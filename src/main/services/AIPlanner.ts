import { agenticCommandProcessor } from './AgenticCommandProcessor';
import { configManager } from './ConfigManager';
import { runUserIntent } from '../core/intentParser';

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

interface PlanStep {
  description: string;
  command: string;
}

export class AIPlanner {
  private agenticCommandProcessor: typeof agenticCommandProcessor;
  private configManager: typeof configManager;
  private partialResults: any[] = [];

  constructor() {
    this.agenticCommandProcessor = agenticCommandProcessor;
    this.configManager = configManager;
  }

  public async planActions(command: string): Promise<PlanningResult> {
    try {
      console.log(`🤖 Planning actions for command: ${command}`);
      
      // Use the AgenticCommandProcessor to process the command
      const result = await this.agenticCommandProcessor.processCommand(command);
      
      // Convert the result into a planning result
      const steps: ActionStep[] = [{
        id: 'step_1',
        action: 'execute_command',
        description: result.message,
        estimatedTime: 1000,
        priority: 1,
        dependencies: []
      }];

      return {
        success: result.success,
        steps,
        totalTime: 1000,
        confidence: result.success ? 0.8 : 0.3,
        fallback: result.fallback
      };
    } catch (error) {
      console.error('❌ Error planning actions:', error);
      return this.generateFallbackPlan(command);
    }
  }

  private generateFallbackPlan(command: string): PlanningResult {
    console.log(`🔄 Generating fallback plan for: "${command}"`);
    
    const lowerCommand = command.toLowerCase();
    const steps: ActionStep[] = [];

    // Simple keyword-based planning
    if (lowerCommand.includes('open') || lowerCommand.includes('launch') || lowerCommand.includes('start')) {
      const appName = this.extractAppName(command);
      steps.push({
        id: 'step_1',
        action: 'launch_app',
        description: `Launch ${appName}`,
        estimatedTime: 2000,
        priority: 1,
        dependencies: []
      });
    } else if (lowerCommand.includes('search') || lowerCommand.includes('find')) {
      steps.push({
        id: 'step_1',
        action: 'search',
        description: `Search for: ${command}`,
        estimatedTime: 1500,
        priority: 2,
        dependencies: []
      });
    } else if (lowerCommand.includes('email') || lowerCommand.includes('mail')) {
      steps.push({
        id: 'step_1',
        action: 'compose_email',
        description: 'Compose email',
        estimatedTime: 3000,
        priority: 2,
        dependencies: []
      });
    } else {
      // Generic fallback
      steps.push({
        id: 'step_1',
        action: 'execute_command',
        description: `Execute: ${command}`,
        estimatedTime: 1000,
        priority: 2,
        dependencies: []
      });
    }

    return {
      success: true,
      steps,
      totalTime: steps.reduce((sum, step) => sum + step.estimatedTime, 0),
      confidence: 0.3,
      fallback: this.generateFallbackSuggestion(command)
    };
  }

  private generateFallbackSuggestion(command: string): string {
    return `Try rephrasing your command: "${command}". You can also try more specific commands like "open [app name]", "search [query]", or "compose email".`;
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
        return false;
      }
    }

    return true;
  }

  public optimizePlan(plan: PlanningResult): PlanningResult {
    if (!plan.success || plan.steps.length === 0) {
      return plan;
    }

    // Sort steps by priority and dependencies
    const sortedSteps = [...plan.steps].sort((a, b) => {
      // Higher priority first
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      // Fewer dependencies first
      return a.dependencies.length - b.dependencies.length;
    });

    const totalTime = sortedSteps.reduce((sum, step) => sum + step.estimatedTime, 0);
    const confidence = this.calculateConfidence(sortedSteps);

    return {
      ...plan,
      steps: sortedSteps,
      totalTime,
      confidence
    };
  }

  private calculateConfidence(steps: ActionStep[]): number {
    // Simple confidence calculation based on step quality
    let confidence = 0.5; // Base confidence
    
    for (const step of steps) {
      if (step.description.length > 10) confidence += 0.1;
      if (step.estimatedTime > 0) confidence += 0.05;
      if (step.priority === 1) confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }

  // Plan and execute a multistep task
  async planAndExecute(userInput: string): Promise<{ success: boolean; results: any[]; error?: string }> {
    // TODO: Use LLM/ReAct to break down the userInput into steps
    // Placeholder: treat the whole input as a single step
    const steps: PlanStep[] = [
      { description: 'Single-step plan', command: userInput }
    ];
    this.partialResults = [];
    for (const step of steps) {
      const result = await runUserIntent(step.command);
      this.partialResults.push({ step: step.description, result });
      if (!result.success) {
        return { success: false, results: this.partialResults, error: result.error };
      }
    }
    return { success: true, results: this.partialResults };
  }

  // Get memory of partial results
  getPartialResults() {
    return this.partialResults;
  }
}

export const aiPlanner = new AIPlanner();

// Legacy function for backward compatibility
export async function planActions(command: string): Promise<string[]> {
  try {
    const planner = new AIPlanner();
    const result = await planner.planActions(command);
    
    if (result.success && result.steps.length > 0) {
      return result.steps.map(step => step.description);
    }
    
    return [command]; // Fallback to original command
  } catch (error) {
    console.error('Error in legacy planActions:', error);
    return [command]; // Fallback to original command
  }
} 