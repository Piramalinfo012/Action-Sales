import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  ArrowUpDown, 
  Download, 
  Trash2, 
  Edit, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Save,
  Building2,
  Hash,
  Scale,
  Box,
  MapPin,
  FileText,
  Calendar,
  Tag
} from 'lucide-react';
import { ActionEntry, User } from '../types';

interface HistoryViewProps {
  actions: ActionEntry[];
  user: User | null;
  onUpdateAction: (rowIndex: number, updated: ActionEntry) => Promise<boolean>;
  onDeleteAction: (rowIndex: number, actionId: string) => Promise<boolean>;
  isOffline: boolean;
}

type SortField = 'timestamp' | 'companyName' | 'quntity' | 'productName' | 'location';
type SortOrder = 'asc' | 'desc';

export default function HistoryView({ 
  actions, 
  user, 
  onUpdateAction, 
  onDeleteAction,
  isOffline 
}: HistoryViewProps) {
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [historyTab, setHistoryTab] = useState<'all' | 'l1_confirmed'>('all');
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Edit Modal State
  const [editingAction, setEditingAction] = useState<ActionEntry | null>(null);
  const [editDate, setEditDate] = useState(''); // HTML input date requires YYYY-MM-DD
  const [editId, setEditId] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editProduct, setEditProduct] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editRemark, setEditRemark] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // 1. Filter data
  const filtered = actions.filter(action => {
    const matchesSearch = 
      (action.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (action.productName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (action.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (action.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (action.remark || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (historyTab === 'l1_confirmed') {
      const hasL1 = (action.areWeL1 && action.areWeL1.trim().length > 0) ||
                    (action.planned1 && action.planned1.trim().length > 0) ||
                    (action.actual1 && action.actual1.trim().length > 0) ||
                    (action.timeDelay1 && action.timeDelay1.trim().length > 0);
      return hasL1;
    }

    return true;
  });

  // 2. Sort data
  const sorted = [...filtered].sort((a, b) => {
    let comparison = 0;
    
    if (sortField === 'timestamp') {
      // Parse dates (DD/MM/YYYY) for comparison
      const parseDate = (dStr: string) => {
        const p = dStr.split('/');
        if (p.length === 3) return new Date(`${p[2]}-${p[1]}-${p[0]}`).getTime();
        return new Date(dStr).getTime() || 0;
      };
      comparison = parseDate(a.timestamp) - parseDate(b.timestamp);
    } else if (sortField === 'companyName') {
      comparison = (a.companyName || '').localeCompare(b.companyName || '');
    } else if (sortField === 'quntity') {
      comparison = (a.quntity || 0) - (b.quntity || 0);
    } else if (sortField === 'productName') {
      comparison = (a.productName || '').localeCompare(b.productName || '');
    } else if (sortField === 'location') {
      comparison = (a.location || '').localeCompare(b.location || '');
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // 3. Paginate data
  const totalPages = Math.ceil(sorted.length / itemsPerPage) || 1;
  const paginated = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // CSV Export
  const handleExportCSV = () => {
    if (sorted.length === 0) {
      alert('No data available to export.');
      return;
    }

    const headers = ['Timetamp', 'ID', 'Company Name', 'Quntity', 'Unit', 'Product Name', 'Location', 'Remark'];
    const rows = sorted.map(a => [
      a.timestamp,
      a.id,
      a.companyName,
      a.quntity,
      a.unit,
      a.productName,
      a.location,
      a.remark
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${(val || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `action_sales_fms_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  const handleDelete = async (action: ActionEntry) => {
    if (!action.rowIndex && !isOffline) {
      alert('Error: Action does not have a spreadsheet row index.');
      return;
    }
    const confirmed = window.confirm(`⚠️ WARNING: Are you sure you want to PERMANENTLY DELETE transaction ${action.id} for ${action.companyName}? This cannot be undone.`);
    if (!confirmed) return;

    await onDeleteAction(action.rowIndex || 0, action.id);
  };

  const canEdit = user?.role === 'Admin' || user?.role === 'Manager';
  const canDelete = user?.role === 'Admin';

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Transactions History Logs
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-medium">
            Search, sort, and export logged transactions. Mapped dynamically from the FMS sheet.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl font-semibold text-sm shadow-md shadow-blue-600/10 flex items-center gap-2 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-4.5 h-4.5" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Toolbar Filter */}
      <div className="glass-card rounded-3xl p-5 flex flex-col md:flex-row gap-4 items-center">
        {/* L1 vs All Segmented Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-900/60 p-1 rounded-2xl w-full md:w-auto self-stretch md:self-auto shrink-0 border border-slate-200/40 dark:border-slate-800/40">
          <button
            onClick={() => { setHistoryTab('all'); setCurrentPage(1); }}
            className={`flex-1 md:flex-initial px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              historyTab === 'all'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            All Logs ({actions.length})
          </button>
          <button
            onClick={() => { setHistoryTab('l1_confirmed'); setCurrentPage(1); }}
            className={`flex-1 md:flex-initial px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              historyTab === 'l1_confirmed'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            L1 Confirmed ({actions.filter(a => (a.areWeL1 && a.areWeL1.trim().length > 0) || (a.planned1 && a.planned1.trim().length > 0) || (a.actual1 && a.actual1.trim().length > 0) || (a.timeDelay1 && a.timeDelay1.trim().length > 0)).length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
          <input
            type="text"
            placeholder="Search Company, ID, Product, Location, or Remarks..."
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
          .responsive-mobile-table td:nth-of-type(8)::before { content: "L1 Confirmation"; }
          .responsive-mobile-table td:nth-of-type(9)::before { content: "Remark"; }
          .responsive-mobile-table td:nth-of-type(10)::before { content: "Auction"; }
        }
      `}</style>
<table className="w-full border-collapse text-left responsive-mobile-table">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800/80 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-4 px-6 select-none cursor-pointer hover:text-slate-700 dark:hover:text-slate-200" onClick={() => handleSort('timestamp')}>
                  <div className="flex items-center gap-1.5">
                    <span>Timetamp</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="py-4 px-6">ID</th>
                <th className="py-4 px-6 select-none cursor-pointer hover:text-slate-700 dark:hover:text-slate-200" onClick={() => handleSort('companyName')}>
                  <div className="flex items-center gap-1.5">
                    <span>Company Name</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="py-4 px-6 select-none cursor-pointer hover:text-slate-700 dark:hover:text-slate-200" onClick={() => handleSort('quntity')}>
                  <div className="flex items-center gap-1.5 justify-end">
                    <span>Quntity</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="py-4 px-6 text-center">Unit</th>
                <th className="py-4 px-6 select-none cursor-pointer hover:text-slate-700 dark:hover:text-slate-200" onClick={() => handleSort('productName')}>
                  <div className="flex items-center gap-1.5">
                    <span>Product Name</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="py-4 px-6 select-none cursor-pointer hover:text-slate-700 dark:hover:text-slate-200" onClick={() => handleSort('location')}>
                  <div className="flex items-center gap-1.5">
                    <span>Location</span>
                    <ArrowUpDown className="w-3.5 h-3.5" />
                  </div>
                </th>
                <th className="py-4 px-6">L1 Confirmation</th>
                <th className="py-4 px-6">Remark</th>
                {(canEdit || canDelete) && <th className="py-4 px-6 text-center">Auction</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300 text-sm font-semibold">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-400 font-medium">
                    No matching sales records found in history.
                  </td>
                </tr>
              ) : (
                paginated.map((action) => {
                  const isSale = action.areWeL1 === 'No';
                  return (
                  <tr key={action.id + '-' + action.rowIndex} className={`transition-colors ${isSale ? 'bg-purple-50/40 hover:bg-purple-50/60 dark:bg-purple-900/20 dark:hover:bg-purple-900/40' : 'hover:bg-slate-50/40 dark:hover:bg-slate-900/10'}`}>
                    <td className="py-4.5 px-6 whitespace-nowrap text-slate-900 dark:text-white font-bold">{action.timestamp}</td>
                    <td className="py-4.5 px-6 whitespace-nowrap font-mono text-xs font-bold text-slate-600 dark:text-slate-400">{action.id}</td>
                    <td className="py-4.5 px-6 whitespace-nowrap text-slate-900 dark:text-white font-extrabold flex items-center gap-1.5 h-[53px]">
                      {action.companyName}
                      {isSale && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800 bg-purple-100 dark:bg-purple-900/40 text-[8px] font-black uppercase tracking-widest text-purple-700 dark:text-purple-300">
                          L1
                        </span>
                      )}
                    </td>
                    <td className="py-4.5 px-6 whitespace-nowrap text-right font-extrabold text-slate-900 dark:text-white">{(action.quntity || 0).toLocaleString()}</td>
                    <td className="py-4.5 px-6 whitespace-nowrap text-center text-slate-500 dark:text-slate-400">{action.unit}</td>
                    <td className="py-4.5 px-6 whitespace-nowrap text-slate-500 dark:text-slate-400 font-semibold">{action.productName}</td>
                    <td className="py-4.5 px-6 whitespace-nowrap text-slate-500 dark:text-slate-400 font-semibold">{action.location}</td>
                    <td className="py-4.5 px-6 whitespace-nowrap">
                      <div className="space-y-2 max-w-xs">
                        {/* Status Badge */}
                        {(() => {
                          const status = action.actual1 && action.actual1.trim().length > 0 
                            ? 'Completed' 
                            : (action.planned1 && action.planned1.trim().length > 0 ? 'Pending' : 'Not Scheduled');
                          
                          if (status === 'Completed') {
                            return (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Completed
                              </span>
                            );
                          } else if (status === 'Pending') {
                            return (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                Pending
                              </span>
                            );
                          } else {
                            return (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                Not Scheduled
                              </span>
                            );
                          }
                        })()}

                        {/* Detailed values hidden per user request */}
                      </div>
                    </td>
                    <td className="py-4.5 px-6 max-w-xs truncate text-slate-500 dark:text-slate-400 text-xs italic">{action.remark || '-'}</td>
                    {(canEdit || canDelete) && (
                      <td className="py-4.5 px-6 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {canEdit && (
                            <button
                              onClick={() => handleOpenEdit(action)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                              title="Edit Entry"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(action)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
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
                    Edit Historical Record
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
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl text-slate-900 dark:text-white text-sm focus:outline-none focus:border-blue-600"
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

                    {/* Product Select */}
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
