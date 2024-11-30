import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Account } from '../types';
import { FormInputEvent, FormSelectEvent } from '../types/events';
import { logAccountAdd } from '../firebase';

export const AddAccount: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    email: '',
    game_type: '',
  });

  const validateForm = () => {
    if (!formData.name || !formData.username || !formData.password || !formData.game_type) {
      return false;
    }
    return true;
  };

  const [currentError, setCurrentError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
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
      
      alert('Account added successfully!');
    } catch (error) {
      console.error('Failed to save account:', error);
      alert('Failed to save account. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" autoComplete="off" noValidate>
      <div className="grid gap-4">
        <div>
          <label className="block text-bl-red font-bold mb-2 text-sm select-none">
            Account Name {currentError === 'name' && <span className="text-bl-red">(Required)</span>}
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={(e: FormInputEvent) => {
              setFormData({ ...formData, name: e.target.value });
              if (currentError === 'name') setCurrentError('');
            }}
            className="w-full"
            required
            autoComplete="off"
          />
        </div>

        <div>
          <label className="block text-bl-red font-bold mb-2 text-sm select-none">
            Username {currentError === 'username' && <span className="text-bl-red">(Required)</span>}
          </label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={(e: FormInputEvent) => {
              setFormData({ ...formData, username: e.target.value });
              if (currentError === 'username') setCurrentError('');
            }}
            className="w-full"
            required
            autoComplete="off"
          />
        </div>

        <div>
          <label className="block text-bl-red font-bold mb-2 text-sm select-none">
            Password {currentError === 'password' && <span className="text-bl-red">(Required)</span>}
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={(e: FormInputEvent) => {
              setFormData({ ...formData, password: e.target.value });
              if (currentError === 'password') setCurrentError('');
            }}
            className="w-full"
            required
            autoComplete="new-password"
          />
        </div>

        <div>
          <label className="block text-bl-red font-bold mb-2 text-sm select-none">Email (Optional)</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={(e: FormInputEvent) => {
              setFormData({ ...formData, email: e.target.value });
            }}
            className="w-full"
            autoComplete="off"
          />
        </div>

        <div>
          <label className="block text-bl-red font-bold mb-2 text-sm select-none">
            Game {currentError === 'game_type' && <span className="text-bl-red">(Required)</span>}
          </label>
          <select
            name="game_type"
            value={formData.game_type}
            onChange={(e: FormSelectEvent) => {
              setFormData({ ...formData, game_type: e.target.value });
              if (currentError === 'game_type') setCurrentError('');
            }}
            className="w-full"
            required
          >
            <option value="">Select game...</option>
            <option value="valorant">VALORANT</option>
            <option value="league">League of Legends</option>
            <option value="both">Both</option>
          </select>
        </div>
      </div>

      <button type="submit" className="btn-primary w-full">
        Add Account
      </button>
    </form>
  );
}; 