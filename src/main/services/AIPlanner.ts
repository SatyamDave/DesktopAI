import axios from 'axios';
import { ConfigManager } from './ConfigManager';

interface ActionStep {
  id: string;
  action: string;
  description: string;
  priority: number;
  dependencies: string[];
  estimatedTime: number;
}

interface PlanningResult {
  success: boolean;
  steps: ActionStep[];
  totalTime: number;
  confidence: number;
  error?: string;
  fallback?: string;
}

export class AIPlanner {
  private configManager: ConfigManager;
  private maxRetries = 3;
  private timeout = 10000; // 10 seconds

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  public async planActions(command: string, context?: any): Promise<PlanningResult> {
    try {
      console.log(`🎯 Planning actions for command: "${command}"`);
      
      // Check if we have AI configuration
      if (!this.configManager.hasAIConfiguration()) {
        return this.generateFallbackPlan(command);
      }

      // Try Azure OpenAI first, then OpenAI as fallback
      const azureConfig = this.configManager.getAzureOpenAIConfig();
      if (azureConfig) {
        try {
          return await this.planWithAzureOpenAI(command, context, azureConfig);
        } catch (error) {
          console.warn('⚠️ Azure OpenAI planning failed, trying OpenAI fallback:', error);
        }
      }

      const openAIConfig = this.configManager.getOpenAIConfig();
      if (openAIConfig) {
        try {
          return await this.planWithOpenAI(command, context, openAIConfig);
        } catch (error) {
          console.warn('⚠️ OpenAI planning failed:', error);
        }
      }

      // If all AI providers fail, use fallback
      return this.generateFallbackPlan(command);

    } catch (error) {
      console.error('❌ Error in action planning:', error);
      return this.generateFallbackPlan(command, error as Error);
    }
  }

  private async planWithAzureOpenAI(command: string, context: any, config: any): Promise<PlanningResult> {
    const url = `${config.endpoint}openai/deployments/${config.deploymentName}/chat/completions?api-version=${config.apiVersion}`;
    
    const messages = [
      {
        role: 'system',
        content: `You are an intelligent desktop assistant that breaks down user commands into actionable steps. 
        
        For each step, provide:
        - A clear action description
        - Priority (1-5, where 1 is highest)
        - Dependencies (if any)
        - Estimated time in seconds
        
        Return the response as a JSON array of objects with these fields:
        - id: unique identifier
        - action: what to do
        - description: detailed explanation
        - priority: 1-5
        - dependencies: array of step IDs this depends on
        - estimatedTime: time in seconds
        
        Focus on practical, executable steps for desktop automation.`
      },
      {
        role: 'user',
        content: `Command: "${command}"
        Context: ${context ? JSON.stringify(context) : 'No additional context'}
        
        Break this down into actionable steps for a desktop assistant to execute.`
      }
    ];

    const response = await axios.post(url, {
      messages,
      max_tokens: 1000,
      temperature: 0.2,
      top_p: 1,
      stop: null,
    }, {
      headers: {
        'api-key': config.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: this.timeout
    });

    const content = response.data.choices[0].message.content;
    return this.parseAIResponse(content, command);
  }

  private async planWithOpenAI(command: string, context: any, config: any): Promise<PlanningResult> {
    const url = 'https://api.openai.com/v1/chat/completions';
    
    const messages = [
      {
        role: 'system',
        content: `You are an intelligent desktop assistant that breaks down user commands into actionable steps. 
        
        For each step, provide:
        - A clear action description
        - Priority (1-5, where 1 is highest)
        - Dependencies (if any)
        - Estimated time in seconds
        
        Return the response as a JSON array of objects with these fields:
        - id: unique identifier
        - action: what to do
        - description: detailed explanation
        - priority: 1-5
        - dependencies: array of step IDs this depends on
        - estimatedTime: time in seconds
        
        Focus on practical, executable steps for desktop automation.`
      },
      {
        role: 'user',
        content: `Command: "${command}"
        Context: ${context ? JSON.stringify(context) : 'No additional context'}
        
        Break this down into actionable steps for a desktop assistant to execute.`
      }
    ];

    const response = await axios.post(url, {
      model: 'gpt-3.5-turbo',
      messages,
      max_tokens: 1000,
      temperature: 0.2,
      top_p: 1,
      stop: null,
    }, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: this.timeout
    });

    const content = response.data.choices[0].message.content;
    return this.parseAIResponse(content, command);
  }

  private parseAIResponse(content: string, originalCommand: string): PlanningResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const stepsData = JSON.parse(jsonMatch[0]);
      const steps: ActionStep[] = stepsData.map((step: any, index: number) => ({
        id: step.id || `step_${index + 1}`,
        action: step.action || step.description || 'Unknown action',
        description: step.description || step.action || 'No description provided',
        priority: step.priority || 3,
        dependencies: step.dependencies || [],
        estimatedTime: step.estimatedTime || 5
      }));

      const totalTime = steps.reduce((sum, step) => sum + step.estimatedTime, 0);
      const confidence = this.calculateConfidence(steps, originalCommand);

      return {
        success: true,
        steps,
        totalTime,
        confidence,
        fallback: this.generateFallbackSuggestion(originalCommand)
      };

    } catch (error) {
      console.error('❌ Error parsing AI response:', error);
      return this.generateFallbackPlan(originalCommand, error as Error);
    }
  }

  private calculateConfidence(steps: ActionStep[], command: string): number {
    // Simple confidence calculation based on step quality
    let confidence = 0.5; // Base confidence

    // Increase confidence for more specific steps
    const specificKeywords = ['open', 'search', 'click', 'type', 'navigate', 'send', 'create'];
    const hasSpecificActions = steps.some(step => 
      specificKeywords.some(keyword => 
        step.action.toLowerCase().includes(keyword)
      )
    );
    if (hasSpecificActions) confidence += 0.2;

    // Increase confidence for reasonable number of steps
    if (steps.length >= 1 && steps.length <= 5) confidence += 0.2;

    // Increase confidence for steps with descriptions
    const hasDescriptions = steps.every(step => step.description && step.description.length > 10);
    if (hasDescriptions) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  private generateFallbackPlan(command: string, error?: Error): PlanningResult {
    console.log(`🔄 Generating fallback plan for: "${command}"`);
    
    const lowerCommand = command.toLowerCase();
    const steps: ActionStep[] = [];

    // Simple keyword-based planning
    if (lowerCommand.includes('open') || lowerCommand.includes('launch') || lowerCommand.includes('start')) {
      const appName = this.extractAppName(command);
      steps.push({
        id: 'step_1',
        action: `Launch ${appName}`,
        description: `Open the ${appName} application`,
        priority: 1,
        dependencies: [],
        estimatedTime: 3
      });
    }

    if (lowerCommand.includes('search') || lowerCommand.includes('find') || lowerCommand.includes('google')) {
      const searchTerm = this.extractSearchTerm(command);
      steps.push({
        id: 'step_1',
        action: `Search for "${searchTerm}"`,
        description: `Perform a web search for the specified term`,
        priority: 1,
        dependencies: [],
        estimatedTime: 2
      });
    }

    if (lowerCommand.includes('email') || lowerCommand.includes('mail') || lowerCommand.includes('send')) {
      steps.push({
        id: 'step_1',
        action: 'Open email client',
        description: 'Launch the default email application',
        priority: 1,
        dependencies: [],
        estimatedTime: 3
      });
    }

    if (lowerCommand.includes('notion')) {
      steps.push({
        id: 'step_1',
        action: 'Open Notion',
        description: 'Launch Notion application or open in browser',
        priority: 1,
        dependencies: [],
        estimatedTime: 3
      });
    }

    if (lowerCommand.includes('slack')) {
      steps.push({
        id: 'step_1',
        action: 'Open Slack',
        description: 'Launch Slack application',
        priority: 1,
        dependencies: [],
        estimatedTime: 3
      });
    }

    // If no specific patterns matched, create a generic step
    if (steps.length === 0) {
      steps.push({
        id: 'step_1',
        action: 'Process command',
        description: `Attempt to execute: ${command}`,
        priority: 1,
        dependencies: [],
        estimatedTime: 5
      });
    }

    const totalTime = steps.reduce((sum, step) => sum + step.estimatedTime, 0);
    const fallbackMessage = error 
      ? `AI planning failed: ${error.message}. Using fallback plan.`
      : 'Using fallback planning due to missing AI configuration.';

    return {
      success: true,
      steps,
      totalTime,
      confidence: 0.3, // Lower confidence for fallback plans
      fallback: fallbackMessage
    };
  }

  private generateFallbackSuggestion(command: string): string {
    const suggestions = [
      'Try rephrasing your command to be more specific',
      'Use simpler commands like "open Chrome" or "search React tutorial"',
      'Check if the application you want to open is installed',
      'Make sure you have the necessary permissions for the requested action'
    ];
    return suggestions[Math.floor(Math.random() * suggestions.length)];
  }

  private extractAppName(command: string): string {
    const openKeywords = ['open', 'launch', 'start'];
    const words = command.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      if (openKeywords.includes(words[i].toLowerCase()) && i + 1 < words.length) {
        return words[i + 1];
      }
    }
    
    return 'application';
  }

  private extractSearchTerm(command: string): string {
    const searchKeywords = ['search', 'find', 'google'];
    const words = command.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      if (searchKeywords.includes(words[i].toLowerCase()) && i + 1 < words.length) {
        return words.slice(i + 1).join(' ');
      }
    }
    
    return command;
  }

  public async validatePlan(plan: PlanningResult): Promise<boolean> {
    if (!plan.success || plan.steps.length === 0) {
      return false;
    }

    // Check for circular dependencies
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCircularDependency = (stepId: string): boolean => {
      if (recursionStack.has(stepId)) {
        return true;
      }
      if (visited.has(stepId)) {
        return false;
      }

      visited.add(stepId);
      recursionStack.add(stepId);

      const step = plan.steps.find(s => s.id === stepId);
      if (step) {
        for (const depId of step.dependencies) {
          if (hasCircularDependency(depId)) {
            return true;
          }
        }
      }

      recursionStack.delete(stepId);
      return false;
    };

    for (const step of plan.steps) {
      if (hasCircularDependency(step.id)) {
        console.error('❌ Circular dependency detected in plan');
        return false;
      }
    }

    return true;
  }

  public optimizePlan(plan: PlanningResult): PlanningResult {
    if (!plan.success) return plan;

    // Sort steps by priority and dependencies
    const sortedSteps = [...plan.steps].sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return a.dependencies.length - b.dependencies.length;
    });

    // Update step IDs to reflect new order
    const stepMap = new Map<string, string>();
    const optimizedSteps = sortedSteps.map((step, index) => {
      const newId = `step_${index + 1}`;
      stepMap.set(step.id, newId);
      
      return {
        ...step,
        id: newId,
        dependencies: step.dependencies.map(dep => stepMap.get(dep) || dep)
      };
    });

    const totalTime = optimizedSteps.reduce((sum, step) => sum + step.estimatedTime, 0);

    return {
      ...plan,
      steps: optimizedSteps,
      totalTime
    };
  }
}

// Legacy function for backward compatibility
export async function planActions(command: string): Promise<string[]> {
  const configManager = new ConfigManager();
  const planner = new AIPlanner(configManager);
  
  try {
    const result = await planner.planActions(command);
    if (result.success) {
      return result.steps.map(step => step.action);
    } else {
      return [`Failed to plan actions: ${result.error}`];
    }
  } catch (error) {
    console.error('Error in legacy planActions:', error);
    return [`Error planning actions: ${error}`];
  }
} 