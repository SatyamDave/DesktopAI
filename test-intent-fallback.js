const { IntentParser } = require('./dist/main/core/intentParser');
const { contextManager } = require('./dist/main/core/context');

async function testIntentFallback() {
  console.log('🧪 Testing intent parsing fallback logic...');
  
  try {
    // Initialize context manager
    const context = await contextManager.getCurrentContext();
    console.log('✅ Context manager initialized');
    
    // Create intent parser
    const intentParser = new IntentParser();
    
    // Test cases that should use fallback parsing
    const testCases = [
      'open notepad',
      'open youtube',
      'open google',
      'open chrome',
      'search for cats',
      'open facebook'
    ];
    
    for (const testCase of testCases) {
      console.log(`\n🔍 Testing: "${testCase}"`);
      
      try {
        // Call the fallback method directly to test it
        const intent = intentParser.fallbackIntentParsing(testCase, context);
        
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

testIntentFallback(); 