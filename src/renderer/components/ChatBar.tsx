import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import DatabaseViewer from './DatabaseViewer';

interface ChatBarProps {
  onClose: () => void;
}

const ChatBar: React.FC<ChatBarProps> = ({ onClose }) => {
  const [input, setInput] = useState('');
<<<<<<< HEAD
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string; isLoading?: boolean }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationContext, setConversationContext] = useState<any>({});
  const [showDatabaseViewer, setShowDatabaseViewer] = useState(false);
=======
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
>>>>>>> origin/main
  const barRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Focus input on open
  useEffect(() => {
    const inputEl = document.getElementById('chatbar-input') as HTMLInputElement;
    if (inputEl) inputEl.focus();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;
    
    const userMessage = input.trim();
<<<<<<< HEAD
    setInput('');
    setIsProcessing(true);
    
    // Add user message to chat
    setMessages((msgs) => [...msgs, { role: 'user', text: userMessage }]);
    
    // Add loading AI message
    setMessages((msgs) => [...msgs, { role: 'ai', text: 'AI is thinking...', isLoading: true }]);
    
    try {
      console.log(`💬 ChatBar: Sending message to backend: "${userMessage}"`);
      console.log(`💬 ChatBar: Current context:`, conversationContext);
      
      // Send to backend via IPC with context
      const response = await window.electronAPI?.processAiInput(userMessage, conversationContext);
      
      if (response?.success) {
        // Update context if the AI response indicates a pending request
        if (response.result && response.result.includes("Could you please provide")) {
          // Extract the pending request from the AI response
          const pendingRequest = extractPendingRequest(userMessage);
          if (pendingRequest) {
            setConversationContext((prev: any) => ({
              ...prev,
              pendingEmailRequest: pendingRequest
            }));
          }
        } else {
          // Clear context if the request was completed
          setConversationContext({});
        }
        
        // Replace loading message with AI response
        setMessages((msgs) => 
          msgs.map((msg, index) => 
            index === msgs.length - 1 && msg.isLoading 
              ? { role: 'ai', text: response.result || 'No response received' }
              : msg
          )
        );
        console.log(`✅ ChatBar: Received AI response:`, response.result);
      } else {
        // Replace loading message with error
        setMessages((msgs) => 
          msgs.map((msg, index) => 
            index === msgs.length - 1 && msg.isLoading 
              ? { role: 'ai', text: response?.error || 'Failed to get response from AI' }
              : msg
          )
        );
        console.error(`❌ ChatBar: AI processing failed:`, response?.error);
      }
    } catch (error) {
      console.error('❌ ChatBar: Error sending message to backend:', error);
      // Replace loading message with error
      setMessages((msgs) => 
        msgs.map((msg, index) => 
          index === msgs.length - 1 && msg.isLoading 
            ? { role: 'ai', text: 'An error occurred while processing your message.' }
            : msg
        )
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper function to extract pending email request
  const extractPendingRequest = (userMessage: string): string | null => {
    const emailKeywords = ['email', 'mail', 'send', 'compose', 'draft', 'write'];
    const hasEmailKeywords = emailKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));
    
    if (hasEmailKeywords) {
      // Extract name from the message (simple approach)
      const words = userMessage.split(/\s+/);
      const nameIndex = words.findIndex(word => 
        word.toLowerCase().includes('to') && 
        words[words.indexOf(word) + 1] && 
        !emailKeywords.includes(words[words.indexOf(word) + 1].toLowerCase())
      );
      
      if (nameIndex !== -1 && words[nameIndex + 1]) {
        const name = words[nameIndex + 1];
        return userMessage.replace(new RegExp(`\\b${name}\\b`, 'gi'), '{EMAIL}');
      }
    }
    
    return null;
=======
    console.log('🎯 ChatBar: User sent message:', userMessage);
    console.log('🔍 ChatBar: electronAPI available:', !!window.electronAPI);
    console.log('🔍 ChatBar: executeCommand available:', !!window.electronAPI?.executeCommand);
    
    // Add user message to chat
    setMessages((msgs) => [...msgs, { role: 'user', text: userMessage }]);
    setInput('');
    setIsProcessing(true);
    
    try {
      console.log('🔄 ChatBar: Sending command to main process...');
      
      // Send command to main process via IPC
      const result = await window.electronAPI.executeCommand(userMessage);
      console.log('✅ ChatBar: Main process response:', result);
      
      if (result.success) {
        const aiResponse = result.result || 'Command executed successfully!';
        console.log('🤖 ChatBar: AI response:', aiResponse);
        setMessages((msgs) => [...msgs, { role: 'ai', text: aiResponse }]);
      } else {
        console.error('❌ ChatBar: Command failed:', result.error);
        setMessages((msgs) => [...msgs, { role: 'ai', text: `Error: ${result.error}` }]);
      }
    } catch (error) {
      console.error('❌ ChatBar: IPC communication error:', error);
      console.error('❌ ChatBar: Error details:', {
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack
      });
      setMessages((msgs) => [...msgs, { role: 'ai', text: 'Sorry, there was an error processing your command.' }]);
    } finally {
      setIsProcessing(false);
    }
>>>>>>> origin/main
  };

  // Drag logic (move window)
  const handleDragStart = (_event: any, info: any) => {
    window.electronAPI?.moveWindow && window.electronAPI.moveWindow(window.screenX, window.screenY);
    dragOffset.current = {
      x: info.point.x,
      y: info.point.y,
    };
  };
  const handleDrag = (_event: any, info: any) => {
    const dx = info.point.x - dragOffset.current.x;
    const dy = info.point.y - dragOffset.current.y;
    const newX = window.screenX + dx;
    const newY = window.screenY + dy;
    window.electronAPI?.moveWindow && window.electronAPI.moveWindow(newX, newY);
  };

  return (
    <motion.div
      ref={barRef}
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      className="fixed top-4 right-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/30 shadow-2xl w-[480px] h-[600px] flex flex-col overflow-hidden group"
      style={{ zIndex: 1000 }}
      drag
      dragMomentum={false}
      dragElastic={0.1}
      dragConstraints={false}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
    >
      {/* Header with minimal design */}
      <div className="relative p-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white text-base">Doppel Assistant</h3>
              <p className="text-gray-500 dark:text-gray-400 text-xs">AI-powered desktop assistant</p>
            </div>
          </div>
          <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={() => setShowDatabaseViewer(true)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
              title="View Database"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Messages with clean styling */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50 dark:bg-gray-900/30">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Ask me anything - I'm here to help!</p>
          </div>
        )}
        {messages.map((message, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700 shadow-sm'
              } ${message.isLoading ? 'animate-pulse' : ''}`}
            >
              {message.isLoading && (
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              )}
              <p className="text-sm leading-relaxed">{message.text}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Input with minimal design */}
      <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm">
        <div className="flex space-x-3">
          <div className="flex-1 relative">
            <input
              id="chatbar-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your message..."
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 text-sm"
              disabled={isProcessing}
            />
            {isProcessing && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            )}
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center space-x-2 text-sm"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                <span>...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span>Send</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Database Viewer Modal */}
      {showDatabaseViewer && (
        <DatabaseViewer onClose={() => setShowDatabaseViewer(false)} />
      )}
    </motion.div>
  );
};

export default ChatBar; 