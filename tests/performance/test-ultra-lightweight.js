const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing ultra-lightweight mode...');

// Test ultra-lightweight startup
function testUltraLightweightMode() {
  console.log('🚀 Starting app in ultra-lightweight mode...');
  
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    PERFORMANCE_MODE: 'true',
    ULTRA_LIGHTWEIGHT: 'true',
    DISABLE_CLIPBOARD_TRACKING: 'true',
    DISABLE_BEHAVIOR_TRACKING: 'true',
    DISABLE_WHISPER_MODE: 'true',
    DISABLE_AI_PROCESSING: 'true',
    PERFORMANCE_MONITORING_INTERVAL: '120000',
    DATABASE_AUTO_SAVE: 'false',
    ANIMATION_COMPLEXITY: 'minimal'
  };

  const child = spawn('npm', ['run', 'dev'], {
    env,
    stdio: 'inherit',
    shell: true
  });

  // Monitor for startup completion
  let startupTime = Date.now();
  
  child.on('spawn', () => {
    console.log('✅ Process spawned');
  });

  child.on('error', (error) => {
    console.error('❌ Process error:', error);
  });

  child.on('exit', (code, signal) => {
    const runtime = Date.now() - startupTime;
    console.log(`📊 Process exited with code ${code} after ${runtime}ms`);
    
    if (runtime < 10000) {
      console.log('✅ Ultra-lightweight mode test passed - fast startup');
    } else {
      console.log('⚠️ Ultra-lightweight mode test - slow startup detected');
    }
  });

  // Stop after 30 seconds
  setTimeout(() => {
    console.log('⏰ Test timeout - stopping process');
    child.kill('SIGTERM');
  }, 30000);
}

// Run the test
testUltraLightweightMode(); 