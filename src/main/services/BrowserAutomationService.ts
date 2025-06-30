// Optional puppeteer import
let puppeteer: any = null;
try {
  puppeteer = require('puppeteer');
} catch (error) {
  console.warn('⚠️ Puppeteer not available - browser automation features will be disabled');
}

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { aiProcessor } from './AIProcessor';
import { configManager } from './ConfigManager';

// Use any types instead of puppeteer types
type Browser = any;
type Page = any;
type ElementHandle = any;

interface EmailCompositionData {
  to?: string;
  subject?: string;
  body: string;
  autoSend?: boolean;
}

interface AutomationLog {
  id: string;
  action: string;
  timestamp: number;
  success: boolean;
  details: string;
  metadata?: any;
}

export class BrowserAutomationService {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private aiProcessor: typeof aiProcessor;
  private configManager: typeof configManager;
  private debug: boolean;
  private logsPath: string;
  private automationLogs: AutomationLog[] = [];
  private isInitialized: boolean = false;

  constructor() {
    this.aiProcessor = aiProcessor;
    this.configManager = configManager;
    this.debug = process.env.NODE_ENV === 'development';
    
    // Setup logs directory
    const logsDir = path.join(os.homedir(), '.doppel', 'automation-logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    this.logsPath = path.join(logsDir, 'browser-automation.json');
    
    this.loadLogs();
  }

  public async initialize(): Promise<void> {
    if (!puppeteer) {
      console.warn('⚠️ Browser automation not available - puppeteer not installed');
      return;
    }
    
    if (this.isInitialized) return;

    try {
      console.log('🌐 Initializing Browser Automation Service...');
      
      // Launch browser only if puppeteer is available
      if (puppeteer) {
        console.log('[BrowserAutomationService] Puppeteer launching...');
        this.browser = await puppeteer.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ]
        });
        console.log('✅ Browser launched successfully');
      }
      
      this.isInitialized = true;
      console.log('✅ Browser Automation Service initialized');
    } catch (error) {
      console.error('❌ Error initializing Browser Automation Service:', error);
      // Don't throw error, just log it and continue without browser automation
    }
  }

  /**
   * Main method to compose and send email via Gmail
   */
  public async composeEmailViaGmail(userPrompt: string, context?: any): Promise<string> {
    const logId = this.generateLogId();
    console.log('[BrowserAutomationService] composeEmailViaGmail called with:', userPrompt, context);
    let emailData: EmailCompositionData | undefined;
    
    try {
      this.logAction(logId, 'email_composition_started', true, 'Starting Gmail email composition workflow');
      
      // Step 1: Generate email content using AI
      emailData = await this.generateEmailContent(userPrompt, context);
      this.logAction(logId, 'email_content_generated', true, 'AI generated email content', emailData);
      
      // Step 2: Launch browser and navigate to Gmail
      console.log('[BrowserAutomationService] Launching browser...');
      await this.launchBrowser();
      console.log('[BrowserAutomationService] Navigating to Gmail...');
      await this.navigateToGmail();
      this.logAction(logId, 'gmail_navigation_complete', true, 'Successfully navigated to Gmail');
      
      // Step 3: Wait for Gmail to load and click compose
      await this.waitForGmailLoad();
      await this.clickComposeButton();
      this.logAction(logId, 'compose_button_clicked', true, 'Compose button clicked successfully');
      
      // Step 4: Fill email form
      await this.fillEmailForm(emailData);
      this.logAction(logId, 'email_form_filled', true, 'Email form filled with generated content', emailData);
      
      // Step 5: Handle sending
      if (emailData.autoSend) {
        await this.sendEmail();
        this.logAction(logId, 'email_sent', true, 'Email sent automatically');
        return `✅ Email composed and sent successfully!\n\n📧 To: ${emailData.to || 'Not specified'}\n📝 Subject: ${emailData.subject || 'No subject'}\n📄 Body: ${emailData.body.substring(0, 100)}...`;
      } else {
        this.logAction(logId, 'email_ready_for_review', true, 'Email ready for user review');
        return `✅ Email composed and ready for review!\n\n📧 To: ${emailData.to || 'Not specified'}\n📝 Subject: ${emailData.subject || 'No subject'}\n📄 Body: ${emailData.body.substring(0, 100)}...\n\n💡 The email is open in Gmail. Please review and send manually.`;
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logAction(logId, 'email_composition_failed', false, `Error: ${errorMessage}`);
      console.error('[BrowserAutomationService] Email composition error:', error);
      return `❌ Error composing email: ${errorMessage}`;
    } finally {
      // Don't close browser immediately - let user review the email
      if (emailData?.autoSend) {
        await this.closeBrowser();
      }
      console.log('[BrowserAutomationService] composeEmailViaGmail finished');
    }
  }

  /**
   * Generate email content using AI
   */
  private async generateEmailContent(userPrompt: string, context?: any): Promise<EmailCompositionData> {
    const prompt = `Generate an email based on this request: "${userPrompt}"

Please provide the email in the following JSON format:
{
  "to": "recipient email or name",
  "subject": "email subject line",
  "body": "email body content",
  "autoSend": false
}

Requirements:
- Extract recipient from the request if mentioned, otherwise leave as null
- Create a professional subject line
- Write a clear, appropriate email body
- Set autoSend to true only if the user explicitly requests immediate sending
- Keep the tone professional unless specified otherwise

Context: ${context ? JSON.stringify(context) : 'None'}`;

    try {
      const response = await this.aiProcessor.processInput(prompt, context);
      
      // Parse JSON response
      let emailData: EmailCompositionData;
      try {
        emailData = JSON.parse(response);
      } catch (parseError) {
        // Fallback if JSON parsing fails
        emailData = {
          subject: 'Email',
          body: response,
          autoSend: false
        };
      }
      
      return emailData;
    } catch (error) {
      console.error('[BrowserAutomationService] AI processing error:', error);
      throw new Error('Failed to generate email content with AI');
    }
  }

  /**
   * Launch browser with appropriate settings
   */
  private async launchBrowser(): Promise<void> {
    if (!puppeteer) {
      throw new Error('Puppeteer not available');
    }
    
    try {
      console.log('[BrowserAutomationService] Puppeteer launching...');
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
      
      if (this.browser) {
        this.page = await this.browser.newPage();
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        console.log('[BrowserAutomationService] Browser launched successfully');
      }
    } catch (err) {
      console.error('[BrowserAutomationService] Puppeteer failed to launch:', err);
      throw err;
    }
  }

  /**
   * Navigate to Gmail
   */
  private async navigateToGmail(): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    await this.page.goto('https://mail.google.com', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    if (this.debug) {
      console.log('[BrowserAutomationService] Navigated to Gmail');
    }
  }

  /**
   * Wait for Gmail to fully load
   */
  private async waitForGmailLoad(): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    // Wait for Gmail to load - look for compose button or main content
    await this.page.waitForFunction(() => {
      // Check for compose button or main Gmail interface
      const composeButton = document.querySelector('[data-tooltip="Compose"]') ||
                           document.querySelector('[aria-label="Compose"]') ||
                           document.querySelector('[title="Compose"]') ||
                           document.querySelector('.T-I.T-I-KE');
      
      const gmailLoaded = document.querySelector('#gb') || // Gmail header
                         document.querySelector('.AO') || // Main content area
                         document.querySelector('[role="main"]');
      
      return composeButton || gmailLoaded;
    }, { timeout: 30000 });

    // Additional wait for stability
    await this.page.waitForTimeout(2000);

    if (this.debug) {
      console.log('[BrowserAutomationService] Gmail loaded successfully');
    }
  }

  /**
   * Click the compose button
   */
  private async clickComposeButton(): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    // Try multiple selectors for compose button
    const composeSelectors = [
      '[data-tooltip="Compose"]',
      '[aria-label="Compose"]',
      '[title="Compose"]',
      '.T-I.T-I-KE',
      '.T-I.T-I-KE.L3',
      'div[role="button"][data-tooltip="Compose"]',
      'div[role="button"][aria-label="Compose"]'
    ];

    let composeButton: ElementHandle | null = null;
    
    for (const selector of composeSelectors) {
      try {
        composeButton = await this.page.$(selector);
        if (composeButton) {
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (!composeButton) {
      throw new Error('Compose button not found');
    }

    await composeButton.click();
    
    // Wait for compose window to appear
    await this.page.waitForFunction(() => {
      const composeWindow = document.querySelector('[role="dialog"]') ||
                           document.querySelector('.Am.Al.editable') ||
                           document.querySelector('[contenteditable="true"]');
      return composeWindow;
    }, { timeout: 10000 });

    if (this.debug) {
      console.log('[BrowserAutomationService] Compose button clicked');
    }
  }

  /**
   * Fill the email form with generated content
   */
  private async fillEmailForm(emailData: EmailCompositionData): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    // Fill recipient field
    if (emailData.to) {
      await this.fillRecipientField(emailData.to);
    }

    // Fill subject field
    if (emailData.subject) {
      await this.fillSubjectField(emailData.subject);
    }

    // Fill body field
    await this.fillBodyField(emailData.body);

    if (this.debug) {
      console.log('[BrowserAutomationService] Email form filled');
    }
  }

  /**
   * Fill recipient field
   */
  private async fillRecipientField(recipient: string): Promise<void> {
    if (!this.page) return;

    const recipientSelectors = [
      'input[name="to"]',
      'input[aria-label="To"]',
      'input[placeholder*="To"]',
      '.vO[aria-label="To"]',
      '[role="textbox"][aria-label="To"]'
    ];

    for (const selector of recipientSelectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 5000 });
        await this.page.type(selector, recipient);
        await this.page.keyboard.press('Tab');
        return;
      } catch (error) {
        continue;
      }
    }

    throw new Error('Recipient field not found');
  }

  /**
   * Fill subject field
   */
  private async fillSubjectField(subject: string): Promise<void> {
    if (!this.page) return;

    const subjectSelectors = [
      'input[name="subjectbox"]',
      'input[aria-label="Subject"]',
      'input[placeholder*="Subject"]',
      '.aoT[aria-label="Subject"]'
    ];

    for (const selector of subjectSelectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 5000 });
        await this.page.type(selector, subject);
        await this.page.keyboard.press('Tab');
        return;
      } catch (error) {
        continue;
      }
    }

    throw new Error('Subject field not found');
  }

  /**
   * Fill body field
   */
  private async fillBodyField(body: string): Promise<void> {
    if (!this.page) return;

    const bodySelectors = [
      '[role="textbox"][aria-label="Message Body"]',
      '.Am.Al.editable',
      '[contenteditable="true"]',
      'div[role="textbox"]',
      '.editable[contenteditable="true"]'
    ];

    for (const selector of bodySelectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 5000 });
        await this.page.click(selector);
        await this.page.keyboard.type(body);
        return;
      } catch (error) {
        continue;
      }
    }

    throw new Error('Body field not found');
  }

  /**
   * Send the email
   */
  private async sendEmail(): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    const sendSelectors = [
      '[data-tooltip="Send"]',
      '[aria-label="Send"]',
      '[title="Send"]',
      '.T-I.J-J5-Ji.aoO.T-I-atl.L3',
      'div[role="button"][data-tooltip="Send"]'
    ];

    for (const selector of sendSelectors) {
      try {
        await this.page.waitForSelector(selector, { timeout: 5000 });
        await this.page.click(selector);
        
        // Wait for send confirmation
        await this.page.waitForTimeout(2000);
        return;
      } catch (error) {
        continue;
      }
    }

    throw new Error('Send button not found');
  }

  /**
   * Close browser
   */
  public async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      
      if (this.debug) {
        console.log('[BrowserAutomationService] Browser closed');
      }
    }
  }

  /**
   * Log automation actions
   */
  private logAction(id: string, action: string, success: boolean, details: string, metadata?: any): void {
    const log: AutomationLog = {
      id,
      action,
      timestamp: Date.now(),
      success,
      details,
      metadata
    };

    this.automationLogs.push(log);
    this.saveLogs();

    if (this.debug) {
      console.log(`[BrowserAutomationService] ${action}: ${success ? 'SUCCESS' : 'FAILED'} - ${details}`);
    }
  }

  /**
   * Generate unique log ID
   */
  private generateLogId(): string {
    return `automation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Save logs to file
   */
  private saveLogs(): void {
    try {
      fs.writeFileSync(this.logsPath, JSON.stringify(this.automationLogs, null, 2));
    } catch (error) {
      console.error('[BrowserAutomationService] Failed to save logs:', error);
    }
  }

  /**
   * Load logs from file
   */
  private loadLogs(): void {
    try {
      if (fs.existsSync(this.logsPath)) {
        const logsData = fs.readFileSync(this.logsPath, 'utf8');
        this.automationLogs = JSON.parse(logsData);
      }
    } catch (error) {
      console.error('[BrowserAutomationService] Failed to load logs:', error);
      this.automationLogs = [];
    }
  }

  /**
   * Get automation logs
   */
  public getAutomationLogs(limit: number = 50): AutomationLog[] {
    return this.automationLogs.slice(-limit);
  }

  /**
   * Clear automation logs
   */
  public clearLogs(): void {
    this.automationLogs = [];
    this.saveLogs();
  }

  /**
   * Check if browser automation is available
   */
  public isAvailable(): boolean {
    return puppeteer !== null && this.browser !== null;
  }

  /**
   * Get service status
   */
  public getStatus(): {
    available: boolean;
    browserOpen: boolean;
    logsCount: number;
  } {
    return {
      available: this.isAvailable(),
      browserOpen: !!this.browser,
      logsCount: this.automationLogs.length
    };
  }
}

export const browserAutomationService = new BrowserAutomationService(); 