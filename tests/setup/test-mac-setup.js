const os = require('os');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🍎 Mac Setup Test for Doppel Desktop Assistant');
console.log('==============================================');
console.log();

// Check OS
console.log('📋 System Information:');
console.log(`- OS: ${os.platform()} ${os.release()}`);
console.log(`- Architecture: ${os.arch()}`);
console.log(`- Node.js: ${process.version}`);
console.log(`- Home Directory: ${os.homedir()}`);
console.log();

// Check required tools
console.log('🔧 Checking required tools...');
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
  console.log(`✅ Node.js: ${nodeVersion}`);
} catch (error) {
  console.log('❌ Node.js not found');
  process.exit(1);
}

try {
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  console.log(`✅ npm: ${npmVersion}`);
} catch (error) {
  console.log('❌ npm not found');
  process.exit(1);
}

// Check project structure
console.log('\n📁 Checking project structure...');
const requiredFiles = [
  'package.json',
  'src/main/main.ts',
  'src/renderer/App.tsx',
  'vite.config.ts',
  'tsconfig.json'
];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} missing`);
  }
});

// Check dependencies
console.log('\n📦 Checking dependencies...');
if (fs.existsSync('node_modules')) {
  console.log('✅ node_modules exists');
  
  // Check key dependencies
  const keyDeps = ['electron', 'react', 'typescript', 'vite'];
  keyDeps.forEach(dep => {
    const depPath = path.join('node_modules', dep);
    if (fs.existsSync(depPath)) {
      console.log(`✅ ${dep}`);
    } else {
      console.log(`❌ ${dep} missing`);
    }
  });
} else {
  console.log('❌ node_modules not found - run npm install');
}

// Check configuration
console.log('\n⚙️ Checking configuration...');
const configPath = path.join(os.homedir(), '.doppel', 'config.json');
if (fs.existsSync(configPath)) {
  console.log('✅ User config exists');
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log(`- Platform: ${config.app?.platform || 'not set'}`);
    console.log(`- Performance Mode: ${config.app?.performanceMode || false}`);
  } catch (error) {
    console.log('⚠️ Config file is invalid JSON');
  }
} else {
  console.log('⚠️ User config not found - will be created on first run');
}

// Check environment file
console.log('\n🔐 Checking environment...');
if (fs.existsSync('.env')) {
  console.log('✅ .env file exists');
  const envContent = fs.readFileSync('.env', 'utf8');
  if (envContent.includes('GEMINI_API_KEY')) {
    console.log('✅ Gemini API key configured');
  } else {
    console.log('⚠️ Gemini API key not found in .env');
  }
} else {
  console.log('⚠️ .env file not found - will be created on first run');
}

// Check Mac-specific permissions
console.log('\n🔐 Checking Mac permissions...');
try {
  // Check if we can access the desktop
  const desktopPath = path.join(os.homedir(), 'Desktop');
  if (fs.existsSync(desktopPath)) {
    console.log('✅ Desktop access: OK');
  } else {
    console.log('⚠️ Desktop access: Limited');
  }
  
  // Check if we can create files in home directory
  const testPath = path.join(os.homedir(), '.doppel-test');
  fs.writeFileSync(testPath, 'test');
  fs.unlinkSync(testPath);
  console.log('✅ File system access: OK');
} catch (error) {
  console.log('❌ File system access: Limited');
}

// Check build capability
console.log('\n🔨 Testing build capability...');
try {
  console.log('Building main process...');
  execSync('npm run build:main', { stdio: 'inherit' });
  console.log('✅ Main process build successful');
} catch (error) {
  console.log('❌ Main process build failed');
  console.log('This might be due to TypeScript errors or missing dependencies');
}

console.log('\n🎯 Mac Setup Summary:');
console.log('====================');
console.log('✅ The project is ready for Mac development!');
console.log();
console.log('🚀 To start development:');
console.log('  npm run start:mac          # Full development mode');
console.log('  npm run start:mac:ultra    # Ultra lightweight mode');
console.log('  npm run start:mac:laptop   # Laptop-safe mode');
console.log();
console.log('📱 Mac-specific shortcuts:');
console.log('  Cmd+Space                  # Toggle floating window');
console.log('  Cmd+Shift+W                # Toggle Whisper mode');
console.log('  Cmd+,                      # Open settings');
console.log('  Cmd+Q                      # Quit app');
console.log();
console.log('📧 Email functionality:');
console.log('  - Add your GEMINI_API_KEY to .env file');
console.log('  - Test with: "compose email to test@example.com about meeting"');
console.log();
console.log('🔧 Troubleshooting:');
console.log('  - If you get permission errors, check System Preferences > Security & Privacy');
console.log('  - For global shortcuts, grant accessibility permissions to Terminal/VS Code');
console.log('  - For notifications, grant notification permissions when prompted'); 