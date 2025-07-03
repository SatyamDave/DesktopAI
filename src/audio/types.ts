export interface TranscriptSnippet {
  text: string;
  ts: number;
}

export interface NowPlayingTrack {
  type: 'track';
  title: string;
  artist: string;
  app: string;
}

export interface MusicOnlyEvent {
  type: 'musicOnly';
}

export type AudioEvent = NowPlayingTrack | MusicOnlyEvent; 