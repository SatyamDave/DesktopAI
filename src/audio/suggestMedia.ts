import { NowPlayingTrack, MusicOnlyEvent } from './types';

export function suggestMedia(event: NowPlayingTrack | MusicOnlyEvent): string[] {
  let suggestions: string[] = [];
  if (event.type === 'track') {
    suggestions = [
      `Show lyrics for "${event.title}"`,
      `Add "${event.title}" to playlist`,
      `Summarize video: "${event.title}"`
    ];
  } else {
    suggestions = [
      'Need lyrics or Shazam info?'
    ];
  }
  console.log('[SuggestMedia] Suggestions:', suggestions);
  return suggestions;
} 