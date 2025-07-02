const { PluginRegistry } = require('./dist/main/core/registry');

async function testPlugins() {
  console.log('🧪 Testing plugin registry...');
  
  const registry = new PluginRegistry();
  
  try {
    await registry.initialize();
    
    console.log('✅ Registry initialized successfully');
    console.log('📊 Registry stats:', registry.getStats());
    console.log('🔌 Available plugins:', registry.listPlugins());
    console.log('📋 Plugin manifests:', registry.getManifests());
    
    // Test running a plugin
    if (registry.listPlugins().length > 0) {
      const firstPlugin = registry.listPlugins()[0];
      console.log(`🧪 Testing plugin: ${firstPlugin}`);
      
      try {
        const result = await registry.runPlugin(firstPlugin, { test: true }, {});
        console.log(`✅ Plugin ${firstPlugin} test result:`, result);
      } catch (error) {
        console.log(`❌ Plugin ${firstPlugin} test failed:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Registry initialization failed:', error);
  }
}

testPlugins(); 