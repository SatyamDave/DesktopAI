import { execSync } from 'child_process';

export interface DiscoveredTool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  exec: {
    type: 'com' | 'powershell';
    progId: string;
    method: string;
    args?: Record<string, any>;
  };
}

/**
 * Scans Windows COM objects for automation capabilities
 * This is a stub implementation - will be expanded for full Windows support
 */
export async function scanWindowsCom(): Promise<DiscoveredTool[]> {
  const tools: DiscoveredTool[] = [];
  
  try {
    // Use PowerShell to enumerate COM objects
    const comObjects = await enumerateComObjects();
    
    for (const comObj of comObjects) {
      const comTools = await extractComMethods(comObj);
      tools.push(...comTools);
    }
  } catch (error) {
    console.error('Error scanning Windows COM objects:', error);
  }
  
  return tools;
}

/**
 * Enumerates available COM objects using PowerShell
 */
async function enumerateComObjects(): Promise<string[]> {
  try {
    const psCommand = `
      Get-ItemProperty HKCR:\\*\\CLSID -ErrorAction SilentlyContinue | 
      Where-Object { $_.PSChildName -match '^[A-Za-z]' } |
      ForEach-Object { $_.PSChildName } |
      Select-Object -First 50
    `;
    
    const result = execSync(`powershell -Command "${psCommand}"`, { encoding: 'utf8' });
    return result.split('\n').filter(line => line.trim() && !line.startsWith('Get-ItemProperty'));
  } catch (error) {
    console.error('Error enumerating COM objects:', error);
    return [];
  }
}

/**
 * Extracts methods from a COM object
 */
async function extractComMethods(progId: string): Promise<DiscoveredTool[]> {
  const tools: DiscoveredTool[] = [];
  
  try {
    // Use PowerShell to get COM object methods
    const psCommand = `
      try {
        $obj = New-Object -ComObject "${progId}"
        $obj | Get-Member -MemberType Method | 
        Where-Object { $_.Name -notmatch '^_' } |
        ForEach-Object { $_.Name }
      } catch {
        Write-Output ""
      }
    `;
    
    const result = execSync(`powershell -Command "${psCommand}"`, { encoding: 'utf8' });
    const methods = result.split('\n').filter(line => line.trim() && !line.startsWith('try'));
    
    for (const method of methods) {
      if (method.trim()) {
        tools.push({
          name: `com_${progId.replace(/[^a-zA-Z0-9]/g, '_')}_${method}`,
          description: `COM method ${method} on ${progId}`,
          parameters: {
            type: 'object',
            properties: {
              args: {
                type: 'array',
                description: 'Arguments to pass to the COM method'
              }
            }
          },
          exec: {
            type: 'com',
            progId,
            method
          }
        });
      }
    }
  } catch (error) {
    console.debug(`Could not extract methods from COM object ${progId}:`, error instanceof Error ? error.message : String(error));
  }
  
  return tools;
}

/**
 * Scans Windows PowerShell cmdlets for automation capabilities
 */
export async function scanPowerShellCmdlets(): Promise<DiscoveredTool[]> {
  const tools: DiscoveredTool[] = [];
  
  try {
    const psCommand = `
      Get-Command -CommandType Cmdlet | 
      Where-Object { $_.Name -notmatch '^_' } |
      Select-Object -First 100 |
      ForEach-Object { $_.Name }
    `;
    
    const result = execSync(`powershell -Command "${psCommand}"`, { encoding: 'utf8' });
    const cmdlets = result.split('\n').filter(line => line.trim() && !line.startsWith('Get-Command'));
    
    for (const cmdlet of cmdlets) {
      if (cmdlet.trim()) {
        tools.push({
          name: `ps_${cmdlet.replace(/[^a-zA-Z0-9]/g, '_')}`,
          description: `PowerShell cmdlet: ${cmdlet}`,
          parameters: {
            type: 'object',
            properties: {
              parameters: {
                type: 'object',
                description: 'Parameters to pass to the cmdlet'
              }
            }
          },
          exec: {
            type: 'powershell',
            progId: cmdlet,
            method: 'Invoke'
          }
        });
      }
    }
  } catch (error) {
    console.error('Error scanning PowerShell cmdlets:', error);
  }
  
  return tools;
} 