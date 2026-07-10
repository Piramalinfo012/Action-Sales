import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, 
  Search, 
  Trash2, 
  Edit, 
  X, 
  Save, 
  ChevronLeft, 
  ChevronRight, 
  Database,
  Building2,
  Hash,
  Scale,
  Box,
  MapPin,
  FileText,
  Calendar,
  Tag,
  WifiOff
} from 'lucide-react';
import { ActionEntry, User } from '../types';

interface PendingViewProps {
  actions: ActionEntry[];
  user: User | null;
  onUpdateAction: (rowIndex: number, updated: ActionEntry) => Promise<boolean>;
  onDeleteAction: (rowIndex: number, actionId: string) => Promise<boolean>;
  isOffline: boolean;
  onSyncAction?: (action: ActionEntry) => Promise<boolean>;
}

export default function PendingView({ 
  actions, 
  user, 
  onUpdateAction, 
  onDeleteAction,
  isOffline,
  onSyncAction
}: PendingViewProps) {
  
  // Offline/Local drafts are entries without a rowIndex
  const pendingSyncActions = actions.filter(a => !a.rowIndex || a.id.startsWith('local-'));

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Edit Modal State
  const [editingAction, setEditingAction] = useState<ActionEntry | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editId, setEditId] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editProduct, setEditProduct] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editRemark, setEditRemark] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);

  // Helper: Convert DD/MM/YYYY to YYYY-MM-DD
  const convertToInputDate = (ddmmyyyy: string): string => {
    const parts = ddmmyyyy.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return ddmmyyyy;
  };

  // Helper: Convert YYYY-MM-DD to DD/MM/YYYY
  const convertToSheetDate = (yyyymmdd: string): string => {
    const parts = yyyymmdd.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return yyyymmdd;
  };

  // Filters
  const filtered = pendingSyncActions.filter(action => {
    const matchesSearch = 
      (action.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (action.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (action.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (action.id || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleOpenEdit = (action: ActionEntry) => {
    setEditingAction(action);
    setEditDate(convertToInputDate(action.timestamp));
    setEditId(action.id);
    setEditCompany(action.companyName);
    setEditQuantity(action.quntity.toString());
    setEditUnit(action.unit);
    setEditProduct(action.productName);
    setEditLocation(action.location);
    setEditRemark(action.remark || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAction) return;

    const qVal = parseFloat(editQuantity);
    if (isNaN(qVal) || qVal <= 0) {
      alert('Please enter a valid positive quantity.');
      return;
    }

    setIsSaving(true);
    const updated: ActionEntry = {
      ...editingAction,
      id: editId.trim(),
      timestamp: convertToSheetDate(editDate),
      companyName: editCompany.trim(),
      quntity: qVal,
      unit: editUnit.trim(),
      productName: editProduct,
      location: editLocation,
      remark: editRemark.trim()
    };

    const success = await onUpdateAction(editingAction.rowIndex || 0, updated);
    setIsSaving(false);
    if (success) {
      setEditingAction(null);
    }
  };

  const handleDeleteDraft = async (action: ActionEntry) => {
    const confirmed = window.confirm(`Are you sure you want to delete this draft entry for ${action.companyName}?`);
    if (!confirmed) return;
    await onDeleteAction(0, action.id);
  };

  const handleSyncDraft = async (action: ActionEntry) => {
    if (isOffline) {
      alert('Cannot sync while offline. Please restore your internet connection first.');
      return;
    }
    if (!onSyncAction) return;

    setIsSyncing(action.id);
    await onSyncAction(action);
    setIsSyncing(null);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <span>Pending Sync Queue</span>
          {pendingSyncActions.length > 0 && (
            <span className="text-xs bg-amber-500/15 text-amber-500 px-2.5 py-0.5 rounded-full font-bold">
              {pendingSyncActions.length} Offline Drafts
            </span>
          )}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-medium">
          Drafts logged while offline are stored securely in local storage. Once online, they can be uploaded to the Google Sheet FMS.
        </p>
      </div>

      {pendingSyncActions.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 mx-auto flex items-center justify-center">
            <Database className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-slate-900 dark:text-white text-base">
            All Synced Correctly
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
            There are no offline drafts in queue. Every transaction is successfully recorded in the Google Sheet.
          </p>
        </div>
      ) : (
        <>
          {/* Toolbar Filter */}
          <div className="glass-card rounded-3xl p-5 flex flex-col md:flex-row gap-4 items-center">
            {/* Search */}
            <div className="relative w-full md:flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
              <input
                type="text"
                placeholder="Search draft queue..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-11 pr-4 py-2.5 glass-input rounded-2xl text-slate-900 dark:text-white text-sm focus:outline-none font-medium transition-all"
              />
            </div>
          </div>

          {/* Main Table */}
          <div className="glass-card rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <style>{`
        @media (max-width: 768px) {
          .responsive-mobile-table { display: block; width: 100%; background: transparent !important; border: none !important; }
          .responsive-mobile-table thead { display: none; }
          .responsive-mobile-table tbody, .responsive-mobile-table tr, .responsive-mobile-table td { display: block; width: 100%; }
          .responsive-mobile-table tr { margin-bottom: 1.5rem; background: var(--bg-card, white); border: 1px solid rgba(0,0,0,0.1); border-radius: 1rem; padding: 1rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .dark .responsive-mobile-table tr { background: rgba(30, 41, 59, 0.5); border-color: rgba(255,255,255,0.05); }
          .responsive-mobile-table td { text-align: right !important; padding: 0.75rem 0 !important; border: none !important; position: relative; padding-left: 50% !important; min-height: 2.5rem; display: flex; justify-content: flex-end; align-items: center; white-space: normal !important; overflow: hidden; }
          .responsive-mobile-table td::before { position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 45%; text-align: left; font-weight: 700; color: #64748b; font-size: 0.7rem; text-transform: uppercase; }
          .dark .responsive-mobile-table td::before { color: #94a3b8; }
          /* Add horizontal lines between rows inside the card */
          .responsive-mobile-table td:not(:last-child) { border-bottom: 1px dashed rgba(148, 163, 184, 0.25) !important; }
          .responsive-mobile-table td:nth-of-type(1)::before { content: "Timetamp"; }
          .responsive-mobile-table td:nth-of-type(2)::before { content: "ID"; }
          .responsive-mobile-table td:nth-of-type(3)::before { content: "Company Name"; }
          .responsive-mobile-table td:nth-of-type(4)::before { content: "Quntity"; }
          .responsive-mobile-table td:nth-of-type(5)::before { content: "Unit"; }
          .responsive-mobile-table td:nth-of-type(6)::before { content: "Product Name"; }
          .responsive-mobile-table td:nth-of-type(7)::before { content: "Location"; }
          .responsive-mobile-table td:nth-of-type(8)::before { content: "Sync Status"; }
          .responsive-mobile-table td:nth-of-type(9)::before { content: "Actions"; }
        }
      `}</style>
<table className="w-full border-collapse text-left responsive-mobile-table">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800/80 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-4 px-6">Timetamp</th>
                    <th className="py-4 px-6">ID</th>
                    <th className="py-4 px-6">Company Name</th>
                    <th className="py-4 px-6 text-right">Quntity</th>
                    <th className="py-4 px-6 text-center">Unit</th>
                    <th className="py-4 px-6">Product Name</th>
                    <th className="py-4 px-6">Location</th>
                    <th className="py-4 px-6 text-center">Sync Status</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300 text-sm font-semibold">
                  {paginated.map((action) => (
                    <tr key={action.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10 transition-colors">
                      <td className="py-4.5 px-6 whitespace-nowrap text-slate-900 dark:text-white font-bold">{action.timestamp}</td>
                      <td className="py-4.5 px-6 whitespace-nowrap font-mono text-xs font-bold text-slate-600 dark:text-slate-400">{action.id}</td>
                      <td className="py-4.5 px-6 whitespace-nowrap text-slate-900 dark:text-white font-extrabold">{action.companyName}</td>
                      <td className="py-4.5 px-6 whitespace-nowrap text-right font-extrabold text-slate-900 dark:text-white">{(action.quntity || 0).toLocaleString()}</td>
                      <td className="py-4.5 px-6 whitespace-nowrap text-center text-slate-500 dark:text-slate-400">{action.unit}</td>
                      <td className="py-4.5 px-6 whitespace-nowrap text-slate-500 dark:text-slate-400 font-semibold">{action.productName}</td>
                      <td className="py-4.5 px-6 whitespace-nowrap text-slate-500 dark:text-slate-400 font-semibold">{action.location}</td>
                      <td className="py-4.5 px-6 whitespace-nowrap text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/15 uppercase tracking-wider">
                          <WifiOff className="w-3.5 h-3.5" />
                          <span>Offline</span>
                        </span>
                      </td>
                      <td className="py-4.5 px-6 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleSyncDraft(action)}
                            disabled={isOffline || isSyncing === action.id}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow-sm flex items-center gap-1 cursor-pointer disabled:opacity-40"
                          >
                            <Database className={`w-3.5 h-3.5 ${isSyncing === action.id ? 'animate-spin' : ''}`} />
                            <span>{isSyncing === action.id ? 'Uploading...' : 'Upload'}</span>
                          </button>
                          <button
                            onClick={() => handleOpenEdit(action)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                            title="Edit Draft"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDraft(action)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete Draft"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/20 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-semibold">
                  Showing page {currentPage} of {totalPages} ({filtered.length} entries matching)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className="p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className="p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Edit Modal Dialog */}
      <AnimatePresence>
        {editingAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50 dark:bg-slate-950/20">
                <div className="flex items-center gap-2">
                  <Edit className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Edit Offline Draft
                  </h3>
                </div>
                <button
                  onClick={() => setEditingAction(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body Form */}
              <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Timestamp */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                        Transaction Date
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-slate-900 dark:text-white text-sm focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    {/* ID */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                        ID
                      </label>
                      <div className="relative">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                          type="text"
                          value={editId}
                          onChange={(e) => setEditId(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-slate-900 dark:text-white text-sm focus:outline-none font-mono"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Company */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Company Name
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                      <input
                        type="text"
                        value={editCompany}
                        onChange={(e) => setEditCompany(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-slate-900 dark:text-white text-sm focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Quantity */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                        Quntity
                      </label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                          type="number"
                          value={editQuantity}
                          onChange={(e) => setEditQuantity(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-slate-900 dark:text-white text-sm focus:outline-none"
                          min="0.0001"
                          step="any"
                          required
                        />
                      </div>
                    </div>

                    {/* Unit */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                        Unit
                      </label>
                      <div className="relative">
                        <Scale className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                          type="text"
                          value={editUnit}
                          onChange={(e) => setEditUnit(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-slate-900 dark:text-white text-sm focus:outline-none"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Location Select */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                        Location Hub
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <select
                          value={editLocation}
                          onChange={(e) => setEditLocation(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-slate-900 dark:text-white text-sm focus:outline-none"
                        >
                          {['RPR', 'Mumbai', 'Delhi', 'Bengaluru', 'Chennai', 'Kolkata', 'Pune'].map(l => (
                            <option key={l} value={l}>{l}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Product Name Select */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                        Product Name
                      </label>
                      <div className="relative">
                        <Box className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <select
                          value={editProduct}
                          onChange={(e) => setEditProduct(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-slate-900 dark:text-white text-sm focus:outline-none"
                        >
                          {[
                            'Fuel Oil (Purcha)',
                            'Piramal Fuel Premium',
                            'Lubricant Ultra-Heavy',
                            'Industrial Grease G-400',
                            'Aviation Biofuel Jet-A',
                            'Marine Fuel Diesel XL'
                          ].map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Remark */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Remark
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                      <input
                        type="text"
                        value={editRemark}
                        onChange={(e) => setEditRemark(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-slate-900 dark:text-white text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit actions */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditingAction(null)}
                    className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 flex items-center gap-1.5 shadow-md shadow-blue-600/15 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
