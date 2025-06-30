import axios from 'axios';
import { shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface EmailDraft {
  subject: string;
  body: string;
  recipient?: string;
  tone: 'professional' | 'casual' | 'formal' | 'friendly';
  length: 'brief' | 'detailed' | 'concise';
}

interface EmailHistory {
  id: number;
  user_prompt: string;
  subject: string;
  body: string;
  recipient: string;
  tone: string;
  timestamp: number;
}

export class EmailService {
  private geminiApiKey: string | null = null;
  private debug: boolean = false;
  private historyPath: string;

  constructor() {
    // Load API keys from environment
    this.geminiApiKey = process.env.GEMINI_API_KEY || null;
    this.debug = process.env.NODE_ENV === 'development';

    // Setup history file
    const dbDir = path.join(os.homedir(), '.doppel');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    this.historyPath = path.join(dbDir, 'email_history.json');

    if (this.debug) {
      console.log('[EmailService] Configuration:', {
        hasGeminiKey: !!this.geminiApiKey
      });
    }
  }

  /**
   * Main method to compose and open an email draft
   */
  public async composeAndOpenEmail(userPrompt: string, context?: any): Promise<string> {
    try {
      if (!this.geminiApiKey) {
        return 'No Gemini API key configured. Please set GEMINI_API_KEY in your environment variables.';
      }

      if (this.debug) {
        console.log(`[EmailService] Composing email for prompt: "${userPrompt}"`);
      }

      // Generate email draft using Gemini AI
      const emailDraft = await this.generateEmailDraft(userPrompt, context);
      
      // Save to history
      await this.saveToHistory(userPrompt, emailDraft);

      // Open email client
      const mailtoUrl = this.createMailtoUrl(emailDraft);
      await shell.openExternal(mailtoUrl);

      return `✅ Email draft created and opened!\n\n📧 Subject: ${emailDraft.subject}\n👤 Recipient: ${emailDraft.recipient || 'Not specified'}\n📝 Tone: ${emailDraft.tone}\n📏 Length: ${emailDraft.length}\n\n📄 Body:\n${emailDraft.body}`;

    } catch (error) {
      console.error('[EmailService] Error composing email:', error);
      return `❌ Error composing email: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Generate email draft using Gemini AI
   */
  private async generateEmailDraft(userPrompt: string, context?: any): Promise<EmailDraft> {
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

  /**
   * Call Gemini API
   */
  private async callGeminiAPI(prompt: string): Promise<string> {
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
    } catch (error: any) {
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

  /**
   * Parse AI response into EmailDraft object
   */
  private parseEmailResponse(aiResponse: string): EmailDraft {
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

  /**
   * Create email prompt for AI
   */
  private createEmailPrompt(userPrompt: string, context?: any): string {
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

  /**
   * Create mailto URL for opening email client
   */
  private createMailtoUrl(emailDraft: EmailDraft): string {
    const params = new URLSearchParams();
    if (emailDraft.subject) params.append('subject', emailDraft.subject);
    if (emailDraft.body) params.append('body', emailDraft.body);
    
    const mailtoUrl = emailDraft.recipient 
      ? `mailto:${emailDraft.recipient}?${params.toString()}`
      : `mailto:?${params.toString()}`;
    
    return mailtoUrl;
  }

  /**
   * Save email draft to history
   */
  private async saveToHistory(userPrompt: string, emailDraft: EmailDraft): Promise<void> {
    try {
      const history: EmailHistory[] = this.loadHistory();
      
      const newEntry: EmailHistory = {
        id: Date.now(),
        user_prompt: userPrompt,
        subject: emailDraft.subject,
        body: emailDraft.body,
        recipient: emailDraft.recipient || '',
        tone: emailDraft.tone,
        timestamp: Date.now()
      };
      
      history.unshift(newEntry); // Add to beginning
      
      // Keep only last 50 entries
      if (history.length > 50) {
        history.splice(50);
      }
      
      fs.writeFileSync(this.historyPath, JSON.stringify(history, null, 2));
      
      if (this.debug) {
        console.log(`[EmailService] Saved email to history (${history.length} total entries)`);
      }
    } catch (error) {
      console.error('[EmailService] Error saving to history:', error);
    }
  }

  /**
   * Load email history from file
   */
  private loadHistory(): EmailHistory[] {
    try {
      if (fs.existsSync(this.historyPath)) {
        const data = fs.readFileSync(this.historyPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('[EmailService] Error loading history:', error);
    }
    return [];
  }

  /**
   * Get email history
   */
  public getEmailHistory(limit: number = 20): EmailHistory[] {
    const history = this.loadHistory();
    return history.slice(0, limit);
  }

  /**
   * Clear email history
   */
  public clearEmailHistory(): void {
    try {
      if (fs.existsSync(this.historyPath)) {
        fs.unlinkSync(this.historyPath);
      }
    } catch (error) {
      console.error('[EmailService] Error clearing history:', error);
    }
  }

  /**
   * Check if AI is configured
   */
  public isAIConfigured(): boolean {
    return !!this.geminiApiKey;
  }

  /**
   * Get configuration status
   */
  public getConfigurationStatus(): {
    hasGemini: boolean;
  } {
    return {
      hasGemini: !!this.geminiApiKey
    };
  }
} 