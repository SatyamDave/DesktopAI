const { spawn } = require('child_process');
const path = require('path');

console.log('🔍 Starting Doppel with debug logging...');

// Set environment variables for debugging
const env = {
  ...process.env,
  NODE_ENV: 'development',
  DEBUG: 'electron:*',
  PERFORMANCE_MODE: 'true',
  CLIPBOARD_TRACKING_ENABLED: 'false',
  BEHAVIOR_TRACKING_ENABLED: 'false'
};

// Start the app with debug output
const child = spawn('npm', ['run', 'dev'], {
  env,
  stdio: 'inherit',
  shell: true
});

// Handle process events
child.on('error', (error) => {
  console.error('❌ Failed to start app:', error);
});

child.on('exit', (code, signal) => {
  console.log(`🛑 App exited with code ${code} and signal ${signal}`);
});

// Handle Ctrl+C to gracefully shutdown
process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down...');
  child.kill('SIGINT');
  process.exit(0);
});

console.log('✅ Debug script started. Press Ctrl+C to stop.'); 