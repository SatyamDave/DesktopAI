import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { aiProcessor } from './AIProcessor';
import { ContextManager } from './ContextManager';

interface PromptTemplate {
  id: string;
  name: string;
  category: string;
  template: string;
  variables: string[];
  usageCount: number;
  lastUsed: number;
  successRate: number;
}

interface UserContext {
  role: string;
  currentApp: string;
  recentActivity: string[];
  preferences: Map<string, any>;
  commonTasks: Map<string, number>;
}

interface PromptSuggestion {
  text: string;
  confidence: number;
  category: string;
  context: string;
}

interface IntentAnalysis {
  intent: string;
  confidence: number;
  suggestedPrompts: PromptSuggestion[];
  requiredContext: string[];
  fallbackOptions: string[];
}

export class EnhancedAIPromptingService {
  private promptTemplates: Map<string, PromptTemplate> = new Map();
  private userContext: UserContext;
  private shortTermMemory: string[] = [];
  private templatesPath: string;
  private contextPath: string;
  private debug: boolean;
  private aiProcessor: typeof aiProcessor;
  private contextManager: ContextManager;

  constructor() {
    this.debug = process.env.NODE_ENV === 'development';
    this.templatesPath = path.join(os.homedir(), '.doppel', 'prompt-templates.json');
    this.contextPath = path.join(os.homedir(), '.doppel', 'user-context.json');
    
    this.userContext = {
      role: 'general',
      currentApp: '',
      recentActivity: [],
      preferences: new Map(),
      commonTasks: new Map()
    };
    
    this.aiProcessor = aiProcessor;
    this.contextManager = new ContextManager();
    
    this.loadTemplates();
    this.loadUserContext();
    this.initializeDefaultTemplates();
  }

  /**
   * Initialize default prompt templates
   */
  private initializeDefaultTemplates(): void {
    const defaultTemplates: PromptTemplate[] = [
      {
        id: 'email_compose',
        name: 'Email Composition',
        category: 'communication',
        template: 'Write a {tone} email to {recipient} about {subject}. Include: {details}',
        variables: ['tone', 'recipient', 'subject', 'details'],
        usageCount: 0,
        lastUsed: 0,
        successRate: 0
      },
      {
        id: 'code_review',
        name: 'Code Review',
        category: 'development',
        template: 'Review this {language} code for {aspects}: {code}',
        variables: ['language', 'aspects', 'code'],
        usageCount: 0,
        lastUsed: 0,
        successRate: 0
      },
      {
        id: 'document_summary',
        name: 'Document Summary',
        category: 'productivity',
        template: 'Summarize this {document_type} in {length} format: {content}',
        variables: ['document_type', 'length', 'content'],
        usageCount: 0,
        lastUsed: 0,
        successRate: 0
      },
      {
        id: 'meeting_notes',
        name: 'Meeting Notes',
        category: 'productivity',
        template: 'Create meeting notes for {topic} with key points: {agenda}',
        variables: ['topic', 'agenda'],
        usageCount: 0,
        lastUsed: 0,
        successRate: 0
      },
      {
        id: 'problem_solving',
        name: 'Problem Solving',
        category: 'general',
        template: 'Help me solve this problem: {problem}. Context: {context}',
        variables: ['problem', 'context'],
        usageCount: 0,
        lastUsed: 0,
        successRate: 0
      }
    ];

    for (const template of defaultTemplates) {
      if (!this.promptTemplates.has(template.id)) {
        this.promptTemplates.set(template.id, template);
      }
    }
  }

  /**
   * Analyze user intent and generate context-aware suggestions
   */
  public async analyzeIntent(userInput: string): Promise<IntentAnalysis> {
    const lowerInput = userInput.toLowerCase();
    
    // Update short-term memory
    this.updateShortTermMemory(userInput);
    
    // Detect intent based on keywords and patterns
    const intent = this.detectIntent(lowerInput);
    
    // Generate context-aware suggestions
    const suggestions = await this.generateContextualSuggestions(userInput, intent);
    
    // Identify required context
    const requiredContext = this.identifyRequiredContext(userInput, intent);
    
    // Generate fallback options
    const fallbackOptions = this.generateFallbackOptions(userInput, intent);
    
    return {
      intent,
      confidence: this.calculateConfidence(userInput, intent),
      suggestedPrompts: suggestions,
      requiredContext,
      fallbackOptions
    };
  }

  /**
   * Detect user intent from input
   */
  private detectIntent(input: string): string {
    const intentPatterns = [
      { pattern: /(email|mail|compose|send)/, intent: 'communication' },
      { pattern: /(code|program|debug|review)/, intent: 'development' },
      { pattern: /(summarize|summary|document|report)/, intent: 'productivity' },
      { pattern: /(meeting|agenda|notes)/, intent: 'productivity' },
      { pattern: /(problem|solve|help|issue)/, intent: 'general' },
      { pattern: /(search|find|look up)/, intent: 'information' },
      { pattern: /(create|write|generate)/, intent: 'creation' }
    ];

    for (const { pattern, intent } of intentPatterns) {
      if (pattern.test(input)) {
        return intent;
      }
    }

    return 'general';
  }

  /**
   * Generate context-aware prompt suggestions
   */
  private async generateContextualSuggestions(userInput: string, intent: string): Promise<PromptSuggestion[]> {
    const suggestions: PromptSuggestion[] = [];
    
    // Get relevant templates
    const relevantTemplates = Array.from(this.promptTemplates.values())
      .filter(t => t.category === intent || t.category === 'general')
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5);

    for (const template of relevantTemplates) {
      const filledTemplate = this.fillTemplateWithContext(template, userInput);
      if (filledTemplate) {
        suggestions.push({
          text: filledTemplate,
          confidence: this.calculateTemplateConfidence(template, userInput),
          category: template.category,
          context: `Based on ${template.name} template`
        });
      }
    }

    // Generate dynamic suggestions based on user context
    const dynamicSuggestions = this.generateDynamicSuggestions(userInput);
    suggestions.push(...dynamicSuggestions);

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Fill template with contextual information
   */
  private fillTemplateWithContext(template: PromptTemplate, userInput: string): string | null {
    try {
      let filledTemplate = template.template;
      
      // Fill variables based on user input and context
      for (const variable of template.variables) {
        const value = this.extractVariableValue(variable, userInput);
        if (value) {
          filledTemplate = filledTemplate.replace(`{${variable}}`, value);
        } else {
          // If we can't fill a required variable, skip this template
          return null;
        }
      }
      
      return filledTemplate;
    } catch (error) {
      console.error('Error filling template:', error);
      return null;
    }
  }

  /**
   * Extract variable values from user input and context
   */
  private extractVariableValue(variable: string, userInput: string): string | null {
    switch (variable) {
      case 'tone':
        return this.detectTone(userInput) || 'professional';
      case 'recipient':
        return this.extractRecipient(userInput);
      case 'subject':
        return this.extractSubject(userInput);
      case 'details':
        return this.extractDetails(userInput);
      case 'language':
        return this.detectProgrammingLanguage(userInput);
      case 'aspects':
        return this.detectCodeReviewAspects(userInput);
      case 'document_type':
        return this.detectDocumentType(userInput);
      case 'length':
        return this.detectSummaryLength(userInput);
      case 'topic':
        return this.extractTopic(userInput);
      case 'problem':
        return this.extractProblem(userInput);
      case 'context':
        return this.getCurrentContext();
      default:
        return null;
    }
  }

  /**
   * Generate dynamic suggestions based on user context
   */
  private generateDynamicSuggestions(userInput: string): PromptSuggestion[] {
    const suggestions: PromptSuggestion[] = [];
    
    // Suggest based on recent activity
    if (this.userContext.recentActivity.length > 0) {
      const recentActivity = this.userContext.recentActivity[this.userContext.recentActivity.length - 1];
      suggestions.push({
        text: `Continue working on: ${recentActivity}`,
        confidence: 0.7,
        category: 'continuation',
        context: 'Based on recent activity'
      });
    }

    // Suggest based on current app
    if (this.userContext.currentApp) {
      suggestions.push({
        text: `Help me with ${this.userContext.currentApp}`,
        confidence: 0.6,
        category: 'app_specific',
        context: `Current app: ${this.userContext.currentApp}`
      });
    }

    // Suggest based on user role
    if (this.userContext.role !== 'general') {
      suggestions.push({
        text: `As a ${this.userContext.role}, help me with: ${userInput}`,
        confidence: 0.5,
        category: 'role_specific',
        context: `User role: ${this.userContext.role}`
      });
    }

    return suggestions;
  }

  /**
   * Identify required context for the user input
   */
  private identifyRequiredContext(userInput: string, intent: string): string[] {
    const requiredContext: string[] = [];
    
    if (intent === 'communication') {
      requiredContext.push('recipient information', 'email context');
    }
    
    if (intent === 'development') {
      requiredContext.push('code context', 'programming language');
    }
    
    if (intent === 'productivity') {
      requiredContext.push('document content', 'meeting details');
    }
    
    if (userInput.includes('this') || userInput.includes('that')) {
      requiredContext.push('current context', 'active content');
    }
    
    return requiredContext;
  }

  /**
   * Generate fallback options for unclear requests
   */
  private generateFallbackOptions(userInput: string, intent: string): string[] {
    const fallbacks: string[] = [];
    
    if (userInput.length < 10) {
      fallbacks.push('Please provide more details about what you need');
      fallbacks.push('Could you be more specific about your request?');
    }
    
    if (intent === 'general') {
      fallbacks.push('Are you looking for information, help with a task, or something else?');
      fallbacks.push('Would you like me to search for this or help you create something?');
    }
    
    return fallbacks;
  }

  /**
   * Calculate confidence score for intent detection
   */
  private calculateConfidence(userInput: string, intent: string): number {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on input length and specificity
    if (userInput.length > 20) confidence += 0.2;
    if (userInput.length > 50) confidence += 0.1;
    
    // Increase confidence based on keyword matches
    const keywordMatches = this.countKeywordMatches(userInput, intent);
    confidence += keywordMatches * 0.1;
    
    // Increase confidence based on context availability
    if (this.userContext.currentApp) confidence += 0.1;
    if (this.userContext.recentActivity.length > 0) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate template confidence score
   */
  private calculateTemplateConfidence(template: PromptTemplate, userInput: string): number {
    let confidence = 0.3; // Base confidence
    
    // Higher confidence for frequently used templates
    confidence += Math.min(template.usageCount / 10, 0.3);
    
    // Higher confidence for successful templates
    confidence += template.successRate * 0.2;
    
    // Higher confidence for recently used templates
    const daysSinceLastUse = (Date.now() - template.lastUsed) / (1000 * 60 * 60 * 24);
    if (daysSinceLastUse < 7) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Update short-term memory
   */
  private updateShortTermMemory(input: string): void {
    this.shortTermMemory.push(input);
    
    // Keep only last 10 inputs
    if (this.shortTermMemory.length > 10) {
      this.shortTermMemory = this.shortTermMemory.slice(-10);
    }
  }

  /**
   * Get current context string
   */
  private getCurrentContext(): string {
    const contextParts: string[] = [];
    
    if (this.userContext.currentApp) {
      contextParts.push(`Currently using: ${this.userContext.currentApp}`);
    }
    
    if (this.userContext.recentActivity.length > 0) {
      contextParts.push(`Recent activity: ${this.userContext.recentActivity.slice(-3).join(', ')}`);
    }
    
    return contextParts.join('. ') || 'No specific context available';
  }

  /**
   * Helper methods for variable extraction
   */
  private detectTone(input: string): string | null {
    const tones = ['professional', 'casual', 'formal', 'friendly', 'urgent'];
    for (const tone of tones) {
      if (input.includes(tone)) return tone;
    }
    return null;
  }

  private extractRecipient(input: string): string | null {
    const emailPattern = /[\w.-]+@[\w.-]+\.\w+/;
    const match = input.match(emailPattern);
    if (match) return match[0];
    
    // Look for "to [name]" patterns
    const toPattern = /to\s+([a-zA-Z\s]+)/i;
    const toMatch = input.match(toPattern);
    if (toMatch) return toMatch[1].trim();
    
    return null;
  }

  private extractSubject(input: string): string | null {
    const aboutPattern = /about\s+(.+?)(?:\s|$)/i;
    const match = input.match(aboutPattern);
    return match ? match[1].trim() : null;
  }

  private extractDetails(input: string): string | null {
    const includePattern = /include\s+(.+)/i;
    const match = input.match(includePattern);
    return match ? match[1].trim() : 'relevant information';
  }

  private detectProgrammingLanguage(input: string): string | null {
    const languages = ['javascript', 'python', 'java', 'c++', 'c#', 'typescript', 'html', 'css'];
    for (const lang of languages) {
      if (input.includes(lang)) return lang;
    }
    return 'code';
  }

  private detectCodeReviewAspects(input: string): string | null {
    const aspects = ['bugs', 'performance', 'security', 'style', 'logic'];
    const foundAspects = aspects.filter(aspect => input.includes(aspect));
    return foundAspects.length > 0 ? foundAspects.join(', ') : 'overall quality';
  }

  private detectDocumentType(input: string): string | null {
    const types = ['email', 'report', 'document', 'article', 'paper'];
    for (const type of types) {
      if (input.includes(type)) return type;
    }
    return 'document';
  }

  private detectSummaryLength(input: string): string | null {
    if (input.includes('brief') || input.includes('short')) return 'brief';
    if (input.includes('detailed') || input.includes('comprehensive')) return 'detailed';
    return 'concise';
  }

  private extractTopic(input: string): string | null {
    const topicPattern = /(?:meeting|discussion)\s+(?:about\s+)?(.+)/i;
    const match = input.match(topicPattern);
    return match ? match[1].trim() : 'the meeting';
  }

  private extractProblem(input: string): string | null {
    const problemPattern = /(?:problem|issue|trouble)\s+(?:with\s+)?(.+)/i;
    const match = input.match(problemPattern);
    return match ? match[1].trim() : 'the current situation';
  }

  private countKeywordMatches(input: string, intent: string): number {
    const intentKeywords: Record<string, string[]> = {
      'communication': ['email', 'mail', 'send', 'compose', 'message'],
      'development': ['code', 'program', 'debug', 'review', 'function'],
      'productivity': ['summarize', 'document', 'report', 'meeting', 'notes'],
      'general': ['help', 'problem', 'solve', 'issue', 'question']
    };
    
    const keywords = intentKeywords[intent] || [];
    return keywords.filter(keyword => input.includes(keyword)).length;
  }

  /**
   * Update user context
   */
  public updateUserContext(context: Partial<UserContext>): void {
    this.userContext = { ...this.userContext, ...context };
    this.saveUserContext();
  }

  /**
   * Add new prompt template
   */
  public addPromptTemplate(template: Omit<PromptTemplate, 'id' | 'usageCount' | 'lastUsed' | 'successRate'>): void {
    const newTemplate: PromptTemplate = {
      ...template,
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      usageCount: 0,
      lastUsed: 0,
      successRate: 0
    };
    
    this.promptTemplates.set(newTemplate.id, newTemplate);
    this.saveTemplates();
  }

  /**
   * Get service analytics
   */
  public getAnalytics(): any {
    const totalTemplates = this.promptTemplates.size;
    const totalUsage = Array.from(this.promptTemplates.values())
      .reduce((sum, template) => sum + template.usageCount, 0);
    
    const topTemplates = Array.from(this.promptTemplates.values())
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5);
    
    const categoryUsage = Array.from(this.promptTemplates.values())
      .reduce((acc, template) => {
        acc[template.category] = (acc[template.category] || 0) + template.usageCount;
        return acc;
      }, {} as Record<string, number>);

    return {
      totalTemplates,
      totalUsage,
      topTemplates,
      categoryUsage,
      userContext: {
        role: this.userContext.role,
        currentApp: this.userContext.currentApp,
        recentActivityCount: this.userContext.recentActivity.length
      }
    };
  }

  /**
   * Save templates to file
   */
  private saveTemplates(): void {
    try {
      const templatesDir = path.dirname(this.templatesPath);
      if (!fs.existsSync(templatesDir)) {
        fs.mkdirSync(templatesDir, { recursive: true });
      }
      
      const templatesData = Array.from(this.promptTemplates.values());
      fs.writeFileSync(this.templatesPath, JSON.stringify(templatesData, null, 2));
    } catch (error) {
      console.error('Failed to save prompt templates:', error);
    }
  }

  /**
   * Save user context to file
   */
  private saveUserContext(): void {
    try {
      const contextDir = path.dirname(this.contextPath);
      if (!fs.existsSync(contextDir)) {
        fs.mkdirSync(contextDir, { recursive: true });
      }
      
      const contextData = {
        role: this.userContext.role,
        currentApp: this.userContext.currentApp,
        recentActivity: this.userContext.recentActivity,
        preferences: Object.fromEntries(this.userContext.preferences),
        commonTasks: Object.fromEntries(this.userContext.commonTasks)
      };
      
      fs.writeFileSync(this.contextPath, JSON.stringify(contextData, null, 2));
    } catch (error) {
      console.error('Failed to save user context:', error);
    }
  }

  /**
   * Load templates from file
   */
  private loadTemplates(): void {
    try {
      if (fs.existsSync(this.templatesPath)) {
        const data = fs.readFileSync(this.templatesPath, 'utf8');
        const templates = JSON.parse(data);
        
        for (const template of templates) {
          this.promptTemplates.set(template.id, template);
        }
      }
    } catch (error) {
      console.error('Failed to load prompt templates:', error);
    }
  }

  /**
   * Load user context from file
   */
  private loadUserContext(): void {
    try {
      if (fs.existsSync(this.contextPath)) {
        const data = fs.readFileSync(this.contextPath, 'utf8');
        const contextData = JSON.parse(data);
        
        this.userContext.role = contextData.role || 'general';
        this.userContext.currentApp = contextData.currentApp || '';
        this.userContext.recentActivity = contextData.recentActivity || [];
        this.userContext.preferences = new Map(Object.entries(contextData.preferences || {}));
        this.userContext.commonTasks = new Map(Object.entries(contextData.commonTasks || {}));
      }
    } catch (error) {
      console.error('Failed to load user context:', error);
    }
  }
}

// Export singleton instance
export const enhancedAIPromptingService = new EnhancedAIPromptingService();
