import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Account } from '../types';
import { FormInputEvent, FormSelectEvent } from '../types/events';
import { logAccountAdd } from '../firebase';
import { FaUser, FaKey, FaEnvelope, FaGamepad, FaEye, FaEyeSlash, FaPlus } from 'react-icons/fa';

export const AddAccount: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    email: '',
    game_type: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [currentError, setCurrentError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    if (!formData.name) {
      setCurrentError('name');
      return false;
    }
    if (!formData.username) {
      setCurrentError('username');
      return false;
    }
    if (!formData.password) {
      setCurrentError('password');
      return false;
    }
    if (!formData.game_type) {
      setCurrentError('game_type');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const account: Account = {
        id: crypto.randomUUID(),
        ...formData,
        category: '',
        last_login: undefined,
      };

      await invoke('save_account', { account });
      logAccountAdd();

      setFormData({
        name: '',
        username: '',
        password: '',
        email: '',
        game_type: '',
      });
      setCurrentError('');

      const notification = document.createElement('div');
      notification.className = 'fixed bottom-4 right-4 bg-bl-gray border border-bl-red rounded-md px-4 py-2 text-sm flex items-center gap-2';
      notification.innerHTML = '<span class="text-bl-red">✓</span> Account added';
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 2000);
    } catch (error) {
      console.error('Failed to save account:', error);
      alert('Failed to save account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-6">
      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off" noValidate>
        <div className="space-y-4">
          {/* Account Name */}
          <div>
            <label className="block text-sm mb-1.5 text-bl-red select-none">
              Account Name {currentError === 'name' && <span className="text-red-500 ml-1">(Required)</span>}
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-bl-red">
                <FaUser size={15} />
              </div>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={(e: FormInputEvent) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (currentError === 'name') setCurrentError('');
                }}
                className="w-full bg-bl-gray border border-bl-light-gray rounded-md pl-10 pr-3 py-2.5 text-base
                         focus:border-bl-red focus:ring-0 transition-colors"
                placeholder="Display name for the account"
                required
                autoComplete="off"
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm mb-1.5 text-bl-red select-none">
              Username {currentError === 'username' && <span className="text-red-500 ml-1">(Required)</span>}
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-bl-red">
                <FaUser size={15} />
              </div>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={(e: FormInputEvent) => {
                  setFormData({ ...formData, username: e.target.value });
                  if (currentError === 'username') setCurrentError('');
                }}
                className="w-full bg-bl-gray border border-bl-light-gray rounded-md pl-10 pr-3 py-2.5 text-base
                         focus:border-bl-red focus:ring-0 transition-colors"
                placeholder="Login username"
                required
                autoComplete="off"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm mb-1.5 text-bl-red select-none">
              Password {currentError === 'password' && <span className="text-red-500 ml-1">(Required)</span>}
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-bl-red">
                <FaKey size={15} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={(e: FormInputEvent) => {
                  setFormData({ ...formData, password: e.target.value });
                  if (currentError === 'password') setCurrentError('');
                }}
                className="w-full bg-bl-gray border border-bl-light-gray rounded-md pl-10 pr-10 py-2.5 text-base
                         focus:border-bl-red focus:ring-0 transition-colors"
                placeholder="Account password"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-bl-red hover:text-red-700 transition-colors"
              >
                {showPassword ? <FaEyeSlash size={15} /> : <FaEye size={15} />}
              </button>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm mb-1.5 text-bl-red select-none">
              Email <span className="text-gray-500">(Optional)</span>
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-bl-red">
                <FaEnvelope size={15} />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={(e: FormInputEvent) => {
                  setFormData({ ...formData, email: e.target.value });
                }}
                className="w-full bg-bl-gray border border-bl-light-gray rounded-md pl-10 pr-3 py-2.5 text-base
                         focus:border-bl-red focus:ring-0 transition-colors"
                placeholder="Account email (if different from username)"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Game Type */}
          <div>
            <label className="block text-sm mb-1.5 text-bl-red select-none">
              Game {currentError === 'game_type' && <span className="text-red-500 ml-1">(Required)</span>}
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-bl-red">
                <FaGamepad size={15} />
              </div>
              <select
                name="game_type"
                value={formData.game_type}
                onChange={(e: FormSelectEvent) => {
                  setFormData({ ...formData, game_type: e.target.value });
                  if (currentError === 'game_type') setCurrentError('');
                }}
                className="w-full bg-bl-gray border border-bl-light-gray rounded-md pl-10 pr-3 py-2.5 text-base
                         focus:border-bl-red focus:ring-0 transition-colors appearance-none cursor-pointer"
                required
              >
                <option value="">Select game...</option>
                <option value="valorant">VALORANT</option>
                <option value="league">League of Legends</option>
                <option value="both">Both Games</option>
              </select>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-6 bg-bl-gray border border-bl-light-gray rounded-md p-3 text-base
                   hover:border-bl-red disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors flex items-center justify-center gap-2"
        >
          <FaPlus size={15} />
          <span>{isLoading ? 'Adding...' : 'Add Account'}</span>
        </button>
      </form>
    </div>
  );
};