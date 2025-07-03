const { execSync } = require('child_process');

// Test the calendar plugin directly
async function testCalendarPlugin() {
  try {
    console.log('📅 Testing calendar plugin...');
    
    const plugin = require('./plugins/calendar_event/index.js');
    
    const args = {
      title: 'Blocked Time',
      start: 'tomorrow 21:00',
      end: 'tomorrow 22:00'
    };
    
    console.log('Running plugin with args:', args);
    const result = await plugin.run(args, {});
    console.log('Result:', result);
    
    if (result.success) {
      console.log('✅ Calendar event created successfully!');
    } else {
      console.log('❌ Failed to create calendar event:', result.message);
    }
    
  } catch (error) {
    console.log('❌ Plugin test failed:', error.message);
  }
}

testCalendarPlugin(); 