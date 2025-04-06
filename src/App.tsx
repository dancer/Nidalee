import React, { useState, useEffect } from 'react';
import { Tabs } from './components/Tabs';
import { TitleBar } from './components/TitleBar';
import { MainSection } from './components/MainSection';
import { AddAccount } from './components/AddAccount';
import { Statistics } from './components/Statistics';
import { Settings } from './components/Settings';
import { FaGithub } from 'react-icons/fa';
import { open } from '@tauri-apps/api/shell';
import { invoke } from '@tauri-apps/api/tauri';
import { logAppOpen, logInstallation } from './firebase';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('main');

  useEffect(() => {
    const init = async () => {
      try {
        const isFirstRun = await invoke<boolean>('check_first_run');
        if (isFirstRun) {
          logInstallation();
        }
      } catch (error) {
        console.error('Failed to check first run:', error);
      }
      logAppOpen();
    };

    init();
  }, []);

  const openGitHub = () => {
    open('https://github.com/dancer/nidalee');
  };

  const preventDrag = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex flex-col h-screen bg-bl-dark">
      <TitleBar />
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <img
              src="icons/icon.ico"
              alt="Nidalee"
              className="w-6 h-6 select-none"
              onDragStart={preventDrag}
              draggable={false}
            />
            <h1 className="text-2xl text-bl-red" style={{ fontFamily: 'Righteous, cursive' }}>NIDALEE</h1>
          </div>
          <div className="flex items-center gap-4 text-gray-500">
            <button
              onClick={openGitHub}
              className="hover:text-bl-red transition-colors flex items-center"
            >
              <FaGithub />
            </button>
          </div>
        </div>

        <Tabs activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="mt-6 bg-bl-dark p-6 rounded-lg border border-bl-gray">
          {activeTab === 'main' && <MainSection />}
          {activeTab === 'add' && <AddAccount />}
          {activeTab === 'stats' && <Statistics />}
          {activeTab === 'settings' && <Settings />}
        </div>
      </div>
    </div>
  );
};

export default App; 