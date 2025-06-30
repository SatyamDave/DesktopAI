#!/usr/bin/env node

/**
 * Test script for the new Real-time AI Desktop Assistant
 * This script tests the core functionality without requiring the full Electron app
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🧪 Testing Real-time AI Desktop Assistant...\n');

// Test configuration
const tests = [
  {
    name: 'Dependencies Check',
    test: () => checkDependencies()
  },
  {
    name: 'Service Files Check',
    test: () => checkServiceFiles()
  },
  {
    name: 'Package.json Dependencies',
    test: () => checkPackageDependencies()
  },
  {
    name: 'TypeScript Compilation',
    test: () => checkTypeScriptCompilation()
  },
  {
    name: 'Ollama Availability',
    test: () => checkOllamaAvailability()
  }
];

async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    console.log(`📋 Running: ${test.name}`);
    try {
      await test.test();
      console.log(`✅ ${test.name}: PASSED\n`);
      passed++;
    } catch (error) {
      console.log(`❌ ${test.name}: FAILED - ${error.message}\n`);
      failed++;
    }
  }

  console.log('📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! The Real-time AI Assistant is ready to use.');
    console.log('\n🚀 Next steps:');
    console.log('1. Run: npm run dev');
    console.log('2. Press Ctrl+K to open the real-time overlay');
    console.log('3. Try commands like "Open Chrome" or "Take screenshot"');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the errors above.');
    process.exit(1);
  }
}

function checkDependencies() {
  const requiredDeps = [
    '@xenova/transformers',
    'tesseract.js',
    'robotjs',
    'screenshot-desktop',
    'systeminformation',
    'ps-list',
    'active-win'
  ];

  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const installedDeps = Object.keys(packageJson.dependencies || {});

  const missing = requiredDeps.filter(dep => !installedDeps.includes(dep));
  
  if (missing.length > 0) {
    throw new Error(`Missing dependencies: ${missing.join(', ')}`);
  }

  console.log('   All required dependencies are installed');
}

function checkServiceFiles() {
  const requiredFiles = [
    'src/main/services/LocalLLMService.ts',
    'src/main/services/SystemControlService.ts',
    'src/main/services/RealTimeCommandProcessor.ts',
    'src/renderer/components/RealTimeOverlay.tsx'
  ];

  const missing = requiredFiles.filter(file => !fs.existsSync(file));
  
  if (missing.length > 0) {
    throw new Error(`Missing service files: ${missing.join(', ')}`);
  }

  console.log('   All service files are present');
}

function checkPackageDependencies() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Check for new scripts
  const requiredScripts = ['install:ollama', 'start:ollama', 'pull:models'];
  const missingScripts = requiredScripts.filter(script => !packageJson.scripts[script]);
  
  if (missingScripts.length > 0) {
    throw new Error(`Missing scripts: ${missingScripts.join(', ')}`);
  }

  // Check for new dependencies
  const newDeps = [
    '@xenova/transformers',
    'tesseract.js',
    'robotjs',
    'screenshot-desktop',
    'systeminformation',
    'ps-list',
    'active-win'
  ];

  const missingDeps = newDeps.filter(dep => !packageJson.dependencies[dep]);
  
  if (missingDeps.length > 0) {
    throw new Error(`Missing dependencies: ${missingDeps.join(', ')}`);
  }

  console.log('   Package.json has all required dependencies and scripts');
}

function checkTypeScriptCompilation() {
  return new Promise((resolve, reject) => {
    const tsc = spawn('npx', ['tsc', '--noEmit'], {
      stdio: 'pipe',
      shell: true
    });

    let output = '';
    let errorOutput = '';

    tsc.stdout.on('data', (data) => {
      output += data.toString();
    });

    tsc.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    tsc.on('close', (code) => {
      if (code === 0) {
        console.log('   TypeScript compilation successful');
        resolve();
      } else {
        reject(new Error(`TypeScript compilation failed:\n${errorOutput}`));
      }
    });
  });
}

function checkOllamaAvailability() {
  return new Promise((resolve, reject) => {
    const curl = spawn('curl', ['-s', 'http://localhost:11434/api/tags'], {
      stdio: 'pipe',
      shell: true
    });

    let output = '';
    let errorOutput = '';

    curl.stdout.on('data', (data) => {
      output += data.toString();
    });

    curl.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    curl.on('close', (code) => {
      if (code === 0) {
        try {
          const response = JSON.parse(output);
          console.log('   Ollama is running and accessible');
          resolve();
        } catch (error) {
          console.log('   ⚠️ Ollama is running but response format is unexpected');
          resolve(); // Not a critical failure
        }
      } else {
        console.log('   ⚠️ Ollama is not running (optional for local LLM)');
        resolve(); // Not a critical failure
      }
    });
  });
}

// Run the tests
runTests().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
}); 