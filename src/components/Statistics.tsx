import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Account } from '../types';
import { FaTrash, FaEye, FaEyeSlash, FaEdit, FaPlus, FaUser, FaFolder, FaUsers, FaLeaf, FaStar, FaTags, FaCheck, FaTimes } from 'react-icons/fa';
import { FormSelectEvent } from '../types/events';

export const Statistics: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState<{ old: string, new: string } | null>(null);

  const togglePasswordVisibility = (accountId: string) => {
    setShowPassword(prev => ({ ...prev, [accountId]: !prev[accountId] }));
  };

  useEffect(() => {
    loadAccountsAndCategories();
  }, []);

  const loadAccountsAndCategories = async () => {
    try {
      const [accounts, savedCategories] = await Promise.all([
        invoke<Account[]>('get_accounts'),
        invoke<string[]>('get_categories'),
      ]);
      setAccounts(accounts);
      setCategories(savedCategories);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    if (categories.includes(newCategory)) {
      alert('Category already exists');
      return;
    }
    const newCategories = [...categories, newCategory];
    setCategories(newCategories);
    try {
      await invoke('save_categories', { categories: newCategories });
      setNewCategory('');
      setShowCategoryModal(false);
    } catch (error) {
      console.error('Failed to save categories:', error);
    }
  };

  const handleEditCategory = async (oldCategory: string, newCategory: string) => {
    if (!newCategory.trim() || oldCategory === newCategory) return;

    const updatedAccounts = accounts.map(account => {
      if (account.category === oldCategory) {
        return { ...account, category: newCategory };
      }
      return account;
    });

    for (const account of updatedAccounts) {
      await invoke('save_account', { account });
    }

    const newCategories = categories.map(cat =>
      cat === oldCategory ? newCategory : cat
    );
    setCategories(newCategories);
    await invoke('save_categories', { categories: newCategories });
    setEditingCategory(null);
    await loadAccountsAndCategories();
  };

  const handleDeleteCategory = async (category: string) => {
    if (!confirm(`Are you sure you want to delete the category "${category}"?`)) return;

    const updatedAccounts = accounts.map(account => {
      if (account.category === category) {
        return { ...account, category: '' };
      }
      return account;
    });

    for (const account of updatedAccounts) {
      await invoke('save_account', { account });
    }

    const newCategories = categories.filter(cat => cat !== category);
    setCategories(newCategories);
    await invoke('save_categories', { categories: newCategories });
    await loadAccountsAndCategories();
  };

  const handleSetCategory = async (accountId: string, category: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;

    const updatedAccount = { ...account, category };
    await invoke('save_account', { account: updatedAccount });
    await loadAccountsAndCategories();
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return;
    await invoke('delete_account', { id: accountId });
    await loadAccountsAndCategories();
  };

  const filteredAccounts = selectedCategory
    ? accounts.filter(account => account.category === selectedCategory)
    : accounts;

  const totalAccounts = accounts.length;
  const leagueAccounts = accounts.filter(a => a.game_type === 'league' || a.game_type === 'both').length;
  const valorantAccounts = accounts.filter(a => a.game_type === 'valorant' || a.game_type === 'both').length;
  const categorizedAccounts = accounts.filter(a => a.category).length;

  return (
    <div className="space-y-6 p-4 max-w-2xl mx-auto">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-bl-gray border border-bl-light-gray rounded-md p-4">
          <p className="text-sm text-bl-red flex items-center gap-2">
            <FaUsers size={14} />
            <span>Total Accounts</span>
          </p>
          <p className="text-2xl mt-2">{totalAccounts}</p>
        </div>
        <div className="bg-bl-gray border border-bl-light-gray rounded-md p-4">
          <p className="text-sm text-bl-red flex items-center gap-2">
            <FaLeaf size={14} />
            <span>League Accounts</span>
          </p>
          <p className="text-2xl mt-2">{leagueAccounts}</p>
        </div>
        <div className="bg-bl-gray border border-bl-light-gray rounded-md p-4">
          <p className="text-sm text-bl-red flex items-center gap-2">
            <FaStar size={14} />
            <span>Valorant Accounts</span>
          </p>
          <p className="text-2xl mt-2">{valorantAccounts}</p>
        </div>
        <div className="bg-bl-gray border border-bl-light-gray rounded-md p-4">
          <p className="text-sm text-bl-red flex items-center gap-2">
            <FaTags size={14} />
            <span>Categorized</span>
          </p>
          <p className="text-2xl mt-2">{categorizedAccounts}</p>
        </div>
      </div>

      {/* Categories Management */}
      <div className="bg-bl-gray border border-bl-light-gray rounded-md p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-bl-red font-medium flex items-center gap-2">
            <FaFolder size={14} />
            <span>Categories</span>
          </h3>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="text-bl-red hover:text-red-700 transition-colors p-1"
          >
            <FaPlus size={14} />
          </button>
        </div>
        <div className="space-y-2">
          {categories.map(category => (
            <div key={category} className="flex items-center justify-between bg-bl-light-gray rounded-md p-2.5">
              {editingCategory?.old === category ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleEditCategory(category, editingCategory.new);
                  }}
                  className="flex-1 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={editingCategory.new}
                    onChange={(e) => setEditingCategory({ old: category, new: e.target.value })}
                    className="flex-1 bg-bl-gray border border-bl-light-gray rounded-md px-3 py-2
                           focus:border-bl-red focus:ring-0 transition-colors"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="text-bl-red hover:text-red-700 transition-colors p-1.5 rounded hover:bg-bl-light-gray"
                    title="Save changes"
                  >
                    <FaCheck size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCategory(null)}
                    className="text-bl-red hover:text-red-700 transition-colors p-1.5 rounded hover:bg-bl-light-gray"
                    title="Cancel"
                  >
                    <FaTimes size={14} />
                  </button>
                </form>
              ) : (
                <>
                  <span>{category}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingCategory({ old: category, new: category })}
                      className="text-bl-red hover:text-red-700 transition-colors"
                    >
                      <FaEdit size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category)}
                      className="text-bl-red hover:text-red-700 transition-colors"
                    >
                      <FaTrash size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {categories.length === 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-400">No categories yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Account List */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-bl-red font-medium flex items-center gap-2">
            <FaUser size={14} />
            <span>Accounts</span>
          </h3>
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e: FormSelectEvent) => setSelectedCategory(e.target.value)}
              className="bg-bl-gray border border-bl-light-gray rounded-md pl-3 pr-8 py-2
                      focus:border-bl-red focus:ring-0 transition-colors appearance-none cursor-pointer"
            >
              <option value="" className="bg-bl-gray text-white">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat} className="bg-bl-gray text-white">{cat}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg className="h-4 w-4 text-bl-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {filteredAccounts.map((account) => (
          <div key={account.id} className="bg-bl-gray border border-bl-light-gray rounded-md p-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-4">
                <h3 className="font-medium">{account.name}</h3>
                <span className="text-sm text-gray-400">{account.username}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => togglePasswordVisibility(account.id)}
                  className="text-bl-red hover:text-red-700 transition-colors"
                >
                  {showPassword[account.id] ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                </button>
                <button
                  onClick={() => handleDelete(account.id)}
                  className="text-bl-red hover:text-red-700 transition-colors"
                >
                  <FaTrash size={14} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Password:</span>
                <span className="ml-2">
                  {showPassword[account.id] ? account.password : '••••••••'}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Category:</span>
                <select
                  value={account.category}
                  onChange={(e) => handleSetCategory(account.id, e.target.value)}
                  className="ml-2 bg-bl-gray border-none focus:ring-0 cursor-pointer"
                >
                  <option value="" className="bg-bl-gray text-white">None</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat} className="bg-bl-gray text-white">{cat}</option>
                  ))}
                </select>
              </div>
              {account.email && (
                <div className="col-span-2">
                  <span className="text-gray-400">Email:</span>
                  <span className="ml-2">{account.email}</span>
                </div>
              )}
              <div>
                <span className="text-gray-400">Game:</span>
                <span className="ml-2">
                  {account.game_type === 'both' ? 'League & VALORANT' :
                    account.game_type === 'league' ? 'League of Legends' : 'VALORANT'}
                </span>
              </div>
              <div>
                <span className="text-gray-400">Last Login:</span>
                <span className="ml-2">
                  {account.last_login
                    ? new Date(account.last_login).toLocaleDateString()
                    : 'Never'}
                </span>
              </div>
            </div>
          </div>
        ))}
        {accounts.length === 0 && (
          <div className="text-center py-6 bg-bl-gray border border-bl-light-gray rounded-md">
            <p className="text-sm text-gray-400">No accounts found</p>
          </div>
        )}
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-bl-gray border border-bl-light-gray rounded-md p-4 w-96">
            <h3 className="text-bl-red font-medium mb-4 flex items-center gap-2">
              <FaFolder size={14} />
              <span>New Category</span>
            </h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleAddCategory();
            }}>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full bg-bl-gray border border-bl-light-gray rounded-md px-3 py-2
                        focus:border-bl-red focus:ring-0 transition-colors mb-4"
                placeholder="Category name"
                autoFocus
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="text-bl-red hover:text-red-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-bl-red hover:text-red-700 transition-colors"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};