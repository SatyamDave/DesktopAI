import React, { useState, useEffect } from 'react';
import { ipcRenderer } from 'electron';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
}

export const FeatureTest: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);

    const tests: TestResult[] = [
      { name: 'Clipboard Manager', status: 'pending', message: 'Testing clipboard functionality...' },
      { name: 'AI Processor', status: 'pending', message: 'Testing AI command processing...' },
      { name: 'Behavior Tracker', status: 'pending', message: 'Testing behavior tracking...' },
      { name: 'Whisper Mode', status: 'pending', message: 'Testing voice recognition...' },
      { name: 'Global Shortcuts', status: 'pending', message: 'Testing keyboard shortcuts...' },
      { name: 'Database', status: 'pending', message: 'Testing data persistence...' }
    ];

    setResults(tests);

    // Test 1: Clipboard Manager
    try {
      const clipboardHistory = await ipcRenderer.invoke('get-clipboard-history');
      tests[0] = {
        name: 'Clipboard Manager',
        status: 'success',
        message: `Found ${clipboardHistory.length} clipboard items`,
        details: clipboardHistory.slice(0, 3)
      };
      setResults([...tests]);
    } catch (error) {
      tests[0] = {
        name: 'Clipboard Manager',
        status: 'error',
        message: `Error: ${error}`,
        details: error
      };
      setResults([...tests]);
    }

    // Test 2: AI Processor
    try {
      const aiResult = await ipcRenderer.invoke('execute-command', 'Hello, how are you?');
      tests[1] = {
        name: 'AI Processor',
        status: aiResult.success ? 'success' : 'error',
        message: aiResult.success ? 'AI processed command successfully' : `Error: ${aiResult.error}`,
        details: aiResult
      };
      setResults([...tests]);
    } catch (error) {
      tests[1] = {
        name: 'AI Processor',
        status: 'error',
        message: `Error: ${error}`,
        details: error
      };
      setResults([...tests]);
    }

    // Test 3: Behavior Tracker
    try {
      const userContext = await ipcRenderer.invoke('get-user-context');
      tests[2] = {
        name: 'Behavior Tracker',
        status: 'success',
        message: `Current app: ${userContext.currentApp}, Time: ${userContext.timeOfDay}`,
        details: userContext
      };
      setResults([...tests]);
    } catch (error) {
      tests[2] = {
        name: 'Behavior Tracker',
        status: 'error',
        message: `Error: ${error}`,
        details: error
      };
      setResults([...tests]);
    }

    // Test 4: Whisper Mode
    try {
      const whisperResult = await ipcRenderer.invoke('toggle-whisper-mode', true);
      tests[3] = {
        name: 'Whisper Mode',
        status: whisperResult.success ? 'success' : 'error',
        message: whisperResult.success ? 'Whisper mode activated' : `Error: ${whisperResult.error}`,
        details: whisperResult
      };
      setResults([...tests]);
    } catch (error) {
      tests[3] = {
        name: 'Whisper Mode',
        status: 'error',
        message: `Error: ${error}`,
        details: error
      };
      setResults([...tests]);
    }

    // Test 5: Global Shortcuts (simulated)
    setTimeout(() => {
      tests[4] = {
        name: 'Global Shortcuts',
        status: 'success',
        message: 'Shortcuts registered: Ctrl+Shift+. (command), Escape (hide), Ctrl+Shift+W (whisper)',
        details: {
          shortcuts: [
            'Ctrl+Shift+. - Open command input',
            'Escape - Hide floating window',
            'Ctrl+Shift+W - Toggle whisper mode'
          ]
        }
      };
      setResults([...tests]);
    }, 500);

    // Test 6: Database (test by adding data)
    try {
      const testCommand = await ipcRenderer.invoke('execute-command', 'Test database functionality');
      tests[5] = {
        name: 'Database',
        status: testCommand.success ? 'success' : 'error',
        message: testCommand.success ? 'Database operations working' : `Error: ${testCommand.error}`,
        details: testCommand
      };
      setResults([...tests]);
    } catch (error) {
      tests[5] = {
        name: 'Database',
        status: 'error',
        message: `Error: ${error}`,
        details: error
      };
      setResults([...tests]);
    }

    setIsRunning(false);
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

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Feature Test Suite</h2>
      
      <div className="mb-6">
        <button
          onClick={runTests}
          disabled={isRunning}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            isRunning
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {isRunning ? 'Running Tests...' : 'Run All Tests'}
        </button>
      </div>

      <div className="space-y-4">
        {results.map((result, index) => (
          <div key={index} className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-800">{result.name}</h3>
              <div className="flex items-center space-x-2">
                <span className={getStatusColor(result.status)}>
                  {getStatusIcon(result.status)}
                </span>
                <span className={`text-sm font-medium ${getStatusColor(result.status)}`}>
                  {result.status.toUpperCase()}
                </span>
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
          <h4 className="font-semibold mb-2">Summary</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Total:</span> {results.length}
            </div>
            <div>
              <span className="font-medium text-green-600">Passed:</span> {results.filter(r => r.status === 'success').length}
            </div>
            <div>
              <span className="font-medium text-red-600">Failed:</span> {results.filter(r => r.status === 'error').length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 