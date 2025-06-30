// Test different Azure OpenAI deployment names
const axios = require('axios');
require('dotenv').config();

console.log('🧪 Testing Azure OpenAI Deployment Names...\n');

const commonDeployments = [
  'gpt-4',
  'gpt-35-turbo',
  'gpt-4o',
  'gpt-4o-mini',
  'gpt-35-turbo-16k',
  'gpt-4-32k',
  'gpt-4-turbo',
  'gpt-4-turbo-preview'
];

async function testDeployment(deploymentName) {
  try {
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-04-01-preview';
    
    console.log(`🔍 Testing deployment: ${deploymentName}`);
    
    const response = await axios.post(
      `${endpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`,
      {
        messages: [
          {
            role: 'user',
            content: 'Hello, this is a test message. Please respond with "Test successful" if you can see this.'
          }
        ],
        max_tokens: 50,
        temperature: 0.1
      },
      {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`  ✅ SUCCESS! Deployment "${deploymentName}" is working`);
    console.log(`  📄 Response: ${response.data.choices[0].message.content}`);
    return { success: true, deployment: deploymentName };
    
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log(`  ❌ Deployment "${deploymentName}" not found`);
    } else {
      console.log(`  ⚠️  Error with "${deploymentName}": ${error.message}`);
    }
    return { success: false, deployment: deploymentName, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Testing common deployment names...\n');
  
  const results = [];
  
  for (const deployment of commonDeployments) {
    const result = await testDeployment(deployment);
    results.push(result);
    
    if (result.success) {
      console.log(`\n🎉 Found working deployment: ${deployment}`);
      console.log(`💡 Update your .env file with:`);
      console.log(`   AZURE_OPENAI_DEPLOYMENT_NAME=${deployment}`);
      console.log('');
      break;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`${'='.repeat(60)}`);
  console.log('📊 TEST SUMMARY');
  console.log(`${'='.repeat(60)}`);
  
  const workingDeployments = results.filter(r => r.success);
  
  if (workingDeployments.length > 0) {
    console.log('✅ Found working deployment(s):');
    workingDeployments.forEach(r => {
      console.log(`   • ${r.deployment}`);
    });
    console.log('');
    console.log('🎯 Next steps:');
    console.log('   1. Update your .env file with the working deployment name');
    console.log('   2. Run "node test-email-standalone.js" to test email composition');
  } else {
    console.log('❌ No working deployments found');
    console.log('');
    console.log('💡 Suggestions:');
    console.log('   1. Check your Azure OpenAI resource in the Azure portal');
    console.log('   2. Create a new deployment with a common model name');
    console.log('   3. Or use a regular OpenAI API key instead');
  }
  
  console.log(`\n${'='.repeat(60)}`);
}

// Check configuration
const apiKey = process.env.AZURE_OPENAI_API_KEY;
const endpoint = process.env.AZURE_OPENAI_ENDPOINT;

if (!apiKey || !endpoint) {
  console.log('❌ Missing Azure OpenAI configuration');
  console.log('   Please set AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT in your .env file');
  process.exit(1);
}

console.log('✅ Azure OpenAI configuration found');
console.log(`   Endpoint: ${endpoint}`);
console.log('');

runTests().catch(console.error); 