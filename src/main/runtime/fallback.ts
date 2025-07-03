import { execSync } from 'child_process';
import * as os from 'os';
import { shell } from 'electron';

export interface FallbackRequest {
  reason: 'missing_app' | 'missing_oauth' | 'missing_permission' | 'missing_script' | 'unknown_action';
  proposal: string;
  details?: {
    appName?: string;
    appUrl?: string;
    oauthProvider?: string;
    permissionType?: string;
    action?: string;
  };
}

export interface FallbackResponse {
  success: boolean;
  message: string;
  action?: 'install_app' | 'open_oauth' | 'request_permission' | 'generate_script' | 'manual_instruction';
  nextSteps?: string[];
}

/**
 * Handles fallback scenarios when tools are not available
 */
export class FallbackHandler {
  private platform: string;
  
  constructor() {
    this.platform = os.platform();
  }
  
  /**
   * Processes a fallback request and provides appropriate response
   */
  async handleFallback(request: FallbackRequest): Promise<FallbackResponse> {
    switch (request.reason) {
      case 'missing_app':
        return await this.handleMissingApp(request);
      case 'missing_oauth':
        return await this.handleMissingOAuth(request);
      case 'missing_permission':
        return await this.handleMissingPermission(request);
      case 'missing_script':
        return await this.handleMissingScript(request);
      case 'unknown_action':
        return await this.handleUnknownAction(request);
      default:
        return {
          success: false,
          message: 'Unknown fallback reason',
          action: 'manual_instruction'
        };
    }
  }
  
  /**
   * Handles missing application scenarios
   */
  private async handleMissingApp(request: FallbackRequest): Promise<FallbackResponse> {
    const { appName, appUrl } = request.details || {};
    
    if (!appName) {
      return {
        success: false,
        message: 'App name not specified in fallback request',
        action: 'manual_instruction'
      };
    }
    
    const nextSteps: string[] = [];
    
    if (this.platform === 'darwin') {
      // macOS app installation
      if (appUrl) {
        nextSteps.push(`Open browser to download: ${appUrl}`);
        nextSteps.push('Or install from Mac App Store if available');
      } else {
        nextSteps.push('Search for the app in Mac App Store');
        nextSteps.push('Or download from the official website');
      }
      
      // Try to open App Store search
      try {
        const searchUrl = `macappstore://search.itunes.apple.com/WebObjects/MZSearch.woa/wa/search?media=software&term=${encodeURIComponent(appName)}`;
        shell.openExternal(searchUrl);
      } catch (error) {
        console.error('Failed to open App Store:', error);
      }
      
    } else if (this.platform === 'win32') {
      // Windows app installation
      if (appUrl) {
        nextSteps.push(`Open browser to download: ${appUrl}`);
      } else {
        nextSteps.push('Search for the app in Microsoft Store');
        nextSteps.push('Or download from the official website');
      }
      
      // Try to open Microsoft Store search
      try {
        const searchUrl = `ms-windows-store://search/?query=${encodeURIComponent(appName)}`;
        shell.openExternal(searchUrl);
      } catch (error) {
        console.error('Failed to open Microsoft Store:', error);
      }
    }
    
    return {
      success: true,
      message: `App "${appName}" is not installed. DELO can help you install it automatically or guide you through the process.`,
      action: 'install_app',
      nextSteps
    };
  }
  
  /**
   * Handles missing OAuth token scenarios
   */
  private async handleMissingOAuth(request: FallbackRequest): Promise<FallbackResponse> {
    const { oauthProvider } = request.details || {};
    
    if (!oauthProvider) {
      return {
        success: false,
        message: 'OAuth provider not specified in fallback request',
        action: 'manual_instruction'
      };
    }
    
    const oauthUrls: Record<string, string> = {
      'google': 'https://accounts.google.com/oauth/authorize',
      'microsoft': 'https://login.microsoftonline.com/oauth2/v2.0/authorize',
      'github': 'https://github.com/login/oauth/authorize',
      'slack': 'https://slack.com/oauth/v2/authorize',
      'discord': 'https://discord.com/api/oauth2/authorize',
      'zoom': 'https://zoom.us/oauth/authorize',
      'dropbox': 'https://www.dropbox.com/oauth2/authorize',
      'box': 'https://account.box.com/api/oauth2/authorize'
    };
    
    const oauthUrl = oauthUrls[oauthProvider.toLowerCase()];
    const nextSteps: string[] = [];
    
    if (oauthUrl) {
      nextSteps.push(`Open OAuth authorization page for ${oauthProvider}`);
      nextSteps.push('Complete the authorization flow');
      nextSteps.push('Copy the authorization code or token');
      nextSteps.push('Configure the token in DELO settings');
      
      // Try to open OAuth page
      try {
        shell.openExternal(oauthUrl);
      } catch (error) {
        console.error(`Failed to open OAuth page for ${oauthProvider}:`, error);
      }
    } else {
      nextSteps.push(`Search for ${oauthProvider} OAuth documentation`);
      nextSteps.push('Follow the official OAuth setup guide');
    }
    
    return {
      success: true,
      message: `OAuth token for ${oauthProvider} is required. Please complete the authorization flow.`,
      action: 'open_oauth',
      nextSteps
    };
  }
  
  /**
   * Handles missing permission scenarios
   */
  private async handleMissingPermission(request: FallbackRequest): Promise<FallbackResponse> {
    const { permissionType } = request.details || {};
    
    if (!permissionType) {
      return {
        success: false,
        message: 'Permission type not specified in fallback request',
        action: 'manual_instruction'
      };
    }
    
    const nextSteps: string[] = [];
    
    if (this.platform === 'darwin') {
      // macOS permissions
      const permissionGuides: Record<string, string[]> = {
        'accessibility': [
          'Open System Preferences > Security & Privacy > Privacy',
          'Select "Accessibility" from the left sidebar',
          'Click the lock icon to make changes',
          'Add DELO to the list of allowed apps',
          'Restart DELO after granting permission'
        ],
        'screen_recording': [
          'Open System Preferences > Security & Privacy > Privacy',
          'Select "Screen Recording" from the left sidebar',
          'Click the lock icon to make changes',
          'Add DELO to the list of allowed apps',
          'Restart DELO after granting permission'
        ],
        'microphone': [
          'Open System Preferences > Security & Privacy > Privacy',
          'Select "Microphone" from the left sidebar',
          'Click the lock icon to make changes',
          'Add DELO to the list of allowed apps'
        ],
        'camera': [
          'Open System Preferences > Security & Privacy > Privacy',
          'Select "Camera" from the left sidebar',
          'Click the lock icon to make changes',
          'Add DELO to the list of allowed apps'
        ],
        'files': [
          'Open System Preferences > Security & Privacy > Privacy',
          'Select "Files and Folders" from the left sidebar',
          'Click the lock icon to make changes',
          'Add DELO and select the folders you want to access'
        ]
      };
      
      nextSteps.push(...(permissionGuides[permissionType.toLowerCase()] || [
        'Open System Preferences > Security & Privacy > Privacy',
        'Look for the relevant permission category',
        'Add DELO to the allowed apps list'
      ]));
      
    } else if (this.platform === 'win32') {
      // Windows permissions
      const permissionGuides: Record<string, string[]> = {
        'accessibility': [
          'Open Settings > Privacy & Security > Accessibility',
          'Turn on "Let apps access your accessibility features"',
          'Add DELO to the list of allowed apps'
        ],
        'microphone': [
          'Open Settings > Privacy & Security > Microphone',
          'Turn on "Microphone access"',
          'Add DELO to the list of allowed apps'
        ],
        'camera': [
          'Open Settings > Privacy & Security > Camera',
          'Turn on "Camera access"',
          'Add DELO to the list of allowed apps'
        ],
        'files': [
          'Open Settings > Privacy & Security > File System',
          'Turn on "File System access"',
          'Add DELO to the list of allowed apps'
        ]
      };
      
      nextSteps.push(...(permissionGuides[permissionType.toLowerCase()] || [
        'Open Settings > Privacy & Security',
        'Look for the relevant permission category',
        'Add DELO to the allowed apps list'
      ]));
    }
    
    return {
      success: true,
      message: `${permissionType} permission is required for this feature. Please grant the permission in system settings.`,
      action: 'request_permission',
      nextSteps
    };
  }
  
  /**
   * Handles missing script scenarios
   */
  private async handleMissingScript(request: FallbackRequest): Promise<FallbackResponse> {
    const { action } = request.details || {};
    
    // Try to generate a script immediately
    try {
      // This would integrate with the MicroScriptGenerator
      // For now, we'll provide a more aggressive response
      const nextSteps = [
        'DELO will analyze the requested action',
        'Generate an appropriate AppleScript or automation script',
        'Test the generated script for safety',
        'Cache it for future use',
        'If the script requires an app, offer to install it'
      ];
      
      // If this is a calendar-related action, offer Calendar.app setup
      if (action && (action.toLowerCase().includes('calendar') || action.toLowerCase().includes('event'))) {
        nextSteps.push('Set up Calendar.app integration if not already configured');
        nextSteps.push('Grant calendar permissions if needed');
      }
      
      // If this is an email-related action, offer Mail.app setup
      if (action && (action.toLowerCase().includes('email') || action.toLowerCase().includes('mail'))) {
        nextSteps.push('Set up Mail.app integration if not already configured');
        nextSteps.push('Configure email accounts if needed');
      }
      
      return {
        success: true,
        message: `DELO will generate a script for: ${action || 'unknown action'}. This may require installing or configuring apps.`,
        action: 'generate_script',
        nextSteps
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to generate script for: ${action || 'unknown'}. Please try a different approach.`,
        action: 'manual_instruction',
        nextSteps: [
          'Try rephrasing your request',
          'Check if the required app is installed',
          'Verify that necessary permissions are granted'
        ]
      };
    }
  }
  
  /**
   * Handles unknown action scenarios
   */
  private async handleUnknownAction(request: FallbackRequest): Promise<FallbackResponse> {
    const { action } = request.details || {};
    
    return {
      success: false,
      message: `Unknown action requested: ${action || 'unspecified'}. DELO cannot perform this action.`,
      action: 'manual_instruction',
      nextSteps: [
        'Try rephrasing your request',
        'Break down complex actions into simpler steps',
        'Check if the required app is installed',
        'Verify that necessary permissions are granted'
      ]
    };
  }
  
  /**
   * Gets the fallback tool schema for the registry
   */
  getFallbackToolSchema(): any[] {
    return [
      {
        name: 'fallback_request',
        description: 'Request fallback handling for missing tools, OAuth, or permissions',
        parameters: {
          type: 'object',
          properties: {
            reason: {
              type: 'string',
              enum: ['missing_app', 'missing_oauth', 'missing_permission', 'missing_script', 'unknown_action'],
              description: 'Reason for the fallback request'
            },
            proposal: {
              type: 'string',
              description: 'Human-readable description of what needs to be done'
            },
            details: {
              type: 'object',
              properties: {
                appName: {
                  type: 'string',
                  description: 'Name of the app that needs to be installed'
                },
                appUrl: {
                  type: 'string',
                  description: 'URL to download the app'
                },
                oauthProvider: {
                  type: 'string',
                  description: 'OAuth provider that needs authorization'
                },
                permissionType: {
                  type: 'string',
                  description: 'Type of permission needed'
                },
                action: {
                  type: 'string',
                  description: 'Action that couldn\'t be performed'
                }
              }
            }
          },
          required: ['reason', 'proposal']
        },
        exec: {
          type: 'fallback',
          handler: 'process'
        }
      }
    ];
  }
} 