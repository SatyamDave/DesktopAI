const axios = require('axios');
require('dotenv').config();

async function testGeminiEmail() {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  
  if (!geminiApiKey) {
    console.log('❌ No Gemini API key found in .env file');
    console.log('Please add GEMINI_API_KEY=your_key_here to your .env file');
    return;
  }

  console.log('🔑 Testing Gemini API for email composition...');
  console.log('📧 API Key found:', geminiApiKey.substring(0, 10) + '...');

  const testPrompts = [
    'Compose a professional email to schedule a meeting with John Smith about the Q4 project',
    'Write a friendly email to my colleague Sarah asking for feedback on my presentation',
    'Draft a formal email to clients@company.com regarding the new product launch'
  ];

  for (let i = 0; i < testPrompts.length; i++) {
    const prompt = testPrompts[i];
    console.log(`\n📝 Test ${i + 1}: ${prompt}`);
    
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
        {
          contents: [{
            parts: [{
              text: `Please compose an email based on this request: "${prompt}"

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

      const aiResponse = response.data.candidates[0].content.parts[0].text;
      console.log('✅ Gemini Response:');
      console.log(aiResponse);
      
      // Try to parse JSON (handle markdown code blocks)
      try {
        let jsonText = aiResponse;
        
        // Remove markdown code blocks if present
        if (aiResponse.includes('```json')) {
          jsonText = aiResponse.split('```json')[1].split('```')[0].trim();
        } else if (aiResponse.includes('```')) {
          jsonText = aiResponse.split('```')[1].split('```')[0].trim();
        }
        
        const emailData = JSON.parse(jsonText);
        console.log('✅ Parsed JSON successfully:');
        console.log('- Subject:', emailData.subject);
        console.log('- Recipient:', emailData.recipient || 'Not specified');
        console.log('- Tone:', emailData.tone);
        console.log('- Length:', emailData.length);
        console.log('- Body length:', emailData.body?.length || 0, 'characters');
      } catch (parseError) {
        console.log('⚠️  Could not parse JSON, but got response:');
        console.log(aiResponse.substring(0, 200) + '...');
      }

    } catch (error) {
      console.log('❌ Error:', error.response?.data || error.message);
      
      if (error.response?.status === 400) {
        console.log('💡 This might be due to content filtering or invalid request format');
      } else if (error.response?.status === 403) {
        console.log('💡 Check if your API key is valid and has proper permissions');
      } else if (error.response?.status === 429) {
        console.log('💡 Rate limit exceeded. Try again later.');
      } else if (error.response?.status === 404) {
        console.log('💡 Model not found. Trying alternative models...');
        // Try with gemini-pro model (legacy)
        try {
          const altResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`,
            {
              contents: [{
                parts: [{
                  text: `Please compose an email based on this request: "${prompt}"

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
          
          const altAiResponse = altResponse.data.candidates[0].content.parts[0].text;
          console.log('✅ Legacy Model Response:');
          console.log(altAiResponse);
          
          try {
            const emailData = JSON.parse(altAiResponse);
            console.log('✅ Parsed JSON successfully:');
            console.log('- Subject:', emailData.subject);
            console.log('- Recipient:', emailData.recipient || 'Not specified');
            console.log('- Tone:', emailData.tone);
            console.log('- Length:', emailData.length);
            console.log('- Body length:', emailData.body?.length || 0, 'characters');
          } catch (parseError) {
            console.log('⚠️  Could not parse JSON, but got response:');
            console.log(altAiResponse.substring(0, 200) + '...');
          }
        } catch (altError) {
          console.log('❌ Legacy model also failed:', altError.response?.data || altError.message);
        }
      }
    }
    
    // Wait between requests
    if (i < testPrompts.length - 1) {
      console.log('⏳ Waiting 2 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

async function testGeminiQuota() {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  
  if (!geminiApiKey) {
    console.log('❌ No Gemini API key found');
    return;
  }

  console.log('\n📊 Testing Gemini API quota...');
  
  try {
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

    console.log('✅ API is working! Quota should be available.');
    console.log('Response:', response.data.candidates[0].content.parts[0].text);
    
  } catch (error) {
    console.log('❌ API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 429) {
      console.log('💡 Rate limit exceeded. You may have hit the free tier limits.');
      console.log('📈 Free tier: 15 requests/minute, 1500 requests/day');
    } else if (error.response?.status === 404) {
      console.log('💡 Trying legacy model...');
      try {
        const altResponse = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`,
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
        
        console.log('✅ Legacy model works!');
        console.log('Response:', altResponse.data.candidates[0].content.parts[0].text);
      } catch (altError) {
        console.log('❌ Legacy model also failed:', altError.response?.data || altError.message);
      }
    }
  }
}

async function main() {
  console.log('🚀 Gemini Email Composition Test');
  console.log('================================');
  
  await testGeminiQuota();
  await testGeminiEmail();
  
  console.log('\n✨ Test completed!');
  console.log('\n📋 Next steps:');
  console.log('1. If tests pass, add GEMINI_API_KEY to your .env file');
  console.log('2. Run your Doppel app and try email commands');
  console.log('3. Example: "compose email to john@example.com about meeting"');
}

main().catch(console.error); 