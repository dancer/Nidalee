import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Account } from '../types'
import { FormSelectEvent } from '../types/events';
import { logGameLaunch } from '../firebase';
import { FaGamepad, FaUser, FaFolder, FaPlay, FaClock, FaExclamationTriangle } from 'react-icons/fa';

interface GameStatus {
  league_running: boolean;
  valorant_running: boolean;
}

export const MainSection: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedGame, setSelectedGame] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [gameStatus, setGameStatus] = useState<GameStatus>({ league_running: false, valorant_running: false });
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    loadAccounts();
    checkGameStatus();
    const interval = setInterval(checkGameStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkGameStatus = async () => {
    try {
      const status = await invoke<GameStatus>('check_game_status');
      setGameStatus(status);
    } catch (error) {
      console.error('Failed to check game status:', error);
    }
  };

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

  const handleForceClose = async () => {
    try {
      setLoading(true);

      const currentStatus = await invoke<GameStatus>('check_game_status');
      if ((selectedGame === 'league' && !currentStatus.league_running) ||
        (selectedGame === 'valorant' && !currentStatus.valorant_running)) {
        await launchNewGame();
        return;
      }

      await invoke('force_close_game', { gameType: selectedGame });

      let attempts = 0;
      while (attempts < 5) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const status = await invoke<GameStatus>('check_game_status');

        if ((selectedGame === 'league' && !status.league_running) ||
          (selectedGame === 'valorant' && !status.valorant_running)) {
          await launchNewGame();
          return;
        }
        attempts++;
      }

      throw new Error('Failed to close the game completely after multiple attempts');
    } catch (error) {
      console.error('Error during game switch:', error);
      alert('Failed to switch accounts. Please close the game manually and try again.');
    } finally {
      setLoading(false);
      setShowWarning(false);
    }
  };

  const launchNewGame = async () => {
    try {
      const account = accounts.find(acc => acc.id === selectedAccount);
      if (!account) {
        throw new Error('Selected account not found');
      }

      await invoke('launch_game', {
        account,
        selectedGame
      });

      logGameLaunch(selectedGame);
      await checkGameStatus();
    } catch (error) {
      console.error('Failed to launch new game:', error);
      throw error;
    }
  };

  const handleLaunch = async () => {
    if (!selectedAccount || !selectedGame) {
      alert('Please select both an account and a game');
      return;
    }

    const currentStatus = await invoke<GameStatus>('check_game_status');
    if (currentStatus.league_running || currentStatus.valorant_running) {
      setShowWarning(true);
      return;
    }

    setLoading(true);
    try {
      await launchNewGame();
    } catch (error) {
      console.error('Failed to launch game:', error);
      alert('Failed to launch game. Please check your settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 max-w-2xl mx-auto">
      {/* Warning Modal */}
      {showWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-bl-gray border border-bl-light-gray rounded-md p-6 max-w-md mx-4">
            <div className="flex items-center gap-2 text-bl-red mb-4">
              <FaExclamationTriangle size={18} />
              <h3 className="text-lg font-medium">Game Already Running</h3>
            </div>
            <p className="text-gray-400 mb-6">
              {gameStatus.league_running && gameStatus.valorant_running ? 'League of Legends and VALORANT are' :
                gameStatus.league_running ? 'League of Legends is' : 'VALORANT is'} currently running.
              Would you like to close {gameStatus.league_running && gameStatus.valorant_running ? 'them' : 'it'} and launch {selectedGame === 'league' ? 'League of Legends' : 'VALORANT'}?
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowWarning(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowWarning(false);
                  setLoading(true);
                  try {
                    if (gameStatus.league_running) {
                      await invoke('force_close_game', { gameType: 'league' });
                    }
                    if (gameStatus.valorant_running) {
                      await invoke('force_close_game', { gameType: 'valorant' });
                    }
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await handleForceClose();
                  } finally {
                    setLoading(false);
                  }
                }}
                className="px-4 py-2 bg-bl-red text-white rounded hover:bg-red-700 transition-colors"
              >
                Close & Switch
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {/* Category Selection */}
        <div>
          <label className="flex text-bl-red mb-1.5 text-sm select-none items-center gap-2">
            <FaFolder size={14} />
            <span>Category</span>
          </label>
          <div className="relative">
            <select
              className="w-full bg-bl-gray border border-bl-light-gray rounded-md pl-3 pr-8 py-2.5 text-base
                      focus:border-bl-red focus:ring-0 transition-colors appearance-none cursor-pointer"
              value={selectedCategory}
              onChange={(e: FormSelectEvent) => {
                setSelectedCategory(e.target.value);
                setSelectedAccount('');
              }}
            >
              <option value="" className="bg-bl-gray text-white">All categories...</option>
              {categories.map((category) => (
                <option key={category} value={category} className="bg-bl-gray text-white">
                  {category}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg className="h-4 w-4 text-bl-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Account Selection */}
        <div>
          <label className="flex text-bl-red mb-1.5 text-sm select-none items-center gap-2">
            <FaUser size={14} />
            <span>Account</span>
          </label>
          <div className="relative">
            <select
              className="w-full bg-bl-gray border border-bl-light-gray rounded-md pl-3 pr-8 py-2.5 text-base
                      focus:border-bl-red focus:ring-0 transition-colors appearance-none cursor-pointer"
              value={selectedAccount}
              onChange={(e: FormSelectEvent) => setSelectedAccount(e.target.value)}
            >
              <option value="" className="bg-bl-gray text-white">Choose account...</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id} className="bg-bl-gray text-white">
                  {account.name} ({account.username})
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg className="h-4 w-4 text-bl-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Game Selection */}
        <div>
          <label className="flex text-bl-red mb-1.5 text-sm select-none items-center gap-2">
            <FaGamepad size={14} />
            <span>Game</span>
          </label>
          <div className="relative">
            <select
              className="w-full bg-bl-gray border border-bl-light-gray rounded-md pl-3 pr-8 py-2.5 text-base
                      focus:border-bl-red focus:ring-0 transition-colors appearance-none cursor-pointer"
              value={selectedGame}
              onChange={(e: FormSelectEvent) => setSelectedGame(e.target.value)}
            >
              <option value="" className="bg-bl-gray text-white">Choose game...</option>
              <option value="league" className="bg-bl-gray text-white">League of Legends</option>
              <option value="valorant" className="bg-bl-gray text-white">VALORANT</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg className="h-4 w-4 text-bl-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Launch Button */}
        <button
          onClick={handleLaunch}
          disabled={loading || !selectedAccount || !selectedGame}
          className="w-full bg-bl-gray border border-bl-light-gray rounded-md p-3 mt-2 text-base
                   hover:border-bl-red disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <FaClock size={14} className="animate-spin" /> : <FaPlay size={14} />}
          <span>{loading ? 'Launching...' : 'Launch Game'}</span>
        </button>
      </div>

      {/* Info Card */}
      <div className="bg-bl-gray rounded-md p-3 border border-bl-light-gray mt-4">
        <h3 className="text-bl-red font-medium mb-1.5 flex items-center gap-2 text-sm">
          <FaGamepad size={12} />
          <span>Quick Launch</span>
        </h3>
        <p className="text-xs text-gray-400">
          Select your account and game to launch. If the login process fails, try adjusting the login delay in Settings.
          A longer delay gives the client more time to load before attempting to log in.
        </p>
        <div className="bg-[#1a1111] border border-bl-red rounded p-1.5 mt-2">
          <div className="text-bl-red text-xs flex gap-1.5">
            <svg className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <div>Do not switch windows during login - credentials may be typed in wrong window</div>
              <div className="mt-0.5">Do not move your mouse during login - this may interfere with the login process</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};