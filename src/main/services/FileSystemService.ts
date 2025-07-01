import { dialog, app } from 'electron';
import chokidar from 'chokidar';
import * as path from 'path';
import * as fs from 'fs';

export class FileSystemService {
  private recentFiles: string[] = [];
  private watchers: chokidar.FSWatcher[] = [];
  private listeners: ((event: { type: 'open' | 'change', file: string }) => void)[] = [];

  async openFileDialog(mainWindow: Electron.BrowserWindow) {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
    });
    if (!canceled && filePaths.length > 0) {
      filePaths.forEach((file) => this.addRecentFile(file));
    }
    return filePaths;
  }

  addRecentFile(file: string) {
    if (!this.recentFiles.includes(file)) {
      this.recentFiles.unshift(file);
      if (this.recentFiles.length > 20) this.recentFiles.pop();
      this.emit({ type: 'open', file });
    }
  }

  watchDirectory(baseDir: string) {
    // Only watch a safe subfolder
    const safeDir = path.join(baseDir, 'DELOWatched');
    if (!fs.existsSync(safeDir)) {
      fs.mkdirSync(safeDir, { recursive: true });
    }
    const watcher = chokidar.watch(safeDir, { ignoreInitial: true });
    watcher.on('all', (event, filePath) => {
      if (event === 'add' || event === 'change') {
        this.emit({ type: 'change', file: filePath });
      }
    });
    watcher.on('error', (err) => {
      if ((err as any)?.code === 'EPERM') return; // Ignore permission errors
      console.error('[FileSystemService] Watcher error:', err);
    });
    this.watchers.push(watcher);
  }

  getRecentFiles() {
    return this.recentFiles;
  }

  onFileEvent(fn: (event: { type: 'open' | 'change', file: string }) => void) {
    this.listeners.push(fn);
  }

  private emit(event: { type: 'open' | 'change', file: string }) {
    for (const fn of this.listeners) fn(event);
  }

  cleanup() {
    this.watchers.forEach(w => w.close());
    this.watchers = [];
  }
}

export const fileSystemService = new FileSystemService(); 