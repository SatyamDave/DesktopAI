const { SimpleRegistry } = require('./src/main/core/registry-simple.js');

async function testRegistry() {
  const registry = new SimpleRegistry();
  await registry.initialize();
  
  console.log('\nAvailable plugins:', registry.listPlugins());
  console.log('Manifests:', registry.getManifests().map(m => m.name));
  
  // Test create_event plugin
  const createEventPlugin = registry.getPlugin('create_event');
  if (createEventPlugin) {
    console.log('\n✅ create_event plugin found!');
    
    // Test running the plugin
    const args = {
      title: 'Test Event from Registry',
      start: 'tomorrow 21:00',
      end: 'tomorrow 22:00'
    };
    
    try {
      const result = await registry.runPlugin('create_event', args, {});
      console.log('✅ Plugin execution result:', result);
    } catch (error) {
      console.log('❌ Plugin execution failed:', error.message);
    }
  } else {
    console.log('\n❌ create_event plugin not found');
  }
  
  // Test create_event_script plugin
  const createEventScriptPlugin = registry.getPlugin('create_event_script');
  if (createEventScriptPlugin) {
    console.log('\n✅ create_event_script plugin found!');
  } else {
    console.log('\n❌ create_event_script plugin not found');
  }
}

testRegistry().catch(console.error); 