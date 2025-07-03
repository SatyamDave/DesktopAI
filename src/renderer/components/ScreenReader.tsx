import React, { useState, useEffect } from 'react';

interface ScreenReaderProps {
  onClose: () => void;
  onTextExtracted: (text: string) => void;
}

export const ScreenReader: React.FC<ScreenReaderProps> = ({ onClose, onTextExtracted }) => {
  const [screenText, setScreenText] = useState<string>('');
  const [isReading, setIsReading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Debug: print electronAPI
    // eslint-disable-next-line no-console
    console.log('window.electronAPI:', (window as any).electronAPI);
  }, []);

  const readScreen = async () => {
    setIsReading(true);
    setError('');
    
    try {
      if ((window as any).electronAPI?.readScreenText) {
        const result = await (window as any).electronAPI.readScreenText();
        if (result.success) {
          setScreenText(result.text);
        } else {
          setError(result.error || 'Failed to read screen text');
        }
      } else {
        setError('Screen reading API not available');
      }
    } catch (err) {
      setError('Error reading screen text');
      console.error('Screen reading error:', err);
    } finally {
      setIsReading(false);
    }
  };

  const clearText = () => {
    setScreenText('');
    setError('');
  };

  const handleUseText = () => {
    if (screenText.trim()) {
      onTextExtracted(screenText);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Screen Reader</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-4 mb-4">
          <button
            onClick={readScreen}
            disabled={isReading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isReading ? 'Reading...' : 'Read Screen'}
          </button>
          <button
            onClick={clearText}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Clear
          </button>
          {screenText && (
            <button
              onClick={handleUseText}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Use Text
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="bg-gray-100 p-4 rounded h-96 overflow-y-auto">
          {screenText ? (
            <div className="whitespace-pre-wrap text-sm">
              {screenText}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">
              Click "Read Screen" to capture and extract text from your screen
            </div>
          )}
        </div>

        {screenText && (
          <div className="mt-4 text-sm text-gray-600">
            Characters: {screenText.length} | Words: {screenText.split(/\s+/).filter(word => word.length > 0).length}
          </div>
        )}
      </div>
    </div>
  );
}; 