const { execSync } = require('child_process');

async function tryApi(args, ctx) {
  // TODO: Implement Google Calendar or MS Graph API call
  return { success: false, message: 'API not connected' };
}

async function tryAppleScript(args, ctx) {
  try {
    // Parse date strings to proper AppleScript format
    const parseDate = (dateStr) => {
      if (dateStr === 'now') return '(current date)';
      if (dateStr === 'tomorrow') return '(current date + 86400)';
      if (dateStr.startsWith('tomorrow ')) {
        const time = dateStr.replace('tomorrow ', '');
        const [hour, minute] = time.split(':').map(Number);
        return `(current date + 86400 + ${hour * 3600} + ${minute * 60})`;
      }
      if (dateStr.startsWith('today ')) {
        const time = dateStr.replace('today ', '');
        const [hour, minute] = time.split(':').map(Number);
        return `(current date + ${hour * 3600} + ${minute * 60})`;
      }
      // Default to current date + 1 hour
      return '(current date + 3600)';
    };

    const startDate = parseDate(args.start);
    const endDate = parseDate(args.end);
    
    const script = `
      set eventTitle to "${args.title || 'New Event'}"
      tell application "Calendar"
        tell calendar "Calendar"
          make new event with properties {summary:eventTitle, start date:${startDate}, end date:${endDate}, location:"${args.location || ''}", description:"${args.description || ''}"}
        end tell
        return "Event created successfully"
      end tell
    `;
    
    const result = execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, { encoding: 'utf8' });
    return { success: true, message: result.trim() };
  } catch (e) {
    return { success: false, message: 'AppleScript failed', error: e.message };
  }
}

async function tryCli(args, ctx) {
  // TODO: Implement CLI fallback (e.g., icalBuddy, or osascript)
  return { success: false, message: 'CLI not available' };
}

async function tryUia(args, ctx) {
  // TODO: Implement UI automation fallback (e.g., AppleScript System Events)
  return { success: false, message: 'UIA not implemented' };
}

async function tryVision(args, ctx) {
  // TODO: Implement vision+LLM fallback
  return { success: false, message: 'Vision fallback not implemented' };
}

exports.run = async function(args, ctx) {
  let result = await tryApi(args, ctx);
  if (result.success) return result;
  result = await tryAppleScript(args, ctx);
  if (result.success) return result;
  result = await tryCli(args, ctx);
  if (result.success) return result;
  result = await tryUia(args, ctx);
  if (result.success) return result;
  result = await tryVision(args, ctx);
  return result;
}; 