import { clipboardContextService } from './ClipboardContextService';
import { activeWindowService } from './ActiveWindowService';
import { fileSystemService } from './FileSystemService';
import { screenOCRService } from './ScreenOCRService';

export interface AggregatedContext {
  clipboard: string;
  activeWindow: { title: string; app: string } | null;
  recentFiles: string[];
  ocrText: string;
}

export class ContextAggregatorService {
  private context: AggregatedContext = {
    clipboard: '',
    activeWindow: null,
    recentFiles: [],
    ocrText: '',
  };
  private listeners: ((ctx: AggregatedContext) => void)[] = [];

  constructor() {
    clipboardContextService.onClipboardChange((text) => {
      this.context.clipboard = text;
      this.emit();
    });
    activeWindowService.onWindowChange((win) => {
      this.context.activeWindow = { title: win.title, app: win.process };
      this.emit();
    });
    fileSystemService.onFileEvent((event) => {
      this.context.recentFiles = fileSystemService.getRecentFiles();
      this.emit();
    });
    screenOCRService.onTextChange((text) => {
      this.context.ocrText = text;
      this.emit();
    });
  }

  getContext() {
    return this.context;
  }

  onContextChange(fn: (ctx: AggregatedContext) => void) {
    this.listeners.push(fn);
  }

  private emit() {
    for (const fn of this.listeners) fn(this.context);
  }
}

export const contextAggregatorService = new ContextAggregatorService(); 