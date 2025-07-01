#!/usr/bin/env node

/**
 * Enhanced Features Test Suite
 * Tests all enhanced services and features
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting Enhanced Features Test Suite...\n');

// Test configuration
const TEST_CONFIG = {
  timeout: 30000,
  verbose: true,
  testCases: [
    // Browser automation tests
    {
      name: 'Enhanced Browser Automation',
      tests: [
        { input: 'open google.com', expected: 'success' },
        { input: 'search for javascript tutorials', expected: 'success' },
        { input: 'open youtube and search for music', expected: 'success' },
        { input: 'open gmail compose', expected: 'success' }
      ]
    },
    // AI prompting tests
    {
      name: 'Enhanced AI Prompting',
      tests: [
        { input: 'write a professional email', expected: 'success' },
        { input: 'create a meeting summary', expected: 'success' },
        { input: 'draft a project proposal', expected: 'success' },
        { input: 'generate code documentation', expected: 'success' }
      ]
    },
    // Command processing tests
    {
      name: 'Enhanced Command Processing',
      tests: [
        { input: 'open browser and search for news', expected: 'success' },
        { input: 'compose email and open gmail', expected: 'success' },
        { input: 'search youtube and open first result', expected: 'success' },
        { input: 'open multiple tabs with different sites', expected: 'success' }
      ]
    },
    // Fallback handling tests
    {
      name: 'Fallback Handling',
      tests: [
        { input: 'open nonexistent-browser', expected: 'fallback' },
        { input: 'search on invalid-engine', expected: 'fallback' },
        { input: 'open invalid-url', expected: 'fallback' }
      ]
    },
    // Natural language tests
    {
      name: 'Natural Language Processing',
      tests: [
        { input: 'I want to watch some videos on YouTube', expected: 'success' },
        { input: 'Can you help me write an email to my boss?', expected: 'success' },
        { input: 'I need to research something on the internet', expected: 'success' },
        { input: 'Show me the latest news', expected: 'success' }
      ]
    }
  ]
};

// Test results tracking
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: [],
  details: []
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test execution functions
async function executeCommand(command) {
  return new Promise((resolve, reject) => {
    const child = spawn('node', ['test-command.js', command], {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: TEST_CONFIG.timeout
    });

    let output = '';
    let error = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      error += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output, error });
      } else {
        reject({ success: false, output, error, code });
      }
    });

    child.on('error', (err) => {
      reject({ success: false, error: err.message });
    });
  });
}

async function testEnhancedBrowserAutomation() {
  log('Testing Enhanced Browser Automation Service...', 'info');
  
  const tests = [
    {
      name: 'Browser Detection',
      command: 'test-browser-detection',
      expected: 'success'
    },
    {
      name: 'URL Opening',
      command: 'open https://www.google.com',
      expected: 'success'
    },
    {
      name: 'Search Functionality',
      command: 'search for enhanced browser automation',
      expected: 'success'
    },
    {
      name: 'Natural Language Command',
      command: 'open a website about artificial intelligence',
      expected: 'success'
    },
    {
      name: 'Fallback Handling',
      command: 'open nonexistent-browser',
      expected: 'fallback'
    }
  ];

  for (const test of tests) {
    testResults.total++;
    try {
      log(`Running: ${test.name}`, 'info');
      const result = await executeCommand(test.command);
      
      if (result.success) {
        log(`✅ ${test.name} - PASSED`, 'success');
        testResults.passed++;
        testResults.details.push({
          test: test.name,
          status: 'PASSED',
          output: result.output
        });
      } else {
        log(`❌ ${test.name} - FAILED: ${result.error}`, 'error');
        testResults.failed++;
        testResults.errors.push(`${test.name}: ${result.error}`);
        testResults.details.push({
          test: test.name,
          status: 'FAILED',
          error: result.error
        });
      }
    } catch (error) {
      log(`❌ ${test.name} - ERROR: ${error.message}`, 'error');
      testResults.failed++;
      testResults.errors.push(`${test.name}: ${error.message}`);
      testResults.details.push({
        test: test.name,
        status: 'ERROR',
        error: error.message
      });
    }
    
    await sleep(1000); // Wait between tests
  }
}

async function testEnhancedAIPrompting() {
  log('Testing Enhanced AI Prompting Service...', 'info');
  
  const tests = [
    {
      name: 'Intent Analysis',
      command: 'analyze-intent write a professional email',
      expected: 'success'
    },
    {
      name: 'Prompt Generation',
      command: 'generate-prompt email professional',
      expected: 'success'
    },
    {
      name: 'Context Awareness',
      command: 'contextualize-prompt meeting summary',
      expected: 'success'
    },
    {
      name: 'Template Management',
      command: 'list-templates',
      expected: 'success'
    },
    {
      name: 'Smart Suggestions',
      command: 'get-suggestions draft proposal',
      expected: 'success'
    }
  ];

  for (const test of tests) {
    testResults.total++;
    try {
      log(`Running: ${test.name}`, 'info');
      const result = await executeCommand(test.command);
      
      if (result.success) {
        log(`✅ ${test.name} - PASSED`, 'success');
        testResults.passed++;
        testResults.details.push({
          test: test.name,
          status: 'PASSED',
          output: result.output
        });
      } else {
        log(`❌ ${test.name} - FAILED: ${result.error}`, 'error');
        testResults.failed++;
        testResults.errors.push(`${test.name}: ${result.error}`);
        testResults.details.push({
          test: test.name,
          status: 'FAILED',
          error: result.error
        });
      }
    } catch (error) {
      log(`❌ ${test.name} - ERROR: ${error.message}`, 'error');
      testResults.failed++;
      testResults.errors.push(`${test.name}: ${error.message}`);
      testResults.details.push({
        test: test.name,
        status: 'ERROR',
        error: error.message
      });
    }
    
    await sleep(1000);
  }
}

async function testEnhancedCommandProcessing() {
  log('Testing Enhanced Command Processing...', 'info');
  
  const tests = [
    {
      name: 'Command Routing',
      command: 'route-command open browser and search',
      expected: 'success'
    },
    {
      name: 'Hybrid Commands',
      command: 'process-hybrid compose email and open gmail',
      expected: 'success'
    },
    {
      name: 'Fallback Decision Tree',
      command: 'test-fallback-chain',
      expected: 'success'
    },
    {
      name: 'Context Preservation',
      command: 'test-context-preservation',
      expected: 'success'
    },
    {
      name: 'Performance Metrics',
      command: 'get-command-metrics',
      expected: 'success'
    }
  ];

  for (const test of tests) {
    testResults.total++;
    try {
      log(`Running: ${test.name}`, 'info');
      const result = await executeCommand(test.command);
      
      if (result.success) {
        log(`✅ ${test.name} - PASSED`, 'success');
        testResults.passed++;
        testResults.details.push({
          test: test.name,
          status: 'PASSED',
          output: result.output
        });
      } else {
        log(`❌ ${test.name} - FAILED: ${result.error}`, 'error');
        testResults.failed++;
        testResults.errors.push(`${test.name}: ${result.error}`);
        testResults.details.push({
          test: test.name,
          status: 'FAILED',
          error: result.error
        });
      }
    } catch (error) {
      log(`❌ ${test.name} - ERROR: ${error.message}`, 'error');
      testResults.failed++;
      testResults.errors.push(`${test.name}: ${error.message}`);
      testResults.details.push({
        test: test.name,
        status: 'ERROR',
        error: error.message
      });
    }
    
    await sleep(1000);
  }
}

async function testIntegration() {
  log('Testing Integration Features...', 'info');
  
  const tests = [
    {
      name: 'End-to-End Workflow',
      command: 'test-workflow compose email and open browser',
      expected: 'success'
    },
    {
      name: 'Analytics Collection',
      command: 'test-analytics',
      expected: 'success'
    },
    {
      name: 'Performance Monitoring',
      command: 'test-performance',
      expected: 'success'
    },
    {
      name: 'Error Handling',
      command: 'test-error-handling',
      expected: 'success'
    },
    {
      name: 'User Experience',
      command: 'test-ux-features',
      expected: 'success'
    }
  ];

  for (const test of tests) {
    testResults.total++;
    try {
      log(`Running: ${test.name}`, 'info');
      const result = await executeCommand(test.command);
      
      if (result.success) {
        log(`✅ ${test.name} - PASSED`, 'success');
        testResults.passed++;
        testResults.details.push({
          test: test.name,
          status: 'PASSED',
          output: result.output
        });
      } else {
        log(`❌ ${test.name} - FAILED: ${result.error}`, 'error');
        testResults.failed++;
        testResults.errors.push(`${test.name}: ${result.error}`);
        testResults.details.push({
          test: test.name,
          status: 'FAILED',
          error: result.error
        });
      }
    } catch (error) {
      log(`❌ ${test.name} - ERROR: ${error.message}`, 'error');
      testResults.failed++;
      testResults.errors.push(`${test.name}: ${error.message}`);
      testResults.details.push({
        test: test.name,
        status: 'ERROR',
        error: error.message
      });
    }
    
    await sleep(1000);
  }
}

function generateReport() {
  log('\n📊 Test Results Summary', 'info');
  log('=' * 50, 'info');
  
  const successRate = ((testResults.passed / testResults.total) * 100).toFixed(2);
  
  log(`Total Tests: ${testResults.total}`, 'info');
  log(`Passed: ${testResults.passed}`, 'success');
  log(`Failed: ${testResults.failed}`, testResults.failed > 0 ? 'error' : 'info');
  log(`Success Rate: ${successRate}%`, successRate >= 80 ? 'success' : 'warning');
  
  if (testResults.errors.length > 0) {
    log('\n❌ Errors:', 'error');
    testResults.errors.forEach((error, index) => {
      log(`${index + 1}. ${error}`, 'error');
    });
  }
  
  log('\n📋 Detailed Results:', 'info');
  testResults.details.forEach((detail, index) => {
    const status = detail.status === 'PASSED' ? '✅' : '❌';
    log(`${index + 1}. ${status} ${detail.test}`, detail.status === 'PASSED' ? 'success' : 'error');
    if (detail.error) {
      log(`   Error: ${detail.error}`, 'error');
    }
  });
  
  // Save detailed report
  const reportPath = path.join(__dirname, 'enhanced-test-report.json');
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      successRate: parseFloat(successRate)
    },
    details: testResults.details,
    errors: testResults.errors
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`\n📄 Detailed report saved to: ${reportPath}`, 'info');
  
  return successRate >= 80;
}

// Main test execution
async function runTests() {
  try {
    log('🚀 Starting Enhanced Features Test Suite...', 'info');
    
    // Test each service
    await testEnhancedBrowserAutomation();
    await sleep(2000);
    
    await testEnhancedAIPrompting();
    await sleep(2000);
    
    await testEnhancedCommandProcessing();
    await sleep(2000);
    
    await testIntegration();
    await sleep(2000);
    
    // Generate report
    const success = generateReport();
    
    if (success) {
      log('\n🎉 All tests completed successfully!', 'success');
      process.exit(0);
    } else {
      log('\n⚠️ Some tests failed. Please review the errors above.', 'warning');
      process.exit(1);
    }
    
  } catch (error) {
    log(`❌ Test suite failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  testResults,
  generateReport
}; 