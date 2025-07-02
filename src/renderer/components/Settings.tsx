import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings as SettingsIcon,
  Sun,
  Monitor,
  Smartphone,
  Bell,
  Shield,
  Lock,
  Database,
  RefreshCw
} from 'lucide-react';

interface SettingsProps {}

interface SettingsState {
  whisperMode: boolean;
  clipboardTracking: boolean;
  behaviorTracking: boolean;
  privacyMode: boolean;
  hotkey: string;
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
  autoStart: boolean;
}

const Settings: React.FC<SettingsProps> = () => {
  const [settings, setSettings] = useState<SettingsState>({
    whisperMode: true,
    clipboardTracking: true,
    behaviorTracking: true,
    privacyMode: false,
    hotkey: 'Cmd+Shift+.',
    theme: 'dark',
    notifications: true,
    autoStart: true
  });

  const [activeTab, setActiveTab] = useState('general');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadSettings();
    loadStats();
  }, []);

  const loadSettings = async () => {
    console.log('Loading settings...');
  };

  const loadStats = async () => {
    setStats({
      totalCommands: 150,
      clipboardItems: 89,
      meetingsAssisted: 12,
      productivityScore: 87
    });
  };

  const saveSettings = async (newSettings: Partial<SettingsState>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    console.log('Saving settings:', updatedSettings);
  };

  const tabs = [
    { id: 'general', label: 'General', icon: <SettingsIcon size={16} /> },
    { id: 'privacy', label: 'Privacy', icon: <Shield size={16} /> },
    { id: 'features', label: 'Features', icon: <RefreshCw size={16} /> },
    { id: 'appearance', label: 'Appearance', icon: <Sun size={16} /> },
    { id: 'stats', label: 'Statistics', icon: <Database size={16} /> }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900">
      <div className="container mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Doppel Settings</h1>
            <p className="text-gray-300">Configure your AI desktop assistant</p>
          </div>

          <div className="glassmorphic glass rounded-2xl overflow-hidden bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
            <div className="flex border-b border-white/10">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-indigo-400 border-b-2 border-indigo-400 bg-white/5'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {activeTab === 'general' && (
                    <div className="space-y-6">
                      <h2 className="text-2xl font-semibold text-white mb-6">General Settings</h2>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 glass rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Monitor className="text-indigo-400" size={20} />
                            <div>
                              <h3 className="text-white font-medium">Global Hotkey</h3>
                              <p className="text-gray-400 text-sm">Shortcut to open Doppel</p>
                            </div>
                          </div>
                          <input
                            type="text"
                            value={settings.hotkey}
                            onChange={(e) => saveSettings({ hotkey: e.target.value })}
                            className="bg-black/30 border border-white/20 rounded px-3 py-2 text-white text-center w-32"
                          />
                        </div>

                        <div className="flex items-center justify-between p-4 glass rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Bell className="text-indigo-400" size={20} />
                            <div>
                              <h3 className="text-white font-medium">Notifications</h3>
                              <p className="text-gray-400 text-sm">Show system notifications</p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.notifications}
                              onChange={(e) => saveSettings({ notifications: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between p-4 glass rounded-lg">
                          <div className="flex items-center space-x-3">
                            <RefreshCw className="text-indigo-400" size={20} />
                            <div>
                              <h3 className="text-white font-medium">Auto-start</h3>
                              <p className="text-gray-400 text-sm">Launch Doppel on system startup</p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.autoStart}
                              onChange={(e) => saveSettings({ autoStart: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'privacy' && (
                    <div className="space-y-6">
                      <h2 className="text-2xl font-semibold text-white mb-6">Privacy & Security</h2>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 glass rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Monitor className="text-indigo-400" size={20} />
                            <div>
                              <h3 className="text-white font-medium">Behavior Tracking</h3>
                              <p className="text-gray-400 text-sm">Learn from your usage patterns</p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.behaviorTracking}
                              onChange={(e) => saveSettings({ behaviorTracking: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between p-4 glass rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Database className="text-indigo-400" size={20} />
                            <div>
                              <h3 className="text-white font-medium">Clipboard Tracking</h3>
                              <p className="text-gray-400 text-sm">Store clipboard history locally</p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.clipboardTracking}
                              onChange={(e) => saveSettings({ clipboardTracking: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>

                        <div className="flex items-center justify-between p-4 glass rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Lock className="text-indigo-400" size={20} />
                            <div>
                              <h3 className="text-white font-medium">Privacy Mode</h3>
                              <p className="text-gray-400 text-sm">Stop all tracking and learning</p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.privacyMode}
                              onChange={(e) => saveSettings({ privacyMode: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>
                      </div>

                      <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <h3 className="text-red-400 font-medium mb-2">Data Management</h3>
                        <p className="text-gray-300 text-sm mb-3">
                          All your data is stored locally on your device. You can export or clear your data at any time.
                        </p>
                        <div className="flex space-x-3">
                          <button className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors">
                            Clear All Data
                          </button>
                          <button className="px-4 py-2 bg-indigo-500/20 text-indigo-400 rounded-lg hover:bg-indigo-500/30 transition-colors">
                            Export Data
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'features' && (
                    <div className="space-y-6">
                      <h2 className="text-2xl font-semibold text-white mb-6">Features</h2>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 glass rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Smartphone className="text-indigo-400" size={20} />
                            <div>
                              <h3 className="text-white font-medium">Whisper Mode</h3>
                              <p className="text-gray-400 text-sm">Interview assistance during meetings</p>
                            </div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.whisperMode}
                              onChange={(e) => saveSettings({ whisperMode: e.target.checked })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'appearance' && (
                    <div className="space-y-6">
                      <h2 className="text-2xl font-semibold text-white mb-6">Appearance</h2>
                      
                      <div className="space-y-4">
                        <div className="p-4 glass rounded-lg">
                          <h3 className="text-white font-medium mb-3">Theme</h3>
                          <div className="flex space-x-3">
                            {['light', 'dark', 'auto'].map((theme) => (
                              <button
                                key={theme}
                                onClick={() => saveSettings({ theme: theme as any })}
                                className={`px-4 py-2 rounded-lg transition-colors ${
                                  settings.theme === theme
                                    ? 'bg-indigo-500 text-white'
                                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                }`}
                              >
                                {theme.charAt(0).toUpperCase() + theme.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'stats' && (
                    <div className="space-y-6">
                      <h2 className="text-2xl font-semibold text-white mb-6">Usage Statistics</h2>
                      
                      {stats && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 glass rounded-lg text-center">
                            <div className="text-3xl font-bold text-indigo-400">{stats.totalCommands}</div>
                            <div className="text-gray-300 text-sm">Commands Executed</div>
                          </div>
                          <div className="p-4 glass rounded-lg text-center">
                            <div className="text-3xl font-bold text-green-400">{stats.clipboardItems}</div>
                            <div className="text-gray-300 text-sm">Clipboard Items</div>
                          </div>
                          <div className="p-4 glass rounded-lg text-center">
                            <div className="text-3xl font-bold text-purple-400">{stats.meetingsAssisted}</div>
                            <div className="text-gray-300 text-sm">Meetings Assisted</div>
                          </div>
                          <div className="p-4 glass rounded-lg text-center">
                            <div className="text-3xl font-bold text-yellow-400">{stats.productivityScore}%</div>
                            <div className="text-gray-300 text-sm">Productivity Score</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Settings; 