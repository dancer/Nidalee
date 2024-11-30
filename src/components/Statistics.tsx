import React, { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { Account } from '../types';
import { FaTrash, FaEye, FaEyeSlash, FaEdit, FaPlus } from 'react-icons/fa';
import { FormSelectEvent } from '../types/events';

export const Statistics: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showPassword, setShowPassword] = useState<{[key: string]: boolean}>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState<{old: string, new: string} | null>(null);

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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-bl-yellow">Account Statistics</h2>
        <div className="flex space-x-4">
          <select
            value={selectedCategory}
            onChange={(e: FormSelectEvent) => setSelectedCategory(e.target.value)}
            className="bg-bl-gray border border-bl-light-gray rounded-md px-3 py-2"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="btn-primary flex items-center"
          >
            <FaPlus className="mr-2" /> Add Category
          </button>
        </div>
      </div>

      {/* Category Management Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-bl-gray p-6 rounded-lg w-96">
            <h3 className="text-lg font-bold mb-4">Add New Category</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleAddCategory();
            }}>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full mb-4"
                placeholder="Category name"
                autoFocus
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="btn-danger"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Add
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Categories List */}
      <div className="mb-6 bg-bl-gray rounded-lg p-4">
        <h3 className="text-lg font-bold mb-4">Categories</h3>
        <div className="space-y-2">
          {categories.map(category => (
            <div key={category} className="flex items-center justify-between bg-bl-light-gray p-2 rounded">
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
                    className="flex-1"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="text-bl-red hover:text-red-800"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCategory(null)}
                    className="text-bl-red hover:text-red-800"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <span>{category}</span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditingCategory({ old: category, new: category })}
                      className="text-bl-red hover:text-red-800"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category)}
                      className="text-bl-red hover:text-red-800"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Accounts List */}
      <div className="grid gap-4">
        {filteredAccounts.map((account) => (
          <div key={account.id} className="bg-bl-gray rounded-lg p-4 border border-bl-light-gray">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg text-white">{account.name}</h3>
                <select
                  value={account.category}
                  onChange={(e) => handleSetCategory(account.id, e.target.value)}
                  className="text-sm bg-bl-light-gray border-none"
                >
                  <option value="">No Category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => togglePasswordVisibility(account.id)}
                  className="text-bl-red hover:text-red-800 transition-colors"
                >
                  {showPassword[account.id] ? <FaEyeSlash /> : <FaEye />}
                </button>
                <button
                  onClick={() => handleDelete(account.id)}
                  className="text-bl-red hover:text-red-800 transition-colors"
                >
                  <FaTrash />
                </button>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-bl-yellow text-sm">Username</p>
                <p className="text-xl font-bold">{account.username}</p>
              </div>
              <div>
                <p className="text-bl-yellow text-sm">Password</p>
                <p className="text-xl font-bold">
                  {showPassword[account.id] ? account.password : '••••••••'}
                </p>
              </div>
              {account.email && (
                <div className="col-span-2">
                  <p className="text-bl-yellow text-sm">Email</p>
                  <p className="text-xl font-bold">{account.email}</p>
                </div>
              )}
              <div>
                <p className="text-bl-yellow text-sm">Last Login</p>
                <p className="text-xl font-bold">
                  {account.last_login 
                    ? new Date(account.last_login).toLocaleDateString()
                    : 'Never'}
                </p>
              </div>
              <div>
                <p className="text-bl-yellow text-sm">Game</p>
                <p className="text-xl font-bold">
                  {account.game_type === 'both' ? 'Both' : account.game_type}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {accounts.length === 0 && (
        <div className="text-center text-gray-500 py-8 bg-bl-gray rounded-lg border border-bl-light-gray">
          No accounts found. Add some accounts to see their statistics here.
        </div>
      )}
    </div>
  );
}; 