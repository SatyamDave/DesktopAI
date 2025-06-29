import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Settings, MessageCircle, Zap, Eye, X } from 'lucide-react';

interface FloatingOrbProps {}

const FloatingOrb: React.FC<FloatingOrbProps> = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [userContext, setUserContext] = useState<any>(null);

  useEffect(() => {
    // Get user context from main process
    const getContext = async () => {
      try {
        const context = await window.electronAPI?.getUserContext();
        setUserContext(context);
      } catch (error) {
        console.error('Error getting user context:', error);
      }
    };

    getContext();
    const interval = setInterval(getContext, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const handleClick = () => {
    setIsExpanded(!isExpanded);
  };

  const handleCommand = async (command: string) => {
    try {
      setIsListening(true);
      const result = await window.electronAPI?.executeCommand(command);
      
      if (result?.success) {
        console.log('Command executed successfully:', result.result);
      } else {
        console.error('Command failed:', result?.error);
      }
    } catch (error) {
      console.error('Error executing command:', error);
    } finally {
      setIsListening(false);
    }
  };

  const quickActions = [
    {
      icon: <MessageCircle size={20} />,
      label: 'Chat',
      action: () => handleCommand('open chat interface')
    },
    {
      icon: <Zap size={20} />,
      label: 'Quick Action',
      action: () => handleCommand('show quick actions')
    },
    {
      icon: <Settings size={20} />,
      label: 'Settings',
      action: () => window.location.href = '/settings'
    }
  ];

  if (!isVisible) {
    return (
      <motion.div
        className="fixed bottom-8 right-8 z-50"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.button
          className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 shadow-2xl border-2 border-white/20 backdrop-blur-md flex items-center justify-center cursor-pointer"
          whileHover={{ scale: 1.1, boxShadow: '0 0 30px rgba(139, 92, 246, 0.6)' }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsVisible(true)}
        >
          <Eye size={20} className="text-white" />
        </motion.button>
      </motion.div>
    );
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Main Floating Orb - Centered */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
        <motion.div
          className="floating-orb animate-breathe shadow-2xl"
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
          onClick={handleClick}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          animate={{
            boxShadow: isHovered
              ? '0 0 60px 20px #a78bfa, 0 0 120px 40px #06b6d4, 0 0 80px 20px #fff8'
              : '0 0 40px 12px #6366f1, 0 0 80px 25px #8b5cf6, 0 0 40px 10px #fff6',
            filter: isHovered
              ? 'blur(0.5px) brightness(1.18)'
              : 'blur(0.2px) brightness(1.08)'
          }}
          transition={{ duration: 0.4 }}
          style={{
            width: 90,
            height: 90,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(139,92,246,0.85) 0%, rgba(6,182,212,0.85) 100%)',
            backdropFilter: 'blur(32px) saturate(220%)',
            WebkitBackdropFilter: 'blur(32px) saturate(220%)',
            border: '3px solid rgba(255,255,255,0.32)',
            position: 'relative',
            cursor: 'pointer',
            overflow: 'hidden',
            boxShadow: '0 0 60px 10px #a5b4fc, 0 0 120px 30px #06b6d4, 0 0 40px 10px #fff6',
          }}
        >
          <div className="w-full h-full flex items-center justify-center">
            <Sparkles
              size={32}
              className="text-white drop-shadow-lg"
              style={{ filter: 'drop-shadow(0 0 15px #fff9) drop-shadow(0 0 30px #8b5cf6)' }}
            />
          </div>
          
          {/* Listening indicator */}
          {isListening && (
            <motion.div
              className="absolute inset-0 rounded-full border-3 border-white/80"
              animate={{
                scale: [1, 1.8, 1],
                opacity: [1, 0, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          )}

          {/* Hide button */}
          <motion.button
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-white/70 shadow-lg"
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              setIsVisible(false);
            }}
          >
            <X size={12} className="text-white" />
          </motion.button>
        </motion.div>
      </div>

      {/* Expanded Interface - Centered */}
      <AnimatePresence>
        {isExpanded && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
            <motion.div
              className="w-96 max-w-[90vw]"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <div className="glass rounded-3xl p-8 shadow-2xl border border-white/20 bg-white/15 backdrop-blur-2xl" 
                   style={{
                     boxShadow:'0 20px 80px 0 rgba(31,38,135,0.45), 0 0 60px 10px #a5b4fc, 0 0 120px 30px #06b6d4',
                     border:'2.5px solid rgba(255,255,255,0.28)',
                     background: 'linear-gradient(120deg, rgba(30,41,59,0.55) 0%, rgba(139,92,246,0.18) 100%)',
                     backdropFilter: 'blur(36px) saturate(220%)',
                     WebkitBackdropFilter: 'blur(36px) saturate(220%)',
                   }}>
                
                {/* Close button */}
                <motion.button
                  className="absolute top-4 right-4 w-8 h-8 bg-red-500/80 rounded-full flex items-center justify-center border border-white/30"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsExpanded(false)}
                >
                  <X size={16} className="text-white" />
                </motion.button>

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <h3 className="text-white font-bold text-xl tracking-wide">Doppel AI</h3>
                  </div>
                  <span className="text-sm text-gray-200 bg-white/10 px-3 py-1 rounded-full">Active</span>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {quickActions.map((action, index) => (
                    <motion.button
                      key={index}
                      className="glass rounded-xl p-4 flex flex-col items-center space-y-2 hover:bg-white/25 transition-all duration-300 border border-white/15"
                      onClick={action.action}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="text-white">{action.icon}</div>
                      <span className="text-xs text-gray-200 font-medium">{action.label}</span>
                    </motion.button>
                  ))}
                </div>

                {/* Context Display */}
                {userContext && (
                  <div className="mb-6 p-4 bg-black/30 rounded-xl border border-white/15">
                    <h4 className="text-sm font-semibold text-white mb-3">Current Context</h4>
                    <div className="text-sm text-gray-200 space-y-2">
                      <div className="flex justify-between">
                        <span>App:</span>
                        <span className="text-cyan-300">{userContext.currentApp}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Time:</span>
                        <span className="text-purple-300">{userContext.timeOfDay}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Day:</span>
                        <span className="text-green-300">{userContext.dayOfWeek}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Command Input */}
                <div className="relative mb-6">
                  <input
                    type="text"
                    placeholder="Ask Doppel anything..."
                    className="w-full bg-gradient-to-br from-white/30 via-white/20 to-purple-200/20 border border-white/40 rounded-xl px-5 py-4 text-gray-900 placeholder-gray-700 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 transition-all duration-300 backdrop-blur-xl text-lg shadow-inner"
                    style={{
                      boxShadow: '0 2px 16px 0 rgba(139,92,246,0.10), 0 1.5px 8px 0 rgba(6,182,212,0.10) inset',
                      background: 'linear-gradient(120deg, rgba(255,255,255,0.82) 0%, rgba(139,92,246,0.10) 100%)',
                      color: '#222',
                      fontWeight: 500,
                      letterSpacing: '0.01em',
                    }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleCommand(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <div className="absolute right-4 top-4 text-gray-300 text-sm">
                    ↵
                  </div>
                </div>

                {/* Recent Activity */}
                <div>
                  <h4 className="text-sm font-semibold text-white mb-3">Recent Activity</h4>
                  <div className="space-y-2">
                    {userContext?.recentApps?.slice(0, 3).map((app: string, index: number) => (
                      <motion.div 
                        key={index} 
                        className="flex items-center space-x-3 text-sm text-gray-300 p-2 rounded-lg hover:bg-white/10 transition-colors"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                        <span>{app}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Whisper Mode Indicator */}
      {userContext?.isInMeeting && (
        <motion.div
          className="absolute top-8 right-8 w-5 h-5 bg-red-500 rounded-full shadow-lg border-2 border-white/70 pointer-events-auto"
          animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </div>
  );
};

export default FloatingOrb; 