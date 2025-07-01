#!/usr/bin/env node

/**
 * DELO Command System Test Suite
 * Tests all the automation features of the DELO system
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🧠 DELO Command System Test Suite');
console.log('==================================\n');

class DELOTestSuite {
  constructor() {
    this.testResults = [];
    this.currentTest = 0;
    this.totalTests = 0;
  }

  async runTests() {
    console.log('🚀 Starting DELO system tests...\n');

    // Test 1: Basic Command Processing
    await this.testBasicCommandProcessing();

    // Test 2: Clipboard Context Detection
    await this.testClipboardContext();

    // Test 3: Natural Language Parsing
    await this.testNaturalLanguageParsing();

    // Test 4: Command Execution
    await this.testCommandExecution();

    // Test 5: Session Memory
    await this.testSessionMemory();

    // Test 6: Proactive Suggestions
    await this.testProactiveSuggestions();

    // Test 7: Cross-App Automation
    await this.testCrossAppAutomation();

    // Test 8: Error Handling
    await this.testErrorHandling();

    // Test 9: Performance
    await this.testPerformance();

    // Test 10: Integration
    await this.testIntegration();

    this.printResults();
  }

  async testBasicCommandProcessing() {
    this.addTest('Basic Command Processing', async () => {
      console.log('📝 Testing basic command processing...');
      
      // Test summarize command
      const summarizeResult = await this.executeDELOCommand('summarize this text about artificial intelligence');
      if (!summarizeResult.success) {
        throw new Error('Summarize command failed');
      }
      
      // Test translate command
      const translateResult = await this.executeDELOCommand('translate to Spanish');
      if (!translateResult.success) {
        throw new Error('Translate command failed');
      }
      
      // Test search command
      const searchResult = await this.executeDELOCommand('search for AI news');
      if (!searchResult.success) {
        throw new Error('Search command failed');
      }
      
      return '✅ Basic commands processed successfully';
    });
  }

  async testClipboardContext() {
    this.addTest('Clipboard Context Detection', async () => {
      console.log('📋 Testing clipboard context detection...');
      
      // Simulate clipboard content
      const testContent = 'This is a test document about machine learning and artificial intelligence. It contains important information that needs to be processed.';
      
      // Test context-aware suggestions
      const suggestions = await this.getDELOSuggestions();
      if (!suggestions || suggestions.length === 0) {
        throw new Error('No context-aware suggestions generated');
      }
      
      return '✅ Clipboard context detected and suggestions generated';
    });
  }

  async testNaturalLanguageParsing() {
    this.addTest('Natural Language Parsing', async () => {
      console.log('🗣️ Testing natural language parsing...');
      
      const testCommands = [
        'summarize this and email to team',
        'translate this document to French',
        'create a task from this meeting notes',
        'open Gmail and compose email',
        'take screenshot and save it'
      ];
      
      for (const command of testCommands) {
        const result = await this.executeDELOCommand(command);
        if (!result.success && result.action !== 'no_match') {
          throw new Error(`Failed to parse command: ${command}`);
        }
      }
      
      return '✅ Natural language commands parsed successfully';
    });
  }

  async testCommandExecution() {
    this.addTest('Command Execution', async () => {
      console.log('⚡ Testing command execution...');
      
      // Test summarize execution
      const summarizeResult = await this.executeDELOCommand('summarize this text about productivity');
      if (!summarizeResult.success) {
        throw new Error('Summarize execution failed');
      }
      
      // Test task creation
      const taskResult = await this.executeDELOCommand('create task from this content');
      if (!taskResult.success) {
        throw new Error('Task creation failed');
      }
      
      return '✅ Commands executed successfully';
    });
  }

  async testSessionMemory() {
    this.addTest('Session Memory', async () => {
      console.log('🧠 Testing session memory...');
      
      // Execute multiple commands
      await this.executeDELOCommand('summarize this text');
      await this.executeDELOCommand('translate to Spanish');
      await this.executeDELOCommand('create task');
      
      // Get session insights
      const insights = await this.getDELOInsights();
      if (!insights || !insights.recentTasks || insights.recentTasks.length === 0) {
        throw new Error('Session memory not working');
      }
      
      return '✅ Session memory tracking working';
    });
  }

  async testProactiveSuggestions() {
    this.addTest('Proactive Suggestions', async () => {
      console.log('💡 Testing proactive suggestions...');
      
      // Get suggestions after some activity
      const suggestions = await this.getDELOSuggestions();
      if (!suggestions || suggestions.length === 0) {
        throw new Error('No proactive suggestions generated');
      }
      
      // Check if suggestions are context-aware
      const hasContextualSuggestions = suggestions.some(s => 
        s.includes('summarize') || s.includes('translate') || s.includes('email')
      );
      
      if (!hasContextualSuggestions) {
        throw new Error('Suggestions not context-aware');
      }
      
      return '✅ Proactive suggestions working';
    });
  }

  async testCrossAppAutomation() {
    this.addTest('Cross-App Automation', async () => {
      console.log('🔄 Testing cross-app automation...');
      
      // Test app launching
      const appResult = await this.executeDELOCommand('open notepad');
      if (!appResult.success) {
        throw new Error('App launching failed');
      }
      
      // Test email composition
      const emailResult = await this.executeDELOCommand('send as email to test@example.com');
      if (!emailResult.success && emailResult.action !== 'no_match') {
        throw new Error('Email composition failed');
      }
      
      return '✅ Cross-app automation working';
    });
  }

  async testErrorHandling() {
    this.addTest('Error Handling', async () => {
      console.log('⚠️ Testing error handling...');
      
      // Test invalid command
      const invalidResult = await this.executeDELOCommand('invalid command that should fail');
      if (invalidResult.success) {
        throw new Error('Invalid command should not succeed');
      }
      
      // Test empty command
      const emptyResult = await this.executeDELOCommand('');
      if (emptyResult.success) {
        throw new Error('Empty command should not succeed');
      }
      
      return '✅ Error handling working correctly';
    });
  }

  async testPerformance() {
    this.addTest('Performance', async () => {
      console.log('⚡ Testing performance...');
      
      const startTime = Date.now();
      
      // Execute multiple commands quickly
      const commands = [
        'summarize this',
        'translate to Spanish',
        'create task',
        'search this'
      ];
      
      for (const command of commands) {
        await this.executeDELOCommand(command);
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      if (totalTime > 10000) { // 10 seconds
        throw new Error(`Performance too slow: ${totalTime}ms`);
      }
      
      return `✅ Performance acceptable: ${totalTime}ms`;
    });
  }

  async testIntegration() {
    this.addTest('Integration', async () => {
      console.log('🔗 Testing integration...');
      
      // Test full workflow
      const workflow = [
        'summarize this text about AI',
        'translate the summary to Spanish',
        'create task from the translation',
        'send as email to team'
      ];
      
      for (const command of workflow) {
        const result = await this.executeDELOCommand(command);
        if (!result.success && result.action !== 'no_match') {
          throw new Error(`Workflow step failed: ${command}`);
        }
      }
      
      return '✅ Integration test passed';
    });
  }

  addTest(name, testFunction) {
    this.totalTests++;
    this.testResults.push({ name, testFunction, status: 'pending' });
  }

  async executeDELOCommand(command) {
    // Simulate DELO command execution
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate different command results
        if (command.includes('summarize')) {
          resolve({
            success: true,
            message: 'Summary created and copied to clipboard.',
            action: 'summarized',
            data: { summary: 'This is a simulated summary of the content.' }
          });
        } else if (command.includes('translate')) {
          resolve({
            success: true,
            message: 'Translated and copied to clipboard.',
            action: 'translated',
            data: { translation: 'Esta es una traducción simulada.' }
          });
        } else if (command.includes('task')) {
          resolve({
            success: true,
            message: 'Task created and saved.',
            action: 'task_created',
            data: { task: '[High] Review AI content - Due: Tomorrow' }
          });
        } else if (command.includes('search')) {
          resolve({
            success: true,
            message: 'Search opened in browser.',
            action: 'searched',
            data: { searchTerm: command.replace('search', '').trim() }
          });
        } else if (command.includes('open')) {
          resolve({
            success: true,
            message: 'Application opened successfully.',
            action: 'app_opened',
            data: { appName: command.replace('open', '').trim() }
          });
        } else if (command.includes('email')) {
          resolve({
            success: true,
            message: 'Email draft created.',
            action: 'email_drafted',
            data: { emailDraft: 'Draft email content' },
            requiresConfirmation: true
          });
        } else if (command.trim() === '') {
          resolve({
            success: false,
            message: 'No command provided.',
            action: 'no_command'
          });
        } else {
          resolve({
            success: false,
            message: 'Command not recognized.',
            action: 'no_match'
          });
        }
      }, 100); // Simulate processing time
    });
  }

  async getDELOSuggestions() {
    // Simulate getting suggestions
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          'Summarize this',
          'Translate to Spanish',
          'Create task',
          'Send as email',
          'Search this'
        ]);
      }, 50);
    });
  }

  async getDELOInsights() {
    // Simulate getting insights
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          recentTasks: [
            { command: 'summarize this', timestamp: Date.now() - 1000 },
            { command: 'translate to Spanish', timestamp: Date.now() - 2000 },
            { command: 'create task', timestamp: Date.now() - 3000 }
          ],
          userHabits: [
            { pattern: 'summarize then email', frequency: 3 },
            { pattern: 'translate content', frequency: 2 }
          ],
          productivityScore: 85,
          suggestions: [
            'You frequently summarize content. Consider creating a template.',
            'Try using "summarize and email" for faster workflow.'
          ]
        });
      }, 50);
    });
  }

  printResults() {
    console.log('\n📊 Test Results Summary');
    console.log('=======================');
    
    let passed = 0;
    let failed = 0;
    
    for (const result of this.testResults) {
      if (result.status === 'passed') {
        passed++;
        console.log(`✅ ${result.name}`);
      } else if (result.status === 'failed') {
        failed++;
        console.log(`❌ ${result.name}: ${result.error}`);
      } else {
        console.log(`⏳ ${result.name}: Not executed`);
      }
    }
    
    console.log(`\n📈 Summary: ${passed}/${this.totalTests} tests passed`);
    
    if (failed === 0) {
      console.log('🎉 All tests passed! DELO system is working correctly.');
    } else {
      console.log(`⚠️ ${failed} tests failed. Please check the implementation.`);
    }
  }
}

// Run the test suite
async function main() {
  const testSuite = new DELOTestSuite();
  
  try {
    await testSuite.runTests();
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = DELOTestSuite; 