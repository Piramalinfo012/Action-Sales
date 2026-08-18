import React, { useState, useEffect } from 'react';
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
  Tag,
  Eye,
  Info,
  Loader2,
  CheckCircle2,
  Truck,
  FileCheck2,
  Banknote,
  Receipt,
  UserCheck,
  Layers
} from 'lucide-react';
import { ActionEntry, User } from '../types';
import { getSaleAllocationRows, getPurchaseAllocationRows, getDispatchRows } from '../api';

interface HistoryViewProps {
  actions: ActionEntry[];
  user: User | null;
  onUpdateAction: (rowIndex: number, updated: ActionEntry) => Promise<boolean>;
  onDeleteAction: (rowIndex: number, actionId: string) => Promise<boolean>;
  isOffline: boolean;
}

type SortField = 'timestamp' | 'companyName' | 'quntity' | 'productName' | 'location';
type SortOrder = 'asc' | 'desc';

// A visual timeline indicator component for the pending stages
const StageTimeline = ({ action, allDispatchRecords }: { action: ActionEntry, allDispatchRecords: any[] }) => {
  const getProgressIndex = (action: ActionEntry) => {
    const fmsComplete = (action.areWeL1 === 'Yes' && action.willPurchase) || (action.areWeL1 === 'No' && action.l1PartyName);
    if (!fmsComplete) return 0;

    const relatedDispatches = allDispatchRecords.filter(d => d.id === action.id);
    if (relatedDispatches.length === 0) return 1;

    const hasAnyDispatch = relatedDispatches.some(d => d.statusDispatchQty && d.statusDispatchQty.trim() !== '');
    if (!hasAnyDispatch) return 1;

    const hasAnyReceipt = relatedDispatches.some(d => (d.plReceiptMaterial && d.plReceiptMaterial.trim() !== '') || (d.acReceiptMaterial && d.acReceiptMaterial.trim() !== ''));
    if (!hasAnyReceipt) return 2;

    return 3;
  };

  const progress = getProgressIndex(action);
  const steps = [
    { label: 'Auction Indent', idx: 0 },
    { label: 'Dispatch', idx: 1 },
    { label: 'Material Receipt', idx: 2 },
    { label: 'Accounts', idx: 3 },
  ];

  return (
    <div className="flex items-center justify-between mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
      {steps.map((step, i) => {
        const isCompleted = progress > step.idx;
        const isActive = progress === step.idx;
        return (
          <div key={i} className="flex flex-col items-center relative flex-1">
             {i !== 0 && (
               <div className={`absolute top-2.5 left-[-50%] w-full h-[2px] z-0 transition-colors ${isCompleted || isActive ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
             )}
             <div className={`relative z-10 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${isCompleted ? 'bg-amber-500 text-white' : isActive ? 'bg-amber-500 text-white shadow-[0_0_0_3px_rgba(245,158,11,0.2)]' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                {isCompleted ? <CheckCircle2 className="w-3 h-3" /> : (i + 1)}
             </div>
             <span className={`text-[9px] uppercase font-bold mt-2 tracking-wider text-center ${isActive ? 'text-amber-600 dark:text-amber-500' : isCompleted ? 'text-slate-500 dark:text-slate-400' : 'text-slate-400 dark:text-slate-500'}`}>
               {step.label}
             </span>
          </div>
        );
      })}
    </div>
  );
};

export default function HistoryView({ 
  actions, 
  user, 
  onUpdateAction, 
  onDeleteAction,
  isOffline 
}: HistoryViewProps) {
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [historyTab, setHistoryTab] = useState<'all' | 'l1_confirmed' | 'pending_stages' | 'completed_history'>('all');
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Edit Modal State
  const [editingAction, setEditingAction] = useState<ActionEntry | null>(null);
  const [viewingAction, setViewingAction] = useState<ActionEntry | null>(null);
  const [editDate, setEditDate] = useState(''); // HTML input date requires YYYY-MM-DD
  const [editId, setEditId] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editUnit, setEditUnit] = useState('');
  const [editProduct, setEditProduct] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editRemark, setEditRemark] = useState('');
  const [editValidity, setEditValidity] = useState('');

  // Stage Modal State
  const [selectedActionForStages, setSelectedActionForStages] = useState<ActionEntry | null>(null);
  const [stageData, setStageData] = useState<{ allocations: any[], dispatches: any[], isLoading: boolean }>({ allocations: [], dispatches: [], isLoading: false });

  // Global Dispatch Records for accurately calculating completed status
  const [allDispatchRecords, setAllDispatchRecords] = useState<any[]>([]);
  const [isDispatchLoaded, setIsDispatchLoaded] = useState(false);

  useEffect(() => {
    getDispatchRows().then(res => {
      if (res.success) setAllDispatchRecords(res.data);
      setIsDispatchLoaded(true);
    }).catch(() => setIsDispatchLoaded(true));
  }, []);

  // Fetch Stage Data when selectedActionForStages changes
  useEffect(() => {
    if (!selectedActionForStages) return;
    let isMounted = true;
    setStageData({ allocations: [], dispatches: [], isLoading: true });

    Promise.all([
      getSaleAllocationRows().catch(() => ({ success: false, data: [] })),
      getPurchaseAllocationRows().catch(() => ({ success: false, data: [] })),
      getDispatchRows().catch(() => ({ success: false, data: [] }))
    ]).then(([saleRes, purRes, dispRes]) => {
      if (!isMounted) return;
      const allAllocations = [
        ...(saleRes.success ? (saleRes.data as any[]) : []),
        ...(purRes.success ? (purRes.data as any[]) : [])
      ];
      const relatedAllocations = allAllocations.filter(a => a.id === selectedActionForStages.id);
      const relatedDispatches = dispRes.success ? (dispRes.data as any[]).filter(d => d.id === selectedActionForStages.id) : [];

      setStageData({
        allocations: relatedAllocations,
        dispatches: relatedDispatches,
        isLoading: false
      });
    });

    return () => { isMounted = false; };
  }, [selectedActionForStages]);
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

  const getPendingStage = (action: ActionEntry): string => {
    if (!action.planned1 || action.planned1.trim() === '') return 'Not Scheduled';
    if (!action.actual1 || action.actual1.trim() === '') return 'L1 Date Pending';
    if (!action.areWeL1 || action.areWeL1.trim() === '') return 'L1 Decision Pending';
    if (action.areWeL1 === 'Yes' && (!action.willPurchase || action.willPurchase.trim() === '')) return 'Purchase Decision Pending';
    if (action.areWeL1 === 'No' && (!action.l1PartyName || action.l1PartyName.trim() === '')) return 'Sale Info Pending';
    
    // Wait until dispatch records are loaded before calculating payment completion
    if (!isDispatchLoaded) return 'Loading...';

    const relatedDispatches = allDispatchRecords.filter(d => d.id === action.id);
    if (relatedDispatches.length === 0) return 'Dispatch Pending';

    const isFullyCompleted = relatedDispatches.every(d => {
      const hasPaymentConf = (d.piPaymentConfirmation && d.piPaymentConfirmation.trim() !== '') || 
                             (d.acPaymentConfirmation && d.acPaymentConfirmation.trim() !== '');
      const hasMakePayment = (d.piMakePayment && d.piMakePayment.trim() !== '') || 
                             (d.acMakePayment && d.acMakePayment.trim() !== '');
      return hasPaymentConf && hasMakePayment;
    });

    if (isFullyCompleted) return 'Completed FMS';
    return 'Payment & Ops Pending';
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

    if (historyTab === 'pending_stages') {
      return getPendingStage(action) !== 'Completed FMS';
    }

    if (historyTab === 'completed_history') {
      return getPendingStage(action) === 'Completed FMS';
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

  // Group items for the special tabs (pending and completed)
  const groupedSpecialItems = React.useMemo(() => {
    if (historyTab !== 'completed_history' && historyTab !== 'pending_stages') return {};
    const groups: Record<string, ActionEntry[]> = {};
    sorted.forEach(action => {
      const comp = action.companyName || 'Unknown Company';
      if (!groups[comp]) groups[comp] = [];
      groups[comp].push(action);
    });
    return groups;
  }, [sorted, historyTab]);

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
    setEditValidity(action.validity || '');
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
      productName: editProduct.trim(),
      location: editLocation.trim(),
      remark: editRemark.trim(),
      validity: editValidity.trim()
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
          <button
            onClick={() => { setHistoryTab('pending_stages'); setCurrentPage(1); }}
            className={`flex-1 md:flex-initial px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              historyTab === 'pending_stages'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Pending Stages ({actions.filter(a => getPendingStage(a) !== 'Completed FMS').length})
          </button>
          <button
            onClick={() => { setHistoryTab('completed_history'); setCurrentPage(1); }}
            className={`flex-1 md:flex-initial px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
              historyTab === 'completed_history'
                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Completed History ({actions.filter(a => getPendingStage(a) === 'Completed FMS').length})
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

      {/* Main Content Area */}
      {historyTab === 'completed_history' || historyTab === 'pending_stages' ? (
        <div className="space-y-6">
          {Object.keys(groupedSpecialItems).length === 0 ? (
            <div className="glass-card rounded-3xl p-16 text-center text-slate-500 dark:text-slate-400 font-medium">
              No transactions found matching your criteria.
            </div>
          ) : (
            Object.entries(groupedSpecialItems).map(([company, items]) => (
              <div key={company} className="glass-card rounded-3xl p-6 md:p-8 space-y-6">
                <h3 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${historyTab === 'completed_history' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  {company}
                  <span className="ml-auto text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-3 py-1 rounded-full">
                    {items.length} Record{items.length !== 1 ? 's' : ''}
                  </span>
                </h3>
                
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {items.map(action => (
                    <div 
                      key={action.id} 
                      onClick={() => setSelectedActionForStages(action)}
                      className={`relative bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-6 hover:shadow-lg transition-all cursor-pointer group ${historyTab === 'completed_history' ? 'hover:border-emerald-500/50' : 'hover:border-amber-500/50'}`}
                    >
                      <div className="absolute top-0 right-0 p-4">
                        {historyTab === 'completed_history' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Pending
                          </span>
                        )}
                      </div>

                      <div className="space-y-5">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{action.timestamp}</span>
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white">{action.productName}</h4>
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
                              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">{action.id}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                              <span>{action.quntity} {action.unit}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {action.location}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white dark:bg-slate-950/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <label className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5 tracking-wider">Planned L1</label>
                            <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{action.planned1 || '-'}</div>
                          </div>
                          <div className="bg-white dark:bg-slate-950/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <label className="text-[9px] uppercase font-bold text-slate-400 block mb-0.5 tracking-wider">Actual L1</label>
                            <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{action.actual1 || '-'}</div>
                          </div>
                        </div>

                        {action.areWeL1 === 'Yes' && (
                          <div className="bg-emerald-50 dark:bg-emerald-500/5 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-500/10">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              <h5 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-widest">Purchased From Another</h5>
                            </div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{action.willPurchase || 'No'}</div>
                          </div>
                        )}

                        {action.areWeL1 === 'No' && (
                          <div className="bg-purple-50 dark:bg-purple-500/5 p-4 rounded-2xl border border-purple-100 dark:border-purple-500/10">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="w-2 h-2 rounded-full bg-purple-500" />
                              <h5 className="text-xs font-bold text-purple-800 dark:text-purple-400 uppercase tracking-widest">L1 Party Assigned</h5>
                            </div>
                            <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{action.l1PartyName || '-'}</div>
                          </div>
                        )}

                        {action.remark && (
                          <div className="bg-slate-100 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700/50">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Remark</span>
                            <p className="text-xs text-slate-600 dark:text-slate-400 italic">{action.remark}</p>
                          </div>
                        )}

                        {historyTab === 'pending_stages' && (
                          <StageTimeline action={action} allDispatchRecords={allDispatchRecords} />
                        )}

                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
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
                {historyTab === 'pending_stages' ? (
                  <th className="py-4 px-6">Pending Stage</th>
                ) : (
                  <th className="py-4 px-6">L1 Confirmation</th>
                )}
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
                      {historyTab === 'pending_stages' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          {getPendingStage(action)}
                        </span>
                      ) : (
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
                        </div>
                      )}
                    </td>
                    <td className="py-4.5 px-6 max-w-xs truncate text-slate-500 dark:text-slate-400 text-xs italic">{action.remark || '-'}</td>
                    <td className="py-4.5 px-6 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setViewingAction(action)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
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

                  {/* Validity */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      Validity
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input
                        type="text"
                        value={editValidity}
                        onChange={(e) => setEditValidity(e.target.value)}
                        placeholder="e.g. 30 Days or Valid till..."
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

      {/* View Details Modal Dialog */}
      <AnimatePresence>
        {viewingAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50 dark:bg-slate-950/20 shrink-0">
                <div className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Transaction Details
                  </h3>
                  <span className="ml-3 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                    {viewingAction.id}
                  </span>
                </div>
                <button
                  onClick={() => setViewingAction(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-all cursor-pointer bg-slate-100 dark:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Company</label>
                    <div className="font-semibold text-slate-900 dark:text-white">{viewingAction.companyName}</div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Product</label>
                    <div className="font-semibold text-slate-900 dark:text-white">{viewingAction.productName}</div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Quantity</label>
                    <div className="font-semibold text-slate-900 dark:text-white">{viewingAction.quntity} {viewingAction.unit}</div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Location</label>
                    <div className="font-semibold text-slate-900 dark:text-white">{viewingAction.location}</div>
                  </div>
                </div>

                {/* FMS Details */}
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> FMS Status
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Created At</label>
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{viewingAction.timestamp || '-'}</div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Planned L1 Date</label>
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{viewingAction.planned1 || '-'}</div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Actual L1 Date</label>
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{viewingAction.actual1 || '-'}</div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Time Delay 1</label>
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{viewingAction.timeDelay1 || '-'}</div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Are We L1?</label>
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{viewingAction.areWeL1 || '-'}</div>
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Remark</label>
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300 italic">{viewingAction.remark || '-'}</div>
                    </div>
                  </div>
                </div>

                {/* Purchase/Sale Details depending on L1 status */}
                {viewingAction.areWeL1 === 'Yes' && (
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Purchase Details
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Purchase Material From Another Party?</label>
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{viewingAction.willPurchase || '-'}</div>
                      </div>
                      <div className="col-span-2">
                         <div className="text-xs text-slate-500 italic mt-4">For detailed supplier allocations, check the Purchase Allocation sheet directly or Dispatch module.</div>
                      </div>
                    </div>
                  </div>
                )}

                {viewingAction.areWeL1 === 'No' && (
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span> Sale Details
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-2 gap-4 border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">L1 Party Name</label>
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{viewingAction.l1PartyName || '-'}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Stage Details Modal */}
      <AnimatePresence>
        {selectedActionForStages && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50 dark:bg-slate-950/20 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white text-lg flex items-center gap-2">
                      Stage-Wise Details
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                        {selectedActionForStages.id}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                      {selectedActionForStages.companyName} • {selectedActionForStages.productName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedActionForStages(null)}
                  className="text-slate-400 hover:text-slate-600 p-2 rounded-xl transition-all cursor-pointer bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30 dark:bg-slate-950/10">
                {stageData.isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    <p className="text-sm font-medium">Fetching dispatch and allocation data...</p>
                  </div>
                ) : (
                  <div className="space-y-8 max-w-3xl mx-auto">
                    
                    {/* Stage 1: FMS */}
                    <div className="relative pl-8 sm:pl-10">
                      <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center z-10">
                        <FileText className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="absolute left-[11px] top-8 bottom-[-24px] w-0.5 bg-slate-200 dark:bg-slate-800 z-0" />
                      
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-3">1. Auction Indent</h4>
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div><label className="text-[10px] text-slate-400 font-bold uppercase block">Quantity</label><span className="text-sm font-semibold dark:text-white">{selectedActionForStages.quntity} {selectedActionForStages.unit}</span></div>
                          <div><label className="text-[10px] text-slate-400 font-bold uppercase block">Location</label><span className="text-sm font-semibold dark:text-white">{selectedActionForStages.location}</span></div>
                          <div><label className="text-[10px] text-slate-400 font-bold uppercase block">Planned L1</label><span className="text-sm font-semibold dark:text-white">{selectedActionForStages.planned1 || '-'}</span></div>
                          <div><label className="text-[10px] text-slate-400 font-bold uppercase block">Actual L1</label><span className="text-sm font-semibold dark:text-white">{selectedActionForStages.actual1 || '-'}</span></div>
                        </div>
                        {selectedActionForStages.areWeL1 === 'Yes' && (
                           <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                             <div className="text-[10px] text-emerald-600 font-bold uppercase mb-1">Purchased From Another</div>
                             <span className="text-sm font-semibold dark:text-white">{selectedActionForStages.willPurchase || 'No'}</span>
                           </div>
                        )}
                        {selectedActionForStages.areWeL1 === 'No' && (
                           <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                             <div className="text-[10px] text-purple-600 font-bold uppercase mb-1">Sale Assigned To L1 Party</div>
                             <span className="text-sm font-semibold dark:text-white">{selectedActionForStages.l1PartyName || '-'}</span>
                           </div>
                        )}
                      </div>
                    </div>

                    {/* Stage 2: Dispatch Planning */}
                    <div className="relative pl-8 sm:pl-10">
                      <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-500/20 border-2 border-indigo-500 flex items-center justify-center z-10">
                        <Layers className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="absolute left-[11px] top-8 bottom-[-24px] w-0.5 bg-slate-200 dark:bg-slate-800 z-0" />
                      
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-3">2. Dispatch</h4>
                      {stageData.allocations.length === 0 ? (
                        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 border-dashed rounded-2xl p-5 text-center text-slate-500 text-sm italic">
                          No allocation data found for this entry.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {stageData.allocations.map((alloc, idx) => {
                            const relatedDispatches = stageData.dispatches.filter(d => (d.allocationId || '').trim().toLowerCase() === (alloc.allocationId || alloc.id).trim().toLowerCase());
                            return (
                            <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                              <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                                <span className="font-bold text-sm dark:text-white">Allocation {idx + 1}</span>
                                <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400 font-mono">{alloc.allocationId || alloc.id}</span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-2">
                                <div><label className="text-[10px] text-slate-400 font-bold uppercase block">Allocated Qty</label><span className="text-sm font-semibold dark:text-white">{alloc.purchaseQuantity || '-'}</span></div>
                                <div><label className="text-[10px] text-slate-400 font-bold uppercase block">Supplier / L1</label><span className="text-sm font-semibold dark:text-white">{alloc.supplierName || '-'}</span></div>
                                <div><label className="text-[10px] text-slate-400 font-bold uppercase block">Rate (Base)</label><span className="text-sm font-semibold dark:text-white">{alloc.purchaseRate || '-'}</span></div>
                              </div>
                              
                              {relatedDispatches.length > 0 && (
                                <div className="mt-4 space-y-3">
                                  {relatedDispatches.map((disp, dIdx) => (
                                    <div key={dIdx} className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                                      <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-2 border-b border-indigo-100 dark:border-indigo-500/20 pb-1 flex items-center justify-between">
                                        <span>Dispatch Update {dIdx + 1}</span>
                                        <span className="font-mono text-[9px] text-slate-400">{disp.dispatchId}</span>
                                      </div>
                                      
                                      {/* Planned Info */}
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                                        <div><label className="text-[9px] text-slate-400 font-bold uppercase block">Planned Qty</label><span className="text-xs font-semibold dark:text-white">{disp.dispatchQuantity || '-'}</span></div>
                                        <div><label className="text-[9px] text-slate-400 font-bold uppercase block">Target Date</label><span className="text-xs font-semibold dark:text-white">{disp.deliveryDateTime || '-'}</span></div>
                                        <div><label className="text-[9px] text-slate-400 font-bold uppercase block">Transporter</label><span className="text-xs font-semibold dark:text-white">{disp.transportation || '-'}</span></div>
                                        <div><label className="text-[9px] text-slate-400 font-bold uppercase block">Rate / From</label><span className="text-xs font-semibold dark:text-white">{disp.rate || '-'} / {disp.materialSuppliedFrom || '-'}</span></div>
                                      </div>

                                      {/* Status Info */}
                                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div><label className="text-[9px] text-indigo-400 font-bold uppercase block">Status</label><span className="text-xs font-semibold dark:text-white">{disp.dispatchStatus || '-'}</span></div>
                                        <div><label className="text-[9px] text-indigo-400 font-bold uppercase block">Actual Qty</label><span className="text-xs font-semibold dark:text-white">{disp.statusDispatchQty || '-'}</span></div>
                                        <div><label className="text-[9px] text-indigo-400 font-bold uppercase block">Actual Date</label><span className="text-xs font-semibold dark:text-white">{disp.statusDispatchDate || '-'}</span></div>
                                        <div><label className="text-[9px] text-indigo-400 font-bold uppercase block">AC Approval</label><span className="text-xs font-semibold dark:text-white">{disp.acDispatchStatus || '-'}</span></div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Stage 3 & 4 & 5 & 6 (Combined Dispatch Record) */}
                    <div className="relative pl-8 sm:pl-10">
                      <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center z-10">
                        <Truck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-3">3. Material Receipt & Accounts</h4>
                      {stageData.dispatches.length === 0 ? (
                        <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 border-dashed rounded-2xl p-5 text-center text-slate-500 text-sm italic">
                          No operational dispatch tracking found yet.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {stageData.dispatches.map((disp, idx) => (
                            <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                               <div className="bg-slate-50 dark:bg-slate-800/40 px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                 <span className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Dispatch Update {idx + 1}</span>
                                 <span className="text-xs font-mono text-slate-400">{disp.dispatchId}</span>
                               </div>
                               <div className="p-4 space-y-5">
                                 
                                 {/* Status is now moved to Stage 2 */}

                                 {/* Material Receipt */}
                                 <div>
                                    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 border-b border-slate-100 dark:border-slate-800 pb-1 flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500"/> Material Receipt</h5>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                      <div><label className="text-[10px] text-slate-400 font-bold uppercase block">PL Receipt</label><span className="text-sm font-semibold dark:text-white">{disp.plReceiptMaterial || '-'}</span></div>
                                      <div><label className="text-[10px] text-slate-400 font-bold uppercase block">AC Receipt</label><span className="text-sm font-semibold dark:text-white">{disp.acReceiptMaterial || '-'}</span></div>
                                      <div><label className="text-[10px] text-slate-400 font-bold uppercase block">Shortage Qty</label><span className="text-sm font-semibold text-rose-500">{disp.shortageQty || '-'}</span></div>
                                    </div>
                                 </div>

                                 {/* Credit Note */}
                                 {(disp.plCreditNote || disp.acCreditNote) && (
                                   <div>
                                      <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 border-b border-slate-100 dark:border-slate-800 pb-1 flex items-center gap-1.5"><Receipt className="w-3 h-3 text-rose-500"/> Credit Note</h5>
                                      <div className="grid grid-cols-2 gap-3">
                                        <div><label className="text-[10px] text-slate-400 font-bold uppercase block">PI Credit Note</label><span className="text-sm font-semibold dark:text-white">{disp.plCreditNote || '-'}</span></div>
                                        <div><label className="text-[10px] text-slate-400 font-bold uppercase block">AC Credit Note</label><span className="text-sm font-semibold dark:text-white">{disp.acCreditNote || '-'}</span></div>
                                      </div>
                                   </div>
                                 )}

                                 {/* Payment */}
                                 <div>
                                    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 border-b border-slate-100 dark:border-slate-800 pb-1 flex items-center gap-1.5"><Banknote className="w-3 h-3 text-emerald-600"/> Payment Info</h5>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div><label className="text-[10px] text-slate-400 font-bold uppercase block">PI Payment Conf.</label><span className="text-sm font-semibold dark:text-white">{disp.piPaymentConfirmation || '-'}</span></div>
                                      <div><label className="text-[10px] text-slate-400 font-bold uppercase block">AC Payment Conf.</label><span className="text-sm font-semibold dark:text-white">{disp.acPaymentConfirmation || '-'}</span></div>
                                      <div><label className="text-[10px] text-slate-400 font-bold uppercase block">PI Make Payment</label><span className="text-sm font-semibold dark:text-white">{disp.piMakePayment || '-'}</span></div>
                                      <div><label className="text-[10px] text-slate-400 font-bold uppercase block">AC Make Payment</label><span className="text-sm font-semibold dark:text-white">{disp.acMakePayment || '-'}</span></div>
                                    </div>
                                 </div>

                               </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
