import { EventEmitter } from 'events';
import { NowPlayingTrack, MusicOnlyEvent } from './types';

let macNowPlaying: any = null;
try {
  macNowPlaying = require('node-mac-nowplaying');
} catch (err) {
  console.warn('[NowPlaying] node-mac-nowplaying not available:', err);
}

class NowPlayingService extends EventEmitter {
  constructor() { super(); }
  start() {
    if (process.platform === 'darwin' && macNowPlaying) {
      macNowPlaying.on('playing', (info: any) => {
        if (info && info.title && info.artist && info.app) {
          const event: NowPlayingTrack = {
            type: 'track',
            title: info.title,
            artist: info.artist,
            app: info.app
          };
          this.emit('nowPlaying', event);
          console.log('[NowPlaying] Track:', event);
        } else {
          const event: MusicOnlyEvent = { type: 'musicOnly' };
          this.emit('nowPlaying', event);
          console.log('[NowPlaying] Music only');
        }
      });
      macNowPlaying.start();
    } else if (process.platform === 'win32') {
      // TODO: Implement SMTC wrapper for Windows
      console.warn('[NowPlaying] Windows SMTC not implemented');
    } else {
      // TODO: Implement YAMNet fallback for music/speech detection
      console.warn('[NowPlaying] Fallback (YAMNet) not implemented');
    }
  }
}

export const nowPlayingService = new NowPlayingService(); 