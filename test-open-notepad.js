const { registry } = require('./dist/main/core/registry');
const { contextManager } = require('./dist/main/core/context');

async function testOpenNotepad() {
  console.log('🧪 Testing open notepad functionality...');
  
  try {
    // Initialize registry
    await registry.initialize();
    console.log('✅ Registry initialized');
    
    // Initialize context manager
    const context = await contextManager.getCurrentContext();
    console.log('✅ Context manager initialized');
    
    // Test the open_app plugin directly
    console.log('\n🔧 Testing open_app plugin with "notepad"...');
    
    const result = await registry.runPlugin('open_app', { appName: 'notepad' }, context);
    
    console.log('✅ Plugin result:', result);
    
    if (result.success) {
      console.log('🎉 Successfully opened notepad!');
    } else {
      console.log('❌ Failed to open notepad:', result.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testOpenNotepad(); 