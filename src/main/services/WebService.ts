import { shell } from 'electron';
import fetch from 'node-fetch';
import * as crypto from 'crypto';

// Allow commonjs require in this file (used for optional Puppeteer dependency)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: any;

// Optional dependency – Puppeteer lets us automate clicking the first video.
// It is not required for basic behaviour.
let puppeteer: any = null;
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore  // Node style require is fine in Electron main process
// eslint-disable-next-line @typescript-eslint/no-var-requires
puppeteer = (() => {
  try { return require('puppeteer'); } catch { return null; }
})();

// Supported providers
const PROVIDERS = ['google', 'microsoft', 'youtube', 'spotify'] as const;
type Provider = typeof PROVIDERS[number];

interface TokenData {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

/**
 * A lightweight helper focused on common web-centric automations that the assistant needs.
 * Right now it only knows how to deal with YouTube searches but can be expanded easily.
 */
export class WebService {
  private browser: any = null;
  private tokenStore: Map<Provider, TokenData> = new Map();

  /**
   * Opens a YouTube search for the provided query. If `autoPlay` is true and Puppeteer
   * is available, the service will automatically click the first search result so the
   * video starts playing. Otherwise it simply opens the search page in the user's
   * default browser.
   */
  public async openYouTubeSearch(query: string, autoPlay = false): Promise<string> {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

    // Fast-path: no Puppeteer / no autoplay requested → just open the browser.
    if (!autoPlay || !puppeteer) {
      await shell.openExternal(searchUrl);
      return `🔍 Searching YouTube for "${query}" in your default browser.`;
    }

    // Advanced path: launch a headless browser and click the first result.
    try {
      this.browser = await puppeteer.launch({ headless: false }); // show browser so user sees action
      const page = await this.browser.newPage();
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });

      // YouTube changes its DOM frequently. The selector below targets the first thumbnail.
      const firstVideoSelector = 'ytd-video-renderer a#thumbnail';
      await page.waitForSelector(firstVideoSelector, { timeout: 10000 });
      await page.click(firstVideoSelector);

      return `▶️ Playing the top YouTube result for "${query}".`;
    } catch (err) {
      console.error('[WebService] Failed automatic playback – falling back to browser:', err);
      if (this.browser) await this.browser.close();
      await shell.openExternal(searchUrl);
      return `🔍 Searching YouTube for "${query}" in your default browser.`;
    }
  }

  /**
   * Closes the internal Puppeteer browser if one is running.
   */
  public async dispose(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // Step 1: Get OAuth URL for user to authenticate
  getAuthUrl(provider: Provider): string {
    switch (provider) {
      case 'google':
        return 'https://accounts.google.com/o/oauth2/v2/auth?...'; // TODO: Fill in client_id, redirect_uri, scopes
      case 'microsoft':
        return 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?...';
      case 'youtube':
        return 'https://accounts.google.com/o/oauth2/v2/auth?...'; // YouTube uses Google OAuth
      case 'spotify':
        return 'https://accounts.spotify.com/authorize?...';
      default:
        throw new Error('Unsupported provider');
    }
  }

  // Step 2: Handle OAuth callback and exchange code for tokens
  async handleAuthCallback(provider: Provider, code: string): Promise<TokenData> {
    // TODO: Implement provider-specific token exchange
    // Placeholder: return dummy token
    const token: TokenData = {
      access_token: crypto.randomBytes(32).toString('hex'),
      refresh_token: crypto.randomBytes(32).toString('hex'),
      expires_at: Date.now() + 3600 * 1000,
    };
    this.tokenStore.set(provider, token);
    return token;
  }

  // Step 3: Get access token (refresh if expired)
  async getAccessToken(provider: Provider): Promise<string> {
    const token = this.tokenStore.get(provider);
    if (!token) throw new Error('No token for provider');
    if (token.expires_at && token.expires_at < Date.now()) {
      await this.refreshToken(provider);
      return this.tokenStore.get(provider)!.access_token;
    }
    return token.access_token;
  }

  // Step 4: Refresh token
  async refreshToken(provider: Provider): Promise<void> {
    // TODO: Implement provider-specific refresh logic
    // Placeholder: extend expiry
    const token = this.tokenStore.get(provider);
    if (token) {
      token.expires_at = Date.now() + 3600 * 1000;
      this.tokenStore.set(provider, token);
    }
  }
}

// Singleton export so services can share the same browser instance if needed.
export const webService = new WebService();