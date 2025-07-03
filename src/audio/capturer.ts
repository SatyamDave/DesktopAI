import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { Worker } from 'worker_threads';
import * as os from 'os';
import * as path from 'node:path';

const sttW = new Worker(path.join(__dirname, 'sttWorker.js'));
const wakeW = new Worker(path.join(__dirname, 'wakeDetector.js'));

let sox: ChildProcessWithoutNullStreams | null = null;
let ffmpeg: ChildProcessWithoutNullStreams | null = null;
let pushStream: NodeJS.ReadableStream | null = null;
let sttActive = false;

function startAudioCapture() {
  if (os.platform() === 'darwin') {
    if (sox) return;
    sox = spawn('sox', ['-d', '-c', '1', '-r', '16000', '-b', '16', '-e', 'signed-integer', '-t', 'raw', '-']);
    pushStream = sox.stdout;
  } else if (os.platform() === 'win32') {
    if (ffmpeg) return;
    // You may need to adjust the audio device name for your system
    ffmpeg = spawn('ffmpeg', ['-f', 'dshow', '-i', 'audio=Stereo Mix', '-ac', '1', '-ar', '16000', '-f', 's16le', '-']);
    pushStream = ffmpeg.stdout;
  } else {
    throw new Error('Unsupported platform for audio capture');
  }

  if (pushStream) {
    pushStream.on('data', buf => {
      wakeW.postMessage(buf, [buf.buffer]);
      if (sttActive) sttW.postMessage(buf, [buf.buffer]);
    });
  }
}

wakeW.on('message', m => {
  if (m.type === 'wake') {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wake', { detail: m }));
    }
    if (typeof process !== 'undefined' && (process as any).emit) {
      (process as any).emit('wake', m);
    }
    sttActive = true;
  }
});

sttW.on('message', m => {
  if (m.type === 'transcript') {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('transcript', { detail: m }));
    }
    if (typeof process !== 'undefined' && (process as any).emit) {
      (process as any).emit('transcript', m);
    }
  } else if (m.type === 'chat') {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('chat', { detail: m }));
    }
    if (typeof process !== 'undefined' && (process as any).emit) {
      (process as any).emit('chat', m);
    }
  } else if (m.type === 'suggestion') {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('suggestion', { detail: m }));
    }
    if (typeof process !== 'undefined' && (process as any).emit) {
      (process as any).emit('suggestion', m);
    }
  } else if (m.type === 'error') {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('audio-error', { detail: m }));
    }
    if (typeof process !== 'undefined' && (process as any).emit) {
      (process as any).emit('audio-error', m);
    }
  }
});

export function stopAudioCapture() {
  if (sox) { sox.kill(); sox = null; }
  if (ffmpeg) { ffmpeg.kill(); ffmpeg = null; }
  sttActive = false;
}

export function startStream() {
  startAudioCapture();
} 