import { execSync } from 'child_process';
import * as os from 'os';

export interface UIElement {
  title?: string;
  role?: string;
  index?: number;
  xpath?: string;
  accessibilityId?: string;
}

export interface UIClickResult {
  success: boolean;
  message: string;
  elementFound?: boolean;
}

export interface UITypeResult {
  success: boolean;
  message: string;
  charactersTyped?: number;
}

/**
 * Generic UI automation bridge for cross-platform accessibility
 */
export class UIABridge {
  private platform: string;
  
  constructor() {
    this.platform = os.platform();
  }
  
  /**
   * Generic UI click operation
   */
  async click(element: UIElement): Promise<UIClickResult> {
    try {
      if (this.platform === 'darwin') {
        return await this.clickMacOS(element);
      } else if (this.platform === 'win32') {
        return await this.clickWindows(element);
      } else {
        return {
          success: false,
          message: `Unsupported platform: ${this.platform}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Click failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * Generic UI type operation
   */
  async type(text: string, element?: UIElement): Promise<UITypeResult> {
    try {
      if (this.platform === 'darwin') {
        return await this.typeMacOS(text, element);
      } else if (this.platform === 'win32') {
        return await this.typeWindows(text, element);
      } else {
        return {
          success: false,
          message: `Unsupported platform: ${this.platform}`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Type failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * macOS-specific click implementation using AppleScript and System Events
   */
  private async clickMacOS(element: UIElement): Promise<UIClickResult> {
    try {
      let script = '';
      
      if (element.title) {
        // Click by title
        script = `
          tell application "System Events"
            try
              click button "${element.title}" of window 1 of application process (name of first application process whose frontmost is true)
              return "success"
            on error
              try
                click menu item "${element.title}" of menu bar 1 of application process (name of first application process whose frontmost is true)
                return "success"
              on error
                return "element not found"
              end try
            end try
          end tell
        `;
      } else if (element.role) {
        // Click by role
        script = `
          tell application "System Events"
            try
              click ${element.role} 1 of window 1 of application process (name of first application process whose frontmost is true)
              return "success"
            on error
              return "element not found"
            end try
          end tell
        `;
      } else {
        // Click at current mouse position (fallback)
        script = `
          tell application "System Events"
            click at mouse location
            return "success"
          end tell
        `;
      }
      
      const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8' }).trim();
      
      if (result === 'success') {
        return {
          success: true,
          message: 'Click successful',
          elementFound: true
        };
      } else {
        return {
          success: false,
          message: 'Element not found',
          elementFound: false
        };
      }
      
    } catch (error) {
      return {
        success: false,
        message: `macOS click failed: ${error instanceof Error ? error.message : String(error)}`,
        elementFound: false
      };
    }
  }
  
  /**
   * Windows-specific click implementation using PowerShell and UIA
   */
  private async clickWindows(element: UIElement): Promise<UIClickResult> {
    try {
      let psScript = '';
      
      if (element.title) {
        // Click by name using UIA
        psScript = `
          Add-Type -AssemblyName UIAutomationClient
          Add-Type -AssemblyName UIAutomationTypes
          
          try {
            $automation = [System.Windows.Automation.AutomationElement]::RootElement
            $condition = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, "${element.title}")
            $element = $automation.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condition)
            
            if ($element -ne $null) {
              $invokePattern = $element.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
              if ($invokePattern -ne $null) {
                $invokePattern.Invoke()
                Write-Output "success"
              } else {
                Write-Output "element not clickable"
              }
            } else {
              Write-Output "element not found"
            }
          } catch {
            Write-Output "error: $($_.Exception.Message)"
          }
        `;
      } else {
        // Click at current mouse position (fallback)
        psScript = `
          Add-Type -TypeDefinition '
            using System;
            using System.Runtime.InteropServices;
            
            public class MouseClick {
              [DllImport("user32.dll")]
              public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo);
              
              public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
              public const uint MOUSEEVENTF_LEFTUP = 0x0004;
            }
          '
          
          try {
            [MouseClick]::mouse_event([MouseClick]::MOUSEEVENTF_LEFTDOWN, 0, 0, 0, [UIntPtr]::Zero)
            [MouseClick]::mouse_event([MouseClick]::MOUSEEVENTF_LEFTUP, 0, 0, 0, [UIntPtr]::Zero)
            Write-Output "success"
          } catch {
            Write-Output "error: $($_.Exception.Message)"
          }
        `;
      }
      
      const result = execSync(`powershell -Command "${psScript}"`, { encoding: 'utf8' }).trim();
      
      if (result === 'success') {
        return {
          success: true,
          message: 'Click successful',
          elementFound: true
        };
      } else if (result === 'element not found') {
        return {
          success: false,
          message: 'Element not found',
          elementFound: false
        };
      } else {
        return {
          success: false,
          message: `Windows click failed: ${result}`,
          elementFound: false
        };
      }
      
    } catch (error) {
      return {
        success: false,
        message: `Windows click failed: ${error instanceof Error ? error.message : String(error)}`,
        elementFound: false
      };
    }
  }
  
  /**
   * macOS-specific type implementation
   */
  private async typeMacOS(text: string, element?: UIElement): Promise<UITypeResult> {
    try {
      let script = '';
      
      if (element && element.title) {
        // Type into specific element
        script = `
          tell application "System Events"
            try
              set value of text field "${element.title}" of window 1 of application process (name of first application process whose frontmost is true) to "${text}"
              return "success"
            on error
              return "element not found"
            end try
          end tell
        `;
      } else {
        // Type at current focus
        script = `
          tell application "System Events"
            keystroke "${text}"
            return "success"
          end tell
        `;
      }
      
      const result = execSync(`osascript -e '${script}'`, { encoding: 'utf8' }).trim();
      
      if (result === 'success') {
        return {
          success: true,
          message: 'Type successful',
          charactersTyped: text.length
        };
      } else {
        return {
          success: false,
          message: 'Type failed - element not found'
        };
      }
      
    } catch (error) {
      return {
        success: false,
        message: `macOS type failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * Windows-specific type implementation
   */
  private async typeWindows(text: string, element?: UIElement): Promise<UITypeResult> {
    try {
      let psScript = '';
      
      if (element && element.title) {
        // Type into specific element using UIA
        psScript = `
          Add-Type -AssemblyName UIAutomationClient
          Add-Type -AssemblyName UIAutomationTypes
          
          try {
            $automation = [System.Windows.Automation.AutomationElement]::RootElement
            $condition = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, "${element.title}")
            $element = $automation.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condition)
            
            if ($element -ne $null) {
              $valuePattern = $element.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
              if ($valuePattern -ne $null) {
                $valuePattern.SetValue("${text}")
                Write-Output "success"
              } else {
                Write-Output "element not editable"
              }
            } else {
              Write-Output "element not found"
            }
          } catch {
            Write-Output "error: $($_.Exception.Message)"
          }
        `;
      } else {
        // Type at current focus using SendKeys
        psScript = `
          Add-Type -AssemblyName System.Windows.Forms
          
          try {
            [System.Windows.Forms.SendKeys]::SendWait("${text}")
            Write-Output "success"
          } catch {
            Write-Output "error: $($_.Exception.Message)"
          }
        `;
      }
      
      const result = execSync(`powershell -Command "${psScript}"`, { encoding: 'utf8' }).trim();
      
      if (result === 'success') {
        return {
          success: true,
          message: 'Type successful',
          charactersTyped: text.length
        };
      } else {
        return {
          success: false,
          message: `Windows type failed: ${result}`
        };
      }
      
    } catch (error) {
      return {
        success: false,
        message: `Windows type failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * Gets the generic UIA tool schema for the registry
   */
  getGenericToolSchema(): any[] {
    return [
      {
        name: 'uia_click',
        description: 'Generic UI click by accessibility properties',
        parameters: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Title or name of the UI element to click'
            },
            role: {
              type: 'string',
              description: 'Role of the UI element (button, menu item, etc.)'
            },
            index: {
              type: 'number',
              description: 'Index of the element if multiple elements match'
            }
          }
        },
        exec: {
          type: 'uia',
          action: 'click'
        }
      },
      {
        name: 'uia_type',
        description: 'Generic UI type text into focused or specified element',
        parameters: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'Text to type',
              required: true
            },
            title: {
              type: 'string',
              description: 'Title of the element to type into (optional)'
            }
          },
          required: ['text']
        },
        exec: {
          type: 'uia',
          action: 'type'
        }
      }
    ];
  }
} 