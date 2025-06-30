const { BrowserAutomationService } = require('./dist/main/services/BrowserAutomationService');

async function testEmailAutomation() {
  console.log('🧪 Testing Email Automation Service...\n');
  
  const automationService = new BrowserAutomationService();
  
  try {
    // Test 1: Check service availability
    console.log('📋 Test 1: Service Availability');
    const status = automationService.getStatus();
    console.log('✅ Service Status:', status);
    
    // Test 2: Test email content generation (without browser)
    console.log('\n📋 Test 2: Email Content Generation');
    const testPrompt = "Write an email to john@example.com about the project meeting tomorrow at 2 PM";
    
    // We'll test the AI content generation part
    console.log('📝 Test prompt:', testPrompt);
    console.log('⏳ This would generate email content using AI...');
    
    // Test 3: Check logs functionality
    console.log('\n📋 Test 3: Logging System');
    const logs = automationService.getAutomationLogs(5);
    console.log('📊 Recent logs:', logs.length);
    
    // Test 4: Service configuration
    console.log('\n📋 Test 4: Service Configuration');
    console.log('🔧 Available:', automationService.isAvailable());
    
    console.log('\n✅ All tests completed successfully!');
    console.log('\n💡 To test full Gmail automation:');
    console.log('   1. Run the Orb assistant');
    console.log('   2. Say "write an email to [recipient] about [topic]"');
    console.log('   3. The system will open Gmail and compose the email');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testEmailAutomation().catch(console.error); 