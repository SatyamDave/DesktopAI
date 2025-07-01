const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building DELO for production...');

try {
  // Check if .env exists
  if (!fs.existsSync('.env')) {
    console.log('⚠️  Warning: .env file not found. Please create one from env.example');
    console.log('   Required: GEMINI_API_KEY');
  }

  // Clean previous builds
  console.log('🧹 Cleaning previous builds...');
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }

  // Build TypeScript
  console.log('🔨 Building TypeScript...');
  execSync('npm run build', { stdio: 'inherit' });

  // Build renderer
  console.log('🎨 Building renderer...');
  execSync('npm run build:renderer', { stdio: 'inherit' });

  // Build main process
  console.log('⚙️  Building main process...');
  execSync('npm run build:main', { stdio: 'inherit' });

  // Copy assets
  console.log('📁 Copying assets...');
  if (fs.existsSync('assets')) {
    fs.cpSync('assets', 'dist/assets', { recursive: true });
  }

  // Copy package.json for electron-builder
  console.log('📦 Preparing for packaging...');
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const buildPackageJson = {
    name: packageJson.name,
    version: packageJson.version,
    description: packageJson.description,
    main: 'main/main.js',
    author: packageJson.author,
    license: packageJson.license,
    dependencies: packageJson.dependencies
  };
  fs.writeFileSync('dist/package.json', JSON.stringify(buildPackageJson, null, 2));

  console.log('✅ Production build complete!');
  console.log('📦 Run "npm run electron-builder" to create distributable packages');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
} 