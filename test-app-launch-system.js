const { appLaunchService } = require('./src/main/services/AppLaunchService');

async function testAppLaunchSystem() {
  console.log('🧪 Testing Agentic App Launch System for Dello\n');

  // Test 1: Basic app launch
  console.log('📱 Test 1: Basic app launch');
  console.log('Input: "open Chrome"');
  const result1 = await appLaunchService.launchApp('open Chrome');
  console.log('Result:', result1);
  console.log('');

  // Test 2: Intent recognition
  console.log('🎯 Test 2: Intent recognition');
  console.log('Input: "open browser"');
  const result2 = await appLaunchService.launchApp('open browser');
  console.log('Result:', result2);
  console.log('');

  // Test 3: Email intent
  console.log('📧 Test 3: Email intent');
  console.log('Input: "open email"');
  const result3 = await appLaunchService.launchApp('open email');
  console.log('Result:', result3);
  console.log('');

  // Test 4: Terminal intent
  console.log('💻 Test 4: Terminal intent');
  console.log('Input: "open terminal"');
  const result4 = await appLaunchService.launchApp('open terminal');
  console.log('Result:', result4);
  console.log('');

  // Test 5: Multiple app detection
  console.log('🔍 Test 5: Multiple app detection');
  console.log('Input: "open chrome" (when Chrome and Chromium are available)');
  const result5 = await appLaunchService.launchApp('open chrome');
  console.log('Result:', result5);
  console.log('');

  // Test 6: App suggestions
  console.log('💡 Test 6: App suggestions');
  console.log('Input: "browser"');
  const suggestions = appLaunchService.getAppSuggestions('browser');
  console.log('Suggestions:', suggestions);
  console.log('');

  // Test 7: Category apps
  console.log('📂 Test 7: Category apps');
  const browserApps = appLaunchService.getCategoryApps('browser');
  console.log('Browser apps:', browserApps.map(app => app.name));
  console.log('');

  // Test 8: All categories
  console.log('🏷️ Test 8: All categories');
  const categories = appLaunchService.getAllCategories();
  console.log('Available categories:', categories);
  console.log('');

  // Test 9: User choice handling
  console.log('👤 Test 9: User choice handling');
  console.log('Simulating user choosing Edge as fallback for Chrome');
  const choiceResult = await appLaunchService.handleUserChoice('open chrome', 'edge');
  console.log('Choice result:', choiceResult);
  console.log('');

  // Test 10: Fallback logic simulation
  console.log('🔄 Test 10: Fallback logic simulation');
  console.log('Input: "open nonexistent-app"');
  const fallbackResult = await appLaunchService.launchApp('open nonexistent-app');
  console.log('Fallback result:', fallbackResult);
  console.log('');

  console.log('✅ App Launch System Tests Completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  testAppLaunchSystem().catch(console.error);
}

module.exports = { testAppLaunchSystem }; 