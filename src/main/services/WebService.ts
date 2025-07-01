import { shell } from 'electron';

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

/**
 * A lightweight helper focused on common web-centric automations that the assistant needs.
 * Right now it only knows how to deal with YouTube searches but can be expanded easily.
 */
export class WebService {
  private browser: any = null;

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
}

// Singleton export so services can share the same browser instance if needed.
export const webService = new WebService();