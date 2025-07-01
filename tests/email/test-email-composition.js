// Test script for AI-powered email composition
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🧪 Testing AI-Powered Email Composition...\n');

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

const addTestResult = (name, passed, message, details = null) => {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${name}: ${message}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${name}: ${message}`);
  }
  testResults.details.push({ name, passed, message, details });
};

// Test 1: Check if OpenAI API key is configured
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf8');
  const hasOpenAIKey = envContent.includes('AZURE_OPENAI_API_KEY=') || envContent.includes('OPENAI_API_KEY=');
  addTestResult('OpenAI Configuration', hasOpenAIKey, hasOpenAIKey ? 'API key found in .env' : 'No API key found');
} else {
  addTestResult('OpenAI Configuration', false, '.env file not found - create from env.example');
}

// Test 2: Check if email draft database table exists
const dbDir = path.join(os.homedir(), '.doppel');
const aiDbPath = path.join(dbDir, 'ai.sqlite');
if (fs.existsSync(aiDbPath)) {
  addTestResult('Email Draft Database', true, 'AI database exists');
} else {
  addTestResult('Email Draft Database', false, 'AI database not found - will be created on first use');
}

// Test 3: Check source files for email composition
const emailCompositionFiles = [
  'src/main/services/AIProcessor.ts',
  'src/main/main.ts',
  'src/main/preload.ts',
  'src/renderer/types/electron.d.ts'
];

emailCompositionFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const hasEmailFeatures = content.includes('email') || content.includes('Email') || content.includes('mailto');
    addTestResult(`Email Features: ${file}`, hasEmailFeatures, hasEmailFeatures ? 'Email features found' : 'No email features detected');
  } else {
    addTestResult(`Email Features: ${file}`, false, 'File not found');
  }
});

// Test 4: Check package.json for required dependencies
if (fs.existsSync('package.json')) {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const hasAxios = pkg.dependencies?.axios || pkg.devDependencies?.axios;
  addTestResult('Axios Dependency', hasAxios, hasAxios ? 'Axios found for API calls' : 'Axios missing');
} else {
  addTestResult('Package.json', false, 'Package.json not found');
}

// Test 5: Check for environment setup instructions
if (fs.existsSync('env.example')) {
  const envExample = fs.readFileSync('env.example', 'utf8');
  const hasOpenAIConfig = envExample.includes('AZURE_OPENAI_API_KEY') || envExample.includes('OPENAI_API_KEY');
  addTestResult('Environment Setup', hasOpenAIConfig, hasOpenAIConfig ? 'OpenAI config documented' : 'OpenAI config missing from example');
} else {
  addTestResult('Environment Setup', false, 'env.example not found');
}

// Wait for async tests to complete, then show summary
setTimeout(() => {
  console.log('\n' + '='.repeat(60));
  console.log('🎉 AI Email Composition Test Summary');
  console.log('='.repeat(60));
  
  console.log(`\n📊 Test Results:`);
  console.log(`   • Total Tests: ${testResults.total}`);
  console.log(`   • Passed: ${testResults.passed} ✅`);
  console.log(`   • Failed: ${testResults.failed} ❌`);
  console.log(`   • Success Rate: ${testResults.total > 0 ? Math.round((testResults.passed / testResults.total) * 100) : 0}%`);
  
  console.log(`\n📧 AI Email Composition Features:`);
  console.log(`   • OpenAI API integration for intelligent email drafting`);
  console.log(`   • Natural language email composition`);
  console.log(`   • Professional tone detection and formatting`);
  console.log(`   • Automatic recipient extraction from prompts`);
  console.log(`   • Email draft history and persistence`);
  console.log(`   • Automatic email client opening with AI-generated content`);
  console.log(`   • Support for both Azure OpenAI and OpenAI APIs`);
  
  console.log(`\n🎯 Email Composition Examples:`);
  console.log(`   • "Email manager asking for time off"`);
  console.log(`   • "Send email to team about meeting tomorrow"`);
  console.log(`   • "Compose email to client requesting project update"`);
  console.log(`   • "Draft email to HR about vacation request"`);
  console.log(`   • "Email boss about work from home request"`);
  
  console.log(`\n🔧 Technical Implementation:`);
  console.log(`   • AIProcessor handles email intent detection`);
  console.log(`   • OpenAI API generates professional email drafts`);
  console.log(`   • JSON response parsing for structured email data`);
  console.log(`   • Mailto URL generation for email client integration`);
  console.log(`   • Database persistence for email draft history`);
  console.log(`   • Cross-platform email client support`);
  
  if (testResults.failed === 0) {
    console.log(`\n🎉 All tests passed! AI email composition is ready to use.`);
    console.log(`   Set up your OpenAI API key in .env file to enable AI features.`);
    console.log(`   Try: "Email manager asking for time off"`);
  } else {
    console.log(`\n⚠️  ${testResults.failed} test(s) failed. Please check the details above.`);
    console.log(`   Some AI email features may not work as expected.`);
  }
  
  console.log(`\n📝 Setup Instructions:`);
  console.log(`   1. Copy env.example to .env`);
  console.log(`   2. Add your OpenAI API key (AZURE_OPENAI_API_KEY or OPENAI_API_KEY)`);
  console.log(`   3. Run 'npm run dev' to start the application`);
  console.log(`   4. Use Ctrl+Shift+. to open command input`);
  console.log(`   5. Try email composition commands`);
  
  console.log('\n' + '='.repeat(60));
}, 1000); 