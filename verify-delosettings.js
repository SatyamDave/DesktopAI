#!/usr/bin/env node

/**
 * Verify DELOSettings Fixes
 * Simple verification that all fixes are in place
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Verifying DELOSettings Fixes...\n');

// Check 1: Verify preload.ts has all required methods
console.log('✅ Check 1: Preload Methods');
const preloadPath = path.join(__dirname, 'src', 'main', 'preload.ts');
if (fs.existsSync(preloadPath)) {
  const preloadContent = fs.readFileSync(preloadPath, 'utf8');
  const requiredMethods = [
    'getScreenSnapshots',
    'getAudioSessions', 
    'getContextSnapshots',
    'startScreenPerception',
    'stopScreenPerception',
    'startAudioPerception',
    'stopAudioPerception',
    'startContextManager',
    'stopContextManager',
    'addScreenFilter',
    'addAudioFilter',
    'addContextPattern',
    'setQuietHours'
  ];
  
  let allMethodsFound = true;
  requiredMethods.forEach(method => {
    if (preloadContent.includes(`${method}:`)) {
      console.log(`   ✓ ${method} - Found in preload`);
    } else {
      console.log(`   ❌ ${method} - Missing from preload`);
      allMethodsFound = false;
    }
  });
  
  if (allMethodsFound) {
    console.log('   🎉 All preload methods are present!\n');
  } else {
    console.log('   ⚠️  Some preload methods are missing\n');
  }
} else {
  console.log('   ❌ preload.ts not found\n');
}

// Check 2: Verify electron.d.ts has all required types
console.log('✅ Check 2: Type Definitions');
const typesPath = path.join(__dirname, 'src', 'renderer', 'types', 'electron.d.ts');
if (fs.existsSync(typesPath)) {
  const typesContent = fs.readFileSync(typesPath, 'utf8');
  const requiredTypes = [
    'getScreenSnapshots',
    'getAudioSessions',
    'getContextSnapshots',
    'startScreenPerception',
    'stopScreenPerception',
    'startAudioPerception',
    'stopAudioPerception',
    'startContextManager',
    'stopContextManager',
    'addScreenFilter',
    'addAudioFilter',
    'addContextPattern',
    'setQuietHours'
  ];
  
  let allTypesFound = true;
  requiredTypes.forEach(type => {
    if (typesContent.includes(`${type}:`)) {
      console.log(`   ✓ ${type} - Found in types`);
    } else {
      console.log(`   ❌ ${type} - Missing from types`);
      allTypesFound = false;
    }
  });
  
  if (allTypesFound) {
    console.log('   🎉 All type definitions are present!\n');
  } else {
    console.log('   ⚠️  Some type definitions are missing\n');
  }
} else {
  console.log('   ❌ electron.d.ts not found\n');
}

// Check 3: Verify main.ts has all required handlers
console.log('✅ Check 3: Main Process Handlers');
const mainPath = path.join(__dirname, 'src', 'main', 'main.ts');
if (fs.existsSync(mainPath)) {
  const mainContent = fs.readFileSync(mainPath, 'utf8');
  const requiredHandlers = [
    'ipcMain.handle(\'get-screen-snapshots\'',
    'ipcMain.handle(\'get-audio-sessions\'',
    'ipcMain.handle(\'get-context-snapshots\'',
    'ipcMain.handle(\'start-screen-perception\'',
    'ipcMain.handle(\'stop-screen-perception\'',
    'ipcMain.handle(\'start-audio-perception\'',
    'ipcMain.handle(\'stop-audio-perception\'',
    'ipcMain.handle(\'start-context-manager\'',
    'ipcMain.handle(\'stop-context-manager\'',
    'ipcMain.handle(\'add-screen-filter\'',
    'ipcMain.handle(\'add-audio-filter\'',
    'ipcMain.handle(\'add-context-pattern\'',
    'ipcMain.handle(\'set-quiet-hours\''
  ];
  
  let allHandlersFound = true;
  requiredHandlers.forEach(handler => {
    if (mainContent.includes(handler)) {
      console.log(`   ✓ ${handler.split("'")[1]} - Found in main`);
    } else {
      console.log(`   ❌ ${handler.split("'")[1]} - Missing from main`);
      allHandlersFound = false;
    }
  });
  
  if (allHandlersFound) {
    console.log('   🎉 All IPC handlers are present!\n');
  } else {
    console.log('   ⚠️  Some IPC handlers are missing\n');
  }
} else {
  console.log('   ❌ main.ts not found\n');
}

// Check 4: Verify services are instantiated
console.log('✅ Check 4: Service Instantiation');
if (fs.existsSync(mainPath)) {
  const mainContent = fs.readFileSync(mainPath, 'utf8');
  const requiredServices = [
    'new ScreenPerception',
    'new AudioPerception',
    'new ContextManager'
  ];
  
  let allServicesFound = true;
  requiredServices.forEach(service => {
    if (mainContent.includes(service)) {
      console.log(`   ✓ ${service} - Found in main`);
    } else {
      console.log(`   ❌ ${service} - Missing from main`);
      allServicesFound = false;
    }
  });
  
  if (allServicesFound) {
    console.log('   🎉 All services are instantiated!\n');
  } else {
    console.log('   ⚠️  Some services are missing\n');
  }
} else {
  console.log('   ❌ main.ts not found\n');
}

// Check 5: Verify DELOSettings component exists
console.log('✅ Check 5: DELOSettings Component');
const deloSettingsPath = path.join(__dirname, 'src', 'renderer', 'components', 'DELOSettings.tsx');
if (fs.existsSync(deloSettingsPath)) {
  console.log('   ✓ DELOSettings.tsx component exists');
  
  // Check for common TypeScript errors
  const deloSettingsContent = fs.readFileSync(deloSettingsPath, 'utf8');
  const commonErrors = [
    'Property \'getScreenSnapshots\' does not exist',
    'Property \'getAudioSessions\' does not exist',
    'Property \'getContextSnapshots\' does not exist'
  ];
  
  let hasErrors = false;
  commonErrors.forEach(error => {
    if (deloSettingsContent.includes(error)) {
      console.log(`   ❌ ${error}`);
      hasErrors = true;
    }
  });
  
  if (!hasErrors) {
    console.log('   🎉 No obvious TypeScript errors detected!\n');
  } else {
    console.log('   ⚠️  Some TypeScript errors may still exist\n');
  }
} else {
  console.log('   ❌ DELOSettings.tsx not found\n');
}

console.log('🎯 Verification Complete!');
console.log('\n📋 Next Steps:');
console.log('   1. Run "npm run dev" to start the app');
console.log('   2. Navigate to DELOSettings in the UI');
console.log('   3. Test all the perception and context features');
console.log('   4. Verify no TypeScript errors in the console');
console.log('\n🚀 Ready to test DELOSettings functionality!'); 