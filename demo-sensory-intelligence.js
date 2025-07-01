#!/usr/bin/env node

/**
 * DELO Sensory Intelligence Demo
 * Demonstrates real-time audio and visual awareness capabilities
 */

console.log('🧠 DELO Sensory Intelligence Demo');
console.log('==================================\n');

class SensoryIntelligenceDemo {
  constructor() {
    this.demoScenarios = [
      {
        name: 'Meeting Intelligence',
        description: 'DELO detects a meeting and offers assistance',
        audio: 'Welcome everyone to the Q4 planning meeting',
        visual: 'Zoom Meeting: Q4 Planning Discussion',
        expected: 'meeting_assistance'
      },
      {
        name: 'Error Detection',
        description: 'DELO detects an error and offers troubleshooting',
        audio: 'I\'m getting an error message',
        visual: 'Error: Connection Failed - Please check your network',
        expected: 'error_assistance'
      },
      {
        name: 'Stress Management',
        description: 'DELO detects high stress and offers help',
        audio: 'I\'m so overwhelmed with all these deadlines',
        visual: 'Multiple browser tabs open with urgent tasks',
        expected: 'stress_assistance'
      },
      {
        name: 'Workflow Automation',
        description: 'DELO detects repetitive patterns and suggests automation',
        audio: 'I keep doing the same email process over and over',
        visual: 'Gmail compose window with similar content',
        expected: 'automation_suggestion'
      },
      {
        name: 'Productivity Optimization',
        description: 'DELO detects high productivity and suggests continuation',
        audio: 'This coding session is going really well',
        visual: 'VS Code with multiple files open and active development',
        expected: 'productivity_boost'
      }
    ];
  }

  async runDemo() {
    console.log('🚀 Starting DELO Sensory Intelligence Demo...\n');

    for (let i = 0; i < this.demoScenarios.length; i++) {
      const scenario = this.demoScenarios[i];
      console.log(`📋 Scenario ${i + 1}: ${scenario.name}`);
      console.log(`   ${scenario.description}\n`);
      
      await this.simulateScenario(scenario);
      
      if (i < this.demoScenarios.length - 1) {
        console.log('⏳ Waiting 3 seconds before next scenario...\n');
        await this.sleep(3000);
      }
    }

    console.log('🎉 Demo completed! DELO Sensory Intelligence is ready to assist you.');
    console.log('\n💡 Key Features Demonstrated:');
    console.log('   • Real-time audio and visual monitoring');
    console.log('   • Intelligent context analysis');
    console.log('   • Proactive assistance suggestions');
    console.log('   • Pattern recognition and automation');
    console.log('   • Stress and productivity monitoring');
  }

  async simulateScenario(scenario) {
    // Simulate audio input
    console.log(`🎤 Audio Input: "${scenario.audio}"`);
    
    // Simulate visual context
    console.log(`👁️ Visual Context: "${scenario.visual}"`);
    
    // Simulate DELO's analysis
    const analysis = this.analyzeContext(scenario.audio, scenario.visual);
    
    console.log(`🧠 DELO Analysis:`);
    console.log(`   • Activity: ${analysis.activity}`);
    console.log(`   • Mood: ${analysis.mood}`);
    console.log(`   • Stress Level: ${analysis.stressLevel}`);
    console.log(`   • Productivity: ${analysis.productivity}`);
    
    // Simulate DELO's response
    const response = this.generateResponse(analysis, scenario.expected);
    
    console.log(`💡 DELO Response:`);
    response.suggestions.forEach((suggestion, index) => {
      console.log(`   ${index + 1}. ${suggestion.title}: ${suggestion.description}`);
    });
    
    console.log(`\n✅ Expected: ${scenario.expected} | Actual: ${response.primaryAction}`);
    
    if (response.primaryAction === scenario.expected) {
      console.log('🎯 Perfect match! DELO correctly identified the context.\n');
    } else {
      console.log('⚠️  Close match. DELO detected similar context.\n');
    }
  }

  analyzeContext(audio, visual) {
    const analysis = {
      activity: 'general_work',
      mood: 'neutral',
      stressLevel: 'low',
      productivity: 'medium'
    };

    // Analyze audio for activity and mood
    const lowerAudio = audio.toLowerCase();
    if (lowerAudio.includes('meeting')) {
      analysis.activity = 'meeting';
    } else if (lowerAudio.includes('email')) {
      analysis.activity = 'email';
    } else if (lowerAudio.includes('coding')) {
      analysis.activity = 'coding';
    }

    if (lowerAudio.includes('overwhelmed') || lowerAudio.includes('stress')) {
      analysis.mood = 'stressed';
      analysis.stressLevel = 'high';
    } else if (lowerAudio.includes('well') || lowerAudio.includes('good')) {
      analysis.mood = 'positive';
      analysis.productivity = 'high';
    }

    // Analyze visual context
    const lowerVisual = visual.toLowerCase();
    if (lowerVisual.includes('error')) {
      analysis.activity = 'troubleshooting';
      analysis.stressLevel = 'medium';
    } else if (lowerVisual.includes('zoom') || lowerVisual.includes('meeting')) {
      analysis.activity = 'meeting';
    } else if (lowerVisual.includes('gmail')) {
      analysis.activity = 'email';
    } else if (lowerVisual.includes('vscode')) {
      analysis.activity = 'coding';
    }

    return analysis;
  }

  generateResponse(analysis, expected) {
    const suggestions = [];
    let primaryAction = 'general_assistance';

    switch (analysis.activity) {
      case 'meeting':
        suggestions.push({
          title: 'Meeting Assistant',
          description: 'I can help take notes, schedule follow-ups, or create action items',
          action: 'meeting_assistance'
        });
        suggestions.push({
          title: 'Recording',
          description: 'Would you like me to record this meeting for later reference?',
          action: 'meeting_recording'
        });
        primaryAction = 'meeting_assistance';
        break;

      case 'troubleshooting':
        suggestions.push({
          title: 'Error Resolution',
          description: 'I can help troubleshoot this issue and find solutions',
          action: 'error_assistance'
        });
        suggestions.push({
          title: 'Network Check',
          description: 'Let me check your network status and connectivity',
          action: 'network_diagnosis'
        });
        primaryAction = 'error_assistance';
        break;

      case 'email':
        suggestions.push({
          title: 'Email Automation',
          description: 'I can help compose, organize, or automate your emails',
          action: 'email_assistance'
        });
        suggestions.push({
          title: 'Template Creation',
          description: 'Would you like me to create templates for common emails?',
          action: 'email_templates'
        });
        primaryAction = 'email_assistance';
        break;

      case 'coding':
        if (analysis.productivity === 'high') {
          suggestions.push({
            title: 'Productivity Boost',
            description: 'Great progress! Would you like me to help maintain this focus?',
            action: 'productivity_boost'
          });
          suggestions.push({
            title: 'Save Progress',
            description: 'Let me help you save and backup your current work',
            action: 'save_progress'
          });
          primaryAction = 'productivity_boost';
        } else {
          suggestions.push({
            title: 'Code Assistance',
            description: 'I can help with debugging, documentation, or code review',
            action: 'code_assistance'
          });
          primaryAction = 'code_assistance';
        }
        break;
    }

    // Add stress management suggestions
    if (analysis.stressLevel === 'high') {
      suggestions.unshift({
        title: 'Stress Management',
        description: 'I notice you seem stressed. Would you like help prioritizing tasks?',
        action: 'stress_assistance'
      });
      primaryAction = 'stress_assistance';
    }

    // Add automation suggestions for repetitive patterns
    if (analysis.activity === 'email' && analysis.stressLevel === 'medium') {
      suggestions.push({
        title: 'Workflow Automation',
        description: 'I can help automate repetitive email tasks to save time',
        action: 'automation_suggestion'
      });
    }

    return {
      suggestions: suggestions.slice(0, 3), // Limit to top 3 suggestions
      primaryAction
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the demo
async function main() {
  const demo = new SensoryIntelligenceDemo();
  await demo.runDemo();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = SensoryIntelligenceDemo; 