#!/usr/bin/env node

/**
 * Agentic Command System Demo
 * 
 * This demo showcases the new agentic command processor that:
 * - Understands natural language commands
 * - Provides intelligent fallbacks
 * - Never says "I can't do that"
 * - Always tries to help the user
 */

const { agenticCommandProcessor } = require('./dist/main/services/AgenticCommandProcessor');

class AgenticDemo {
  constructor() {
    this.demoCommands = [
      {
        command: "open spotify",
        description: "App Launch with Web Fallback",
        expected: "Should try to launch Spotify app, fallback to web version"
      },
      {
        command: "search for React tutorial",
        description: "Web Search",
        expected: "Should open Google search for React tutorial"
      },
      {
        command: "search for Logan Paul videos",
        description: "YouTube Search",
        expected: "Should open YouTube search for Logan Paul videos"
      },
      {
        command: "write an email to Sarah",
        description: "Email Composition",
        expected: "Should open email composer for Sarah"
      },
      {
        command: "check the weather in Tokyo",
        description: "Weather Check",
        expected: "Should open weather search for Tokyo"
      },
      {
        command: "open nonexistentapp",
        description: "Unknown App with Fallback",
        expected: "Should provide helpful fallback suggestions"
      },
      {
        command: "volume up",
        description: "System Control",
        expected: "Should increase system volume"
      },
      {
        command: "lock system",
        description: "System Lock",
        expected: "Should lock the system"
      }
    ];
  }

  async runDemo() {
    console.log('🤖 Agentic Command System Demo');
    console.log('================================\n');
    
    console.log('🎯 Core Principles:');
    console.log('• Understands natural language');
    console.log('• Provides intelligent fallbacks');
    console.log('• Never says "I can\'t do that"');
    console.log('• Always tries to help\n');

    for (let i = 0; i < this.demoCommands.length; i++) {
      const demo = this.demoCommands[i];
      console.log(`📝 Demo ${i + 1}: ${demo.description}`);
      console.log(`   Command: "${demo.command}"`);
      console.log(`   Expected: ${demo.expected}`);
      
      try {
        const result = await agenticCommandProcessor.processCommand(demo.command);
        
        console.log(`   ✅ Result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
        console.log(`   📢 Message: ${result.message}`);
        
        if (result.fallback) {
          console.log(`   🔄 Fallback: ${result.fallback}`);
        }
        
        if (result.error) {
          console.log(`   ❌ Error: ${result.error}`);
        }
        
        // Show the agentic behavior
        if (!result.success && result.fallback) {
          console.log(`   🧠 Agentic Behavior: Instead of failing, I provided a helpful fallback!`);
        }
        
      } catch (error) {
        console.log(`   💥 Exception: ${error.message}`);
      }
      
      console.log('');
    }

    console.log('🎉 Demo Complete!');
    console.log('\n💡 Key Takeaways:');
    console.log('• The system understands natural language');
    console.log('• It provides intelligent fallbacks when primary actions fail');
    console.log('• It never gives up - always tries to help');
    console.log('• It maintains context and user preferences');
    console.log('• It\'s extensible and maintainable');
  }

  async testUserPreferences() {
    console.log('\n🔧 Testing User Preferences:');
    
    // Set a preference
    agenticCommandProcessor.setUserPreference('default_browser', 'firefox');
    console.log('   Set default browser to Firefox');
    
    // Get the preference
    const browser = agenticCommandProcessor.getUserPreference('default_browser');
    console.log(`   Retrieved default browser: ${browser}`);
    
    // Test with a command that would use the preference
    const result = await agenticCommandProcessor.processCommand("search for test");
    console.log(`   Search result: ${result.message}`);
  }

  async testFallbackStrategies() {
    console.log('\n🔄 Testing Fallback Strategies:');
    
    const fallbackTests = [
      {
        command: "open spotify",
        description: "App → Web Fallback"
      },
      {
        command: "open gmail",
        description: "Web-Only App"
      },
      {
        command: "open nonexistentapp",
        description: "Unknown → Search Fallback"
      }
    ];

    for (const test of fallbackTests) {
      console.log(`   Testing: ${test.description}`);
      const result = await agenticCommandProcessor.processCommand(test.command);
      console.log(`   Strategy: ${result.success ? 'Primary' : 'Fallback'}`);
      console.log(`   Message: ${result.message}`);
      if (result.fallback) {
        console.log(`   Fallback: ${result.fallback}`);
      }
      console.log('');
    }
  }
}

// Run the demo
async function main() {
  const demo = new AgenticDemo();
  
  try {
    await demo.runDemo();
    await demo.testUserPreferences();
    await demo.testFallbackStrategies();
  } catch (error) {
    console.error('Demo failed:', error);
  }
}

if (require.main === module) {
  main();
}

module.exports = { AgenticDemo }; 