# DELO.FridayCore - Dynamic Discovery Architecture

## Overview

DELO.FridayCore now features a **dynamic, tiered plugin architecture** that discovers automation capabilities on the fly without requiring pre-built plugins or hand-written AppleScripts. The system scans the OS at startup, generates a comprehensive Tool JSON catalog for OpenRouter, and handles missing capabilities through intelligent fallbacks.

## Architecture Components

### 1. Discovery Layer (`src/main/discovery/`)

#### `macScriptDict.ts`
- **Purpose**: Scans `/Applications/*.app` and extracts AppleScript dictionaries
- **Process**: 
  - Runs `sdef $APP | sdp -fh --basename temp` for each app
  - Parses `.h` files for "command *execute*" blocks
  - Generates tool schemas with proper parameter definitions
- **Output**: Tool objects with `app_<bundleId>_<verb>` naming convention

#### `winComScan.ts`
- **Purpose**: Enumerates Windows COM objects and PowerShell cmdlets
- **Process**:
  - Uses PowerShell to scan registry for COM progIDs
  - Extracts available methods from COM objects
  - Discovers PowerShell cmdlets for automation
- **Output**: Tool objects for COM methods and PowerShell commands

#### `shortcutsScan.ts` (integrated in macScriptDict.ts)
- **Purpose**: Discovers macOS Shortcuts for automation
- **Process**: Uses `shortcuts list` and `shortcuts info` commands
- **Output**: Tool objects for running Shortcuts with input parameters

### 2. Runtime Layer (`src/main/runtime/`)

#### `registry.ts` - DynamicRegistry
- **Purpose**: Central tool catalog and execution engine
- **Features**:
  - Combines discovered tools from all sources
  - Handles missing tools through script generation
  - Provides unified execution interface
  - Maintains tool statistics and metadata

#### `scriptCache.ts` - ScriptCacheManager
- **Purpose**: Manages generated scripts for reuse
- **Features**:
  - Stores LLM-generated scripts with success/failure tracking
  - Automatic cleanup of failed scripts
  - Export as tools for the registry
  - Persistent storage with JSON format

#### `microScriptGen.ts` - MicroScriptGenerator
- **Purpose**: Generates automation scripts on demand
- **Process**:
  - Analyzes missing action requests
  - Uses LLM to generate appropriate scripts
  - Tests and validates generated scripts
  - Caches successful scripts for reuse

#### `uiaBridge.ts` - UIABridge
- **Purpose**: Cross-platform UI automation
- **Features**:
  - Generic click/type operations
  - macOS: AppleScript + System Events
  - Windows: UIA + PowerShell
  - Accessibility-based element targeting

#### `fallback.ts` - FallbackHandler
- **Purpose**: Handles missing capabilities gracefully
- **Scenarios**:
  - `missing_app`: App installation guidance
  - `missing_oauth`: OAuth flow assistance
  - `missing_permission`: Permission request help
  - `missing_script`: Script generation triggers
  - `unknown_action`: Manual instruction guidance

### 3. Intent Layer (`src/main/intent/`)

#### `promptTemplate.ts` - PromptTemplateManager
- **Purpose**: Builds intelligent prompts for LLM interactions
- **Features**:
  - Injects discovered tools into prompts
  - Includes live system context
  - Maintains failure learning history
  - Provides specialized prompts for different scenarios

## Tool Discovery Flow

```
1. Startup Scan
   ├── Scan /Applications/*.app → AppleScript dictionaries
   ├── Scan Shortcuts → Automation workflows
   ├── Scan COM objects → Windows automation
   └── Load cached scripts → Generated tools

2. Tool Registration
   ├── Parse discovered capabilities
   ├── Generate OpenRouter-compatible schemas
   ├── Register with execution handlers
   └── Build unified catalog

3. Runtime Execution
   ├── Tool found → Execute directly
   ├── Tool missing → Generate script
   ├── App missing → Fallback to installation
   └── Permission missing → Fallback to guidance
```

## Tool Categories

### Tier 0: Native APIs
- **AppleScript**: Direct app automation via dictionaries
- **COM Objects**: Windows automation via COM interfaces
- **Shortcuts**: macOS workflow automation

### Tier 1: System Commands
- **PowerShell**: Windows cmdlet automation
- **CLI Tools**: Command-line interface automation

### Tier 2: UI Automation
- **UIA Bridge**: Cross-platform accessibility automation
- **Click/Type**: Generic UI interaction

### Tier 3: Generated Scripts
- **LLM-Generated**: On-demand script creation
- **Cached Scripts**: Reused successful generations

### Tier 4: Fallback Systems
- **Installation**: App download/installation guidance
- **OAuth**: Authorization flow assistance
- **Permissions**: System permission requests

## Usage Examples

### Basic Tool Discovery
```bash
# Scan and display discovered tools
ts-node bin/scan_apps.ts

# Get statistics only
ts-node bin/scan_apps.ts --stats

# Export to JSON
ts-node bin/scan_apps.ts --json > tools.json
```

### Tool Execution Flow
```typescript
// Initialize the dynamic registry
const registry = new DynamicRegistry(aiProcessor);
await registry.initialize();

// Get available tools for OpenRouter
const tools = registry.getFunctionDeclarations();

// Execute a tool
const result = await registry.run('app_com_apple_mail_send', {
  to: 'user@example.com',
  subject: 'Test',
  body: 'Hello world'
}, context);
```

### Fallback Handling
```typescript
// When a tool is missing, the system automatically:
// 1. Attempts script generation
// 2. Falls back to installation guidance
// 3. Provides OAuth assistance
// 4. Requests permissions

const result = await registry.run('unknown_action', args, context);
// Result includes fallback guidance and next steps
```

## Configuration

### Environment Variables
```bash
# AI Configuration (for script generation)
OPENAI_API_KEY=your_key
GEMINI_API_KEY=your_key
AZURE_OPENAI_API_KEY=your_key

# Platform-specific settings
PLATFORM=darwin  # or win32
```

### Cache Management
```typescript
// Script cache is stored in:
// ~/.doppel/cache/scripts/script-cache.json

// Clean up old/failed scripts
scriptCache.cleanup(maxAge, maxFailureRate);

// Get cache statistics
const stats = scriptCache.getStats();
```

## Integration with Existing System

### OpenRouter Integration
The dynamic registry provides tools in OpenRouter's function calling format:

```typescript
const tools = registry.getFunctionDeclarations();
// Returns array of { name, description, parameters } objects
```

### Context Integration
Live context is automatically injected into prompts:

```typescript
const context = {
  frontApp: 'Safari',
  clipboard: 'copied text',
  screenText: 'OCR detected text',
  userRequest: 'original user request'
};
```

### Failure Learning
The system learns from failures and adapts:

```typescript
// Record failures for learning
promptManager.recordFailure('tool_name', 'error', 'context');

// Record successes
promptManager.recordSuccess('tool_name', 'context');
```

## Development

### Adding New Discovery Sources
1. Create new discovery module in `src/main/discovery/`
2. Implement discovery interface
3. Register in `DynamicRegistry.discoverTools()`
4. Add to CLI scanner

### Extending Tool Types
1. Add new execution handler in `DynamicRegistry.executeTool()`
2. Update tool schema generation
3. Add to prompt template formatting

### Testing
```bash
# Test discovery
ts-node bin/scan_apps.ts --raw

# Test specific platform
PLATFORM=darwin ts-node bin/scan_apps.ts

# Test with mock data
NODE_ENV=test ts-node bin/scan_apps.ts
```

## Benefits

### 1. Zero Configuration
- No manual plugin setup required
- Automatic discovery of installed apps
- Dynamic capability detection

### 2. Intelligent Fallbacks
- Graceful handling of missing tools
- Automatic script generation
- User guidance for installations

### 3. Learning System
- Failure tracking and learning
- Script caching and reuse
- Adaptive prompt generation

### 4. Cross-Platform
- macOS: AppleScript + Shortcuts
- Windows: COM + PowerShell
- Generic: UIA + Accessibility

### 5. Extensible
- Easy to add new discovery sources
- Pluggable execution handlers
- Customizable fallback strategies

## Future Enhancements

### Planned Features
- **Vision Fallback**: OCR-based UI interaction
- **Machine Learning**: Predictive tool selection
- **Plugin Ecosystem**: Third-party discovery modules
- **Cloud Integration**: Shared script repositories
- **Advanced Context**: Multi-modal context awareness

### Performance Optimizations
- **Lazy Loading**: Discover tools on demand
- **Caching**: Intelligent result caching
- **Parallel Discovery**: Concurrent scanning
- **Incremental Updates**: Delta-based refresh

This architecture provides a robust, intelligent, and extensible foundation for OS-level AI automation that adapts to the user's environment and learns from experience. 