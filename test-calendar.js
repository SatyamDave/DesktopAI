const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test AppleScript execution
function testAppleScript() {
  try {
    const script = 'tell application "System Events" to return "AppleScript working!"';
    const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8' });
    console.log('✅ AppleScript test passed:', result.trim());
    return true;
  } catch (error) {
    console.log('❌ AppleScript test failed:', error.message);
    return false;
  }
}

// Test calendar event creation
function testCalendarEvent() {
  try {
    const script = `
      tell application "Calendar"
        tell calendar "Home"
          make new event with properties {summary:"Test Event", start date:(current date + 3600), end date:(current date + 7200)}
        end tell
        return "Event created"
      end tell
    `;
    const result = execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, { encoding: 'utf8' });
    console.log('✅ Calendar event test passed:', result.trim());
    return true;
  } catch (error) {
    console.log('❌ Calendar event test failed:', error.message);
    return false;
  }
}

// Test if Calendar.app is available
function testCalendarApp() {
  try {
    console.log('📱 Testing Calendar.app availability...');
    
    const script = `
      tell application "Calendar"
        return name of calendars
      end tell
    `;
    
    const result = execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, { encoding: 'utf8' });
    console.log('✅ Calendar.app is available. Calendars:', result.trim());
    return true;
  } catch (error) {
    console.log('❌ Calendar.app not available:', error.message);
    return false;
  }
}

// Test the actual plugin file
function testPluginFile() {
  try {
    console.log('🔌 Testing plugin file...');
    
    const pluginPath = path.join(__dirname, 'plugins', 'calendar_event', 'index.js');
    if (fs.existsSync(pluginPath)) {
      console.log('✅ Plugin file exists:', pluginPath);
      
      const plugin = require(pluginPath);
      console.log('✅ Plugin loaded successfully');
      console.log('Plugin exports:', Object.keys(plugin));
      
      // Test the run function
      if (typeof plugin.run === 'function') {
        console.log('✅ Plugin has run function');
        
        // Test with sample arguments
        const testArgs = {
          title: "Test Event",
          start: "tomorrow 21:00",
          end: "tomorrow 22:00"
        };
        
        plugin.run(testArgs, {}).then(result => {
          console.log('✅ Plugin execution result:', result);
        }).catch(error => {
          console.log('❌ Plugin execution failed:', error.message);
        });
        
      } else {
        console.log('❌ Plugin missing run function');
      }
      
    } else {
      console.log('❌ Plugin file not found:', pluginPath);
    }
  } catch (error) {
    console.log('❌ Plugin test failed:', error.message);
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting AppleScript and Calendar tests...\n');
  
  const appleScriptWorks = testAppleScript();
  console.log('');
  
  const calendarAppWorks = testCalendarApp();
  console.log('');
  
  if (appleScriptWorks && calendarAppWorks) {
    testCalendarEvent();
    console.log('');
  }
  
  testPluginFile();
}

runTests(); 