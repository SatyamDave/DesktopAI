import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, X } from 'lucide-react';

interface CommandInputProps {
  onClose: () => void;
}

const CommandInput: React.FC<CommandInputProps> = ({ onClose }) => {
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    setIsProcessing(true);
    setResult('');

    try {
      const response = await window.electronAPI?.executeCommand(command);
      if (response?.success) {
        setResult(response.result || 'Command executed successfully');
      } else {
        setResult(`Error: ${response?.error || 'Unknown error'}`);
      }
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-lg shadow-xl w-96 max-w-[90vw]"
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.8, y: 20 }}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Command Input</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="Enter your command..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isProcessing}
              />
            </div>

            <button
              type="submit"
              disabled={isProcessing || !command.trim()}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Send Command</span>
                </>
              )}
            </button>
          </form>

          {result && (
            <div className="mt-4 p-3 bg-gray-100 rounded-lg">
              <h3 className="font-semibold mb-2">Result:</h3>
              <p className="text-sm text-gray-700">{result}</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CommandInput; 