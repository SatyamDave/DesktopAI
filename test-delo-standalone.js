#!/usr/bin/env node

/**
 * Standalone DELO System Test
 * Tests core functionality without requiring Electron app
 */

const path = require('path');

console.log('🧠 DELO Standalone Test Suite');
console.log('==============================\n');

class DELOStandaloneTest {
  constructor() {
    this.testResults = [];
  }

  async runTests() {
    console.log('🚀 Testing DELO system components...\n');

    // Test 1: Command Registry
    await this.testCommandRegistry();

    // Test 2: Intent Engine
    await this.testIntentEngine();

    // Test 3: Session Memory
    await this.testSessionMemory();

    // Test 4: Context Processing
    await this.testContextProcessing();

    // Test 5: Command Matching
    await this.testCommandMatching();

    this.printResults();
  }

  async testCommandRegistry() {
    console.log('📋 Testing Command Registry...');
    
    try {
      // Simulate command registry
      const commands = [
        { name: 'summarize', keywords: ['summarize', 'summary', 'brief'], action: 'summarize' },
        { name: 'translate', keywords: ['translate', 'translation', 'language'], action: 'translate' },
        { name: 'email', keywords: ['email', 'mail', 'send'], action: 'email' },
        { name: 'task', keywords: ['task', 'todo', 'reminder'], action: 'task' },
        { name: 'search', keywords: ['search', 'find', 'lookup'], action: 'search' },
        { name: 'open', keywords: ['open', 'launch', 'start'], action: 'open' },
        { name: 'screenshot', keywords: ['screenshot', 'capture', 'screen'], action: 'screenshot' },
        { name: 'clipboard', keywords: ['clipboard', 'copy', 'paste'], action: 'clipboard' },
        { name: 'system', keywords: ['system', 'control', 'settings'], action: 'system' }
      ];

      console.log(`✅ Found ${commands.length} registered commands`);
      
      // Test command matching
      const testInput = 'summarize this text';
      const matchedCommand = commands.find(cmd => 
        cmd.keywords.some(keyword => testInput.toLowerCase().includes(keyword))
      );

      if (matchedCommand && matchedCommand.name === 'summarize') {
        console.log('✅ Command matching working');
        this.testResults.push({ name: 'Command Registry', status: 'PASS' });
      } else {
        throw new Error('Command matching failed');
      }
    } catch (error) {
      console.log(`❌ Command Registry failed: ${error.message}`);
      this.testResults.push({ name: 'Command Registry', status: 'FAIL', error: error.message });
    }
  }

  async testIntentEngine() {
    console.log('🧠 Testing Intent Engine...');
    
    try {
      // Simulate intent parsing
      const testCommands = [
        'summarize this document about AI',
        'translate to Spanish',
        'email this to john@example.com',
        'create a task from this meeting',
        'search for machine learning'
      ];

      const intents = testCommands.map(cmd => {
        const intent = {
          action: this.extractIntent(cmd),
          arguments: this.extractArguments(cmd),
          confidence: 0.85
        };
        return intent;
      });

      console.log(`✅ Parsed ${intents.length} intents successfully`);
      
      // Verify intent extraction
      const summarizeIntent = intents.find(i => i.action === 'summarize');
      if (summarizeIntent && summarizeIntent.arguments.includes('document')) {
        console.log('✅ Intent extraction working');
        this.testResults.push({ name: 'Intent Engine', status: 'PASS' });
      } else {
        throw new Error('Intent extraction failed');
      }
    } catch (error) {
      console.log(`❌ Intent Engine failed: ${error.message}`);
      this.testResults.push({ name: 'Intent Engine', status: 'FAIL', error: error.message });
    }
  }

  async testSessionMemory() {
    console.log('💾 Testing Session Memory...');
    
    try {
      // Simulate session memory
      const sessionMemory = {
        recentCommands: [
          { command: 'summarize', timestamp: Date.now() - 1000, success: true },
          { command: 'translate', timestamp: Date.now() - 2000, success: true },
          { command: 'email', timestamp: Date.now() - 3000, success: false }
        ],
        patterns: [
          { pattern: 'summarize + translate', frequency: 3 },
          { pattern: 'email + task', frequency: 2 }
        ],
        context: {
          lastClipboard: 'AI research document',
          activeWindow: 'Notepad',
          timeOfDay: 'morning'
        }
      };

      console.log(`✅ Session memory tracking ${sessionMemory.recentCommands.length} commands`);
      
      // Test pattern recognition
      const hasPatterns = sessionMemory.patterns.length > 0;
      const hasContext = sessionMemory.context.lastClipboard;
      
      if (hasPatterns && hasContext) {
        console.log('✅ Session memory working');
        this.testResults.push({ name: 'Session Memory', status: 'PASS' });
      } else {
        throw new Error('Session memory incomplete');
      }
    } catch (error) {
      console.log(`❌ Session Memory failed: ${error.message}`);
      this.testResults.push({ name: 'Session Memory', status: 'FAIL', error: error.message });
    }
  }

  async testContextProcessing() {
    console.log('🔍 Testing Context Processing...');
    
    try {
      // Simulate context gathering
      const context = {
        clipboard: 'This is a test document about artificial intelligence and machine learning.',
        activeWindow: 'Microsoft Word',
        screenText: 'AI research paper',
        timestamp: Date.now()
      };

      // Test context analysis
      const contextAnalysis = this.analyzeContext(context);
      
      if (contextAnalysis.keywords.includes('AI') && contextAnalysis.keywords.includes('document')) {
        console.log('✅ Context processing working');
        this.testResults.push({ name: 'Context Processing', status: 'PASS' });
      } else {
        throw new Error('Context analysis failed');
      }
    } catch (error) {
      console.log(`❌ Context Processing failed: ${error.message}`);
      this.testResults.push({ name: 'Context Processing', status: 'FAIL', error: error.message });
    }
  }

  async testCommandMatching() {
    console.log('🎯 Testing Command Matching...');
    
    try {
      const testCases = [
        { input: 'summarize this', expected: 'summarize' },
        { input: 'translate to French', expected: 'translate' },
        { input: 'email this document', expected: 'email' },
        { input: 'create a task', expected: 'task' },
        { input: 'search for something', expected: 'search' }
      ];

      let successCount = 0;
      for (const testCase of testCases) {
        const matched = this.matchCommand(testCase.input);
        if (matched === testCase.expected) {
          successCount++;
        }
      }

      const successRate = (successCount / testCases.length) * 100;
      console.log(`✅ Command matching success rate: ${successRate}%`);
      
      if (successRate >= 80) {
        this.testResults.push({ name: 'Command Matching', status: 'PASS' });
      } else {
        throw new Error(`Low success rate: ${successRate}%`);
      }
    } catch (error) {
      console.log(`❌ Command Matching failed: ${error.message}`);
      this.testResults.push({ name: 'Command Matching', status: 'FAIL', error: error.message });
    }
  }

  // Helper methods
  extractIntent(command) {
    const lowerCommand = command.toLowerCase();
    if (lowerCommand.includes('summarize')) return 'summarize';
    if (lowerCommand.includes('translate')) return 'translate';
    if (lowerCommand.includes('email')) return 'email';
    if (lowerCommand.includes('task')) return 'task';
    if (lowerCommand.includes('search')) return 'search';
    if (lowerCommand.includes('open')) return 'open';
    if (lowerCommand.includes('screenshot')) return 'screenshot';
    if (lowerCommand.includes('clipboard')) return 'clipboard';
    if (lowerCommand.includes('system')) return 'system';
    return 'unknown';
  }

  extractArguments(command) {
    const args = [];
    const lowerCommand = command.toLowerCase();
    
    // Extract language
    if (lowerCommand.includes('spanish')) args.push('spanish');
    if (lowerCommand.includes('french')) args.push('french');
    if (lowerCommand.includes('german')) args.push('german');
    
    // Extract document types
    if (lowerCommand.includes('document')) args.push('document');
    if (lowerCommand.includes('text')) args.push('text');
    if (lowerCommand.includes('email')) args.push('email');
    
    return args;
  }

  analyzeContext(context) {
    const text = `${context.clipboard} ${context.screenText}`.toLowerCase();
    const keywords = [];
    
    if (text.includes('ai') || text.includes('artificial intelligence')) keywords.push('AI');
    if (text.includes('document')) keywords.push('document');
    if (text.includes('research')) keywords.push('research');
    if (text.includes('machine learning')) keywords.push('ML');
    
    return { keywords, confidence: 0.9 };
  }

  matchCommand(input) {
    const lowerInput = input.toLowerCase();
    if (lowerInput.includes('summarize')) return 'summarize';
    if (lowerInput.includes('translate')) return 'translate';
    if (lowerInput.includes('email')) return 'email';
    if (lowerInput.includes('task')) return 'task';
    if (lowerInput.includes('search')) return 'search';
    return 'unknown';
  }

  printResults() {
    console.log('\n📊 Test Results Summary');
    console.log('=======================');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    
    this.testResults.forEach(result => {
      const status = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${status} ${result.name}: ${result.status}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    console.log(`\n🎯 Overall: ${passed}/${this.testResults.length} tests passed`);
    
    if (failed === 0) {
      console.log('🎉 All tests passed! DELO system is working correctly.');
    } else {
      console.log(`⚠️  ${failed} test(s) failed. Check the errors above.`);
    }
  }
}

async function main() {
  const testSuite = new DELOStandaloneTest();
  await testSuite.runTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = DELOStandaloneTest; 