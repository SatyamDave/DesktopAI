import { clipboard } from 'electron';
import { EventEmitter } from 'events';

class ClipboardContextService extends EventEmitter {
  private lastText: string = '';
  private interval: NodeJS.Timeout | null = null;

  public startPolling(intervalMs: number = 1500) {
    if (this.interval) return;
    this.interval = setInterval(() => {
      this.pollClipboard();
    }, intervalMs);
    this.pollClipboard();
  }

  public stopPolling() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private pollClipboard() {
    try {
      const text = clipboard.readText();
      if (text !== this.lastText) {
        this.lastText = text;
        this.emit('clipboard-change', text);
      }
    } catch (err) {
      // Ignore clipboard errors
    }
  }

  public onClipboardChange(fn: (text: string) => void) {
    this.on('clipboard-change', fn);
  }
}

export const clipboardContextService = new ClipboardContextService(); 