#!/usr/bin/env ts-node

import { DynamicRegistry } from '../src/main/runtime/registry';
import { AIProcessor } from '../src/main/services/AIProcessor';
import { scanMacApps, scanShortcuts } from '../src/main/discovery/macScriptDict';
import { scanWindowsCom, scanPowerShellCmdlets } from '../src/main/discovery/winComScan';
import * as os from 'os';

/**
 * CLI tool to scan and display discovered automation tools
 */
async function main() {
  const platform = os.platform();
  const args = process.argv.slice(2);
  
  console.log(`🔍 DELO Tool Discovery Scanner`);
  console.log(`Platform: ${platform}`);
  console.log(`Arguments: ${args.join(' ')}`);
  console.log('');
  
  try {
    if (args.includes('--help') || args.includes('-h')) {
      showHelp();
      return;
    }
    
    if (args.includes('--raw')) {
      await showRawDiscovery();
    } else if (args.includes('--stats')) {
      await showRegistryStats();
    } else if (args.includes('--json')) {
      await showJsonOutput();
    } else {
      await showFormattedOutput();
    }
    
  } catch (error) {
    console.error('❌ Error during scanning:', error);
    process.exit(1);
  }
}

/**
 * Shows help information
 */
function showHelp(): void {
  console.log(`Usage: ts-node bin/scan_apps.ts [options]

Options:
  --raw      Show raw discovery results without processing
  --stats    Show registry statistics and tool counts
  --json     Output in JSON format for programmatic use
  --help     Show this help message

Examples:
  ts-node bin/scan_apps.ts                    # Default formatted output
  ts-node bin/scan_apps.ts --raw              # Raw discovery results
  ts-node bin/scan_apps.ts --stats            # Statistics only
  ts-node bin/scan_apps.ts --json > tools.json # Save to file
`);
}

/**
 * Shows raw discovery results
 */
async function showRawDiscovery(): Promise<void> {
  console.log('🔍 Raw Discovery Results');
  console.log('========================');
  
  if (os.platform() === 'darwin') {
    console.log('\n📱 macOS AppleScript Tools:');
    const appTools = await scanMacApps();
    console.log(`Found ${appTools.length} AppleScript tools`);
    appTools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    
    console.log('\n⚡ macOS Shortcuts:');
    const shortcutTools = await scanShortcuts();
    console.log(`Found ${shortcutTools.length} Shortcut tools`);
    shortcutTools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    
  } else if (os.platform() === 'win32') {
    console.log('\n🪟 Windows COM Objects:');
    const comTools = await scanWindowsCom();
    console.log(`Found ${comTools.length} COM tools`);
    comTools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    
    console.log('\n💻 PowerShell Cmdlets:');
    const psTools = await scanPowerShellCmdlets();
    console.log(`Found ${psTools.length} PowerShell tools`);
    psTools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
  }
}

/**
 * Shows registry statistics
 */
async function showRegistryStats(): Promise<void> {
  console.log('📊 Registry Statistics');
  console.log('=====================');
  
  const aiProcessor = new AIProcessor();
  const registry = new DynamicRegistry(aiProcessor);
  
  await registry.initialize();
  const stats = registry.getStats();
  
  console.log(`Total Tools: ${stats.totalTools}`);
  console.log(`Platform: ${stats.platform}`);
  console.log('\nTools by Type:');
  
  Object.entries(stats.byType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
}

/**
 * Shows JSON output
 */
async function showJsonOutput(): Promise<void> {
  const aiProcessor = new AIProcessor();
  const registry = new DynamicRegistry(aiProcessor);
  
  await registry.initialize();
  const tools = registry.getFunctionDeclarations();
  const stats = registry.getStats();
  
  const output = {
    timestamp: new Date().toISOString(),
    platform: os.platform(),
    stats,
    tools
  };
  
  console.log(JSON.stringify(output, null, 2));
}

/**
 * Shows formatted output
 */
async function showFormattedOutput(): Promise<void> {
  console.log('🛠️  Discovered Automation Tools');
  console.log('================================');
  
  const aiProcessor = new AIProcessor();
  const registry = new DynamicRegistry(aiProcessor);
  
  await registry.initialize();
  const tools = registry.getFunctionDeclarations();
  const stats = registry.getStats();
  
  console.log(`\n📈 Summary:`);
  console.log(`  Total Tools: ${stats.totalTools}`);
  console.log(`  Platform: ${stats.platform}`);
  
  console.log(`\n📋 Tools by Category:`);
  Object.entries(stats.byType).forEach(([type, count]) => {
    const icon = getTypeIcon(type);
    console.log(`  ${icon} ${type}: ${count}`);
  });
  
  console.log(`\n🔧 Available Tools:`);
  tools.forEach((tool, index) => {
    const params = tool.parameters?.properties ? 
      Object.keys(tool.parameters.properties).join(', ') : 
      'no parameters';
    
    console.log(`  ${index + 1}. ${tool.name}`);
    console.log(`     Description: ${tool.description}`);
    console.log(`     Parameters: ${params}`);
    console.log('');
  });
  
  console.log(`\n💡 Usage Tips:`);
  console.log(`  - Use 'uia_click' and 'uia_type' for generic UI automation`);
  console.log(`  - App-specific tools are prefixed with 'app_'`);
  console.log(`  - Use 'fallback_request' when tools are missing`);
  console.log(`  - Generated scripts are prefixed with 'gen_'`);
}

/**
 * Gets an icon for tool types
 */
function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    'applescript': '🍎',
    'shortcut': '⚡',
    'com': '🪟',
    'powershell': '💻',
    'uia': '🖱️',
    'fallback': '🔄',
    'generated': '🤖'
  };
  
  return icons[type] || '🔧';
}

// Run the CLI
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
} 