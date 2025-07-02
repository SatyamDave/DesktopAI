import fetch from 'node-fetch';

export interface VideoSearchResult {
  title: string;
  url: string;
  platform: 'youtube' | 'vimeo' | 'other';
  confidence: number;
}

export class VideoSearchService {
  private debug: boolean;
  private geminiApiKey: string;

  constructor() {
    this.debug = process.env.DEBUG_MODE === 'true';
    this.geminiApiKey = process.env.GEMINI_API_KEY || '';
  }

  public async findVideo(query: string): Promise<VideoSearchResult | null> {
    try {
      this.log(`Searching for video: "${query}"`);

      if (!this.geminiApiKey) {
        this.log('No Gemini API key available, falling back to direct search');
        return this.fallbackSearch(query);
      }

      // Use Gemini to find the specific video URL
      const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=' + this.geminiApiKey;
      
      const prompt = `Find the most relevant video URL for: "${query}"

Please return ONLY a JSON object with this exact format:
{
  "title": "Video title",
  "url": "Direct video URL",
  "platform": "youtube|vimeo|other",
  "confidence": 0.9
}

If you can't find a specific video, return null.`;

      const body = {
        contents: [
          { parts: [{ text: prompt }] }
        ]
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      this.log('Gemini response:', data);

      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const text = data.candidates[0].content.parts[0].text;
        
        // Try to parse JSON from the response
        try {
          const result = JSON.parse(text);
          if (result && result.url) {
            return result;
          }
        } catch (e) {
          this.log('Failed to parse JSON from Gemini response');
        }
      }

      // Fallback to direct search
      return this.fallbackSearch(query);

    } catch (error) {
      this.log('Error searching for video:', error);
      return this.fallbackSearch(query);
    }
  }

  private fallbackSearch(query: string): VideoSearchResult {
    // Fallback to YouTube search
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    
    return {
      title: `Search results for: ${query}`,
      url: searchUrl,
      platform: 'youtube',
      confidence: 0.5
    };
  }

  private log(message: string, data?: any) {
    if (this.debug) {
      console.log(`[VideoSearchService] ${message}`, data || '');
    }
  }
}

export const videoSearchService = new VideoSearchService(); 