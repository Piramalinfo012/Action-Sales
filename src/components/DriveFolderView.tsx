import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Folder, 
  ExternalLink, 
  Copy, 
  Check, 
  Grid, 
  List, 
  Info, 
  FileText, 
  RefreshCw,
  Search
} from 'lucide-react';

interface DriveFolderViewProps {
  folderId: string;
  onAddToast?: (type: 'success' | 'error' | 'info', title: string, desc: string) => void;
}

export default function DriveFolderView({ folderId, onAddToast }: DriveFolderViewProps) {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [copied, setCopied] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // Google Drive folder link
  const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;
  
  // Embedded Google Drive folder URL
  const embedUrl = `https://drive.google.com/embeddedfolderview?id=${folderId}#${viewMode}`;

  const handleCopyFolderId = () => {
    navigator.clipboard.writeText(folderId);
    setCopied(true);
    if (onAddToast) {
      onAddToast('success', 'Copied to Clipboard', 'Google Drive Folder ID copied successfully.');
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = () => {
    setIframeKey(prev => prev + 1);
    if (onAddToast) {
      onAddToast('info', 'Refreshing Drive View', 'Reloading embedded Google Drive frame.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Folder className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            <span>Shared Documents Drive</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-medium">
            Browse reports, contracts, invoices, and other distribution assets in real-time inside your shared drive.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh Frame */}
          <button
            onClick={handleRefresh}
            className="p-2.5 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-950/60 rounded-xl transition-all cursor-pointer bg-white dark:bg-slate-900 shadow-sm"
            title="Refresh View"
          >
            <RefreshCw className="w-4.5 h-4.5" />
          </button>

          {/* List vs Grid embed togglers */}
          <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/50 dark:border-slate-850">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>

          <a
            href={folderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-md shadow-blue-600/15 transition-all duration-300"
          >
            <span>Open in Drive</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Info Card / Quick Metadata */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-5 border border-slate-100 dark:border-slate-850 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
              Google Drive Integration
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-slate-400 dark:text-slate-500 text-xs font-semibold">
                Folder ID:
              </span>
              <code className="bg-slate-100 dark:bg-slate-950 px-2 py-0.5 rounded text-xs text-slate-700 dark:text-slate-300 font-mono select-all">
                {folderId}
              </code>
              <button
                onClick={handleCopyFolderId}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
                title="Copy Folder ID"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 px-3.5 py-2 rounded-xl text-slate-500 dark:text-slate-400 max-w-md font-semibold">
          <Info className="w-4 h-4 text-blue-500 shrink-0" />
          <span>Note: You need active permissions on this folder to view or edit files inside. Ask your Admin to grant access to your email.</span>
        </div>
      </motion.div>

      {/* Embedded Folder Frame Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-3xl border border-slate-100 dark:border-slate-800/80 overflow-hidden shadow-xl"
      >
        <div className="bg-slate-50/80 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800/80 px-5 py-3 flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active Frame: Cloud Stream</span>
          </span>
          <span>Google Workspace Sandbox</span>
        </div>

        <div className="relative w-full h-[650px] bg-slate-50 dark:bg-slate-950/20">
          <iframe
            key={iframeKey}
            src={embedUrl}
            className="w-full h-full border-0 rounded-b-3xl"
            allowFullScreen
            loading="lazy"
            title="Google Drive Folder Explorer"
          />
        </div>
      </motion.div>
    </div>
  );
}
