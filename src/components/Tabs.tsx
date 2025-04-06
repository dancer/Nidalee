import React from 'react';
import { TabItem } from '../types';

interface TabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ activeTab, onTabChange }) => {
  const tabs: TabItem[] = [
    { id: 'main', label: 'Main' },
    { id: 'add', label: 'Add Account' },
    { id: 'stats', label: 'Statistics' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="flex space-x-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 rounded-md transition-colors ${
            activeTab === tab.id
              ? 'bg-bl-red text-white'
              : 'text-gray-400 hover:text-bl-red'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}; 