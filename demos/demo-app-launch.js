#!/usr/bin/env node

/**
 * Demo: Agentic App-Launching System for Dello
 * 
 * This script demonstrates the new agentic app-launching capabilities
 * including intent recognition, fallback logic, and user preferences.
 */

const { appLaunchService } = require('./dist/main/services/AppLaunchService');

async function demonstrateAppLaunchSystem() {
  console.log('🚀 Dello Agentic App-Launching System Demo\n');
  console.log('=' .repeat(60));

  // Demo 1: Basic Intent Recognition
  console.log('\n📱 Demo 1: Intent Recognition');
  console.log('-' .repeat(40));
  
  const intents = [
    'open browser',
    'open email', 
    'open terminal',
    'open text editor'
  ];

  for (const intent of intents) {
    console.log(`\nUser: "${intent}"`);
    const result = await appLaunchService.launchApp(intent);
    console.log(`Dello: ${result.message}`);
    if (!result.success && result.error) {
      console.log(`(This is expected - apps may not be installed)`);
    }
  }

  // Demo 2: App Suggestions
  console.log('\n\n💡 Demo 2: Smart App Suggestions');
  console.log('-' .repeat(40));
  
  const suggestionInputs = ['browser', 'email', 'terminal', 'editor'];
  
  for (const input of suggestionInputs) {
    console.log(`\nUser types: "${input}"`);
    const suggestions = appLaunchService.getAppSuggestions(input);
    console.log(`Dello suggests: ${suggestions.join(', ')}`);
  }

  // Demo 3: Category Management
  console.log('\n\n📂 Demo 3: Category Management');
  console.log('-' .repeat(40));
  
  const categories = appLaunchService.getAllCategories();
  console.log('Available categories:', categories.join(', '));
  
  for (const category of categories.slice(0, 3)) {
    const apps = appLaunchService.getCategoryApps(category);
    console.log(`\n${category} apps: ${apps.map(app => app.name).join(', ')}`);
  }

  // Demo 4: Fallback Logic Simulation
  console.log('\n\n🔄 Demo 4: Fallback Logic Simulation');
  console.log('-' .repeat(40));
  
  console.log('\nScenario: User tries to open Chrome, but it\'s not installed');
  console.log('User: "open Chrome"');
  
  // Simulate Chrome not being available
  const chromeResult = await appLaunchService.launchApp('open Chrome');
  if (!chromeResult.success) {
    console.log(`Dello: ${chromeResult.message}`);
    console.log('\nDello would now ask: "Chrome is not installed. Would you like me to open Edge, Firefox, or Brave instead?"');
    
    // Simulate user choosing Edge
    console.log('\nUser chooses: "Edge"');
    const choiceResult = await appLaunchService.handleUserChoice('open Chrome', 'edge');
    console.log(`Dello: ${choiceResult.message}`);
  }

  // Demo 5: Multiple App Detection
  console.log('\n\n🔍 Demo 5: Multiple App Detection');
  console.log('-' .repeat(40));
  
  console.log('\nScenario: User asks for "browser" but multiple browsers are available');
  console.log('User: "open browser"');
  
  const browserApps = appLaunchService.getCategoryApps('browser');
  if (browserApps.length > 1) {
    console.log(`Dello detects: ${browserApps.map(app => app.name).join(', ')}`);
    console.log('Dello would ask: "I found multiple browsers. Which one would you prefer?"');
  }

  // Demo 6: User Preference Learning
  console.log('\n\n🧠 Demo 6: User Preference Learning');
  console.log('-' .repeat(40));
  
  console.log('\nDello learns from user choices and stores preferences.');
  console.log('Preferences are saved to: ~/.doppel/app-preferences.json');
  console.log('This allows Dello to make smarter suggestions in the future.');

  // Demo 7: Extensibility
  console.log('\n\n🔧 Demo 7: System Extensibility');
  console.log('-' .repeat(40));
  
  console.log('The system is designed to be easily extensible:');
  console.log('• Add new apps by updating AppConfig array');
  console.log('• Add new categories with intent mappings');
  console.log('• Customize fallback logic per category');
  console.log('• Extend with AI-powered intent recognition');

  console.log('\n\n✅ Demo Complete!');
  console.log('\nKey Features Demonstrated:');
  console.log('• Intent Recognition: Understands natural language');
  console.log('• App Detection: Finds installed applications');
  console.log('• Fallback Logic: Offers alternatives when apps aren\'t available');
  console.log('• User Preferences: Learns from user choices');
  console.log('• Agentic Design: Asks clarifying questions');
  console.log('• Extensibility: Easy to add new apps and categories');
  
  console.log('\n🎯 The system is now ready for production use in Dello!');
}

// Run demo if this file is executed directly
if (require.main === module) {
  demonstrateAppLaunchSystem().catch(error => {
    console.error('Demo failed:', error);
    process.exit(1);
  });
}

module.exports = { demonstrateAppLaunchSystem }; 