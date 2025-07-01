const axios = require('axios');
require('dotenv').config();

async function testEmailDebug() {
  console.log('🔍 Debugging Email Functionality');
  console.log('================================');
  
  // Test 1: Check environment
  console.log('\n📋 Environment Check:');
  console.log('- GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Not set');
  console.log('- NODE_ENV:', process.env.NODE_ENV);
  console.log('- DEBUG_MODE:', process.env.DEBUG_MODE);
  
  if (!process.env.GEMINI_API_KEY) {
    console.log('❌ GEMINI_API_KEY not set in .env file');
    return;
  }
  
  // Test 2: Test direct API call
  console.log('\n🌐 Testing Direct Gemini API Call...');
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        contents: [{
          parts: [{
            text: 'Hello, this is a test message.'
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 10
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Direct API call successful:');
    console.log('Response:', response.data.candidates[0].content.parts[0].text);
  } catch (error) {
    console.log('❌ Direct API call failed:');
    console.log('Error:', error.response?.data || error.message);
    return;
  }
  
  // Test 3: Test email composition API call
  console.log('\n📧 Testing Email Composition API Call...');
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const emailPrompt = `Please compose an email based on this request: "write an email to john@example.com about meeting tomorrow"

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
    
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        contents: [{
          parts: [{
            text: emailPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Email composition API call successful:');
    const aiResponse = response.data.candidates[0].content.parts[0].text;
    console.log('Raw response:', aiResponse);
    
    // Try to parse JSON
    try {
      let jsonText = aiResponse;
      if (aiResponse.includes('```json')) {
        jsonText = aiResponse.split('```json')[1].split('```')[0].trim();
      } else if (aiResponse.includes('```')) {
        jsonText = aiResponse.split('```')[1].split('```')[0].trim();
      }
      
      const emailData = JSON.parse(jsonText);
      console.log('✅ Parsed email data:');
      console.log('- Subject:', emailData.subject);
      console.log('- Recipient:', emailData.recipient);
      console.log('- Tone:', emailData.tone);
      console.log('- Length:', emailData.length);
      console.log('- Body:', emailData.body);
    } catch (parseError) {
      console.log('⚠️ Could not parse JSON response');
      console.log('Parse error:', parseError.message);
    }
    
  } catch (error) {
    console.log('❌ Email composition API call failed:');
    console.log('Error:', error.response?.data || error.message);
  }
  
  // Test 4: Check if the app is running
  console.log('\n📱 Checking if app is running...');
  try {
    const response = await axios.get('http://localhost:3000');
    console.log('✅ Vite dev server is running');
  } catch (error) {
    console.log('❌ Vite dev server is not running');
    console.log('Make sure to run: npm run start:mac');
  }
}

testEmailDebug().catch(console.error); 