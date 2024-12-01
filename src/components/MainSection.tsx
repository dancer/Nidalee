import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Account } from '../types'
import { FormSelectEvent } from '../types/events';
import { logGameLaunch } from '../firebase';

export const MainSection: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedGame, setSelectedGame] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const accounts = await invoke<Account[]>('get_accounts');
      setAccounts(accounts);
      const uniqueCategories = [...new Set(accounts.map(acc => acc.category))].filter(category => category !== "");
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const filteredAccounts = accounts.filter(
    account => selectedCategory === '' || account.category === selectedCategory
  );

  const handleLaunch = async () => {
    if (!selectedAccount || !selectedGame) {
      alert('Please select both an account and a game');
      return;
    }

    setLoading(true);
    try {
      const account = accounts.find(acc => acc.id === selectedAccount);
      if (account) {
        await invoke('launch_game', { 
          account,
          selectedGame  
        });
        logGameLaunch(selectedGame);
      }
    } catch (error) {
      console.error('Failed to launch game:', error);
      alert('Failed to launch game. Please check your settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div>
          <label className="block text-bl-yellow mb-2 text-sm">Select Category</label>
          <select
            className="w-full bg-bl-gray border border-bl-light-gray rounded-md px-3 py-2 text-white"
            value={selectedCategory}
            onChange={(e: FormSelectEvent) => {
              setSelectedCategory(e.target.value);
              setSelectedAccount('');
            }}
          >
            <option value="">All categories...</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-bl-yellow mb-2 text-sm">Select Account</label>
          <select
            className="w-full bg-bl-gray border border-bl-light-gray rounded-md px-3 py-2 text-white"
            value={selectedAccount}
            onChange={(e: FormSelectEvent) => setSelectedAccount(e.target.value)}
          >
            <option value="">Choose account...</option>
            {filteredAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.username})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-bl-yellow mb-2 text-sm">Select Game</label>
          <select
            className="w-full bg-bl-gray border border-bl-light-gray rounded-md px-3 py-2 text-white"
            value={selectedGame}
            onChange={(e: FormSelectEvent) => setSelectedGame(e.target.value)}
          >
            <option value="">Choose game...</option>
            <option value="league">League of Legends</option>
            <option value="valorant">VALORANT</option>
          </select>
        </div>

        <button
          onClick={handleLaunch}
          disabled={loading || !selectedAccount || !selectedGame}
          className="btn-primary bg-bl-yellow w-full mt-4"
        >
          {loading ? 'Launching...' : 'Launch'}
        </button>
      </div>

      <div className="mt-6 bg-bl-gray rounded-md p-4 border border-bl-light-gray">
        <h3 className="text-bl-red font-bold mb-2">Quick Launch</h3>
        <p className="text-sm text-gray-400">
          Select your account and game to launch. If the login process fails, try adjusting the login delay in Settings. 
          A longer delay gives the client more time to load before attempting to log in.
        </p>
        <div className="bg-[#1a1111] border border-bl-red rounded p-1.5 mt-2">
          <p className="text-bl-red text-xs">
            Do not switch windows during login - credentials may be typed in wrong window
          </p>
        </div>
      </div>
    </div>
  );
}; 