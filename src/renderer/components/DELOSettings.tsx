import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface DELOSettingsProps {
  onClose: () => void;
}

interface AppFilter {
  app_name: string;
  is_whitelisted: boolean;
  is_blacklisted: boolean;
  window_patterns: string[];
}

interface AudioFilter {
  source_name: string;
  is_whitelisted: boolean;
  is_blacklisted: boolean;
  volume_threshold: number;
  keywords: string[];
}

interface ContextPattern {
  pattern_name: string;
  app_name: string;
  window_pattern: string;
  audio_keywords: string[];
  screen_keywords: string[];
  trigger_actions: string[];
  is_active: boolean;
}

const DELOSettings: React.FC<DELOSettingsProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'screen' | 'audio' | 'context' | 'patterns'>('overview');
  const [appStatus, setAppStatus] = useState<any>(null);
  const [screenSnapshots, setScreenSnapshots] = useState<any[]>([]);
  const [audioSessions, setAudioSessions] = useState<any[]>([]);
  const [contextSnapshots, setContextSnapshots] = useState<any[]>([]);
  
  // Form states
  const [newAppFilter, setNewAppFilter] = useState<AppFilter>({
    app_name: '',
    is_whitelisted: false,
    is_blacklisted: false,
    window_patterns: []
  });
  
  const [newAudioFilter, setNewAudioFilter] = useState<AudioFilter>({
    source_name: '',
    is_whitelisted: false,
    is_blacklisted: false,
    volume_threshold: 0.1,
    keywords: []
  });
  
  const [newContextPattern, setNewContextPattern] = useState<ContextPattern>({
    pattern_name: '',
    app_name: '',
    window_pattern: '',
    audio_keywords: [],
    screen_keywords: [],
    trigger_actions: [],
    is_active: true
  });
  
  const [quietHours, setQuietHours] = useState({ start: 22, end: 6 });

  useEffect(() => {
    loadAppStatus();
    loadData();
  }, []);

  const loadAppStatus = async () => {
    try {
      const result = await window.electronAPI.getAppStatus();
      if (result.success) {
        setAppStatus(result.status);
      }
    } catch (error) {
      console.error('Error loading app status:', error);
    }
  };

  const loadData = async () => {
    try {
      const [screenResult, audioResult, contextResult] = await Promise.all([
        window.electronAPI.getScreenSnapshots(10),
        window.electronAPI.getAudioSessions(10),
        window.electronAPI.getContextSnapshots(10)
      ]);
      
      if (screenResult.success) setScreenSnapshots(screenResult.snapshots);
      if (audioResult.success) setAudioSessions(audioResult.sessions);
      if (contextResult.success) setContextSnapshots(contextResult.snapshots);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleToggleScreenPerception = async () => {
    try {
      if (appStatus?.screenPerception?.active) {
        await window.electronAPI.stopScreenPerception();
      } else {
        await window.electronAPI.startScreenPerception();
      }
      await loadAppStatus();
    } catch (error) {
      console.error('Error toggling screen perception:', error);
    }
  };

  const handleToggleAudioPerception = async () => {
    try {
      if (appStatus?.audioPerception?.active) {
        await window.electronAPI.stopAudioPerception();
      } else {
        await window.electronAPI.startAudioPerception();
      }
      await loadAppStatus();
    } catch (error) {
      console.error('Error toggling audio perception:', error);
    }
  };

  const handleToggleContextManager = async () => {
    try {
      if (appStatus?.contextManager?.active) {
        await window.electronAPI.stopContextManager();
      } else {
        await window.electronAPI.startContextManager();
      }
      await loadAppStatus();
    } catch (error) {
      console.error('Error toggling context manager:', error);
    }
  };

  const handleAddAppFilter = async () => {
    try {
      await window.electronAPI.addScreenFilter(newAppFilter);
      setNewAppFilter({
        app_name: '',
        is_whitelisted: false,
        is_blacklisted: false,
        window_patterns: []
      });
      await loadData();
    } catch (error) {
      console.error('Error adding app filter:', error);
    }
  };

  const handleAddAudioFilter = async () => {
    try {
      await window.electronAPI.addAudioFilter(newAudioFilter);
      setNewAudioFilter({
        source_name: '',
        is_whitelisted: false,
        is_blacklisted: false,
        volume_threshold: 0.1,
        keywords: []
      });
      await loadData();
    } catch (error) {
      console.error('Error adding audio filter:', error);
    }
  };

  const handleAddContextPattern = async () => {
    try {
      await window.electronAPI.addContextPattern(newContextPattern);
      setNewContextPattern({
        pattern_name: '',
        app_name: '',
        window_pattern: '',
        audio_keywords: [],
        screen_keywords: [],
        trigger_actions: [],
        is_active: true
      });
      await loadData();
    } catch (error) {
      console.error('Error adding context pattern:', error);
    }
  };

  const handleSetQuietHours = async () => {
    try {
      await window.electronAPI.setQuietHours(quietHours.start, quietHours.end);
      await loadAppStatus();
    } catch (error) {
      console.error('Error setting quiet hours:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 50 }}
        animate={{ y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">DELO Perception Settings</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Configure your AI Orb's perception layer</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'screen', label: 'Screen Perception', icon: '📸' },
            { id: 'audio', label: 'Audio Perception', icon: '🎤' },
            { id: 'context', label: 'Context Manager', icon: '🧠' },
            { id: 'patterns', label: 'Patterns & Filters', icon: '🎯' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Screen Perception Status */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Screen Perception</h3>
                    <div className={`w-3 h-3 rounded-full ${appStatus?.screenPerception?.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Current App: {appStatus?.screenPerception?.currentApp || 'None'}
                  </p>
                  <button
                    onClick={handleToggleScreenPerception}
                    className="mt-2 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    {appStatus?.screenPerception?.active ? 'Stop' : 'Start'}
                  </button>
                </div>

                {/* Audio Perception Status */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Audio Perception</h3>
                    <div className={`w-3 h-3 rounded-full ${appStatus?.audioPerception?.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Recording: {appStatus?.audioPerception?.recording ? 'Yes' : 'No'}
                  </p>
                  <button
                    onClick={handleToggleAudioPerception}
                    className="mt-2 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    {appStatus?.audioPerception?.active ? 'Stop' : 'Start'}
                  </button>
                </div>

                {/* Context Manager Status */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Context Manager</h3>
                    <div className={`w-3 h-3 rounded-full ${appStatus?.contextManager?.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Patterns: {appStatus?.contextManager?.patternsCount || 0}
                  </p>
                  <button
                    onClick={handleToggleContextManager}
                    className="mt-2 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    {appStatus?.contextManager?.active ? 'Stop' : 'Start'}
                  </button>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Recent Screen Snapshots</h4>
                    <div className="space-y-2">
                      {screenSnapshots.slice(0, 3).map((snapshot, index) => (
                        <div key={index} className="text-sm text-gray-600 dark:text-gray-400">
                          <div className="font-medium">{snapshot.app_name}</div>
                          <div className="truncate">{snapshot.window_title}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Recent Audio Sessions</h4>
                    <div className="space-y-2">
                      {audioSessions.slice(0, 3).map((session, index) => (
                        <div key={index} className="text-sm text-gray-600 dark:text-gray-400">
                          <div className="truncate">{session.transcript}</div>
                          <div className="text-xs">{new Date(session.start_time).toLocaleTimeString()}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Recent Context Snapshots</h4>
                    <div className="space-y-2">
                      {contextSnapshots.slice(0, 3).map((snapshot, index) => (
                        <div key={index} className="text-sm text-gray-600 dark:text-gray-400">
                          <div className="font-medium">{snapshot.app_name}</div>
                          <div className="text-xs">{snapshot.user_intent || 'No intent'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'screen' && (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Screen Perception</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  DELO continuously monitors your screen content using Accessibility APIs and OCR fallbacks.
                  Configure which applications and windows should be monitored.
                </p>
              </div>

              {/* App Filter Form */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-4">Add App Filter</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      App Name
                    </label>
                    <input
                      type="text"
                      value={newAppFilter.app_name}
                      onChange={(e) => setNewAppFilter({ ...newAppFilter, app_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="e.g., Chrome, VSCode"
                    />
                  </div>
                  
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={newAppFilter.is_whitelisted}
                        onChange={() => setNewAppFilter({ ...newAppFilter, is_whitelisted: true, is_blacklisted: false })}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Whitelist</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        checked={newAppFilter.is_blacklisted}
                        onChange={() => setNewAppFilter({ ...newAppFilter, is_blacklisted: true, is_whitelisted: false })}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Blacklist</span>
                    </label>
                  </div>
                  
                  <button
                    onClick={handleAddAppFilter}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Add Filter
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audio' && (
            <div className="space-y-6">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">Audio Perception</h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  DELO listens to system audio and microphone input, transcribing speech using Whisper.
                  Configure audio sources and keywords to monitor.
                </p>
              </div>

              {/* Audio Filter Form */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-4">Add Audio Filter</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Audio Source
                    </label>
                    <input
                      type="text"
                      value={newAudioFilter.source_name}
                      onChange={(e) => setNewAudioFilter({ ...newAudioFilter, source_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="e.g., Spotify, Zoom, Microphone"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Volume Threshold
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={newAudioFilter.volume_threshold}
                      onChange={(e) => setNewAudioFilter({ ...newAudioFilter, volume_threshold: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{newAudioFilter.volume_threshold}</span>
                  </div>
                  
                  <button
                    onClick={handleAddAudioFilter}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Add Filter
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'context' && (
            <div className="space-y-6">
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">Context Manager</h3>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  DELO analyzes screen content and audio transcripts to understand your context and predict your needs.
                  Configure quiet hours and context patterns.
                </p>
              </div>

              {/* Quiet Hours */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-4">Quiet Hours</h4>
                <div className="flex items-center gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Start Hour
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={quietHours.start}
                      onChange={(e) => setQuietHours({ ...quietHours, start: parseInt(e.target.value) })}
                      className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      End Hour
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={quietHours.end}
                      onChange={(e) => setQuietHours({ ...quietHours, end: parseInt(e.target.value) })}
                      className="w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <button
                    onClick={handleSetQuietHours}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                  >
                    Set Quiet Hours
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'patterns' && (
            <div className="space-y-6">
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">Context Patterns</h3>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  Define patterns that trigger automatic actions based on your context.
                  DELO will learn from these patterns to provide proactive assistance.
                </p>
              </div>

              {/* Context Pattern Form */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-4">Add Context Pattern</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Pattern Name
                    </label>
                    <input
                      type="text"
                      value={newContextPattern.pattern_name}
                      onChange={(e) => setNewContextPattern({ ...newContextPattern, pattern_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="e.g., Coding Session, Email Composition"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      App Name
                    </label>
                    <input
                      type="text"
                      value={newContextPattern.app_name}
                      onChange={(e) => setNewContextPattern({ ...newContextPattern, app_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="e.g., VSCode, Chrome"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Window Pattern
                    </label>
                    <input
                      type="text"
                      value={newContextPattern.window_pattern}
                      onChange={(e) => setNewContextPattern({ ...newContextPattern, window_pattern: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      placeholder="e.g., .js, .tsx, Gmail"
                    />
                  </div>
                  
                  <button
                    onClick={handleAddContextPattern}
                    className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
                  >
                    Add Pattern
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DELOSettings; 