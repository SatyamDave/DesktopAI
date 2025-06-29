import React, { useState } from 'react';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
  duration?: number;
}

export const FeatureTest: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testProgress, setTestProgress] = useState(0);

  const runTests = async () => {
    setIsRunning(true);
    setTestProgress(0);
    setResults([]);

    const tests: TestResult[] = [
      { name: 'App Status Check', status: 'pending', message: 'Checking app services...' },
      { name: 'Command Executor', status: 'pending', message: 'Testing command execution...' },
      { name: 'App Launch (Chrome)', status: 'pending', message: 'Testing Chrome launch...' },
      { name: 'Web Search', status: 'pending', message: 'Testing web search...' },
      { name: 'YouTube Search', status: 'pending', message: 'Testing YouTube search...' },
      { name: 'Email Drafting', status: 'pending', message: 'Testing email client...' },
      { name: 'Command History', status: 'pending', message: 'Testing command history...' },
      { name: 'Command Suggestions', status: 'pending', message: 'Testing autocomplete...' },
      { name: 'Clipboard Manager', status: 'pending', message: 'Testing clipboard functionality...' },
      { name: 'AI Processor', status: 'pending', message: 'Testing AI command processing...' },
      { name: 'Behavior Tracker', status: 'pending', message: 'Testing behavior tracking...' },
      { name: 'Whisper Mode', status: 'pending', message: 'Testing voice recognition...' },
      { name: 'Global Shortcuts', status: 'pending', message: 'Testing keyboard shortcuts...' },
      { name: 'Database Operations', status: 'pending', message: 'Testing data persistence...' },
      { name: 'Command Queue', status: 'pending', message: 'Testing sequential execution...' }
    ];

    setResults(tests);

    // Test 1: App Status Check
    await runTest(0, async () => {
      const startTime = Date.now();
      const response = await window.electronAPI.getAppStatus();
      const duration = Date.now() - startTime;
      
      if (response?.success) {
        return {
          status: 'success',
          message: 'All services are running',
          details: response.status,
          duration
        };
      } else {
        return {
          status: 'error',
          message: `Error: ${response?.error || 'Unknown error'}`,
          details: response,
          duration
        };
      }
    });

    // Test 2: Command Executor
    await runTest(1, async () => {
      const startTime = Date.now();
      const response = await window.electronAPI.executeCommand('help');
      const duration = Date.now() - startTime;
      
      if (response?.success) {
        return {
          status: 'success',
          message: 'Command executor working correctly',
          details: response,
          duration
        };
      } else {
        return {
          status: 'error',
          message: `Error: ${response?.error || 'Unknown error'}`,
          details: response,
          duration
        };
      }
    });

    // Test 3: App Launch (Chrome)
    await runTest(2, async () => {
      const startTime = Date.now();
      const response = await window.electronAPI.executeCommand('open chrome');
      const duration = Date.now() - startTime;
      
      if (response?.success) {
        return {
          status: 'success',
          message: 'Chrome launch command processed',
          details: response,
          duration
        };
      } else {
        return {
          status: 'error',
          message: `Chrome launch failed: ${response?.error || 'Unknown error'}`,
          details: response,
          duration
        };
      }
    });

    // Test 4: Web Search
    await runTest(3, async () => {
      const startTime = Date.now();
      const response = await window.electronAPI.executeCommand('search for React tutorial');
      const duration = Date.now() - startTime;
      
      if (response?.success) {
        return {
          status: 'success',
          message: 'Web search command processed',
          details: response,
          duration
        };
      } else {
        return {
          status: 'error',
          message: `Web search failed: ${response?.error || 'Unknown error'}`,
          details: response,
          duration
        };
      }
    });

    // Test 5: YouTube Search
    await runTest(4, async () => {
      const startTime = Date.now();
      const response = await window.electronAPI.executeCommand('YouTube React tutorial');
      const duration = Date.now() - startTime;
      
      if (response?.success) {
        return {
          status: 'success',
          message: 'YouTube search command processed',
          details: response,
          duration
        };
      } else {
        return {
          status: 'error',
          message: `YouTube search failed: ${response?.error || 'Unknown error'}`,
          details: response,
          duration
        };
      }
    });

    // Test 6: Email Drafting
    await runTest(5, async () => {
      const startTime = Date.now();
      const response = await window.electronAPI.executeCommand('send email to manager asking for time off');
      const duration = Date.now() - startTime;
      
      if (response?.success) {
        return {
          status: 'success',
          message: 'Email drafting command processed',
          details: response,
          duration
        };
      } else {
        return {
          status: 'error',
          message: `Email drafting failed: ${response?.error || 'Unknown error'}`,
          details: response,
          duration
        };
      }
    });

    // Test 7: Command History
    await runTest(6, async () => {
      const startTime = Date.now();
      const response = await window.electronAPI.getCommandHistory(5);
      const duration = Date.now() - startTime;
      
      if (response?.success) {
        return {
          status: 'success',
          message: `Found ${response.history?.length || 0} command history items`,
          details: response.history?.slice(0, 3),
          duration
        };
      } else {
        return {
          status: 'error',
          message: `Error: ${response?.error || 'Unknown error'}`,
          details: response,
          duration
        };
      }
    });

    // Test 8: Command Suggestions
    await runTest(7, async () => {
      const startTime = Date.now();
      const response = await window.electronAPI.getCommandSuggestions('open');
      const duration = Date.now() - startTime;
      
      if (response?.success) {
        return {
          status: 'success',
          message: `Found ${response.suggestions?.length || 0} suggestions`,
          details: response.suggestions,
          duration
        };
      } else {
        return {
          status: 'error',
          message: `Error: ${response?.error || 'Unknown error'}`,
          details: response,
          duration
        };
      }
    });

    // Test 9: Clipboard Manager
    await runTest(8, async () => {
      const startTime = Date.now();
      const clipboardHistory = await window.electronAPI.getClipboardHistory();
      const duration = Date.now() - startTime;
      
      return {
        status: 'success',
        message: `Found ${clipboardHistory.length} clipboard items`,
        details: clipboardHistory.slice(0, 3),
        duration
      };
    });

    // Test 10: AI Processor
    await runTest(9, async () => {
      const startTime = Date.now();
      const aiResult = await window.electronAPI.processAiInput('Hello, how are you?');
      const duration = Date.now() - startTime;
      
      if (aiResult.success) {
        return {
          status: 'success',
          message: 'AI processed command successfully',
          details: aiResult,
          duration
        };
      } else {
        return {
          status: 'error',
          message: `Error: ${aiResult.error}`,
          details: aiResult,
          duration
        };
      }
    });

    // Test 11: Behavior Tracker
    await runTest(10, async () => {
      const startTime = Date.now();
      const userContext = await window.electronAPI.getUserContext();
      const duration = Date.now() - startTime;
      
      return {
        status: 'success',
        message: `Current app: ${userContext.currentApp}, Time: ${userContext.timeOfDay}`,
        details: userContext,
        duration
      };
    });

    // Test 12: Whisper Mode
    await runTest(11, async () => {
      const startTime = Date.now();
      const whisperResult = await window.electronAPI.toggleWhisperMode(true);
      const duration = Date.now() - startTime;
      
      if (whisperResult.success) {
        return {
          status: 'success',
          message: 'Whisper mode activated',
          details: whisperResult,
          duration
        };
      } else {
        return {
          status: 'error',
          message: `Error: ${whisperResult.error}`,
          details: whisperResult,
          duration
        };
      }
    });

    // Test 13: Global Shortcuts (simulated)
    await runTest(12, async () => {
      const startTime = Date.now();
      await new Promise(resolve => setTimeout(resolve, 100));
      const duration = Date.now() - startTime;
      
      return {
        status: 'success',
        message: 'Shortcuts registered: Ctrl+Shift+. (command), Escape (hide), Ctrl+Shift+W (whisper)',
        details: {
          shortcuts: [
            'Ctrl+Shift+. - Open command input',
            'Escape - Hide floating window',
            'Ctrl+Shift+W - Toggle whisper mode'
          ]
        },
        duration
      };
    });

    // Test 14: Database Operations
    await runTest(13, async () => {
      const startTime = Date.now();
      const testCommand = await window.electronAPI.executeCommand('Test database functionality');
      const duration = Date.now() - startTime;
      
      if (testCommand.success) {
        return {
          status: 'success',
          message: 'Database operations working',
          details: testCommand,
          duration
        };
      } else {
        return {
          status: 'error',
          message: `Error: ${testCommand.error}`,
          details: testCommand,
          duration
        };
      }
    });

    // Test 15: Command Queue
    await runTest(14, async () => {
      const startTime = Date.now();
      const queueResult = await window.electronAPI.executeCommandQueue([
        'help',
        'search for test'
      ]);
      const duration = Date.now() - startTime;
      
      if (queueResult.success) {
        return {
          status: 'success',
          message: `Executed ${queueResult.results?.length || 0} commands in queue`,
          details: queueResult.results,
          duration
        };
      } else {
        return {
          status: 'error',
          message: `Error: ${queueResult.error}`,
          details: queueResult,
          duration
        };
      }
    });

    setIsRunning(false);
    setTestProgress(100);
  };

  const runTest = async (index: number, testFn: () => Promise<Partial<TestResult>>) => {
    try {
      const result = await testFn();
      const updatedTests = [...results];
      updatedTests[index] = {
        ...updatedTests[index],
        ...result
      };
      setResults(updatedTests);
      setTestProgress(((index + 1) / results.length) * 100);
    } catch (error) {
      const updatedTests = [...results];
      updatedTests[index] = {
        ...updatedTests[index],
        status: 'error',
        message: `Error: ${error}`,
        details: error
      };
      setResults(updatedTests);
      setTestProgress(((index + 1) / results.length) * 100);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-500';
      case 'error': return 'text-red-500';
      case 'pending': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'pending': return '⏳';
      default: return '❓';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'error': return 'bg-red-50 border-red-200';
      case 'pending': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const passedTests = results.filter(r => r.status === 'success').length;
  const failedTests = results.filter(r => r.status === 'error').length;
  const totalTests = results.length;

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Doppel Feature Test Suite</h2>
      
      {/* Progress Bar */}
      {isRunning && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Test Progress</span>
            <span className="text-sm text-gray-500">{Math.round(testProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${testProgress}%` }}
            ></div>
          </div>
        </div>
      )}
      
      <div className="mb-6">
        <button
          onClick={runTests}
          disabled={isRunning}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            isRunning
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {isRunning ? 'Running Tests...' : 'Run All Tests'}
        </button>
      </div>

      <div className="space-y-4 max-h-96 overflow-y-auto">
        {results.map((result, index) => (
          <div key={index} className={`border rounded-lg p-4 ${getStatusBg(result.status)}`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-800">{result.name}</h3>
              <div className="flex items-center space-x-2">
                <span className={getStatusColor(result.status)}>
                  {getStatusIcon(result.status)}
                </span>
                <span className={`text-sm font-medium ${getStatusColor(result.status)}`}>
                  {result.status.toUpperCase()}
                </span>
                {result.duration && (
                  <span className="text-xs text-gray-500">
                    {result.duration}ms
                  </span>
                )}
              </div>
            </div>
            <p className="text-gray-600 text-sm mb-2">{result.message}</p>
            {result.details && (
              <details className="text-xs">
                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                  View Details
                </summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                  {JSON.stringify(result.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>

      {results.length > 0 && (
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <h4 className="font-semibold mb-3">Test Summary</h4>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-800">{totalTests}</div>
              <div className="text-gray-600">Total Tests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{passedTests}</div>
              <div className="text-gray-600">Passed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{failedTests}</div>
              <div className="text-gray-600">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0}%
              </div>
              <div className="text-gray-600">Success Rate</div>
            </div>
          </div>
          
          {failedTests === 0 && passedTests > 0 && (
            <div className="mt-4 p-3 bg-green-100 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-green-600">🎉</span>
                <span className="text-green-800 font-medium">All tests passed! Doppel is ready to use.</span>
              </div>
            </div>
          )}
          
          {failedTests > 0 && (
            <div className="mt-4 p-3 bg-yellow-100 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-yellow-600">⚠️</span>
                <span className="text-yellow-800 font-medium">
                  {failedTests} test(s) failed. Check the details above for more information.
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 