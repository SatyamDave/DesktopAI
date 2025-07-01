import { exec } from 'child_process';

export class ActiveWindowService {
  private lastWindow: string = '';
  private interval: NodeJS.Timeout | null = null;
  private listeners: ((info: { title: string; process: string }) => void)[] = [];

  startPolling(intervalMs: number = 1500) {
    if (this.interval) return;
    this.interval = setInterval(() => {
      this.getActiveWindow().then(info => {
        const key = info.title + '|' + info.process;
        if (key !== this.lastWindow) {
          this.lastWindow = key;
          this.listeners.forEach(fn => fn(info));
        }
      });
    }, intervalMs);
  }

  stopPolling() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  onWindowChange(fn: (info: { title: string; process: string }) => void) {
    this.listeners.push(fn);
  }

  async getActiveWindow(): Promise<{ title: string; process: string }> {
    return new Promise(resolve => {
      // PowerShell script to get active window title and process
      const ps = `Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport(\"user32.dll\")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport(\"user32.dll\")]
    public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count);
    [DllImport(\"user32.dll\")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, [System.Runtime.InteropServices.Out] out uint lpdwProcessId);
} 
"@
$hwnd = [Win32]::GetForegroundWindow()
$sb = New-Object System.Text.StringBuilder 1024
[Win32]::GetWindowText($hwnd, $sb, $sb.Capacity) | Out-Null
$null = [Win32]::GetWindowThreadProcessId($hwnd, [ref]$pid)
$p = Get-Process -Id $pid
Write-Output "$($sb.ToString())|$($p.ProcessName)"`;
      exec(`powershell -Command "${ps}"`, { windowsHide: true }, (err, stdout) => {
        if (err || !stdout) return resolve({ title: '', process: '' });
        const [title, process] = stdout.trim().split('|');
        resolve({ title: title || '', process: process || '' });
      });
    });
  }
}

export const activeWindowService = new ActiveWindowService(); 