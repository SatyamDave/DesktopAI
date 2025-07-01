# DELO Gemini Integration Guide

## Overview

DELO now features a powerful Gemini-powered prompt clarification system that:

1. **Sends user prompts to Gemini API** for intelligent clarification and expansion
2. **Breaks down complex requests** into clear, actionable steps
3. **Requests user confirmation** before executing any actions
4. **Executes multiple actions** based on the clarified intent
5. **Provides transparent feedback** on what will be done

## Setup Instructions

### 1. Get Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

### 2. Configure Environment

Create a `.env` file in the project root:

```bash
# Copy the example file
cp env.example .env

# Edit the file and add your API key
GEMINI_API_KEY=your-actual-gemini-api-key-here
```

### 3. Test Integration

Run the test script to verify your API key works:

```bash
node test-gemini-integration.js
```

You should see:
```
✅ Gemini API response received!
✅ JSON parsing successful!
🎯 Clarified Intent: [clarified intent]
📋 Action Steps: [number of steps]
🔍 Context: [context information]
```

## How It Works

### 1. User Input Flow

```
User types: "summarize this and email it to team"
     ↓
DELO sends to Gemini with clipboard context
     ↓
Gemini returns: {
  "clarifiedIntent": "Summarize clipboard content and compose email to team",
  "actionSteps": [
    "Extract and summarize the clipboard content",
    "Open email composition interface",
    "Draft email with summary and team recipients"
  ],
  "context": "Assuming clipboard contains relevant content to summarize"
}
     ↓
DELO shows clarification to user
     ↓
User confirms: "yes"
     ↓
DELO executes each action step
```

### 2. Confirmation Interface

When you enter a command, DELO will show:

```
🤖 Here's what I understood from your prompt:

Original: "summarize this and email it to team"
Clarified Intent: Summarize clipboard content and compose email to team
Action Steps:
1. Extract and summarize the clipboard content
2. Open email composition interface  
3. Draft email with summary and team recipients

Context: Assuming clipboard contains relevant content to summarize

[Input field] Type 'yes' to proceed or 'no' to modify
[Confirm & Execute] [Modify Prompt]
```

### 3. Execution Results

After confirmation, DELO shows detailed results:

```
✅ Executed Successfully!

Step 1: Extract and summarize the clipboard content
Result: Summary generated successfully
Action: summarize

Step 2: Open email composition interface
Result: Email client opened
Action: open

Step 3: Draft email with summary and team recipients
Result: Email drafted with summary content
Action: email
```

## Example Commands

### Simple Commands
- `"open chrome"` → Opens Chrome browser
- `"what time is it"` → Shows current time
- `"take screenshot"` → Captures screen

### Complex Commands
- `"summarize this and email it to team"` → Multi-step process
- `"search for python tutorials and save the best ones"` → Web search + file operations
- `"fix this text and send it to john"` → Text correction + messaging

### Vague Commands
- `"do something with this"` → Gemini will ask for clarification
- `"help me organize"` → Gemini will suggest specific actions
- `"make this better"` → Gemini will determine what "better" means

## Keyboard Shortcuts

- **Enter**: Execute command or confirm action
- **Escape**: Cancel or modify prompt
- **Ctrl+H**: Toggle orb visibility
- **Alt+Space**: Show orb

## Troubleshooting

### API Key Issues
```
❌ Gemini API test failed: 400 Bad Request
```
- Check your API key is correct
- Ensure you have billing enabled on Google AI Studio
- Verify the API key has proper permissions

### No Response from Gemini
```
❌ Gemini API error: Network Error
```
- Check your internet connection
- Verify the API endpoint is accessible
- Try the test script to isolate the issue

### Fallback Mode
If Gemini API fails, DELO will:
1. Use basic command expansion
2. Execute single actions
3. Show fallback processing message

## Advanced Configuration

### Customizing Gemini Prompts

Edit the prompt in `src/main/main-working.js`:

```javascript
const prompt = `Your custom prompt template here...`;
```

### Adding New Action Types

1. Add new patterns in `expandCommand()` function
2. Add new action types in `determineActionType()` function  
3. Add new handlers in `executeAction()` function

### Environment Variables

```bash
# Required
GEMINI_API_KEY=your-api-key

# Optional
NODE_ENV=development
ELECTRON_IS_DEV=true
```

## Security Notes

- Never commit your API key to version control
- Use environment variables for sensitive data
- The API key is only used for prompt clarification
- No user data is stored or transmitted beyond the API call

## Performance Tips

- Gemini API calls typically take 1-3 seconds
- Complex prompts may take longer
- Results are cached during the session
- Fallback mode is instant if API fails

## Support

If you encounter issues:

1. Run `node test-gemini-integration.js` to test API connectivity
2. Check the console logs for detailed error messages
3. Verify your API key and billing status
4. Try simpler commands to isolate the issue

---

**Happy AI-assisted productivity! 🚀** 