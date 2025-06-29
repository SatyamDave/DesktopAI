// Script to list Azure OpenAI deployments
const axios = require('axios');
require('dotenv').config();

async function listDeployments() {
  try {
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-04-01-preview';
    
    if (!apiKey || !endpoint) {
      console.log('❌ Missing API key or endpoint in .env file');
      return;
    }
    
    console.log('🔍 Listing Azure OpenAI deployments...');
    console.log(`Endpoint: ${endpoint}`);
    console.log(`API Version: ${apiVersion}`);
    console.log('');
    
    // List deployments
    const response = await axios.get(
      `${endpoint}/openai/deployments?api-version=${apiVersion}`,
      {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Available deployments:');
    console.log('');
    
    if (response.data.data && response.data.data.length > 0) {
      response.data.data.forEach((deployment, index) => {
        console.log(`${index + 1}. Name: ${deployment.id}`);
        console.log(`   Model: ${deployment.model}`);
        console.log(`   Status: ${deployment.status}`);
        console.log(`   Created: ${new Date(deployment.created_at * 1000).toLocaleString()}`);
        console.log('');
      });
      
      console.log('💡 Update your .env file with the correct deployment name:');
      console.log('   AZURE_OPENAI_DEPLOYMENT_NAME=<deployment_name_from_above>');
      
    } else {
      console.log('❌ No deployments found');
    }
    
  } catch (error) {
    console.log('❌ Error listing deployments:');
    console.log(`   ${error.message}`);
    
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    
    console.log('');
    console.log('💡 Alternative: Try using OpenAI API directly');
    console.log('   Set OPENAI_API_KEY in your .env file instead of Azure OpenAI');
  }
}

listDeployments(); 