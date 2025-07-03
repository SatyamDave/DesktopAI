const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class SimpleRegistry {
  constructor() {
    this.plugins = {};
    this.manifests = [];
    this.pluginsDir = path.join(process.cwd(), 'plugins');
  }

  async initialize() {
    console.log('Initializing simple registry...');
    await this.discoverPlugins();
    console.log(`Loaded ${this.manifests.length} plugins:`, this.manifests.map(m => m.name));
  }

  async discoverPlugins() {
    const pluginDirs = fs.readdirSync(this.pluginsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const pluginDir of pluginDirs) {
      await this.loadPlugin(pluginDir);
    }
  }

  async loadPlugin(pluginDir) {
    try {
      const pluginPath = path.join(this.pluginsDir, pluginDir);
      const manifestYmlPath = path.join(pluginPath, 'manifest.yml');
      const indexJsPath = path.join(pluginPath, 'index.js');

      if (fs.existsSync(manifestYmlPath)) {
        console.log(`Loading YAML plugin: ${pluginDir}`);
        const yamlContent = fs.readFileSync(manifestYmlPath, 'utf8');
        const yamlManifests = yaml.loadAll(yamlContent);

        if (fs.existsSync(indexJsPath)) {
          const pluginModule = require(indexJsPath);

          for (const yamlManifest of yamlManifests) {
            if (yamlManifest.name && yamlManifest.description) {
              const convertedManifest = {
                name: yamlManifest.name,
                description: yamlManifest.description,
                parametersSchema: {
                  type: 'object',
                  properties: yamlManifest.parameters?.properties || {},
                  required: yamlManifest.parameters?.required || []
                }
              };

              this.manifests.push(convertedManifest);
              this.plugins[convertedManifest.name] = {
                manifest: convertedManifest,
                run: pluginModule.run
              };

              console.log(`✅ Loaded plugin: ${convertedManifest.name}`);
            }
          }
        }
      }
    } catch (error) {
      console.log(`Failed to load plugin ${pluginDir}:`, error.message);
    }
  }

  getManifests() {
    return this.manifests;
  }

  getPlugin(name) {
    return this.plugins[name];
  }

  listPlugins() {
    return Object.keys(this.plugins);
  }

  async runPlugin(name, args, context) {
    const plugin = this.plugins[name];
    if (!plugin) {
      throw new Error(`Plugin '${name}' not found`);
    }
    return await plugin.run(args, context);
  }
}

module.exports = { SimpleRegistry }; 