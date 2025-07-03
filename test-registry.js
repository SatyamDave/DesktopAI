const { Registry } = require('./src/main/core/registry');

async function testRegistry() {
  const registry = new Registry();
  await registry.initialize();
  
  console.log('Available plugins:', registry.listPlugins());
  console.log('Manifests:', registry.getManifests().map(m => m.name));
  
  // Check if create_event is available
  const createEventPlugin = registry.getPlugin('create_event');
  if (createEventPlugin) {
    console.log('✅ create_event plugin found!');
    console.log('Manifest:', createEventPlugin.manifest);
  } else {
    console.log('❌ create_event plugin not found');
  }
  
  // Check if create_event_script is available
  const createEventScriptPlugin = registry.getPlugin('create_event_script');
  if (createEventScriptPlugin) {
    console.log('✅ create_event_script plugin found!');
    console.log('Manifest:', createEventScriptPlugin.manifest);
  } else {
    console.log('❌ create_event_script plugin not found');
  }
}

testRegistry().catch(console.error); 