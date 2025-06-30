// Test email composition using OpenAI API directly
const axios = require('axios');
require('dotenv').config();

console.log('🧪 Testing Email Composition with OpenAI API (Direct)...\n');

async function testOpenAIEmail(prompt) {
  try {
    console.log(`📧 Testing: "${prompt}"`);
    
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('No OpenAI API key found');
    }
    
    console.log('  🔗 Using OpenAI API directly...');
    
    const response = await axios.post(
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
            content: `Please compose an email based on this request: "${prompt}"

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
}`
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

    const aiResponse = response.data.choices[0].message.content;
    
    // Try to parse JSON response
    try {
      const emailData = JSON.parse(aiResponse);
      console.log('  ✅ Email composed successfully!');
      console.log(`  📝 Subject: ${emailData.subject}`);
      console.log(`  👤 Recipient: ${emailData.recipient || 'Not specified'}`);
      console.log(`  🎭 Tone: ${emailData.tone}`);
      console.log(`  📏 Length: ${emailData.length}`);
      console.log(`  📄 Body: ${emailData.body.substring(0, 150)}${emailData.body.length > 150 ? '...' : ''}`);
      
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

async function runTest() {
  const testPrompt = "Email manager asking for time off next week";
  
  console.log('🚀 Testing single email composition...\n');
  console.log(`${'='.repeat(60)}`);
  console.log('Test Email Composition');
  console.log(`${'='.repeat(60)}`);
  
  const result = await testOpenAIEmail(testPrompt);
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('🎉 TEST RESULT');
  console.log(`${'='.repeat(60)}`);
  
  if (result.success) {
    console.log('✅ Email composition is working!');
    console.log('🎯 You can now use this in the full app:');
    console.log(`   "${testPrompt}"`);
    console.log('');
    console.log('💡 To test in the full app:');
    console.log('   1. Run "npm run dev"');
    console.log('   2. Press Ctrl+Shift+. to open command input');
    console.log('   3. Try the email prompt above');
  } else {
    console.log('❌ Email composition failed');
    console.log('🔧 Check your OpenAI API key configuration');
  }
  
  console.log(`\n${'='.repeat(60)}`);
}

// Check if OpenAI API key is available
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.log('❌ No OpenAI API key found!');
  console.log('   Please set OPENAI_API_KEY in your .env file');
  process.exit(1);
}

console.log('✅ OpenAI API key found');
console.log('');

runTest().catch(console.error); 