const { execSync } = require('child_process');

function debugCalendarDetails() {
  try {
    console.log('🔍 Detailed calendar debugging...\n');
    
    // 1. Check what calendars are available
    console.log('1. Available calendars:');
    const calendarListScript = `
      tell application "Calendar"
        set calendarNames to {}
        repeat with cal in calendars
          set end of calendarNames to name of cal
        end repeat
        return calendarNames
      end tell
    `;
    
    const calendarList = execSync(`osascript -e '${calendarListScript.replace(/'/g, "'\\''")}'`, { encoding: 'utf8' });
    console.log('   Calendars:', calendarList.trim());
    
    // 2. Check if we can access the Calendar app
    console.log('\n2. Testing Calendar app access:');
    const accessScript = `
      tell application "Calendar"
        return "Calendar app is accessible"
      end tell
    `;
    
    const accessResult = execSync(`osascript -e '${accessScript.replace(/'/g, "'\\''")}'`, { encoding: 'utf8' });
    console.log('   Access test:', accessResult.trim());
    
    // 3. Try to create a simple event with current date
    console.log('\n3. Testing simple event creation:');
    const simpleEventScript = `
      tell application "Calendar"
        tell calendar "Calendar"
          make new event with properties {summary:"Test Event Now", start date:(current date), end date:(current date + 3600)}
        end tell
        return "Simple event created"
      end tell
    `;
    
    const simpleResult = execSync(`osascript -e '${simpleEventScript.replace(/'/g, "'\\''")}'`, { encoding: 'utf8' });
    console.log('   Simple event result:', simpleResult.trim());
    
    // 4. Check if the simple event was created
    console.log('\n4. Checking if simple event exists:');
    const checkSimpleScript = `
      tell application "Calendar"
        tell calendar "Calendar"
          set todayEvents to events whose start date > (current date - 3600)
          return "Found " & (count of todayEvents) & " events today"
        end tell
      end tell
    `;
    
    const checkSimpleResult = execSync(`osascript -e '${checkSimpleScript.replace(/'/g, "'\\''")}'`, { encoding: 'utf8' });
    console.log('   Today events check:', checkSimpleResult.trim());
    
    // 5. Try with a different calendar name (first available)
    console.log('\n5. Testing with first available calendar:');
    const firstCalendarScript = `
      tell application "Calendar"
        set firstCal to item 1 of calendars
        tell firstCal
          make new event with properties {summary:"Test Event First Calendar", start date:(current date + 7200), end date:(current date + 10800)}
        end tell
        return "Event created in first calendar"
      end tell
    `;
    
    const firstCalResult = execSync(`osascript -e '${firstCalendarScript.replace(/'/g, "'\\''")}'`, { encoding: 'utf8' });
    console.log('   First calendar result:', firstCalResult.trim());
    
  } catch (error) {
    console.log('❌ Debug failed:', error.message);
  }
}

debugCalendarDetails(); 