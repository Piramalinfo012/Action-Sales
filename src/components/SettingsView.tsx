import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  User, 
  Lock, 
  Sun, 
  Moon, 
  Save, 
  Shield, 
  Database,
  Eye,
  EyeOff
} from 'lucide-react';
import { User as UserType } from '../types';
import { getUsersFromSheet, updateUserPasswordInSheet } from '../api';

interface SettingsViewProps {
  user: UserType | null;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onAddToast: (type: any, title: string, desc: string) => void;
  driveFolderId: string;
  onUpdateDriveFolderId: (id: string) => void;
}

export default function SettingsView({ 
  user, 
  darkMode, 
  onToggleDarkMode,
  onAddToast,
  driveFolderId,
  onUpdateDriveFolderId
}: SettingsViewProps) {
  
  // Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Folder ID state
  const [localFolderId, setLocalFolderId] = useState(driveFolderId);

  const handleSaveFolderId = () => {
    if (!localFolderId.trim()) {
      onAddToast('error', 'Validation Error', 'Drive Folder ID cannot be empty.');
      return;
    }
    onUpdateDriveFolderId(localFolderId.trim());
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    if (!oldPassword || !newPassword || !confirmPassword) {
      onAddToast('error', 'Validation Error', 'Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      onAddToast('error', 'Validation Error', 'New passwords do not match.');
      return;
    }
    if (newPassword.length < 5) {
      onAddToast('error', 'Validation Error', 'New password must be at least 5 characters long.');
      return;
    }

    setIsChanging(true);

    try {
      // 1. Fetch current users from Google sheet 'Login' to get the row and verify the current password securely in real-time
      const res = await getUsersFromSheet();
      if (!res.success || !res.data) {
        onAddToast('error', 'Sync Failure', res.error || 'Failed to connect to spreadsheet database.');
        setIsChanging(false);
        return;
      }

      // Find current user row in sheet
      const matchedUser = res.data.find(u => u.username === user.username);
      if (!matchedUser) {
        onAddToast('error', 'Security Failure', 'Could not locate your account in the sheet.');
        setIsChanging(false);
        return;
      }

      // Verify old password
      if (matchedUser.password !== oldPassword) {
        onAddToast('error', 'Auth Failed', 'Your current old password is incorrect.');
        setIsChanging(false);
        return;
      }

      // 2. Update password in sheet using the matched user's rowIndex
      const rowIndex = matchedUser.rowIndex;
      const updateRes = await updateUserPasswordInSheet(
        rowIndex,
        matchedUser.name,
        matchedUser.username,
        matchedUser.role,
        newPassword
      );

      if (updateRes.success) {
        onAddToast('success', 'Security Lock', 'Your account password has been updated in Google Sheets!');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        onAddToast('error', 'Database Error', updateRes.error || 'Failed to update database.');
      }

    } catch (err: any) {
      onAddToast('error', 'Security Failure', err.message || 'Network error updating credentials.');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Title */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          System Preferences & Account
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-medium">
          Customize your local workspace preferences and update your Google Sheet login credentials securely.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left column: Profile card */}
        <div className="md:col-span-1 space-y-6">
          <div className="glass-card rounded-3xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-2xl" />
            
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center font-bold text-2xl shadow-sm">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>

              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base truncate max-w-full">
                  {user?.name}
                </h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">
                  @{user?.username}
                </p>
              </div>

              <div className="w-full bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-slate-500">
                <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                  <Shield className="w-3.5 h-3.5 text-blue-500" />
                  <span>Access Level</span>
                </span>
                <span className="bg-blue-500/10 text-blue-500 px-2.5 py-0.5 rounded-full border border-blue-500/15">
                  {user?.role}
                </span>
              </div>
            </div>
          </div>

          {/* Theme card */}
          <div className="glass-card rounded-3xl p-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              Visual Preferences
            </h4>

            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Light / Dark Theme
              </span>
              
              <button
                onClick={onToggleDarkMode}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-950/60 transition-all cursor-pointer"
              >
                {darkMode ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>

          {/* Drive configuration card */}
          <div className="glass-card rounded-3xl p-6">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Google Drive Integration
            </h4>
            <p className="text-[11px] text-slate-500 font-semibold mb-4 leading-relaxed">
              Define the folder ID used to display team invoices, sheets, and transaction documents.
            </p>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={localFolderId}
                  onChange={(e) => setLocalFolderId(e.target.value)}
                  placeholder="Enter Folder ID"
                  className="w-full px-3 py-2 text-xs glass-input rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none"
                />
              </div>

              <button
                onClick={handleSaveFolderId}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Folder ID</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right column: Secure Change Password Form */}
        <div className="md:col-span-2 glass-card rounded-3xl p-6 md:p-8">
          <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight mb-2 flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-500" />
            <span>Secure Password Configuration</span>
          </h3>
          <p className="text-slate-400 dark:text-slate-500 text-xs font-semibold leading-relaxed mb-6">
            Update your login password securely. Your credentials will be verified and modified directly inside the Google Sheet <strong className="text-slate-500 dark:text-slate-400">"Login"</strong> database.
          </p>

          <form onSubmit={handleChangePassword} className="space-y-4">
            
             {/* Old password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Current Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-2.5 glass-input rounded-2xl text-slate-900 dark:text-white text-sm focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 5 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 glass-input rounded-2xl text-slate-900 dark:text-white text-sm focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 glass-input rounded-2xl text-slate-900 dark:text-white text-sm focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Form actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={isChanging}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-semibold text-xs shadow-md shadow-blue-600/15 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isChanging ? 'Updating Sheet...' : 'Change Password'}</span>
              </button>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}
