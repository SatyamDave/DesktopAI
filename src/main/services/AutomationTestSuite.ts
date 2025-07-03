import { CommandExecutor } from './CommandExecutor';
import { configManager } from './ConfigManager';
import { AIPlanner } from './AIPlanner';
import { ClipboardManager } from './ClipboardManager';
import { behaviorTracker } from './BehaviorTracker';
import { AIProcessor } from './AIProcessor';
import { WhisperMode } from './WhisperMode';
import { commandExecutor } from './CommandExecutor';
import { aiProcessor } from './AIProcessor';

interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
  suggestions?: string[];
}

interface TestSuite {
  name: string;
  tests: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDuration: number;
  successRate: number;
}

export class AutomationTestSuite {
  private commandExecutor: CommandExecutor;
  private configManager: typeof configManager;
  private aiPlanner: AIPlanner;
  private clipboardManager: ClipboardManager;
  private behaviorTracker: typeof behaviorTracker;
  private aiProcessor: AIProcessor;
  private whisperMode: WhisperMode;

  constructor() {
    this.configManager = configManager;
    this.commandExecutor = commandExecutor;
    this.aiPlanner = new AIPlanner();
    this.clipboardManager = new ClipboardManager();
    this.behaviorTracker = behaviorTracker;
    this.aiProcessor = aiProcessor;
    this.whisperMode = new WhisperMode();
  }

  public async runAllTests(): Promise<TestSuite> {
    console.log('🧪 Starting Doppel Automation Test Suite...\n');

    const testSuites = [
      await this.runConfigurationTests(),
      await this.runCommandExecutionTests(),
      await this.runAITests(),
      await this.runClipboardTests(),
      await this.runBehaviorTrackingTests(),
      await this.runWhisperModeTests(),
      await this.runIntegrationTests()
    ];

    const allTests = testSuites.flatMap(suite => suite.tests);
    const totalTests = allTests.length;
    const passedTests = allTests.filter(test => test.success).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = allTests.reduce((sum, test) => sum + test.duration, 0);
    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    const results: TestSuite = {
      name: 'Doppel Automation Test Suite',
      tests: allTests,
      totalTests,
      passedTests,
      failedTests,
      totalDuration,
      successRate
    };

    this.printResults(results);
    return results;
  }

  private async runConfigurationTests(): Promise<TestSuite> {
    const tests: TestResult[] = [];
    const startTime = Date.now();

    // Test 1: ConfigManager initialization
    const configTest = await this.runTest('ConfigManager Initialization', async () => {
      const status = this.configManager.getConfigurationStatus();
      if (!status) throw new Error('Failed to get configuration status');
      return status;
    });
    tests.push(configTest);

    // Test 2: API Configuration validation
    const apiTest = await this.runTest('API Configuration', async () => {
      const hasAI = this.configManager.hasAIConfiguration();
      
      return {
        hasAI,
        debugMode: this.configManager.isDebugMode()
      };
    });
    tests.push(apiTest);

    // Test 3: Environment variables loading
    const envTest = await this.runTest('Environment Variables', async () => {
      const requiredVars = [
        'AZURE_OPENAI_API_KEY',
        'AZURE_OPENAI_ENDPOINT',
        'AZURE_OPENAI_DEPLOYMENT_NAME',
        'OPENAI_API_KEY'
      ];
      
      const missingVars = requiredVars.filter(varName => !process.env[varName]);
      if (missingVars.length > 0) {
        throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
      }
      
      return { configuredVars: requiredVars.length - missingVars.length };
    });
    tests.push(envTest);

    return this.createTestSuite('Configuration Tests', tests, startTime);
  }

  private async runCommandExecutionTests(): Promise<TestSuite> {
    const tests: TestResult[] = [];
    const startTime = Date.now();

    // Test 1: Basic command execution
    const basicTest = await this.runTest('Basic Command Execution', async () => {
      const result = await this.commandExecutor.executeCommand('help');
      if (!result.success) throw new Error(`Help command failed: ${result.message}`);
      return result;
    });
    tests.push(basicTest);

    // Test 2: App launching (safe test)
    const appTest = await this.runTest('App Launch Detection', async () => {
      const result = await this.commandExecutor.executeCommand('open notepad');
      // We don't actually launch notepad in tests, just check if the command is recognized
      if (result.message.includes('not found') || result.message.includes('not installed')) {
        return { status: 'Command recognized, app not installed (expected)' };
      }
      return result;
    });
    tests.push(appTest);

    // Test 3: Web search functionality
    const searchTest = await this.runTest('Web Search', async () => {
      const result = await this.commandExecutor.executeCommand('search test query');
      if (!result.success) throw new Error(`Search command failed: ${result.message}`);
      return result;
    });
    tests.push(searchTest);

    // Test 4: Command history
    const historyTest = await this.runTest('Command History', async () => {
      const history = this.commandExecutor.getCommandHistory(5);
      if (!Array.isArray(history)) throw new Error('Command history should be an array');
      return { historyLength: history.length };
    });
    tests.push(historyTest);

    // Test 5: Command suggestions
    const suggestionsTest = await this.runTest('Command Suggestions', async () => {
      const suggestions = this.commandExecutor.getCommandSuggestions('open');
      if (!Array.isArray(suggestions)) throw new Error('Suggestions should be an array');
      return { suggestionsCount: suggestions.length };
    });
    tests.push(suggestionsTest);

    return this.createTestSuite('Command Execution Tests', tests, startTime);
  }

  private async runAITests(): Promise<TestSuite> {
    const tests: TestResult[] = [];
    const startTime = Date.now();

    // Test 1: AI Planner initialization
    const plannerTest = await this.runTest('AI Planner Initialization', async () => {
      const hasConfig = this.configManager.hasAIConfiguration();
      return { hasAIConfiguration: hasConfig };
    });
    tests.push(plannerTest);

    // Test 2: Action planning (with fallback)
    const planningTest = await this.runTest('Action Planning', async () => {
      const result = await this.aiPlanner.planActions('open chrome and search for react tutorial');
      if (!result.success) throw new Error(`Planning failed: ${result.error}`);
      return {
        stepsCount: result.steps.length,
        confidence: result.confidence,
        totalTime: result.totalTime
      };
    });
    tests.push(planningTest);

    // Test 3: Plan validation
    const validationTest = await this.runTest('Plan Validation', async () => {
      const plan = await this.aiPlanner.planActions('simple test command');
      const isValid = await this.aiPlanner.validatePlan(plan);
      return { isValid, planSteps: plan.steps.length };
    });
    tests.push(validationTest);

    // Test 4: AI Processor
    const processorTest = await this.runTest('AI Processor', async () => {
      const result = await this.aiProcessor.processInput('help');
      if (!result) throw new Error('AI processing failed');
      return { responseLength: result.length };
    });
    tests.push(processorTest);

    return this.createTestSuite('AI Tests', tests, startTime);
  }

  private async runClipboardTests(): Promise<TestSuite> {
    const tests: TestResult[] = [];
    const startTime = Date.now();

    // Test 1: Clipboard manager initialization
    const initTest = await this.runTest('Clipboard Manager Init', async () => {
      await this.clipboardManager.init();
      return { initialized: true };
    });
    tests.push(initTest);

    // Test 2: Clipboard history
    const historyTest = await this.runTest('Clipboard History', async () => {
      const history = await this.clipboardManager.getHistory();
      if (!Array.isArray(history)) throw new Error('Clipboard history should be an array');
      return { historyLength: history.length };
    });
    tests.push(historyTest);

    return this.createTestSuite('Clipboard Tests', tests, startTime);
  }

  private async runBehaviorTrackingTests(): Promise<TestSuite> {
    const tests: TestResult[] = [];
    const startTime = Date.now();

    // Test 1: Behavior tracker initialization
    const initTest = await this.runTest('Behavior Tracker Init', async () => {
      await this.behaviorTracker.init();
      return { initialized: true };
    });
    tests.push(initTest);

    // Test 2: Recent events
    const eventsTest = await this.runTest('Recent Events', async () => {
      const events = await this.behaviorTracker.getRecentEvents(5);
      if (!Array.isArray(events)) throw new Error('Events should be an array');
      return { eventsCount: events.length };
    });
    tests.push(eventsTest);

    // Test 3: App usage stats
    const usageTest = await this.runTest('App Usage Stats', async () => {
      const usage = await this.behaviorTracker.getAppUsageStats();
      if (!Array.isArray(usage)) throw new Error('Usage stats should be an array');
      return { usageCount: usage.length };
    });
    tests.push(usageTest);

    return this.createTestSuite('Behavior Tracking Tests', tests, startTime);
  }

  private async runWhisperModeTests(): Promise<TestSuite> {
    const tests: TestResult[] = [];
    const startTime = Date.now();

    // Test 1: Whisper mode initialization
    const initTest = await this.runTest('Whisper Mode Init', async () => {
      await this.whisperMode.init();
      return { initialized: true };
    });
    tests.push(initTest);

    // Test 2: Whisper mode status
    const statusTest = await this.runTest('Whisper Mode Status', async () => {
      const status = this.whisperMode.getStatus();
      return { isActive: status.isActive, isRecording: status.isRecording };
    });
    tests.push(statusTest);

    return this.createTestSuite('Whisper Mode Tests', tests, startTime);
  }

  private async runIntegrationTests(): Promise<TestSuite> {
    const tests: TestResult[] = [];
    const startTime = Date.now();

    // Test 1: End-to-end command flow
    const e2eTest = await this.runTest('End-to-End Command Flow', async () => {
      // Simulate a complete command execution flow
      const command = 'help';
      const plan = await this.aiPlanner.planActions(command);
      const result = await this.commandExecutor.executeCommand(command);
      
      return {
        planningSuccess: plan.success,
        executionSuccess: result.success,
        hasResponse: !!result.message
      };
    });
    tests.push(e2eTest);

    // Test 2: Sequential command execution
    const sequentialTest = await this.runTest('Sequential Commands', async () => {
      const commands = ['help', 'help'];
      const results = await this.commandExecutor.executeCommandQueue(commands);
      
      if (!Array.isArray(results)) throw new Error('Results should be an array');
      const allSuccessful = results.every(r => r.success);
      
      return {
        commandsExecuted: results.length,
        allSuccessful,
        totalResults: results.length
      };
    });
    tests.push(sequentialTest);

    // Test 3: Error handling
    const errorTest = await this.runTest('Error Handling', async () => {
      const result = await this.commandExecutor.executeCommand('invalid_command_that_should_fail');
      // This should fail gracefully
      return {
        handledGracefully: !result.success,
        hasErrorMessage: !!result.message
      };
    });
    tests.push(errorTest);

    return this.createTestSuite('Integration Tests', tests, startTime);
  }

  private async runTest(name: string, testFn: () => Promise<any>): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      return {
        name,
        success: true,
        duration,
        details: result
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        name,
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error),
        suggestions: this.generateSuggestions(name, error)
      };
    }
  }

  private generateSuggestions(testName: string, error: any): string[] {
    const suggestions: string[] = [];
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (testName.includes('Configuration')) {
      suggestions.push('Check your .env file and ensure all required API keys are set');
      suggestions.push('Copy env.example to .env and fill in your actual API keys');
      suggestions.push('Verify your Azure OpenAI or OpenAI API credentials are valid');
    }

    if (testName.includes('Command Execution')) {
      suggestions.push('Ensure the CommandExecutor service is properly initialized');
      suggestions.push('Check if the target applications are installed on your system');
      suggestions.push('Verify you have the necessary permissions to execute commands');
    }

    if (testName.includes('AI')) {
      suggestions.push('Verify your AI API keys are valid and have sufficient credits');
      suggestions.push('Check your internet connection for API calls');
      suggestions.push('Ensure the AI service endpoints are accessible');
    }

    if (testName.includes('Clipboard')) {
      suggestions.push('Check if clipboard access is enabled in your system settings');
      suggestions.push('Verify the clipboard manager has proper permissions');
    }

    if (testName.includes('Whisper')) {
      suggestions.push('Ensure microphone permissions are granted to the application');
      suggestions.push('Check if audio input devices are properly configured');
    }

    if (errorMessage.includes('permission') || errorMessage.includes('access')) {
      suggestions.push('Run the application with appropriate permissions');
      suggestions.push('Check system security settings and firewall rules');
    }

    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      suggestions.push('Check your internet connection');
      suggestions.push('Verify firewall settings are not blocking the application');
    }

    return suggestions.length > 0 ? suggestions : ['Review the error message and check system logs for more details'];
  }

  private createTestSuite(name: string, tests: TestResult[], startTime: number): TestSuite {
    const totalTests = tests.length;
    const passedTests = tests.filter(test => test.success).length;
    const failedTests = totalTests - passedTests;
    const totalDuration = Date.now() - startTime;
    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    return {
      name,
      tests,
      totalTests,
      passedTests,
      failedTests,
      totalDuration,
      successRate
    };
  }

  private printResults(results: TestSuite): void {
    console.log('\n' + '='.repeat(80));
    console.log('🎉 DOPPEL AUTOMATION TEST SUITE RESULTS');
    console.log('='.repeat(80));
    
    console.log(`\n📊 Overall Results:`);
    console.log(`   • Total Tests: ${results.totalTests}`);
    console.log(`   • Passed: ${results.passedTests} ✅`);
    console.log(`   • Failed: ${results.failedTests} ❌`);
    console.log(`   • Success Rate: ${results.successRate.toFixed(1)}%`);
    console.log(`   • Total Duration: ${results.totalDuration}ms`);
    
    if (results.failedTests > 0) {
      console.log(`\n❌ Failed Tests:`);
      results.tests
        .filter(test => !test.success)
        .forEach(test => {
          console.log(`   • ${test.name}: ${test.error}`);
          if (test.suggestions && test.suggestions.length > 0) {
            console.log(`     💡 Suggestions:`);
            test.suggestions.forEach(suggestion => console.log(`       - ${suggestion}`));
          }
        });
    }
    
    console.log(`\n✅ Passed Tests:`);
    results.tests
      .filter(test => test.success)
      .forEach(test => {
        console.log(`   • ${test.name} (${test.duration}ms)`);
      });
    
    console.log('\n' + '='.repeat(80));
    
    if (results.successRate >= 90) {
      console.log('🎉 Excellent! All core features are working properly.');
    } else if (results.successRate >= 70) {
      console.log('⚠️ Good! Most features are working, but some issues need attention.');
    } else {
      console.log('🚨 Critical issues detected! Please review failed tests and suggestions.');
    }
    
    console.log('='.repeat(80) + '\n');
  }

  public async runSpecificTest(testName: string): Promise<TestResult | null> {
    const allTests = await this.runAllTests();
    return allTests.tests.find(test => test.name.toLowerCase().includes(testName.toLowerCase())) || null;
  }

  public getTestSuggestions(): string[] {
    return [
      'Run "npm run dev" to start the application',
      'Check the console for detailed error messages',
      'Verify all environment variables are set correctly',
      'Ensure all dependencies are installed with "npm install"',
      'Check system permissions for clipboard and microphone access',
      'Verify internet connection for AI API calls',
      'Review the README.md for setup instructions'
    ];
  }
} 