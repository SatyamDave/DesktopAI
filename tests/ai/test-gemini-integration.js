const axios = require('axios');

// Test Gemini API integration
async function testGeminiIntegration() {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'your-gemini-api-key-here';
  const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
  
  if (GEMINI_API_KEY === 'your-gemini-api-key-here') {
    console.log('❌ Please set your GEMINI_API_KEY in the environment');
    console.log('💡 Get your API key from: https://makersuite.google.com/app/apikey');
    return;
  }
  
  try {
    console.log('🧪 Testing Gemini API integration...');
    
    const testPrompt = 'summarize this text';
    const testClipboard = 'This is a sample text that needs to be summarized for testing purposes.';
    
    const prompt = `Clarify and expand this prompt for better understanding. Return the user's likely intent and break it into clear, concise action steps.

User's prompt: "${testPrompt}"
Clipboard context: "${testClipboard}"

Please provide:
1. The clarified intent
2. A numbered list of specific action steps
3. Any additional context or assumptions

Format your response as JSON:
{
  "clarifiedIntent": "clear description of what user wants",
  "actionSteps": ["step 1", "step 2", "step 3"],
  "context": "any additional context or assumptions"
}`;

    const response = await axios.post(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data && response.data.candidates && response.data.candidates[0]) {
      const text = response.data.candidates[0].content.parts[0].text;
      console.log('✅ Gemini API response received!');
      console.log('📝 Response:', text.substring(0, 200) + '...');
      
      // Try to parse JSON
      try {
        const parsed = JSON.parse(text);
        console.log('✅ JSON parsing successful!');
        console.log('🎯 Clarified Intent:', parsed.clarifiedIntent);
        console.log('📋 Action Steps:', parsed.actionSteps.length);
        console.log('🔍 Context:', parsed.context);
      } catch (parseError) {
        console.log('⚠️ JSON parsing failed, but API is working');
      }
    } else {
      console.log('❌ Invalid response from Gemini API');
    }
    
  } catch (error) {
    console.error('❌ Gemini API test failed:', error.message);
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📝 Response:', error.response.data);
    }
  }
}

// Run the test
testGeminiIntegration(); 