import React, { useState, useEffect, useRef } from 'react';

interface DeloCommandResult {
  success: boolean;
  message: string;
  action: string;
  data?: any;
  nextAction?: string;
  requiresConfirmation?: boolean;
}

interface DeloInsights {
  recentTasks: any[];
  userHabits: any[];
  productivityScore: number;
  suggestions: string[];
}

export const DELOInterface: React.FC = () => {
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<DeloCommandResult | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [insights, setInsights] = useState<DeloInsights | null>(null);
  const [showInsights, setShowInsights] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (window.electronAPI) {
      console.log('Renderer: window.electronAPI is available');
    } else {
      console.error('Renderer: window.electronAPI is NOT available');
    }
  }, []);

  useEffect(() => {
    loadSuggestions();
    loadInsights();
    
    // Focus input on mount
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const loadSuggestions = async () => {
    try {
      const response = await window.electronAPI.getDeloSuggestions();
      if (response.success) {
        setSuggestions(response.suggestions || []);
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
    }
  };

  const loadInsights = async () => {
    try {
      const response = await window.electronAPI.getDeloInsights();
      if (response.success) {
        setInsights(response.insights);
      }
    } catch (error) {
      console.error('Error loading insights:', error);
    }
  };

  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || isProcessing) return;

    setIsProcessing(true);
    setResult(null);

    try {
      const response = await window.electronAPI.processDeloCommand(command);
      setResult(response);
      
      if (response.success) {
        setCommand('');
        // Reload suggestions and insights after successful command
        loadSuggestions();
        loadInsights();
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to process command',
        action: 'error',
        data: { error: String(error) }
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setCommand(suggestion);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setCommand('');
      setResult(null);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'summarized': return '📝';
      case 'translated': return '🌐';
      case 'email_drafted': return '📧';
      case 'task_created': return '✅';
      case 'searched': return '🔍';
      case 'app_opened': return '🚀';
      case 'screenshot_taken': return '📸';
      case 'clipboard_cleared': return '🗑️';
      case 'clipboard_shown': return '📋';
      case 'volume_up': return '🔊';
      case 'volume_down': return '🔉';
      case 'system_locked': return '🔒';
      case 'duplicate_warning': return '⚠️';
      case 'no_match': return '❓';
      case 'error': return '❌';
      default: return '🤖';
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('error') || action.includes('warning')) return 'text-red-500';
    if (action.includes('success') || action.includes('created') || action.includes('opened')) return 'text-green-500';
    return 'text-blue-500';
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 glassmorphic bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-glow">
            <span className="text-white text-xl">🧠</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">DELO</h1>
            <p className="text-sm text-white/70">Intelligent Desktop Automation</p>
          </div>
        </div>
        <button
          onClick={() => setShowInsights(!showInsights)}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium text-white/80 transition-colors border border-white/20"
        >
          {showInsights ? 'Hide' : 'Show'} Insights
        </button>
      </div>

      {/* Insights Panel */}
      {showInsights && insights && (
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Session Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{insights.productivityScore}%</div>
              <div className="text-sm text-gray-600">Productivity Score</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Recent Tasks</div>
              <div className="text-xs text-gray-600">
                {insights.recentTasks.slice(0, 3).map((task, i) => (
                  <div key={i} className="truncate">• {task.command}</div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 mb-1">Suggestions</div>
              <div className="text-xs text-gray-600">
                {insights.suggestions.slice(0, 2).map((suggestion, i) => (
                  <div key={i} className="truncate">💡 {suggestion}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Command Input */}
      <form onSubmit={handleCommandSubmit} className="mb-6">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What would you like me to do? (e.g., 'summarize this', 'translate to Spanish')"
            className="w-full px-4 py-3 pr-12 text-lg border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={isProcessing || !command.trim()}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-md font-medium transition-colors"
          >
            {isProcessing ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Processing...</span>
              </div>
            ) : (
              'Execute'
            )}
          </button>
        </div>
      </form>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-sm text-gray-700 rounded-full transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`p-4 rounded-lg border-2 ${
          result.success 
            ? 'border-green-200 bg-green-50' 
            : 'border-red-200 bg-red-50'
        }`}>
          <div className="flex items-start space-x-3">
            <div className={`text-2xl ${getActionColor(result.action)}`}>
              {getActionIcon(result.action)}
            </div>
            <div className="flex-1">
              <div className={`font-medium ${getActionColor(result.action)}`}>
                {result.message}
              </div>
              {result.data && (
                <div className="mt-2 text-sm text-gray-600">
                  {result.data.summary && (
                    <div className="mb-2">
                      <strong>Summary:</strong>
                      <div className="mt-1 p-2 bg-white rounded border text-xs">
                        {result.data.summary}
                      </div>
                    </div>
                  )}
                  {result.data.translation && (
                    <div className="mb-2">
                      <strong>Translation:</strong>
                      <div className="mt-1 p-2 bg-white rounded border text-xs">
                        {result.data.translation}
                      </div>
                    </div>
                  )}
                  {result.data.task && (
                    <div className="mb-2">
                      <strong>Task Created:</strong>
                      <div className="mt-1 p-2 bg-white rounded border text-xs">
                        {result.data.task}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {result.nextAction && (
                <div className="mt-2 p-2 bg-blue-100 rounded text-sm text-blue-800">
                  💡 <strong>Next:</strong> {result.nextAction}
                </div>
              )}
              {result.requiresConfirmation && (
                <div className="mt-2 p-2 bg-yellow-100 rounded text-sm text-yellow-800">
                  ⚠️ Please review and confirm the action in your email client.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-6 text-sm text-gray-500">
        <p className="mb-2"><strong>Examples:</strong></p>
        <ul className="space-y-1 text-xs">
          <li>• "Summarize this" - Summarize clipboard content</li>
          <li>• "Translate to Spanish" - Translate clipboard content</li>
          <li>• "Send as email to team" - Create email draft</li>
          <li>• "Create task" - Create task from content</li>
          <li>• "Search this" - Search clipboard content</li>
          <li>• "Open Gmail" - Launch application</li>
          <li>• "Take screenshot" - Capture screen</li>
          <li>• "Volume up" - System controls</li>
        </ul>
      </div>
    </div>
  );
}; 