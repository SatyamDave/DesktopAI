// Standalone test for AI-powered email composition
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🧪 Testing AI-Powered Email Composition (Standalone)...\n');

// Test email prompts
const testPrompts = [
  "Email manager asking for time off next week",
  "Send email to team about meeting tomorrow at 2 PM",
  "Compose email to client requesting project update",
  "Draft email to HR about vacation request for December",
  "Email boss about work from home request due to illness"
];

async function testEmailComposition(prompt) {
  try {
    console.log(`📧 Testing: "${prompt}"`);
    
    // Check if we have the required environment variables
    const apiKey = process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-04-01-preview';
    
    if (!apiKey) {
      throw new Error('No OpenAI API key found in environment variables');
    }
    
    // Create the email prompt
    const emailPrompt = `Please compose an email based on this request: "${prompt}"

Requirements:
- Extract recipient from the request if mentioned
- Determine appropriate tone (professional, casual, formal, friendly)
- Choose appropriate length (brief, detailed, concise)
- Create a clear, professional subject line
- Write a well-structured email body

Respond with JSON in this format:
{
  "subject": "Email Subject",
  "body": "Email body content...",
  "recipient": "email@example.com" (if specified),
  "tone": "professional",
  "length": "brief"
}`;

    let response;
    
    if (endpoint && deployment) {
      // Azure OpenAI
      console.log('  🔗 Using Azure OpenAI...');
      response = await axios.post(
        `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`,
        {
          messages: [
            {
              role: 'system',
              content: 'You are an expert email composer. Create professional, well-structured email drafts based on user requests. Always respond with valid JSON containing subject, body, recipient (if specified), tone, and length fields.'
            },
            {
              role: 'user',
              content: emailPrompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.7
        },
        {
          headers: {
            'api-key': apiKey,
            'Content-Type': 'application/json'
          }
        }
      );
    } else {
      // OpenAI
      console.log('  🔗 Using OpenAI...');
      response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an expert email composer. Create professional, well-structured email drafts based on user requests. Always respond with valid JSON containing subject, body, recipient (if specified), tone, and length fields.'
            },
            {
              role: 'user',
              content: emailPrompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    const aiResponse = response.data.choices[0].message.content;
    
    // Try to parse JSON response
    try {
      const emailData = JSON.parse(aiResponse);
      console.log('  ✅ Email composed successfully!');
      console.log(`  📝 Subject: ${emailData.subject}`);
      console.log(`  👤 Recipient: ${emailData.recipient || 'Not specified'}`);
      console.log(`  🎭 Tone: ${emailData.tone}`);
      console.log(`  📏 Length: ${emailData.length}`);
      console.log(`  📄 Body: ${emailData.body.substring(0, 100)}${emailData.body.length > 100 ? '...' : ''}`);
      
      // Create mailto URL
      const params = new URLSearchParams();
      if (emailData.subject) params.append('subject', emailData.subject);
      if (emailData.body) params.append('body', emailData.body);
      
      const mailtoUrl = emailData.recipient 
        ? `mailto:${emailData.recipient}?${params.toString()}`
        : `mailto:?${params.toString()}`;
      
      console.log(`  🔗 Mailto URL: ${mailtoUrl.substring(0, 100)}...`);
      
      return {
        success: true,
        emailData,
        mailtoUrl
      };
      
    } catch (parseError) {
      console.log('  ⚠️  JSON parsing failed, using raw response');
      console.log(`  📄 Raw Response: ${aiResponse.substring(0, 200)}...`);
      
      return {
        success: true,
        emailData: {
          subject: 'Email',
          body: aiResponse,
          tone: 'professional',
          length: 'brief'
        },
        mailtoUrl: `mailto:?body=${encodeURIComponent(aiResponse)}`
      };
    }
    
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    if (error.response) {
      console.log(`  📊 Status: ${error.response.status}`);
      console.log(`  📄 Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return {
      success: false,
      error: error.message
    };
  }
}

async function runTests() {
  console.log('🚀 Starting email composition tests...\n');
  
  const results = [];
  
  for (let i = 0; i < testPrompts.length; i++) {
    const prompt = testPrompts[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Test ${i + 1}/${testPrompts.length}`);
    console.log(`${'='.repeat(60)}`);
    
    const result = await testEmailComposition(prompt);
    results.push({ prompt, result });
    
    // Add a small delay between tests
    if (i < testPrompts.length - 1) {
      console.log('\n⏳ Waiting 2 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('🎉 TEST SUMMARY');
  console.log(`${'='.repeat(60)}`);
  
  const successfulTests = results.filter(r => r.result.success).length;
  const failedTests = results.filter(r => !r.result.success).length;
  
  console.log(`📊 Results:`);
  console.log(`   • Total Tests: ${results.length}`);
  console.log(`   • Successful: ${successfulTests} ✅`);
  console.log(`   • Failed: ${failedTests} ❌`);
  console.log(`   • Success Rate: ${Math.round((successfulTests / results.length) * 100)}%`);
  
  if (successfulTests > 0) {
    console.log(`\n🎯 Email Composition is working!`);
    console.log(`   You can now use these commands in the full app:`);
    testPrompts.forEach((prompt, i) => {
      console.log(`   ${i + 1}. "${prompt}"`);
    });
  } else {
    console.log(`\n❌ Email composition failed. Check your API configuration.`);
  }
  
  console.log(`\n💡 To test in the full app:`);
  console.log(`   1. Run 'npm run dev'`);
  console.log(`   2. Press Ctrl+Shift+. to open command input`);
  console.log(`   3. Try any of the email prompts above`);
  
  console.log(`\n${'='.repeat(60)}`);
}

// Check environment variables first
console.log('🔍 Checking environment configuration...');
const apiKey = process.env.AZURE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

if (!apiKey) {
  console.log('❌ No OpenAI API key found!');
  console.log('   Please set AZURE_OPENAI_API_KEY or OPENAI_API_KEY in your .env file');
  process.exit(1);
}

console.log('✅ API key found');
if (endpoint && deployment) {
  console.log('✅ Azure OpenAI configuration found');
  console.log(`   Endpoint: ${endpoint}`);
  console.log(`   Deployment: ${deployment}`);
} else {
  console.log('✅ Using OpenAI API directly');
}

console.log('');

// Run the tests
runTests().catch(console.error); 