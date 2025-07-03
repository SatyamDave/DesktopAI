import * as vm from 'vm';
import * as fs from 'fs';
import * as path from 'path';

class PluginSandboxService {
  private reviewQueue: Set<string> = new Set();
  private approvedPlugins: Set<string> = new Set();

  // Run a plugin in a restricted VM context
  async runPluginInSandbox(pluginPath: string, args: any): Promise<{ success: boolean; output: string; error?: string }> {
    if (!this.approvedPlugins.has(pluginPath)) {
      return { success: false, output: '', error: 'Plugin not approved for execution.' };
    }
    try {
      const code = fs.readFileSync(pluginPath, 'utf8');
      const sandbox = { args, output: '', console };
      const script = new vm.Script(code);
      const context = vm.createContext(sandbox);
      script.runInContext(context, { timeout: 2000 });
      return { success: true, output: sandbox.output };
    } catch (error: any) {
      return { success: false, output: '', error: error.message };
    }
  }

  // Submit a plugin for review
  submitForReview(pluginPath: string) {
    this.reviewQueue.add(pluginPath);
  }

  // Approve a plugin
  approvePlugin(pluginPath: string) {
    this.reviewQueue.delete(pluginPath);
    this.approvedPlugins.add(pluginPath);
  }

  // Reject a plugin
  rejectPlugin(pluginPath: string) {
    this.reviewQueue.delete(pluginPath);
    this.approvedPlugins.delete(pluginPath);
  }

  // List plugins pending review
  getPendingReviews(): string[] {
    return Array.from(this.reviewQueue);
  }
}

export const pluginSandboxService = new PluginSandboxService(); 