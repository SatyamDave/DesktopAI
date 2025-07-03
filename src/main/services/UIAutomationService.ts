import * as os from 'os';
import { exec } from 'child_process';
import OpenAI from 'openai';

const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY!
});

class UIAutomationService {
  private isMac = os.platform() === 'darwin';
  private isWin = os.platform() === 'win32';

  // Find UI elements in an app (macOS: list menu items as example)
  async findElements(appName: string): Promise<any[]> {
    if (this.isMac) {
      const script = `
        tell application "System Events"
          set menuItems to name of every menu item of menu 1 of menu bar 1 of application process "${appName}"
        end tell
        return menuItems
      `;
      try {
        const { stdout } = await this.execAppleScript(script);
        const items = stdout.trim().split(',').map(s => s.trim()).filter(Boolean);
        return items.map((title, index) => ({ title, role: 'AXMenuItem', index }));
      } catch (err) {
        console.error('[UIAutomationService] findElements error:', err);
        return [];
      }
    } else if (this.isWin) {
      // TODO: Use PowerShell/UIA to list elements
      return [{ title: 'File', role: 'MenuItem', index: 0 }];
    }
    return [];
  }

  // Click a UI element by title (macOS: click menu item)
  async clickElement(selector: { appName: string; title?: string; role?: string; index?: number }): Promise<boolean> {
    if (this.isMac && selector.title) {
      const script = `
        tell application "System Events"
          tell process "${selector.appName}"
            click menu item "${selector.title}" of menu 1 of menu bar 1
          end tell
        end tell
      `;
      try {
        await this.execAppleScript(script);
        return true;
      } catch (err) {
        console.error('[UIAutomationService] clickElement error:', err);
        return false;
      }
    } else if (this.isWin) {
      // TODO: Use PowerShell/UIA to click element
      return true;
    }
    return false;
  }

  // Type text into the frontmost app (macOS: use System Events)
  async typeText(selector: { appName: string; title?: string; role?: string; index?: number }, text: string): Promise<boolean> {
    if (this.isMac) {
      const script = `
        tell application "${selector.appName}"
          activate
          delay 0.5
          tell application "System Events"
            keystroke "${text.replace(/"/g, '\"')}"
          end tell
        end tell
      `;
      try {
        await this.execAppleScript(script);
        return true;
      } catch (err) {
        console.error('[UIAutomationService] typeText error:', err);
        return false;
      }
    } else if (this.isWin) {
      // TODO: Use PowerShell/UIA to type text
      return true;
    }
    return false;
  }

  /**
   * Universal automation entry point
   * Supported actions: create_note, find_note, play_song, play_video
   */
  async perform(action: string, params: any): Promise<{ success: boolean; message: string }> {
    if (!this.isMac) {
      return { success: false, message: 'Universal automation only implemented for macOS.' };
    }
    try {
      switch (action) {
        case 'create_note':
          return await this.createNote(params.content);
        case 'find_note':
          return await this.findNote(params.query);
        case 'play_song':
          return await this.playSong(params.song, params.app || 'Music');
        case 'play_video':
          return await this.playYouTubeVideo(params.video);
        default:
          return { success: false, message: `Unknown action: ${action}` };
      }
    } catch (err) {
      return { success: false, message: String(err) };
    }
  }

  /**
   * AI-powered automation: generate and run AppleScript for a user request using OpenRouter
   */
  async aiAutomate(userRequest: string): Promise<{ success: boolean; script: string; output: string; error?: string }> {
    if (!this.isMac) {
      return { success: false, script: '', output: '', error: 'AI automation only implemented for macOS.' };
    }
    try {
      // 1. Ask OpenRouter to generate AppleScript
      const completion = await openrouter.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are an expert in AppleScript automation. Only output valid AppleScript. Do not explain.' },
          { role: 'user', content: `Write an AppleScript to: ${userRequest}` }
        ]
      });
      const script = completion.choices?.[0]?.message?.content?.trim();
      if (!script) {
        return { success: false, script: '', output: '', error: 'AI did not return a script.' };
      }
      console.log('[AI Automation] Generated AppleScript:', script);
      // 2. (Optional) Security review step: log or prompt for approval
      // 3. Execute the script
      const { stdout, stderr } = await this.execAppleScript(script);
      return { success: true, script, output: stdout.trim(), error: stderr?.trim() };
    } catch (err: any) {
      return { success: false, script: '', output: '', error: String(err) };
    }
  }

  // --- App-specific robust automation ---

  private async createNote(content: string): Promise<{ success: boolean; message: string }> {
    const script = `
      tell application "Notes"
        activate
        delay 0.5
        tell application "System Events"
          keystroke "n" using command down
          delay 0.5
          keystroke "${content.replace(/"/g, '\"')}"
        end tell
      end tell
    `;
    await this.execAppleScript(script);
    return { success: true, message: 'Note created.' };
  }

  private async findNote(query: string): Promise<{ success: boolean; message: string }> {
    const script = `
      tell application "Notes"
        activate
        delay 0.5
        set foundNotes to every note whose name contains "${query.replace(/"/g, '\"')}" or body contains "${query.replace(/"/g, '\"')}"
        if (count of foundNotes) > 0 then
          show note 1 of foundNotes
          return name of note 1 of foundNotes
        else
          return "No note found"
        end if
      end tell
    `;
    const { stdout } = await this.execAppleScript(script);
    return { success: true, message: stdout.trim() };
  }

  private async playSong(song: string, app: string): Promise<{ success: boolean; message: string }> {
    // Default to Apple Music
    if (app.toLowerCase() === 'music' || app.toLowerCase() === 'itunes') {
      const script = `
        tell application "Music"
          activate
          delay 0.5
          set foundTracks to (every track whose name contains "${song.replace(/"/g, '\"')}")
          if (count of foundTracks) > 0 then
            play item 1 of foundTracks
            return "Playing: " & name of item 1 of foundTracks
          else
            return "Song not found"
          end if
        end tell
      `;
      const { stdout } = await this.execAppleScript(script);
      return { success: true, message: stdout.trim() };
    } else if (app.toLowerCase() === 'spotify') {
      // Spotify AppleScript (requires Spotify app)
      const script = `
        tell application "Spotify"
          activate
          delay 0.5
          play track (first track whose name contains "${song.replace(/"/g, '\"')}")
        end tell
      `;
      await this.execAppleScript(script);
      return { success: true, message: `Requested song in Spotify: ${song}` };
    } else {
      return { success: false, message: `Unsupported music app: ${app}` };
    }
  }

  private async playYouTubeVideo(video: string): Promise<{ success: boolean; message: string }> {
    // Use AppleScript to open the first YouTube search result and play it
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(video)}`;
    const script = `
      tell application "Google Chrome"
        activate
        delay 0.5
        open location "${searchUrl}"
        delay 2
        tell application "System Events"
          keystroke "\t"
          delay 0.2
          keystroke "\r"
        end tell
      end tell
    `;
    await this.execAppleScript(script);
    return { success: true, message: `Opened and played: ${video}` };
  }

  // Helper to run AppleScript via osascript
  private execAppleScript(script: string): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      exec(`osascript -e '${script.replace(/'/g, "'\\''")}'`, (err, stdout, stderr) => {
        if (err) reject(stderr || err);
        else resolve({ stdout, stderr });
      });
    });
  }
}

export default new UIAutomationService(); 