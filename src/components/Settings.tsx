import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { dialog } from '@tauri-apps/api';
import { Settings as SettingsType } from '../types';
import { FormInputEvent } from '../types/events';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SettingsType>({
    riot_client_path: '',
    league_path: '',
    valorant_path: '',
    startWithWindows: false,
    minimizeToTray: false,
    loginDelay: 10,
    minimizeOnGameLaunch: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await invoke<SettingsType>('get_settings');
      setSettings(savedSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSave = async () => {
    try {
      await invoke('save_settings', { settings });
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings. Please try again.');
    }
  };

  const handleBrowse = async (setting: keyof SettingsType) => {
    try {
      const selected = await dialog.open({
        filters: [{
          name: 'Executable',
          extensions: ['exe']
        }]
      });
      
      if (selected) {
        setSettings(prev => ({
          ...prev,
          [setting]: selected
        }));
      }
    } catch (error) {
      console.error('Failed to browse:', error);
    }
  };

  return (
    <div className="space-y-8">
      {/* General Settings Section */}
      <div className="bg-bl-gray rounded-lg p-6">
        <h2 className="text-xl font-bold text-bl-yellow mb-4">General Settings</h2>
        <div className="space-y-6">
          <div>
            <label className="block text-bl-yellow mb-2 text-sm">Login Delay (seconds)</label>
            <div className="flex gap-4 items-center">
              <input
                type="range"
                min="5"
                max="60"
                value={settings.loginDelay || 10}
                onChange={(e: FormInputEvent) => 
                  setSettings(prev => ({ ...prev, loginDelay: parseInt(e.target.value) }))
                }
                className="flex-1 h-2 bg-bl-light-gray rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-bl-red [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer hover:[&::-webkit-slider-thumb]:bg-red-800"
              />
              <span className="text-white min-w-[3rem]">{settings.loginDelay || 10}s</span>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.startWithWindows}
                onChange={(e) => 
                  setSettings(prev => ({ ...prev, startWithWindows: e.target.checked }))
                }
                className="rounded border-bl-light-gray text-bl-red focus:ring-bl-red"
              />
              <span className="text-bl-yellow">Start with Windows</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.minimizeToTray}
                onChange={(e) => 
                  setSettings(prev => ({ ...prev, minimizeToTray: e.target.checked }))
                }
                className="rounded border-bl-light-gray text-bl-red focus:ring-bl-red"
              />
              <span className="text-bl-yellow">Minimize to Tray</span>
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.minimizeOnGameLaunch}
                onChange={(e) => 
                  setSettings(prev => ({ ...prev, minimizeOnGameLaunch: e.target.checked }))
                }
                className="rounded border-bl-light-gray text-bl-red focus:ring-bl-red"
              />
              <span className="text-bl-yellow">Minimize When Game Launches</span>
            </label>
          </div>
        </div>
      </div>

      {/* Path Settings Section */}
      <div className="bg-bl-gray rounded-lg p-6">
        <h2 className="text-xl font-bold text-bl-yellow mb-4">Path Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-bl-yellow mb-2 text-sm">Riot Client Path</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.riot_client_path}
                onChange={(e: FormInputEvent) => 
                  setSettings(prev => ({ ...prev, riot_client_path: e.target.value }))
                }
                className="flex-1"
              />
              <button
                onClick={() => handleBrowse('riot_client_path')}
                className="btn-primary"
              >
                Browse
              </button>
            </div>
          </div>
        </div>
      </div>

      <button onClick={handleSave} className="btn-primary w-full mt-8">
        Save Settings
      </button>
    </div>
  );
}; 