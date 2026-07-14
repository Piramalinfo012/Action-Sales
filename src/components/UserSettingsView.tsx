import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { UserPlus, Shield, Save, Users, AlertCircle, Edit, CheckSquare, X } from 'lucide-react';
import { User as UserType } from '../types';
import { getUsersFromSheet, API_URL } from '../api';

interface UserSettingsViewProps {
  user: UserType | null;
  onAddToast: (type: any, title: string, desc: string) => void;
}

const AVAILABLE_PAGES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'new-action', label: 'Auction Indent' },
  { id: 'pending', label: 'Dispatch Planning' },
  { id: 'dispatch-status', label: 'Dispatch Status' },
  { id: 'material-receipt', label: 'Material Receipt' },
  { id: 'credit-note', label: 'Credit Note Creation' },
  { id: 'payment-confirmation', label: 'Payment Confirmation' },
  { id: 'make-payment', label: 'Make Payment' },
  { id: 'history', label: 'History' },
  { id: 'reports', label: 'Reports' },
  { id: 'drive-folder', label: 'Shared Drive' },
  { id: 'settings', label: 'Settings' },
  { id: 'user-settings', label: 'User Settings' }
];

export default function UserSettingsView({ user, onAddToast }: UserSettingsViewProps) {
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Edit Mode state
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Admin' | 'Manager' | 'Sales' | 'User'>('User');
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    const res = await getUsersFromSheet();
    if (res.success && res.data) {
      setUsersList(res.data);
    } else {
      onAddToast('error', 'Fetch Failed', res.error || 'Failed to fetch users from database.');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handlePageToggle = (pageId: string) => {
    setSelectedPages(prev => 
      prev.includes(pageId) ? prev.filter(p => p !== pageId) : [...prev, pageId]
    );
  };

  const handleEditClick = (u: any) => {
    setSelectedUser(u);
    setName(u.name || '');
    setUsername(u.username || '');
    setPassword(u.password || '');
    setRole(u.role || 'User');
    
    const accessStr = u['page access'] || u.pageaccess || '';
    if (accessStr.toLowerCase() === 'all') {
      setSelectedPages(AVAILABLE_PAGES.map(p => p.id));
    } else if (accessStr) {
      setSelectedPages(accessStr.split(',').map((s: string) => s.trim()).filter(Boolean));
    } else {
      setSelectedPages([]);
    }
  };

  const resetForm = () => {
    setSelectedUser(null);
    setName('');
    setUsername('');
    setPassword('');
    setRole('User');
    setSelectedPages([]);
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username || !password || !role) {
      onAddToast('error', 'Validation Error', 'Please fill all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const pageAccessStr = selectedPages.length === AVAILABLE_PAGES.length 
        ? 'All' 
        : selectedPages.join(', ');

      const profileUrl = selectedUser ? (selectedUser['profile url'] || selectedUser.profileurl || '') : '';
      const lastLoginTime = selectedUser ? (selectedUser['last login time'] || selectedUser.lastlogintime || '') : '';

      // Columns: Name, Username, Password, Role, Profile Url, Last Login Time, Page Access
      const rowData = [name, username, password, role, profileUrl, lastLoginTime, pageAccessStr];
      
      const query = selectedUser 
        ? `?sheetName=Login&action=update&rowIndex=${selectedUser.rowIndex}&rowData=${encodeURIComponent(JSON.stringify(rowData))}`
        : `?sheetName=Login&action=insert&rowData=${encodeURIComponent(JSON.stringify(rowData))}`;

      const response = await fetch(`${API_URL}${query}`, { method: 'POST' });
      const result = await response.json();
      
      if (result.success) {
        onAddToast('success', selectedUser ? 'User Updated' : 'User Created', selectedUser ? 'User access updated successfully!' : 'New user added successfully!');
        resetForm();
        fetchUsers();
      } else {
        onAddToast('error', 'Operation Failed', result.error || 'Failed to process user');
      }
    } catch (err: any) {
      onAddToast('error', 'Network Error', err.message || 'Failed to connect to server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Users className="w-6 h-6 text-blue-500" />
          <span>User Management</span>
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-medium">
          Create and edit user accounts, assign roles, and precisely configure page access levels.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column: Form */}
        <div className="xl:col-span-1 glass-card rounded-3xl p-6 relative overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight flex items-center gap-2">
              {selectedUser ? <Edit className="w-5 h-5 text-amber-500" /> : <UserPlus className="w-5 h-5 text-emerald-500" />}
              <span>{selectedUser ? 'Edit User Access' : 'Create New User'}</span>
            </h3>
            {selectedUser && (
              <button 
                onClick={resetForm}
                className="text-xs font-bold text-slate-500 hover:text-rose-500 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
            )}
          </div>

          <form onSubmit={handleSubmitUser} className="space-y-4 relative z-10 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-2.5 glass-input rounded-2xl text-slate-900 dark:text-white text-sm focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="johndoe123"
                  className="w-full px-4 py-2.5 glass-input rounded-2xl text-slate-900 dark:text-white text-sm focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Password
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 glass-input rounded-2xl text-slate-900 dark:text-white text-sm focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-4 py-2.5 glass-input rounded-2xl text-slate-900 dark:text-white text-sm focus:outline-none appearance-none"
                  required
                >
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Sales">Sales</option>
                  <option value="User">User</option>
                </select>
              </div>

              {/* Page Access Checkboxes */}
              <div className="space-y-2.5 pt-2">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-blue-500" />
                  Page Access Permissions
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-950/20">
                  {AVAILABLE_PAGES.map(page => {
                    const isChecked = selectedPages.includes(page.id);
                    return (
                      <label 
                        key={page.id} 
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          isChecked ? 'bg-blue-500/10' : 'hover:bg-slate-100 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handlePageToggle(page.id)}
                          className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className={`text-sm font-medium ${isChecked ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                          {page.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-6 mt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-semibold text-xs shadow-md shadow-blue-600/15 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>
                  {isSubmitting 
                    ? (selectedUser ? 'Updating...' : 'Creating...') 
                    : (selectedUser ? 'Update User Access' : 'Create User')}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Users List */}
        <div className="xl:col-span-2 glass-card rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" />
              <span>Current System Users</span>
            </h3>
            
            <button
              onClick={fetchUsers}
              className="text-xs font-bold text-blue-500 hover:text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
            >
              {isLoading ? 'Refreshing...' : 'Refresh List'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800/80 text-xs text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold px-4">Name</th>
                  <th className="pb-3 font-semibold px-4">Username</th>
                  <th className="pb-3 font-semibold px-4">Role</th>
                  <th className="pb-3 font-semibold px-4">Page Access</th>
                  <th className="pb-3 font-semibold px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {isLoading && usersList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 font-semibold text-xs">Loading users...</td>
                  </tr>
                ) : usersList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 font-semibold text-xs flex items-center justify-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      No users found.
                    </td>
                  </tr>
                ) : (
                  usersList.map((u, i) => (
                    <motion.tr 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      key={u.rowIndex || i} 
                      className={`transition-colors ${selectedUser?.rowIndex === u.rowIndex ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/20'}`}
                    >
                      <td className="py-3 px-4 text-slate-800 dark:text-slate-200 font-medium">
                        {u.name}
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                        @{u.username}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          u.role === 'Admin' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400' :
                          u.role === 'Manager' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400' :
                          u.role === 'Sales' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400' :
                          'bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-400'
                        }`}>
                          {u.role || 'User'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-xs max-w-[200px] truncate" title={u['page access'] || u.pageaccess || 'All'}>
                        {u['page access'] || u.pageaccess || 'All'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleEditClick(u)}
                          className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer inline-flex"
                          title="Edit Access"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
