import { EventEmitter } from 'events';
import { DELOCommandSystem } from './DELOCommandSystem';
import { RealTimeAudioService, AudioContext } from './RealTimeAudioService';
import { RealTimeVisualService, VisualContext } from './RealTimeVisualService';
import { EnhancedAIPromptingService } from './EnhancedAIPromptingService';

export interface SensoryContext {
  timestamp: number;
  audio: AudioContext | null;
  visual: VisualContext | null;
  combined: CombinedContext;
  intelligence: IntelligenceInsights;
  suggestions: Suggestion[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface CombinedContext {
  currentActivity: string;
  environment: string;
  mood: string;
  productivity: number;
  focus: number;
  stress: number;
  keywords: string[];
  entities: Entity[];
  patterns: Pattern[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  distractions: string[];
}

export interface Entity {
  type: 'person' | 'app' | 'topic' | 'action' | 'time' | 'location';
  value: string;
  confidence: number;
  context: string;
}

export interface Pattern {
  type: 'behavior' | 'workflow' | 'interaction' | 'temporal';
  description: string;
  frequency: number;
  confidence: number;
  suggestion?: string;
}

export interface IntelligenceInsights {
  currentTask: string;
  nextAction: string;
  distractions: string[];
  opportunities: string[];
  risks: string[];
  recommendations: string[];
  automationOpportunities: string[];
}

export interface Suggestion {
  id: string;
  type: 'action' | 'automation' | 'reminder' | 'optimization' | 'assistance';
  title: string;
  description: string;
  confidence: number;
  urgency: 'low' | 'medium' | 'high';
  action?: string;
  data?: any;
  timestamp: number;
}

export interface SensoryConfig {
  enabled: boolean;
  audioEnabled: boolean;
  visualEnabled: boolean;
  analysisInterval: number;
  suggestionThreshold: number;
  maxSuggestions: number;
  contextWindow: number;
  aiAnalysisEnabled: boolean;
  patternDetectionEnabled: boolean;
  automationEnabled: boolean;
}

export interface SensoryState {
  isActive: boolean;
  isAnalyzing: boolean;
  lastAnalysis: number;
  contextsProcessed: number;
  suggestionsGenerated: number;
  patternsDetected: number;
  error?: string;
}

export class SensoryIntelligenceService extends EventEmitter {
  private deloSystem: DELOCommandSystem;
  private audioService: RealTimeAudioService;
  private visualService: RealTimeVisualService;
  private enhancedAI: EnhancedAIPromptingService;
  private config: SensoryConfig;
  private state: SensoryState;
  private contextHistory: SensoryContext[] = [];
  private suggestionHistory: Suggestion[] = [];
  private patternHistory: Pattern[] = [];
  private analysisInterval?: NodeJS.Timeout;
  private isInitialized = false;

  constructor(
    deloSystem: DELOCommandSystem,
    audioService: RealTimeAudioService,
    visualService: RealTimeVisualService
  ) {
    super();
    this.deloSystem = deloSystem;
    this.audioService = audioService;
    this.visualService = visualService;
    this.enhancedAI = new EnhancedAIPromptingService();
    
    this.config = {
      enabled: true,
      audioEnabled: true,
      visualEnabled: true,
      analysisInterval: 5000, // 5 seconds
      suggestionThreshold: 0.7,
      maxSuggestions: 5,
      contextWindow: 300, // 5 minutes
      aiAnalysisEnabled: true,
      patternDetectionEnabled: true,
      automationEnabled: true
    };

    this.state = {
      isActive: false,
      isAnalyzing: false,
      lastAnalysis: 0,
      contextsProcessed: 0,
      suggestionsGenerated: 0,
      patternsDetected: 0
    };

    this.setupEventListeners();
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🧠 Initializing Sensory Intelligence Service...');
      
      // Initialize audio and visual services
      if (this.config.audioEnabled) {
        await this.audioService.initialize();
      }
      
      if (this.config.visualEnabled) {
        await this.visualService.initialize();
      }
      
      this.isInitialized = true;
      console.log('✅ Sensory Intelligence Service initialized');
    } catch (error) {
      console.error('❌ Error initializing Sensory Intelligence Service:', error);
      this.state.error = String(error);
      throw error;
    }
  }

  /**
   * Start sensory intelligence monitoring
   */
  public async startMonitoring(): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Sensory intelligence is disabled');
    }

    if (this.state.isActive) {
      console.log('Already monitoring sensory context');
      return;
    }

    try {
      this.state.isActive = true;
      this.emit('monitoring', true);

      // Start audio monitoring
      if (this.config.audioEnabled) {
        await this.audioService.startRecording();
      }

      // Start visual monitoring
      if (this.config.visualEnabled) {
        await this.visualService.startMonitoring();
      }

      // Start periodic analysis
      this.startPeriodicAnalysis();

      console.log('🧠 Sensory intelligence monitoring started');
    } catch (error) {
      this.state.isActive = false;
      this.state.error = String(error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Stop sensory intelligence monitoring
   */
  public async stopMonitoring(): Promise<void> {
    if (!this.state.isActive) return;

    try {
      this.state.isActive = false;
      this.emit('monitoring', false);

      // Stop audio monitoring
      if (this.config.audioEnabled) {
        await this.audioService.stopRecording();
      }

      // Stop visual monitoring
      if (this.config.visualEnabled) {
        await this.visualService.stopMonitoring();
      }

      // Stop periodic analysis
      if (this.analysisInterval) {
        clearInterval(this.analysisInterval);
        this.analysisInterval = undefined;
      }

      console.log('🧠 Sensory intelligence monitoring stopped');
    } catch (error) {
      console.error('Error stopping sensory monitoring:', error);
    }
  }

  /**
   * Get current sensory context
   */
  public async getCurrentSensoryContext(): Promise<SensoryContext | null> {
    try {
      const audioContext = this.config.audioEnabled ? 
        this.audioService.getRecentAudioContext(30)[0] || null : null;
      
      const visualContext = this.config.visualEnabled ? 
        this.visualService.getRecentVisualContext(1)[0] || null : null;

      if (!audioContext && !visualContext) {
        return null;
      }

      const combined = await this.analyzeCombinedContext(audioContext, visualContext);
      const intelligence = await this.generateIntelligenceInsights(combined);
      const suggestions = await this.generateSuggestions(combined, intelligence);

      const sensoryContext: SensoryContext = {
        timestamp: Date.now(),
        audio: audioContext,
        visual: visualContext,
        combined,
        intelligence,
        suggestions,
        urgency: this.calculateUrgency(combined, intelligence, suggestions)
      };

      // Add to history
      this.contextHistory.push(sensoryContext);
      this.state.contextsProcessed++;
      
      // Keep only recent contexts
      if (this.contextHistory.length > 100) {
        this.contextHistory.shift();
      }

      // Emit context event
      this.emit('sensoryContext', sensoryContext);

      return sensoryContext;
    } catch (error) {
      console.error('Error getting sensory context:', error);
      return null;
    }
  }

  /**
   * Get recent sensory contexts
   */
  public getRecentSensoryContexts(count: number = 10): SensoryContext[] {
    return this.contextHistory.slice(-count);
  }

  /**
   * Get active suggestions
   */
  public getActiveSuggestions(): Suggestion[] {
    const cutoffTime = Date.now() - (this.config.contextWindow * 1000);
    return this.suggestionHistory.filter(suggestion => suggestion.timestamp > cutoffTime);
  }

  /**
   * Get detected patterns
   */
  public getDetectedPatterns(): Pattern[] {
    return this.patternHistory;
  }

  /**
   * Get sensory state
   */
  public getSensoryState(): SensoryState {
    return { ...this.state };
  }

  /**
   * Get sensory configuration
   */
  public getSensoryConfig(): SensoryConfig {
    return { ...this.config };
  }

  /**
   * Update sensory configuration
   */
  public updateSensoryConfig(newConfig: Partial<SensoryConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);
  }

  /**
   * Setup event listeners for audio and visual services
   */
  private setupEventListeners(): void {
    // Audio events
    this.audioService.on('transcription', (audioContext: AudioContext) => {
      this.handleAudioContext(audioContext);
    });

    this.audioService.on('keywords', (data: any) => {
      this.handleAudioKeywords(data);
    });

    this.audioService.on('meeting', (data: any) => {
      this.handleMeetingContext(data);
    });

    // Visual events
    this.visualService.on('visualContext', (visualContext: VisualContext) => {
      this.handleVisualContext(visualContext);
    });

    this.visualService.on('meeting', (data: any) => {
      this.handleMeetingContext(data);
    });

    this.visualService.on('urgent', (data: any) => {
      this.handleUrgentContext(data);
    });
  }

  /**
   * Handle audio context updates
   */
  private async handleAudioContext(audioContext: AudioContext): Promise<void> {
    try {
      // Trigger immediate analysis if significant audio detected
      if (audioContext.confidence > 0.8) {
        await this.triggerAnalysis();
      }
    } catch (error) {
      console.error('Error handling audio context:', error);
    }
  }

  /**
   * Handle audio keywords
   */
  private async handleAudioKeywords(data: any): Promise<void> {
    try {
      const suggestion: Suggestion = {
        id: `keyword_${Date.now()}`,
        type: 'action',
        title: 'Keyword Detected',
        description: `Detected keywords: ${data.keywords.join(', ')}`,
        confidence: 0.8,
        urgency: 'medium',
        action: 'process_keywords',
        data: data,
        timestamp: Date.now()
      };

      this.addSuggestion(suggestion);
    } catch (error) {
      console.error('Error handling audio keywords:', error);
    }
  }

  /**
   * Handle visual context updates
   */
  private async handleVisualContext(visualContext: VisualContext): Promise<void> {
    try {
      // Trigger analysis for significant visual changes
      if (visualContext.changes.length > 0) {
        await this.triggerAnalysis();
      }
    } catch (error) {
      console.error('Error handling visual context:', error);
    }
  }

  /**
   * Handle meeting context
   */
  private async handleMeetingContext(data: any): Promise<void> {
    try {
      const suggestion: Suggestion = {
        id: `meeting_${Date.now()}`,
        type: 'assistance',
        title: 'Meeting Detected',
        description: 'You appear to be in a meeting. Would you like assistance?',
        confidence: 0.9,
        urgency: 'medium',
        action: 'meeting_assistance',
        data: data,
        timestamp: Date.now()
      };

      this.addSuggestion(suggestion);
    } catch (error) {
      console.error('Error handling meeting context:', error);
    }
  }

  /**
   * Handle urgent context
   */
  private async handleUrgentContext(data: any): Promise<void> {
    try {
      const suggestion: Suggestion = {
        id: `urgent_${Date.now()}`,
        type: 'action',
        title: 'Urgent Situation Detected',
        description: 'Something urgent appears to be happening. Do you need help?',
        confidence: 0.9,
        urgency: 'high',
        action: 'urgent_assistance',
        data: data,
        timestamp: Date.now()
      };

      this.addSuggestion(suggestion);
    } catch (error) {
      console.error('Error handling urgent context:', error);
    }
  }

  /**
   * Analyze combined audio and visual context
   */
  private async analyzeCombinedContext(
    audioContext: AudioContext | null,
    visualContext: VisualContext | null
  ): Promise<CombinedContext> {
    try {
      const audioText = audioContext?.transcript || '';
      const visualText = visualContext?.ocrText || '';
      const combinedText = `${audioText} ${visualText}`.trim();

      // Extract entities
      const entities = await this.extractEntities(combinedText);
      
      // Detect patterns
      const patterns = await this.detectPatterns(audioContext, visualContext);
      
      // Analyze activity
      const currentActivity = await this.analyzeCurrentActivity(combinedText, entities);
      
      // Analyze environment
      const environment = await this.analyzeEnvironment(visualContext);
      
      // Analyze mood and productivity
      const { mood, productivity, focus, stress } = await this.analyzeMetrics(combinedText);

      // Calculate urgency and distractions
      const urgency = this.calculateUrgencyFromContext(stress, combinedText);
      const distractions = this.identifyDistractions(combinedText, visualContext);

      return {
        currentActivity,
        environment,
        mood,
        productivity,
        focus,
        stress,
        keywords: this.extractKeywords(combinedText),
        entities,
        patterns,
        urgency,
        distractions
      };
    } catch (error) {
      console.error('Error analyzing combined context:', error);
      return {
        currentActivity: 'unknown',
        environment: 'unknown',
        mood: 'neutral',
        productivity: 0.5,
        focus: 0.5,
        stress: 0.5,
        keywords: [],
        entities: [],
        patterns: [],
        urgency: 'low',
        distractions: []
      };
    }
  }

  /**
   * Calculate urgency from context
   */
  private calculateUrgencyFromContext(stress: number, text: string): 'low' | 'medium' | 'high' | 'critical' {
    const urgentKeywords = ['urgent', 'emergency', 'asap', 'deadline', 'critical'];
    const hasUrgentKeywords = urgentKeywords.some(keyword => text.toLowerCase().includes(keyword));
    
    if (stress > 0.8 || hasUrgentKeywords) return 'critical';
    if (stress > 0.6) return 'high';
    if (stress > 0.4) return 'medium';
    return 'low';
  }

  /**
   * Identify distractions from context
   */
  private identifyDistractions(text: string, visualContext: VisualContext | null): string[] {
    const distractions: string[] = [];
    
    if (visualContext?.activeWindow?.toLowerCase().includes('chrome')) {
      distractions.push('web_browsing');
    }
    
    if (text.toLowerCase().includes('notification') || text.toLowerCase().includes('alert')) {
      distractions.push('notifications');
    }
    
    return distractions;
  }

  /**
   * Identify distractions from combined context
   */
  private identifyDistractionsFromContext(combined: CombinedContext): string[] {
    const distractions: string[] = [];
    
    if (combined.stress > 0.7) {
      distractions.push('high_stress_level');
    }
    
    if (combined.focus < 0.3) {
      distractions.push('low_focus_level');
    }
    
    if (combined.entities.some(e => e.type === 'app' && ['chrome', 'browser'].includes(e.value))) {
      distractions.push('web_browsing');
    }
    
    return distractions;
  }

  /**
   * Extract entities from text
   */
  private async extractEntities(text: string): Promise<Entity[]> {
    const entities: Entity[] = [];
    
    // Simple entity extraction (would use NLP in production)
    const personPattern = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g;
    const appPattern = /\b(zoom|teams|gmail|chrome|vscode|word|excel)\b/gi;
    const actionPattern = /\b(send|open|close|save|delete|create|edit)\b/gi;
    
    // Extract persons
    const persons = text.match(personPattern) || [];
    persons.forEach(person => {
      entities.push({
        type: 'person',
        value: person,
        confidence: 0.8,
        context: text
      });
    });

    // Extract apps
    const apps = text.match(appPattern) || [];
    apps.forEach(app => {
      entities.push({
        type: 'app',
        value: app.toLowerCase(),
        confidence: 0.9,
        context: text
      });
    });

    // Extract actions
    const actions = text.match(actionPattern) || [];
    actions.forEach(action => {
      entities.push({
        type: 'action',
        value: action.toLowerCase(),
        confidence: 0.7,
        context: text
      });
    });

    return entities;
  }

  /**
   * Detect patterns in behavior
   */
  private async detectPatterns(
    audioContext: AudioContext | null,
    visualContext: VisualContext | null
  ): Promise<Pattern[]> {
    const patterns: Pattern[] = [];
    
    // Analyze recent contexts for patterns
    const recentContexts = this.contextHistory.slice(-10);
    
    // Look for repeated activities
    const activities = recentContexts.map(ctx => ctx.combined.currentActivity);
    const activityCounts = activities.reduce((acc, activity) => {
      acc[activity] = (acc[activity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(activityCounts).forEach(([activity, count]) => {
      if (count >= 3) {
        patterns.push({
          type: 'behavior',
          description: `Frequently performing: ${activity}`,
          frequency: count,
          confidence: Math.min(count / 10, 0.9),
          suggestion: `Consider automating ${activity}`
        });
      }
    });

    return patterns;
  }

  /**
   * Analyze current activity
   */
  private async analyzeCurrentActivity(text: string, entities: Entity[]): Promise<string> {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('meeting') || lowerText.includes('call')) {
      return 'meeting';
    } else if (lowerText.includes('email') || lowerText.includes('mail')) {
      return 'email';
    } else if (lowerText.includes('code') || lowerText.includes('programming')) {
      return 'coding';
    } else if (lowerText.includes('document') || lowerText.includes('writing')) {
      return 'writing';
    } else if (lowerText.includes('research') || lowerText.includes('search')) {
      return 'research';
    } else {
      return 'general_work';
    }
  }

  /**
   * Analyze environment
   */
  private async analyzeEnvironment(visualContext: VisualContext | null): Promise<string> {
    if (!visualContext) return 'unknown';
    
    const text = visualContext.ocrText.toLowerCase();
    
    if (text.includes('zoom') || text.includes('teams')) {
      return 'meeting';
    } else if (text.includes('gmail') || text.includes('outlook')) {
      return 'email';
    } else if (text.includes('vscode') || text.includes('terminal')) {
      return 'development';
    } else if (text.includes('chrome') || text.includes('browser')) {
      return 'web_browsing';
    } else {
      return 'general';
    }
  }

  /**
   * Analyze mood and productivity metrics
   */
  private async analyzeMetrics(text: string): Promise<{
    mood: string;
    productivity: number;
    focus: number;
    stress: number;
  }> {
    const lowerText = text.toLowerCase();
    
    // Simple sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'happy', 'productive'];
    const negativeWords = ['bad', 'terrible', 'frustrated', 'stressed', 'overwhelmed'];
    const urgentWords = ['urgent', 'deadline', 'asap', 'critical', 'emergency'];
    
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
    const urgentCount = urgentWords.filter(word => lowerText.includes(word)).length;
    
    let mood = 'neutral';
    if (positiveCount > negativeCount) mood = 'positive';
    else if (negativeCount > positiveCount) mood = 'negative';
    
    const productivity = Math.min(0.9, 0.5 + (positiveCount * 0.1) - (negativeCount * 0.1));
    const focus = Math.max(0.1, 0.5 - (urgentCount * 0.1));
    const stress = Math.min(0.9, 0.3 + (urgentCount * 0.2) + (negativeCount * 0.1));
    
    return { mood, productivity, focus, stress };
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    const keywords = [
      'meeting', 'email', 'document', 'code', 'research',
      'urgent', 'important', 'deadline', 'project', 'task',
      'zoom', 'teams', 'gmail', 'chrome', 'vscode'
    ];
    
    const lowerText = text.toLowerCase();
    return keywords.filter(keyword => lowerText.includes(keyword));
  }

  /**
   * Generate intelligence insights
   */
  private async generateIntelligenceInsights(combined: CombinedContext): Promise<IntelligenceInsights> {
    try {
      const insights: IntelligenceInsights = {
        currentTask: combined.currentActivity,
        nextAction: this.predictNextAction(combined),
        distractions: this.identifyDistractionsFromContext(combined),
        opportunities: this.identifyOpportunities(combined),
        risks: this.identifyRisks(combined),
        recommendations: this.generateRecommendations(combined),
        automationOpportunities: this.identifyAutomationOpportunities(combined)
      };

      return insights;
    } catch (error) {
      console.error('Error generating intelligence insights:', error);
      return {
        currentTask: 'unknown',
        nextAction: 'continue_current_task',
        distractions: [],
        opportunities: [],
        risks: [],
        recommendations: [],
        automationOpportunities: []
      };
    }
  }

  /**
   * Predict next action
   */
  private predictNextAction(combined: CombinedContext): string {
    switch (combined.currentActivity) {
      case 'meeting':
        return 'take_notes_or_follow_up';
      case 'email':
        return 'compose_or_reply';
      case 'coding':
        return 'test_or_debug';
      case 'writing':
        return 'save_or_share';
      case 'research':
        return 'summarize_findings';
      default:
        return 'continue_current_task';
    }
  }

  /**
   * Identify opportunities
   */
  private identifyOpportunities(combined: CombinedContext): string[] {
    const opportunities: string[] = [];
    
    if (combined.productivity > 0.8) {
      opportunities.push('high_productivity_moment');
    }
    
    if (combined.patterns.length > 0) {
      opportunities.push('automation_opportunity');
    }
    
    if (combined.currentActivity === 'meeting') {
      opportunities.push('meeting_assistance');
    }
    
    return opportunities;
  }

  /**
   * Identify risks
   */
  private identifyRisks(combined: CombinedContext): string[] {
    const risks: string[] = [];
    
    if (combined.stress > 0.8) {
      risks.push('burnout_risk');
    }
    
    if (combined.urgency === 'high') {
      risks.push('missed_deadline');
    }
    
    if (combined.distractions.length > 2) {
      risks.push('productivity_loss');
    }
    
    return risks;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(combined: CombinedContext): string[] {
    const recommendations: string[] = [];
    
    if (combined.stress > 0.7) {
      recommendations.push('Take a short break to reduce stress');
    }
    
    if (combined.focus < 0.3) {
      recommendations.push('Close distracting applications');
    }
    
    if (combined.patterns.length > 0) {
      recommendations.push('Consider automating repetitive tasks');
    }
    
    return recommendations;
  }

  /**
   * Identify automation opportunities
   */
  private identifyAutomationOpportunities(combined: CombinedContext): string[] {
    const opportunities: string[] = [];
    
    combined.patterns.forEach(pattern => {
      if (pattern.frequency >= 3) {
        opportunities.push(`Automate ${pattern.description}`);
      }
    });
    
    return opportunities;
  }

  /**
   * Generate suggestions based on context
   */
  private async generateSuggestions(
    combined: CombinedContext,
    intelligence: IntelligenceInsights
  ): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];
    
    // Meeting suggestions
    if (combined.currentActivity === 'meeting') {
      suggestions.push({
        id: `meeting_${Date.now()}`,
        type: 'assistance',
        title: 'Meeting Assistant',
        description: 'I can help take notes, set reminders, or schedule follow-ups',
        confidence: 0.9,
        urgency: 'medium',
        action: 'meeting_assistance',
        timestamp: Date.now()
      });
    }
    
    // Email suggestions
    if (combined.currentActivity === 'email') {
      suggestions.push({
        id: `email_${Date.now()}`,
        type: 'automation',
        title: 'Email Automation',
        description: 'I can help compose, summarize, or organize emails',
        confidence: 0.8,
        urgency: 'low',
        action: 'email_assistance',
        timestamp: Date.now()
      });
    }
    
    // Stress management suggestions
    if (combined.stress > 0.7) {
      suggestions.push({
        id: `stress_${Date.now()}`,
        type: 'assistance',
        title: 'Stress Management',
        description: 'Would you like me to help prioritize tasks or take a break?',
        confidence: 0.9,
        urgency: 'high',
        action: 'stress_management',
        timestamp: Date.now()
      });
    }
    
    // Automation suggestions
    if (combined.patterns.length > 0) {
      suggestions.push({
        id: `automation_${Date.now()}`,
        type: 'automation',
        title: 'Workflow Automation',
        description: `I detected ${combined.patterns.length} patterns that could be automated`,
        confidence: 0.8,
        urgency: 'medium',
        action: 'workflow_automation',
        data: combined.patterns,
        timestamp: Date.now()
      });
    }
    
    return suggestions.slice(0, this.config.maxSuggestions);
  }

  /**
   * Calculate overall urgency
   */
  private calculateUrgency(
    combined: CombinedContext,
    intelligence: IntelligenceInsights,
    suggestions: Suggestion[]
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (combined.stress > 0.8 || intelligence.risks.includes('burnout_risk')) {
      return 'critical';
    } else if (combined.stress > 0.6 || intelligence.risks.includes('missed_deadline')) {
      return 'high';
    } else if (suggestions.some(s => s.urgency === 'high')) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Add suggestion to history
   */
  private addSuggestion(suggestion: Suggestion): void {
    this.suggestionHistory.push(suggestion);
    this.state.suggestionsGenerated++;
    
    // Keep only recent suggestions
    if (this.suggestionHistory.length > 100) {
      this.suggestionHistory.shift();
    }
    
    // Emit suggestion event
    this.emit('suggestion', suggestion);
  }

  /**
   * Start periodic analysis
   */
  private startPeriodicAnalysis(): void {
    this.analysisInterval = setInterval(async () => {
      if (this.state.isActive && !this.state.isAnalyzing) {
        await this.triggerAnalysis();
      }
    }, this.config.analysisInterval);
  }

  /**
   * Trigger immediate analysis
   */
  private async triggerAnalysis(): Promise<void> {
    if (this.state.isAnalyzing) return;

    try {
      this.state.isAnalyzing = true;
      this.state.lastAnalysis = Date.now();
      
      const context = await this.getCurrentSensoryContext();
      if (context) {
        this.emit('analysis', context);
      }
    } catch (error) {
      console.error('Error during analysis:', error);
    } finally {
      this.state.isAnalyzing = false;
    }
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    await this.stopMonitoring();
    this.removeAllListeners();
  }
} 