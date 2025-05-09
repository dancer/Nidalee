import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { dialog } from '@tauri-apps/api';
import { Settings as SettingsType } from '../types';
import { FormInputEvent } from '../types/events';
import { FaCog, FaFolder, FaSave, FaClock, FaWindows, FaMinusSquare, FaGamepad } from 'react-icons/fa';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SettingsType>({
    riot_client_path: '',
    league_path: '',
    valorant_path: '',
    start_with_windows: false,
    minimize_to_tray: false,
    login_delay: 5,
    minimize_on_game_launch: false,
    window_pos: null
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await invoke<SettingsType>('get_settings');
      setSettings(savedSettings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      console.log('Saving settings:', settings);
      await invoke('save_settings', { settings });
      const notification = document.createElement('div');
      notification.className = 'fixed bottom-4 right-4 bg-bl-gray border border-bl-red rounded-md px-4 py-2 text-sm flex items-center gap-2';
      notification.innerHTML = '<span class="text-bl-red">✓</span> Settings saved';
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 2000);
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
    <div className="max-w-3xl mx-auto space-y-4">
      {!isLoading && (
        <>
          {/* General Settings */}
          <div className="bg-bl-gray border border-bl-light-gray rounded-md">
            <div className="border-b border-bl-light-gray p-4 flex items-center gap-2">
              <FaCog className="text-bl-red" size={14} />
              <h2 className="text-sm font-bold">General Settings</h2>
            </div>

            <div className="p-4 space-y-6">
              {/* Login Delay */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FaClock className="text-bl-red" size={12} />
                  <label className="text-sm">Login Delay</label>
                </div>
                <div className="flex gap-1">
                  {[2, 5, 10, 15, 20].map((value) => (
                    <button
                      key={value}
                      onClick={() => setSettings(prev => ({ ...prev, login_delay: value }))}
                      className={`flex-1 py-2 px-3 text-sm rounded-md transition-colors ${settings.login_delay === value
                        ? 'bg-bl-red text-white'
                        : 'bg-bl-gray border border-bl-light-gray hover:border-bl-red'
                        }`}
                    >
                      {value}s
                    </button>
                  ))}
                  {![2, 5, 10, 15, 20].includes(settings.login_delay) && (
                    <button
                      className="flex-1 py-2 px-3 text-sm rounded-md transition-colors bg-bl-red text-white"
                      onClick={() => setSettings(prev => ({ ...prev, login_delay: 5 }))}
                    >
                      {settings.login_delay}s
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Adjust the delay between launching the client and attempting to log in.
                  Increase this value if login fails.
                </p>
              </div>

              {/* Checkboxes */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 group cursor-pointer">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.start_with_windows}
                      onChange={(e) =>
                        setSettings(prev => ({ ...prev, start_with_windows: e.target.checked }))
                      }
                      className="w-4 h-4 border border-bl-light-gray rounded bg-bl-gray
                               checked:bg-bl-red checked:border-bl-red
                               focus:ring-1 focus:ring-bl-red focus:ring-offset-0
                               transition-colors cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <FaWindows className="text-bl-red" size={12} />
                    <span className="text-sm">Start with Windows</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 group cursor-pointer">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.minimize_to_tray}
                      onChange={(e) =>
                        setSettings(prev => ({ ...prev, minimize_to_tray: e.target.checked }))
                      }
                      className="w-4 h-4 border border-bl-light-gray rounded bg-bl-gray
                               checked:bg-bl-red checked:border-bl-red
                               focus:ring-1 focus:ring-bl-red focus:ring-offset-0
                               transition-colors cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <FaMinusSquare className="text-bl-red" size={12} />
                    <span className="text-sm">Minimize to Tray</span>
                  </div>
                </label>

                <label className="flex items-center gap-3 group cursor-pointer">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.minimize_on_game_launch}
                      onChange={(e) =>
                        setSettings(prev => ({ ...prev, minimize_on_game_launch: e.target.checked }))
                      }
                      className="w-4 h-4 border border-bl-light-gray rounded bg-bl-gray
                               checked:bg-bl-red checked:border-bl-red
                               focus:ring-1 focus:ring-bl-red focus:ring-offset-0
                               transition-colors cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <FaGamepad className="text-bl-red" size={12} />
                    <span className="text-sm">Minimize When Game Launches</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Path Settings */}
          <div className="bg-bl-gray border border-bl-light-gray rounded-md">
            <div className="border-b border-bl-light-gray p-4 flex items-center gap-2">
              <FaFolder className="text-bl-red" size={14} />
              <h2 className="text-sm font-bold">Game Paths</h2>
            </div>

            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm">Riot Client</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settings.riot_client_path}
                    onChange={(e: FormInputEvent) =>
                      setSettings(prev => ({ ...prev, riot_client_path: e.target.value }))
                    }
                    placeholder="Path to RiotClientServices.exe"
                    className="flex-1 bg-bl-light-gray border border-bl-light-gray rounded-md px-3 py-1.5 text-sm
                             focus:border-bl-red focus:ring-0 transition-colors"
                  />
                  <button
                    onClick={() => handleBrowse('riot_client_path')}
                    className="px-3 py-1.5 bg-bl-light-gray border border-bl-light-gray rounded-md
                             hover:border-bl-red transition-colors text-sm flex items-center gap-2"
                  >
                    <FaFolder size={12} />
                    Browse
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="w-full bg-bl-gray border border-bl-light-gray rounded-md p-3
                     hover:border-bl-red transition-colors flex items-center justify-center gap-2"
          >
            <FaSave size={14} />
            <span>Save Settings</span>
          </button>
        </>
      )}
    </div>
  );
}