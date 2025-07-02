const { registry } = require('./dist/main/core/registry');
const { IntentParser } = require('./dist/main/core/intentParser');
const { contextManager } = require('./dist/main/core/context');

async function testIntentParsing() {
  console.log('🧪 Testing intent parsing with plugins...');
  
  try {
    // Initialize registry
    await registry.initialize();
    console.log('✅ Registry initialized');
    
    // Initialize context manager
    await contextManager.getCurrentContext();
    console.log('✅ Context manager initialized');
    
    // Create intent parser
    const intentParser = new IntentParser();
    
    // Test cases
    const testCases = [
      'open notepad',
      'open chrome',
      'search for cats',
      'open google.com',
      'email john@example.com'
    ];
    
    for (const testCase of testCases) {
      console.log(`\n🔍 Testing: "${testCase}"`);
      
      try {
        const context = await contextManager.getCurrentContext();
        const intent = await intentParser.parseIntent(testCase, context);
        
        console.log(`✅ Intent parsed: ${intent.functionName}`);
        console.log(`   Arguments:`, intent.arguments);
        console.log(`   Confidence: ${intent.confidence}`);
        console.log(`   Reasoning: ${intent.reasoning}`);
        
      } catch (error) {
        console.log(`❌ Failed to parse intent: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testIntentParsing(); 