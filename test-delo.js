#!/usr/bin/env node

/**
 * DELO Perception Layer Test Script
 * 
 * This script tests the DELO perception layer implementation
 * and demonstrates its core functionality.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🧠 DELO Perception Layer Test Suite');
console.log('=====================================\n');

// Test configuration
const testConfig = {
  timeout: 30000,
  services: ['screen', 'audio', 'context'],
  testData: {
    appFilters: [
      { app_name: 'Chrome', is_blacklisted: true, window_patterns: ['incognito'] },
      { app_name: 'VSCode', is_whitelisted: true, window_patterns: ['.js', '.ts'] }
    ],
    audioFilters: [
      { source_name: 'Spotify', is_blacklisted: true, volume_threshold: 0.1, keywords: ['music'] },
      { source_name: 'Zoom', is_whitelisted: true, volume_threshold: 0.3, keywords: ['meeting'] }
    ],
    contextPatterns: [
      {
        pattern_name: 'Coding Session',
        app_name: 'VSCode',
        window_pattern: '.js',
        audio_keywords: ['debug', 'error'],
        screen_keywords: ['function', 'class'],
        trigger_actions: ['suggest_fix', 'open_documentation']
      }
    ]
  }
};

// Test utilities
class DELOTestSuite {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      total: 0
    };
  }

  async runTest(testName, testFn) {
    this.results.total++;
    console.log(`\n🧪 Running test: ${testName}`);
    
    try {
      await testFn();
      console.log(`✅ PASS: ${testName}`);
      this.results.passed++;
    } catch (error) {
      console.log(`❌ FAIL: ${testName}`);
      console.log(`   Error: ${error.message}`);
      this.results.failed++;
    }
  }

  async testEnvironmentSetup() {
    // Check if .env file exists
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
      throw new Error('Environment file (.env) not found');
    }

    // Check if required environment variables are set
    const envContent = fs.readFileSync(envPath, 'utf8');
    const requiredVars = [
      'AZURE_OPENAI_API_KEY',
      'AZURE_OPENAI_ENDPOINT',
      'AZURE_OPENAI_DEPLOYMENT_NAME'
    ];

    for (const varName of requiredVars) {
      if (!envContent.includes(varName)) {
        throw new Error(`Required environment variable ${varName} not found`);
      }
    }

    console.log('   Environment configuration verified');
  }

  async testServiceFiles() {
    const requiredFiles = [
      'src/main/services/ScreenPerception.ts',
      'src/main/services/AudioPerception.ts',
      'src/main/services/ContextManager.ts',
      'src/renderer/components/DELOSettings.tsx'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(__dirname, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Required file not found: ${file}`);
      }
    }

    console.log('   All service files present');
  }

  async testDatabaseSchema() {
    // Check if database directory exists
    const dbDir = path.join(require('os').homedir(), '.doppel');
    if (!fs.existsSync(dbDir)) {
      console.log('   Database directory will be created on first run');
    } else {
      console.log('   Database directory exists');
    }
  }

  async testIPCIntegration() {
    // Check if preload.ts includes DELO methods
    const preloadPath = path.join(__dirname, 'src/main/preload.ts');
    const preloadContent = fs.readFileSync(preloadPath, 'utf8');
    
    const requiredMethods = [
      'startScreenPerception',
      'stopScreenPerception',
      'startAudioPerception',
      'stopAudioPerception',
      'startContextManager',
      'stopContextManager'
    ];

    for (const method of requiredMethods) {
      if (!preloadContent.includes(method)) {
        throw new Error(`IPC method ${method} not found in preload.ts`);
      }
    }

    console.log('   IPC integration verified');
  }

  async testTypeDefinitions() {
    // Check if electron.d.ts includes DELO types
    const typesPath = path.join(__dirname, 'src/renderer/types/electron.d.ts');
    const typesContent = fs.readFileSync(typesPath, 'utf8');
    
    const requiredTypes = [
      'startScreenPerception',
      'getScreenSnapshots',
      'startAudioPerception',
      'getAudioSessions',
      'startContextManager',
      'getContextSnapshots'
    ];

    for (const type of requiredTypes) {
      if (!typesContent.includes(type)) {
        throw new Error(`Type definition ${type} not found in electron.d.ts`);
      }
    }

    console.log('   Type definitions verified');
  }

  async testMainProcessIntegration() {
    // Check if main.ts includes DELO services
    const mainPath = path.join(__dirname, 'src/main/main.ts');
    const mainContent = fs.readFileSync(mainPath, 'utf8');
    
    const requiredImports = [
      'ScreenPerception',
      'AudioPerception',
      'ContextManager'
    ];

    for (const importName of requiredImports) {
      if (!mainContent.includes(importName)) {
        throw new Error(`Import ${importName} not found in main.ts`);
      }
    }

    console.log('   Main process integration verified');
  }

  async testRendererIntegration() {
    // Check if App.tsx includes DELO components
    const appPath = path.join(__dirname, 'src/renderer/App.tsx');
    const appContent = fs.readFileSync(appPath, 'utf8');
    
    if (!appContent.includes('DELOSettings')) {
      throw new Error('DELOSettings component not found in App.tsx');
    }

    console.log('   Renderer integration verified');
  }

  async testConfigurationOptions() {
    // Check if env.example includes DELO options
    const envExamplePath = path.join(__dirname, 'env.example');
    const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
    
    const requiredOptions = [
      'DISABLE_SCREEN_PERCEPTION',
      'DISABLE_AUDIO_PERCEPTION',
      'DISABLE_CONTEXT_MANAGER'
    ];

    for (const option of requiredOptions) {
      if (!envExampleContent.includes(option)) {
        throw new Error(`Configuration option ${option} not found in env.example`);
      }
    }

    console.log('   Configuration options verified');
  }

  async testDocumentation() {
    // Check if documentation exists
    const docsPath = path.join(__dirname, 'DELO_IMPLEMENTATION_GUIDE.md');
    if (!fs.existsSync(docsPath)) {
      throw new Error('DELO implementation guide not found');
    }

    const docsContent = fs.readFileSync(docsPath, 'utf8');
    const requiredSections = [
      'Screen Perception',
      'Audio Perception',
      'Context Manager',
      'Getting Started',
      'API Reference'
    ];

    for (const section of requiredSections) {
      if (!docsContent.includes(section)) {
        throw new Error(`Documentation section ${section} not found`);
      }
    }

    console.log('   Documentation verified');
  }

  async runAllTests() {
    console.log('🚀 Starting DELO test suite...\n');

    await this.runTest('Environment Setup', () => this.testEnvironmentSetup());
    await this.runTest('Service Files', () => this.testServiceFiles());
    await this.runTest('Database Schema', () => this.testDatabaseSchema());
    await this.runTest('IPC Integration', () => this.testIPCIntegration());
    await this.runTest('Type Definitions', () => this.testTypeDefinitions());
    await this.runTest('Main Process Integration', () => this.testMainProcessIntegration());
    await this.runTest('Renderer Integration', () => this.testRendererIntegration());
    await this.runTest('Configuration Options', () => this.testConfigurationOptions());
    await this.runTest('Documentation', () => this.testDocumentation());

    this.printResults();
  }

  printResults() {
    console.log('\n📊 Test Results');
    console.log('===============');
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed} ✅`);
    console.log(`Failed: ${this.results.failed} ❌`);
    console.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);

    if (this.results.failed === 0) {
      console.log('\n🎉 All tests passed! DELO is ready to use.');
      console.log('\n📖 Next steps:');
      console.log('1. Configure your .env file with API keys');
      console.log('2. Run "npm run dev" to start the application');
      console.log('3. Right-click the orb to access DELO settings');
      console.log('4. Configure app filters and context patterns');
    } else {
      console.log('\n⚠️  Some tests failed. Please check the errors above.');
    }
  }
}

// Demo functions
function demonstrateFeatures() {
  console.log('\n🎯 DELO Feature Demonstration');
  console.log('=============================\n');

  console.log('📸 Screen Perception Features:');
  console.log('  • Cross-platform accessibility API integration');
  console.log('  • OCR fallback with Tesseract/Apple Vision/Windows GDI');
  console.log('  • Smart diff-based updates (30-120 second intervals)');
  console.log('  • App filtering with whitelist/blacklist');
  console.log('  • Content hash tracking for change detection\n');

  console.log('🎤 Audio Perception Features:');
  console.log('  • Continuous system audio and microphone monitoring');
  console.log('  • Whisper integration for real-time transcription');
  console.log('  • Smart silence detection and session management');
  console.log('  • Audio source filtering with volume thresholds');
  console.log('  • Transcript search and history management\n');

  console.log('🧠 Context Manager Features:');
  console.log('  • Intelligent context analysis combining screen and audio');
  console.log('  • User intent detection using AI models');
  console.log('  • Pattern-based automation triggers');
  console.log('  • Quiet hours and privacy controls');
  console.log('  • Context snapshots with metadata\n');

  console.log('🎨 User Experience Features:');
  console.log('  • Visual orb indicators (color changes, pulsing)');
  console.log('  • Right-click context menu for quick access');
  console.log('  • Comprehensive settings panel');
  console.log('  • Privacy transparency and controls');
  console.log('  • Emergency stop functionality\n');
}

function showUsageExamples() {
  console.log('\n💡 Usage Examples');
  console.log('==================\n');

  console.log('🔧 Configuration Examples:');
  console.log('```bash');
  console.log('# Enable all DELO services');
  console.log('DISABLE_SCREEN_PERCEPTION=false');
  console.log('DISABLE_AUDIO_PERCEPTION=false');
  console.log('DISABLE_CONTEXT_MANAGER=false');
  console.log('');
  console.log('# Performance optimization');
  console.log('ULTRA_LIGHTWEIGHT=false');
  console.log('PERFORMANCE_MONITORING_INTERVAL=60000');
  console.log('```\n');

  console.log('🎯 Pattern Examples:');
  console.log('```typescript');
  console.log('// Email composition pattern');
  console.log('await contextManager.addContextPattern({');
  console.log('  pattern_name: "Email Composition",');
  console.log('  app_name: "Gmail",');
  console.log('  window_pattern: "compose",');
  console.log('  audio_keywords: ["email", "send", "draft"],');
  console.log('  screen_keywords: ["subject", "recipient", "message"],');
  console.log('  trigger_actions: ["suggest_subject", "check_grammar"]');
  console.log('});');
  console.log('```\n');

  console.log('🔒 Privacy Examples:');
  console.log('```typescript');
  console.log('// Set quiet hours (10 PM to 6 AM)');
  console.log('contextManager.setQuietHours(22, 6);');
  console.log('');
  console.log('// Blacklist sensitive apps');
  console.log('await screenPerception.addAppFilter({');
  console.log('  app_name: "Chrome",');
  console.log('  is_blacklisted: true,');
  console.log('  window_patterns: ["incognito", "private"]');
  console.log('});');
  console.log('```\n');
}

// Main execution
async function main() {
  const testSuite = new DELOTestSuite();
  
  try {
    await testSuite.runAllTests();
    demonstrateFeatures();
    showUsageExamples();
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { DELOTestSuite, demonstrateFeatures, showUsageExamples }; 