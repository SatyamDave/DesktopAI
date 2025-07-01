import React, { useState, useEffect } from 'react';

interface DatabaseViewerProps {
  onClose: () => void;
}

interface Conversation {
  id: number;
  user_input: string;
  ai_response: string;
  timestamp: number;
  intent: string;
}

interface EmailDraft {
  id: number;
  user_prompt: string;
  subject: string;
  body: string;
  recipient: string;
  timestamp: number;
}

const DatabaseViewer: React.FC<DatabaseViewerProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'conversations' | 'emails' | 'clipboard'>('conversations');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [emailDrafts, setEmailDrafts] = useState<EmailDraft[]>([]);
  const [clipboardHistory, setClipboardHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'conversations':
          const convResponse = await window.electronAPI?.getConversationHistory(50);
          if (convResponse?.success) {
            setConversations(convResponse.history || []);
          }
          break;
        case 'emails':
          const emailResponse = await window.electronAPI?.getEmailDraftHistory(50);
          if (emailResponse?.success) {
            setEmailDrafts(emailResponse.history || []);
          }
          break;
        case 'clipboard':
          const clipboardData = await window.electronAPI?.getClipboardHistory();
          setClipboardHistory(clipboardData || []);
          break;
      }
    } catch (error) {
      console.error('Error loading database data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl w-5/6 h-5/6 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="relative p-6 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-medium text-gray-900 dark:text-white">Database Viewer</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Your AI Assistant's Memory</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200/50 dark:border-gray-700/50 bg-white/40 dark:bg-gray-800/40">
          <button
            onClick={() => setActiveTab('conversations')}
            className={`px-6 py-4 text-sm font-medium transition-all duration-200 ${
              activeTab === 'conversations' 
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border-b-2 border-blue-500' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Conversations</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('emails')}
            className={`px-6 py-4 text-sm font-medium transition-all duration-200 ${
              activeTab === 'emails' 
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border-b-2 border-blue-500' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Email Drafts</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('clipboard')}
            className={`px-6 py-4 text-sm font-medium transition-all duration-200 ${
              activeTab === 'clipboard' 
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border-b-2 border-blue-500' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>Clipboard History</span>
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50/50 dark:bg-gray-900/30">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 border-3 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
                <p className="text-gray-500 dark:text-gray-400">Loading your data...</p>
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'conversations' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Recent Conversations ({conversations.length})</h3>
                  {conversations.map((conv) => (
                    <div key={conv.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-sm text-gray-500 dark:text-gray-400">{formatTimestamp(conv.timestamp)}</span>
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800">{conv.intent}</span>
                      </div>
                      <div className="mb-3">
                        <strong className="text-blue-600 dark:text-blue-400">You:</strong> 
                        <p className="text-gray-700 dark:text-gray-300 mt-1">{conv.user_input}</p>
                      </div>
                      <div>
                        <strong className="text-purple-600 dark:text-purple-400">AI:</strong> 
                        <p className="text-gray-700 dark:text-gray-300 mt-1">{conv.ai_response}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'emails' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Email Drafts ({emailDrafts.length})</h3>
                  {emailDrafts.map((email) => (
                    <div key={email.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-sm text-gray-500 dark:text-gray-400">{formatTimestamp(email.timestamp)}</span>
                        <button
                          onClick={() => copyToClipboard(email.body)}
                          className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-1 rounded-full border border-green-200 dark:border-green-800 hover:bg-green-200 dark:hover:bg-green-900/50 transition-all duration-200"
                        >
                          Copy
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <strong className="text-blue-600 dark:text-blue-400">To:</strong> 
                          <p className="text-gray-700 dark:text-gray-300 mt-1">{email.recipient}</p>
                        </div>
                        <div>
                          <strong className="text-purple-600 dark:text-purple-400">Subject:</strong> 
                          <p className="text-gray-700 dark:text-gray-300 mt-1">{email.subject}</p>
                        </div>
                      </div>
                      <div className="mb-4">
                        <strong className="text-amber-600 dark:text-amber-400">Prompt:</strong> 
                        <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">{email.user_prompt}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{email.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'clipboard' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Clipboard History ({clipboardHistory.length})</h3>
                  {clipboardHistory.map((item, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200 shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-sm text-gray-500 dark:text-gray-400">{formatTimestamp(item.timestamp || Date.now())}</span>
                        <button
                          onClick={() => window.electronAPI?.pasteFromHistory(index)}
                          className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all duration-200"
                        >
                          Paste
                        </button>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                        <p className="text-gray-700 dark:text-gray-300 text-sm break-all leading-relaxed">{item.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DatabaseViewer; 