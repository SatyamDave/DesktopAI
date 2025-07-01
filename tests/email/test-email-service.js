const axios = require('axios');
require('dotenv').config();

// Simple EmailService implementation for testing
class EmailService {
  constructor() {
    this.geminiApiKey = process.env.GEMINI_API_KEY || null;
    this.debug = process.env.NODE_ENV === 'development';
  }

  async composeAndOpenEmail(userPrompt, context) {
    try {
      if (!this.geminiApiKey) {
        return 'No Gemini API key configured. Please set GEMINI_API_KEY in your environment variables.';
      }

      if (this.debug) {
        console.log(`[EmailService] Composing email for prompt: "${userPrompt}"`);
      }

      // Generate email draft using Gemini AI
      const emailDraft = await this.generateEmailDraft(userPrompt, context);
      
      return `✅ Email draft created!\n\n📧 Subject: ${emailDraft.subject}\n👤 Recipient: ${emailDraft.recipient || 'Not specified'}\n📝 Tone: ${emailDraft.tone}\n📏 Length: ${emailDraft.length}\n\n📄 Body:\n${emailDraft.body}`;

    } catch (error) {
      console.error('[EmailService] Error composing email:', error);
      return `❌ Error composing email: ${error.message}`;
    }
  }

  async generateEmailDraft(userPrompt, context) {
    const prompt = this.createEmailPrompt(userPrompt, context);
    
    try {
      const response = await this.callGeminiAPI(prompt);
      if (this.debug) console.log('[EmailService] Using Gemini API');

      // Parse JSON response
      return this.parseEmailResponse(response);

    } catch (error) {
      console.error('[EmailService] Gemini API error:', error);
      throw new Error('Failed to generate email draft with Gemini AI');
    }
  }

  async callGeminiAPI(prompt) {
    try {
      // Try gemini-2.0-flash first (free tier model)
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.geminiApiKey}`,
        {
          contents: [{
            parts: [{
              text: prompt
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

      return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
      // If gemini-2.0-flash fails, try gemini-pro (legacy)
      if (error.response?.status === 404) {
        const altResponse = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.geminiApiKey}`,
          {
            contents: [{
              parts: [{
                text: prompt
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

        return altResponse.data.candidates[0].content.parts[0].text;
      }
      throw error;
    }
  }

  parseEmailResponse(aiResponse) {
    try {
      let jsonText = aiResponse;
      
      // Remove markdown code blocks if present
      if (aiResponse.includes('```json')) {
        jsonText = aiResponse.split('```json')[1].split('```')[0].trim();
      } else if (aiResponse.includes('```')) {
        jsonText = aiResponse.split('```')[1].split('```')[0].trim();
      }
      
      const emailData = JSON.parse(jsonText);
      return {
        subject: emailData.subject || 'Email',
        body: emailData.body || '',
        recipient: emailData.recipient,
        tone: emailData.tone || 'professional',
        length: emailData.length || 'brief'
      };
    } catch (parseError) {
      // Fallback if JSON parsing fails
      return {
        subject: 'Email',
        body: aiResponse,
        tone: 'professional',
        length: 'brief'
      };
    }
  }

  createEmailPrompt(userPrompt, context) {
    const contextInfo = context ? `\nContext: ${JSON.stringify(context)}` : '';
    
    return `Please compose an email based on this request: "${userPrompt}"${contextInfo}

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
  }

  isAIConfigured() {
    return !!this.geminiApiKey;
  }

  getConfigurationStatus() {
    return {
      hasGemini: !!this.geminiApiKey
    };
  }
}

async function testEmailService() {
  console.log('🚀 Testing EmailService (Gemini Only)');
  console.log('=====================================');
  
  const emailService = new EmailService();
  
  // Check configuration
  console.log('\n📋 Configuration Status:');
  const config = emailService.getConfigurationStatus();
  console.log('- Gemini API:', config.hasGemini ? '✅ Configured' : '❌ Not configured');
  
  if (!emailService.isAIConfigured()) {
    console.log('\n❌ No Gemini API key configured!');
    console.log('Please add GEMINI_API_KEY to your .env file');
    return;
  }
  
  // Test email composition
  const testPrompts = [
    'Compose a professional email to schedule a meeting with John Smith about the Q4 project',
    'Write a friendly email to my colleague Sarah asking for feedback on my presentation',
    'Draft a formal email to clients@company.com regarding the new product launch'
  ];
  
  for (let i = 0; i < testPrompts.length; i++) {
    const prompt = testPrompts[i];
    console.log(`\n📝 Test ${i + 1}: ${prompt}`);
    
    try {
      const result = await emailService.composeAndOpenEmail(prompt);
      console.log('✅ Result:');
      console.log(result);
      
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
    
    // Wait between tests
    if (i < testPrompts.length - 1) {
      console.log('⏳ Waiting 3 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  console.log('\n✨ EmailService test completed!');
}

testEmailService().catch(console.error); 