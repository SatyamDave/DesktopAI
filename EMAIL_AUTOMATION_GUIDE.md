# Email Automation Guide

## Overview

The Orb assistant now includes a powerful email automation feature that can automatically compose and send emails through Gmail using browser automation. This feature combines AI-powered content generation with seamless browser control.

## Features

### 🤖 AI-Powered Email Generation
- Automatically generates professional email content based on your request
- Extracts recipient information from your prompt
- Creates appropriate subject lines
- Maintains professional tone and formatting

### 🌐 Browser Automation
- Opens Gmail in your default browser
- Automatically navigates to the compose interface
- Fills in recipient, subject, and body fields
- Handles Gmail's dynamic interface elements

### 📝 Smart Workflow
- **Step 1**: AI generates email content
- **Step 2**: Browser opens and navigates to Gmail
- **Step 3**: Waits for Gmail to load completely
- **Step 4**: Clicks compose button
- **Step 5**: Fills email form with generated content
- **Step 6**: Pauses for user review or auto-sends based on request

## How to Use

### Basic Usage

Simply say to the Orb assistant:

```
"write an email to john@example.com about the project meeting tomorrow"
```

### Advanced Usage

You can be more specific about the content:

```
"compose an email to sarah@company.com requesting a budget review for Q4"
```

```
"send an email to the team about the new office policy"
```

### Auto-Send Option

To automatically send the email (use with caution):

```
"write and send an email to client@example.com about the proposal"
```

## Technical Implementation

### Architecture

The email automation system consists of several components:

1. **BrowserAutomationService** (`src/main/services/BrowserAutomationService.ts`)
   - Handles Puppeteer browser automation
   - Manages Gmail navigation and form filling
   - Provides logging and error handling

2. **CommandExecutor Integration** (`src/main/services/CommandExecutor.ts`)
   - Detects email-related commands
   - Routes requests to BrowserAutomationService
   - Provides user feedback

3. **AI Integration** (`src/main/services/AIProcessor.ts`)
   - Generates email content using configured AI providers
   - Parses user intent and context
   - Creates structured email data

### Dependencies

- **Puppeteer**: Browser automation library
- **AIProcessor**: For content generation
- **ConfigManager**: For service configuration

### Browser Automation Flow

```mermaid
graph TD
    A[User says "write an email"] --> B[AI generates content]
    B --> C[Launch browser with Puppeteer]
    C --> D[Navigate to Gmail]
    D --> E[Wait for page load]
    E --> F[Click compose button]
    F --> G[Fill recipient field]
    G --> H[Fill subject field]
    H --> I[Fill body field]
    I --> J{User requested auto-send?}
    J -->|Yes| K[Click send button]
    J -->|No| L[Pause for user review]
    K --> M[Close browser]
    L --> N[Keep browser open]
```

## Configuration

### Environment Variables

The system uses existing AI configuration:

- `AZURE_OPENAI_API_KEY`: For Azure OpenAI integration
- `AZURE_OPENAI_ENDPOINT`: Azure OpenAI endpoint
- `AZURE_OPENAI_DEPLOYMENT_NAME`: Model deployment name
- `GEMINI_API_KEY`: For Google Gemini integration

### Service Settings

The BrowserAutomationService automatically:
- Creates log directories in `~/.doppel/automation-logs/`
- Stores automation history for debugging
- Handles browser session management

## Error Handling

### Common Issues

1. **Browser Launch Failures**
   - Check if Puppeteer is properly installed
   - Verify system has sufficient resources
   - Ensure no conflicting browser instances

2. **Gmail Navigation Issues**
   - Network connectivity problems
   - Gmail interface changes
   - Authentication requirements

3. **Form Filling Errors**
   - Gmail interface updates
   - Selector changes
   - Page load timing issues

### Debugging

Enable debug mode by setting `NODE_ENV=development`:

```bash
export NODE_ENV=development
```

Check automation logs:

```javascript
const automationService = new BrowserAutomationService();
const logs = automationService.getAutomationLogs();
console.log(logs);
```

## Security Considerations

### Browser Security
- Browser runs in non-headless mode for user visibility
- No automatic credential storage
- User maintains control over final send action

### Data Privacy
- Email content is generated locally using AI
- No email content is stored permanently
- Logs contain only metadata, not email content

### Best Practices
- Always review emails before sending
- Use specific recipient addresses
- Test with non-critical emails first

## Future Enhancements

### Planned Features
- Support for other email providers (Outlook, Yahoo)
- Email templates and signatures
- Attachment handling
- Calendar integration for meeting scheduling
- Email threading and conversation management

### Extensibility
The modular design allows for easy extension:
- New email providers can be added
- Different AI models can be integrated
- Custom automation workflows can be created

## Testing

### Manual Testing
1. Start the Orb assistant
2. Say "write an email to test@example.com about testing"
3. Verify browser opens and navigates to Gmail
4. Check that form fields are filled correctly
5. Review the composed email

### Automated Testing
Run the test script:

```bash
node test-email-automation.js
```

### Integration Testing
The system integrates with existing Orb features:
- Command history tracking
- Performance monitoring
- Configuration management
- Error logging

## Troubleshooting

### Installation Issues
```bash
# Reinstall Puppeteer if needed
npm uninstall puppeteer
npm install puppeteer@latest
```

### Browser Issues
```bash
# Clear Puppeteer cache
rm -rf ~/.cache/puppeteer
```

### Permission Issues
```bash
# Ensure proper permissions
chmod +x node_modules/puppeteer/.local-chromium/*/chrome-linux/chrome
```

## Support

For issues or questions:
1. Check the automation logs in `~/.doppel/automation-logs/`
2. Review the debug output with `NODE_ENV=development`
3. Test with the provided test script
4. Check system resources and network connectivity

---

**Note**: This feature requires an active internet connection and a Gmail account. The browser automation is designed to work with the standard Gmail interface and may need updates if Google changes their interface significantly. 