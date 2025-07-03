const { execSync } = require('child_process');

// Test the exact AppleScript that should be executed
function debugCalendarScript() {
  try {
    console.log('🔍 Debugging calendar AppleScript...');
    
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
      return '(current date + 3600)';
    };

    const startDate = parseDate('tomorrow 21:00');
    const endDate = parseDate('tomorrow 22:00');
    
    console.log('Parsed dates:');
    console.log('  Start:', startDate);
    console.log('  End:', endDate);
    
    const script = `
      set eventTitle to "Busy"
      tell application "Calendar"
        tell calendar "Calendar"
          make new event with properties {summary:eventTitle, start date:${startDate}, end date:${endDate}, location:"", description:""}
        end tell
        return "Event created successfully"
      end tell
    `;
    
    console.log('\nExecuting AppleScript:');
    console.log(script);
    
    const result = execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, { encoding: 'utf8' });
    console.log('\n✅ AppleScript result:', result.trim());
    
    // Now let's check if the event was actually created
    const checkScript = `
      tell application "Calendar"
        tell calendar "Calendar"
          set eventCount to count of events
          return "Calendar has " & eventCount & " events"
        end tell
      end tell
    `;
    
    const checkResult = execSync(`osascript -e '${checkScript.replace(/'/g, "'\\''")}'`, { encoding: 'utf8' });
    console.log('📊 Calendar check:', checkResult.trim());
    
  } catch (error) {
    console.log('❌ AppleScript failed:', error.message);
  }
}

debugCalendarScript(); 