const { createWorker } = require('tesseract.js');
const screenshot = require('screenshot-desktop');

module.exports = {
  name: "summarize_screen",
  description: "Summarize the visible content on the user's screen using OCR.",
  parameters: {},
  run: async (args, context) => {
    try {
      console.log('📸 Capturing screen for summary...');
      
      // Capture the screen
      const imgBuffer = await screenshot();
      
      // Perform OCR
      console.log('🔍 Running OCR on screen capture...');
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(imgBuffer);
      await worker.terminate();
      
      if (!text || !text.trim()) {
        return { 
          success: false, 
          message: "No text found on screen. Make sure there is visible text content." 
        };
      }
      
      console.log('📝 OCR completed, text length:', text.length);
      
      // Get context information
      const clipboardText = context.clipboardContent || '';
      const activeApp = context.activeApp || '';
      const windowTitle = context.windowTitle || '';
      
      // Build context block
      let contextBlock = '';
      if (clipboardText) contextBlock += `\n\nClipboard: ${clipboardText.substring(0, 500)}`;
      if (activeApp && windowTitle) contextBlock += `\n\nActive App: ${activeApp}\nActive Window: ${windowTitle}`;
      
      // Create prompt for summary
      const prompt = `You are DELO, a floating AI desktop assistant.

Here is the visible text from the user's screen:

${text.substring(0, 3000)}${contextBlock}

Your task:
1. Summarize what is happening on screen in 2-3 sentences
2. Infer what the user is trying to do or needs help with
3. Suggest 1-3 helpful actions (e.g., summarize, translate, reply, search, automate, open app)
4. Categorize the type of activity (e.g., email, coding, form filling, browsing, meeting, research, writing)

Return your output in this JSON format:
{
  "summary": "<what's happening>",
  "intent": "<inferred user goal>",
  "suggestedActions": ["<Action 1>", "<Action 2>", "<Action 3>"],
  "intentCategory": "<one-word category>"
}`;

      // Use OpenRouter API for summary
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        return { 
          success: false, 
          message: "OpenRouter API key not set. Please set OPENROUTER_API_KEY environment variable." 
        };
      }
      
      console.log('🤖 Generating AI summary...');
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are DELO, a helpful AI desktop assistant.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 512,
          temperature: 0.4
        })
      });
      
      const data = await response.json();
      let summary = '';
      let suggestions = [];
      let intent = '';
      let intentCategory = '';
      
      if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
        const raw = data.choices[0].message.content;
        
        // Try to extract JSON from the response
        const match = raw.match(/```json([\s\S]*?)```/);
        let jsonStr = '';
        if (match && match[1]) {
          jsonStr = match[1];
        } else {
          // fallback: try to find first { ... }
          const braceMatch = raw.match(/\{[\s\S]*\}/);
          if (braceMatch) jsonStr = braceMatch[0];
        }
        
        try {
          const parsed = JSON.parse(jsonStr);
          summary = parsed.summary || '';
          intent = parsed.intent || '';
          suggestions = parsed.suggestedActions || [];
          intentCategory = parsed.intentCategory || '';
        } catch (e) {
          summary = raw;
          suggestions = [];
        }
      }
      
      if (!summary) {
        summary = "I captured your screen but couldn't generate a summary. Here's what I found: " + text.substring(0, 200) + "...";
      }
      
      console.log('✅ Screen summary completed');
      
      return { 
        success: true, 
        message: summary,
        data: {
          summary,
          intent,
          suggestions,
          intentCategory,
          textLength: text.length
        }
      };
      
    } catch (error) {
      console.error('❌ Error in summarize_screen plugin:', error);
      return { 
        success: false, 
        message: `Failed to summarize screen: ${error.message || error}` 
      };
    }
  }
}; 