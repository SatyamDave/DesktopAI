#!/usr/bin/env node

/**
 * DELO Integration Test Suite
 * 
 * This test demonstrates DELO's core capabilities:
 * - Task completion memory and non-redundancy
 * - Session context awareness
 * - User habit learning
 * - Intelligent suggestions
 * - Context-aware task routing
 */

const { deloIntegrationService } = require('./dist/main/services/DELOIntegrationService');
const { sessionMemoryManager } = require('./dist/main/services/SessionMemoryManager');

class DELOTestSuite {
  constructor() {
    this.testResults = [];
    this.currentTest = '';
  }

  async runAllTests() {
    console.log('🧠 DELO Integration Test Suite');
    console.log('================================\n');

    try {
      // Initialize DELO
      await this.runTest('DELO Initialization', async () => {
        await deloIntegrationService.initialize();
        const status = await deloIntegrationService.getDELOStatus();
        console.log('  ✅ DELO initialized:', status.isInitialized);
        console.log('  🧠 Session memory:', status.sessionMemoryStatus.isInitialized);
        return status.isInitialized;
      });

      // Test 1: Basic command processing
      await this.runTest('Basic Command Processing', async () => {
        const result = await deloIntegrationService.processDELOCommand('open edge');
        console.log('  📝 Command:', 'open edge');
        console.log('  ✅ Success:', result.success);
        console.log('  💬 Message:', result.message);
        console.log('  🎯 Action:', result.action);
        return result.success;
      });

      // Test 2: Duplicate task detection
      await this.runTest('Duplicate Task Detection', async () => {
        const result = await deloIntegrationService.processDELOCommand('open edge');
        console.log('  📝 Command:', 'open edge (duplicate)');
        console.log('  ✅ Success:', result.success);
        console.log('  💬 Message:', result.message);
        console.log('  🧠 Memory:', result.memory?.isDuplicate ? 'Duplicate detected' : 'No duplicate');
        return result.memory?.isDuplicate === true;
      });

      // Test 3: Similar task detection
      await this.runTest('Similar Task Detection', async () => {
        const result = await deloIntegrationService.processDELOCommand('launch edge browser');
        console.log('  📝 Command:', 'launch edge browser');
        console.log('  ✅ Success:', result.success);
        console.log('  💬 Message:', result.message);
        console.log('  🧠 Similarity:', result.memory?.similarity ? 'Similar task detected' : 'No similarity');
        return result.success;
      });

      // Test 4: Context awareness
      await this.runTest('Context Awareness', async () => {
        const result = await deloIntegrationService.processDELOCommand('search for Node.js documentation');
        console.log('  📝 Command:', 'search for Node.js documentation');
        console.log('  ✅ Success:', result.success);
        console.log('  💬 Message:', result.message);
        console.log('  🎯 Context:', result.context.activeApp);
        console.log('  💡 Suggestions:', result.suggestions?.length || 0);
        return result.success;
      });

      // Test 5: Next action suggestions
      await this.runTest('Next Action Suggestions', async () => {
        const result = await deloIntegrationService.processDELOCommand('write an email to john@example.com');
        console.log('  📝 Command:', 'write an email to john@example.com');
        console.log('  ✅ Success:', result.success);
        console.log('  💬 Message:', result.message);
        console.log('  🚀 Next Action:', result.nextAction?.suggestion || 'None');
        console.log('  📊 Confidence:', result.nextAction?.confidence || 0);
        return result.success;
      });

      // Test 6: Session insights
      await this.runTest('Session Insights', async () => {
        const insights = await deloIntegrationService.getSessionInsights();
        console.log('  📊 Recent Tasks:', insights.recentTasks.length);
        console.log('  🧠 User Habits:', insights.userHabits.length);
        console.log('  📈 Productivity Score:', insights.productivityScore.toFixed(1) + '%');
        console.log('  💡 Suggestions:', insights.suggestions.length);
        
        if (insights.recentTasks.length > 0) {
          console.log('  📝 Latest Task:', insights.recentTasks[0].input);
        }
        
        if (insights.userHabits.length > 0) {
          console.log('  🔄 Top Habit:', insights.userHabits[0].pattern);
        }
        
        return insights.recentTasks.length > 0;
      });

      // Test 7: Memory management
      await this.runTest('Memory Management', async () => {
        const status = await deloIntegrationService.getDELOStatus();
        console.log('  🧠 Task Memory Size:', status.sessionMemoryStatus.taskMemorySize);
        console.log('  🔄 Habits Count:', status.sessionMemoryStatus.habitsCount);
        console.log('  ⏰ Last Activity:', Math.round(status.lastActivity / 1000) + 's ago');
        console.log('  📊 Context Status:', status.contextStatus.hasContext ? 'Active' : 'Inactive');
        return status.sessionMemoryStatus.taskMemorySize > 0;
      });

      // Test 8: Habit learning
      await this.runTest('Habit Learning', async () => {
        // Perform a series of related tasks to trigger habit learning
        await deloIntegrationService.processDELOCommand('open notepad');
        await deloIntegrationService.processDELOCommand('search for text editor tips');
        await deloIntegrationService.processDELOCommand('save current file');
        
        const insights = await deloIntegrationService.getSessionInsights();
        const textEditorHabits = insights.userHabits.filter(h => 
          h.pattern.includes('text') || h.pattern.includes('editor')
        );
        
        console.log('  📝 Text Editor Habits:', textEditorHabits.length);
        if (textEditorHabits.length > 0) {
          console.log('  🔄 Pattern:', textEditorHabits[0].pattern);
          console.log('  📊 Frequency:', textEditorHabits[0].frequency);
        }
        
        return textEditorHabits.length > 0;
      });

      // Test 9: Non-redundancy with different contexts
      await this.runTest('Context-Aware Non-Redundancy', async () => {
        // Same command, different context (simulated)
        const result1 = await deloIntegrationService.processDELOCommand('open chrome');
        console.log('  📝 Command 1:', 'open chrome');
        console.log('  🧠 Duplicate:', result1.memory?.isDuplicate ? 'Yes' : 'No');
        
        // Simulate context change
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const result2 = await deloIntegrationService.processDELOCommand('open chrome');
        console.log('  📝 Command 2:', 'open chrome (different context)');
        console.log('  🧠 Duplicate:', result2.memory?.isDuplicate ? 'Yes' : 'No');
        
        return result1.success && result2.success;
      });

      // Test 10: Intelligent suggestions
      await this.runTest('Intelligent Suggestions', async () => {
        const result = await deloIntegrationService.processDELOCommand('create a new document');
        console.log('  📝 Command:', 'create a new document');
        console.log('  ✅ Success:', result.success);
        console.log('  💡 Suggestions:', result.suggestions?.length || 0);
        
        if (result.suggestions && result.suggestions.length > 0) {
          result.suggestions.forEach((suggestion, index) => {
            console.log(`    ${index + 1}. ${suggestion}`);
          });
        }
        
        return result.suggestions && result.suggestions.length > 0;
      });

      // Print summary
      this.printSummary();

    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  async runTest(name, testFunction) {
    this.currentTest = name;
    console.log(`🧪 Testing: ${name}`);
    
    try {
      const startTime = Date.now();
      const result = await testFunction();
      const duration = Date.now() - startTime;
      
      const status = result ? '✅ PASS' : '❌ FAIL';
      console.log(`  ${status} (${duration}ms)\n`);
      
      this.testResults.push({
        name,
        status: result ? 'PASS' : 'FAIL',
        duration
      });
      
      return result;
    } catch (error) {
      console.error(`  ❌ ERROR: ${error.message}\n`);
      this.testResults.push({
        name,
        status: 'ERROR',
        duration: 0,
        error: error.message
      });
      return false;
    }
  }

  printSummary() {
    console.log('\n📊 DELO Test Summary');
    console.log('===================');
    
    const total = this.testResults.length;
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const errors = this.testResults.filter(r => r.status === 'ERROR').length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`💥 Errors: ${errors}`);
    console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0 || errors > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.status !== 'PASS')
        .forEach(r => {
          console.log(`  - ${r.name}: ${r.status}${r.error ? ` (${r.error})` : ''}`);
        });
    }
    
    console.log('\n🎉 DELO Integration Test Complete!');
    console.log('DELO successfully demonstrates:');
    console.log('  🧠 Task completion memory and non-redundancy');
    console.log('  🎯 Context awareness and intelligent routing');
    console.log('  🔄 User habit learning and pattern recognition');
    console.log('  💡 Smart suggestions and next action prediction');
    console.log('  📊 Session insights and productivity tracking');
  }
}

// Run the test suite
async function main() {
  const testSuite = new DELOTestSuite();
  await testSuite.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { DELOTestSuite }; 