const { shell } = require('electron');

const manifest = {
  name: "open_url",
  description: "Open a URL or perform a web search",
  parametersSchema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "URL to open or search query"
      },
      searchEngine: {
        type: "string",
        description: "Search engine to use (google, bing, duckduckgo)",
        default: "google"
      },
      useVideoSearch: {
        type: "boolean",
        description: "Whether to use video search service for finding specific video URLs",
        default: false
      }
    },
    required: ["url"]
  },
  version: "1.0.0",
  author: "Friday Team"
};

async function run(args, context) {
  try {
    let finalUrl = args.url;
    
    // Handle video search if requested
    if (args.useVideoSearch) {
      try {
        // Import the video search service
        const { videoSearchService } = require('../../dist/main/services/VideoSearchService');
        const videoResult = await videoSearchService.findVideo(args.url);
        
        if (videoResult && videoResult.url) {
          finalUrl = videoResult.url;
          console.log(`[open_url] Found video: ${videoResult.title} at ${videoResult.url}`);
        } else {
          // Fallback to YouTube search
          finalUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(args.url)}`;
        }
      } catch (error) {
        console.log(`[open_url] Video search failed, falling back to YouTube search: ${error}`);
        finalUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(args.url)}`;
      }
    }
    // If it's not a valid URL and not a video search, treat it as a search query
    else if (!isValidUrl(args.url)) {
      const searchEngine = args.searchEngine || 'google';
      const searchUrls = {
        google: `https://www.google.com/search?q=${encodeURIComponent(args.url)}`,
        bing: `https://www.bing.com/search?q=${encodeURIComponent(args.url)}`,
        duckduckgo: `https://duckduckgo.com/?q=${encodeURIComponent(args.url)}`
      };
      
      finalUrl = searchUrls[searchEngine] || searchUrls.google;
    }

    // Open the URL in the default browser
    await shell.openExternal(finalUrl);
    
    return {
      success: true,
      message: `Opened ${finalUrl}`,
      summary: `Opened ${finalUrl}`,
      data: {
        originalUrl: args.url,
        finalUrl,
        searchEngine: args.searchEngine,
        useVideoSearch: args.useVideoSearch
      }
    };
    
  } catch (error) {
    return {
      success: false,
      message: `Failed to open URL: ${error}`,
      error: String(error)
    };
  }
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

module.exports.manifest = manifest;
module.exports.run = run; 