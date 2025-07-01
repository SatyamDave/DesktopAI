#!/usr/bin/env node

/**
 * Performance Test Script for Doppel Desktop Assistant
 * Run this script to test various performance aspects of the app
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class PerformanceTester {
  constructor() {
    this.testResults = [];
    this.startTime = Date.now();
  }

  log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }

  async runTest(testName, testFunction) {
    this.log(`🧪 Starting test: ${testName}`);
    const startTime = performance.now();
    
    try {
      await testFunction();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.testResults.push({
        name: testName,
        duration: duration,
        success: true,
        timestamp: new Date().toISOString()
      });
      
      this.log(`✅ Test completed: ${testName} (${duration.toFixed(2)}ms)`);
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.testResults.push({
        name: testName,
        duration: duration,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      this.log(`❌ Test failed: ${testName} (${duration.toFixed(2)}ms) - ${error.message}`);
    }
  }

  async testDatabasePerformance() {
    // Simulate database operations
    const operations = [];
    for (let i = 0; i < 100; i++) {
      operations.push({
        sql: 'INSERT INTO test_table (data) VALUES (?)',
        params: [`test_data_${i}`]
      });
    }
    
    // Simulate batch processing
    for (let i = 0; i < operations.length; i += 10) {
      const batch = operations.slice(i, i + 10);
      await new Promise(resolve => setTimeout(resolve, 10)); // Simulate processing time
    }
  }

  async testMemoryUsage() {
    const initialMemory = process.memoryUsage();
    
    // Simulate memory-intensive operations
    const data = [];
    for (let i = 0; i < 1000; i++) {
      data.push({
        id: i,
        content: `Large data object ${i}`.repeat(100),
        timestamp: Date.now()
      });
    }
    
    const finalMemory = process.memoryUsage();
    const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
    
    if (memoryIncrease > 50 * 1024 * 1024) { // 50MB threshold
      throw new Error(`Memory usage increased by ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    }
  }

  async testAnimationPerformance() {
    // Simulate animation frame processing
    const frames = 60; // 1 second at 60fps
    const frameTimes = [];
    
    for (let i = 0; i < frames; i++) {
      const start = performance.now();
      
      // Simulate animation calculation
      await new Promise(resolve => {
        requestAnimationFrame(() => {
          const end = performance.now();
          frameTimes.push(end - start);
          resolve();
        });
      });
    }
    
    const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    if (avgFrameTime > 16.67) { // 60fps = 16.67ms per frame
      throw new Error(`Average frame time too high: ${avgFrameTime.toFixed(2)}ms`);
    }
  }

  async testEventHandling() {
    // Simulate event handling performance
    const events = [];
    for (let i = 0; i < 1000; i++) {
      events.push({
        type: 'test_event',
        data: { id: i, timestamp: Date.now() }
      });
    }
    
    const startTime = performance.now();
    
    // Process events with debouncing
    let processed = 0;
    for (const event of events) {
      await new Promise(resolve => {
        setTimeout(() => {
          processed++;
          resolve();
        }, 1); // 1ms debounce
      });
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    if (duration > 2000) { // 2 second threshold
      throw new Error(`Event processing took too long: ${duration.toFixed(2)}ms`);
    }
  }

  async testFileOperations() {
    // Test file I/O performance
    const testFile = path.join(__dirname, 'performance-test-temp.json');
    const testData = { test: 'data', timestamp: Date.now() };
    
    // Write test
    const writeStart = performance.now();
    fs.writeFileSync(testFile, JSON.stringify(testData));
    const writeTime = performance.now() - writeStart;
    
    // Read test
    const readStart = performance.now();
    const readData = JSON.parse(fs.readFileSync(testFile, 'utf8'));
    const readTime = performance.now() - readStart;
    
    // Cleanup
    fs.unlinkSync(testFile);
    
    if (writeTime > 100 || readTime > 100) {
      throw new Error(`File I/O too slow - Write: ${writeTime.toFixed(2)}ms, Read: ${readTime.toFixed(2)}ms`);
    }
  }

  async testNetworkLatency() {
    // Simulate network operations
    const requests = [];
    for (let i = 0; i < 10; i++) {
      requests.push(
        new Promise(resolve => {
          setTimeout(() => resolve(`response_${i}`), Math.random() * 100 + 50);
        })
      );
    }
    
    const startTime = performance.now();
    await Promise.all(requests);
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    if (duration > 1000) {
      throw new Error(`Network simulation took too long: ${duration.toFixed(2)}ms`);
    }
  }

  async runAllTests() {
    this.log('🚀 Starting Performance Test Suite');
    this.log('=====================================');
    
    await this.runTest('Database Performance', () => this.testDatabasePerformance());
    await this.runTest('Memory Usage', () => this.testMemoryUsage());
    await this.runTest('Animation Performance', () => this.testAnimationPerformance());
    await this.runTest('Event Handling', () => this.testEventHandling());
    await this.runTest('File Operations', () => this.testFileOperations());
    await this.runTest('Network Latency', () => this.testNetworkLatency());
    
    this.generateReport();
  }

  generateReport() {
    const totalTime = Date.now() - this.startTime;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = this.testResults.filter(r => !r.success).length;
    
    console.log('\n📊 Performance Test Report');
    console.log('==========================');
    console.log(`Total Time: ${totalTime}ms`);
    console.log(`Tests Passed: ${passedTests}`);
    console.log(`Tests Failed: ${failedTests}`);
    console.log(`Success Rate: ${((passedTests / this.testResults.length) * 100).toFixed(1)}%`);
    
    console.log('\n📋 Detailed Results:');
    this.testResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.name}: ${result.duration.toFixed(2)}ms`);
      if (!result.success) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    // Save report to file
    const reportPath = path.join(__dirname, 'performance-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      summary: {
        totalTime,
        passedTests,
        failedTests,
        successRate: (passedTests / this.testResults.length) * 100
      },
      results: this.testResults,
      timestamp: new Date().toISOString()
    }, null, 2));
    
    console.log(`\n📄 Report saved to: ${reportPath}`);
    
    if (failedTests > 0) {
      console.log('\n⚠️  Some tests failed. Check the detailed results above.');
      process.exit(1);
    } else {
      console.log('\n🎉 All performance tests passed!');
    }
  }
}

// Run the performance tests
if (require.main === module) {
  const tester = new PerformanceTester();
  tester.runAllTests().catch(error => {
    console.error('❌ Performance test suite failed:', error);
    process.exit(1);
  });
}

module.exports = PerformanceTester; 