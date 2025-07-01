const { agenticCommandProcessor } = require('./dist/main/services/AgenticCommandProcessor');

async function testAgenticCommands() {
  console.log('🧪 Testing Agentic Command Processor...\n');

  const testCommands = [
    'open spotify',
    'search for React tutorial',
    'search for Logan Paul videos',
    'write an email to Sarah',
    'check the weather in Tokyo',
    'open chrome',
    'volume up',
    'lock system'
  ];

  for (const command of testCommands) {
    console.log(`📝 Testing: "${command}"`);
    try {
      const result = await agenticCommandProcessor.processCommand(command);
      console.log(`✅ Result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      console.log(`   Message: ${result.message}`);
      if (result.fallback) {
        console.log(`   Fallback: ${result.fallback}`);
      }
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    console.log('');
  }

  console.log('🎉 Testing complete!');
}

// Run the test
testAgenticCommands().catch(console.error); 