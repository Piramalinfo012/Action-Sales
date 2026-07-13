import { useState, useEffect, FormEvent } from 'react';
import { motion } from 'motion/react';
import {
  Truck,
  Search,
  RefreshCw,
  Save,
  X,
  Box,
  MapPin,
  Building2,
  Calendar,
  Package,
  IndianRupee,
  Loader2,
  ClipboardList,
  ChevronDown
} from 'lucide-react';
import {
  getPurchaseAllocationRows,
  getSaleAllocationRows,
  getDispatchRows,
  saveDispatchRecord,
  getMaterialSourcesFromMaster,
  AllocationRow,
  DispatchFields,
  DispatchRecord
} from '../api';

// A queue row = an allocation plus its aggregated dispatch progress.
interface DispatchQueueRow extends AllocationRow {
  targetQty: number;      // total qty to dispatch for this allocation (purchase qty)
  dispatchedQty: number;  // sum of all dispatches so far
  pendingQty: number;     // remaining to dispatch
  dispatchCount: number;  // number of dispatch parts done
  lastMaterial: string;
  lastTransportation: string;
  lastRupees: string;
  lastRate: string;
}

type DispatchStatus = 'pending' | 'partial' | 'completed';

interface DispatchPlanningViewProps {
  onAddToast: (type: any, title: string, desc: string) => void;
}

const emptyFields: DispatchFields = {
  acDispatch: '',
  dispatchQuantity: '',
  deliveryDateTime: '',
  rateProfiled: '',
  materialSuppliedFrom: '',
  transportation: '',
  rupeesPerLtr: '',
  dispatchRemark: ''
};

// Today's date as DD/MM/YYYY (used to stamp the AC Dispatch date on save).
const todayDDMMYYYY = (): string => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

// Format any stored delivery value to DD/MM/YYYY (with HH:MM if a time is present).
// Handles values that are already DD/MM/YYYY, plain ISO, or ISO-UTC returned by
// Google Sheets (which we convert back to local time so the shown time matches input).
const formatDeliveryDDMMYYYY = (value: string): string => {
  if (!value) return '';
  const s = String(value).trim();

  // Already DD/MM/YYYY (optionally with time)
  const dm = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (dm) {
    const dd = dm[1].padStart(2, '0'), mo = dm[2].padStart(2, '0'), y = dm[3];
    return dm[4] ? `${dd}/${mo}/${y} ${dm[4].padStart(2, '0')}:${dm[5]}` : `${dd}/${mo}/${y}`;
  }

  // ISO / datetime — use LOCAL components (reverses Google's UTC serialization)
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const y = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return (hh === '00' && mi === '00') ? `${dd}/${mo}/${y}` : `${dd}/${mo}/${y} ${hh}:${mi}`;
  }
  return s;
};

// Convert a stored value into the "YYYY-MM-DDTHH:MM" format the datetime-local input needs.
const toDatetimeLocal = (value: string): string => {
  if (!value) return '';
  const s = String(value).trim();

  // DD/MM/YYYY [HH:MM]
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (m) {
    const dd = m[1].padStart(2, '0'), mo = m[2].padStart(2, '0'), y = m[3];
    const hh = (m[4] || '00').padStart(2, '0'), mi = m[5] || '00';
    return `${y}-${mo}-${dd}T${hh}:${mi}`;
  }

  // ISO — use LOCAL components
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${mo}-${dd}T${hh}:${mi}`;
  }
  return '';
};

// Convert a datetime-local value ("YYYY-MM-DDTHH:MM") to a DD/MM/YYYY HH:MM string
// so the value stored in the sheet reads in the same DD/MM/YYYY format as everywhere else.
const datetimeLocalToDDMM = (value: string): string => {
  if (!value) return '';
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (m) {
    return m[4] ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : `${m[3]}/${m[2]}/${m[1]}`;
  }
  return value;
};

export default function DispatchPlanningView({ onAddToast }: DispatchPlanningViewProps) {
  const [rows, setRows] = useState<DispatchQueueRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'completed' | 'all'>('active');

  // Update modal state
  const [editingRow, setEditingRow] = useState<DispatchQueueRow | null>(null);
  const [fields, setFields] = useState<DispatchFields>(emptyFields);
  const [isSaving, setIsSaving] = useState(false);

  // "Material To Be supplied From" dropdown options (Master sheet column A2:A)
  const [materialSources, setMaterialSources] = useState<string[]>([]);

  const loadRows = async (notify = false, silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      // Candidates come from Purchase Allocation; saved dispatch data lives in the
      // 'Dispatch' sheet. Merge the two by Allocation ID.
      const [allocRes, saleRes, dispRes] = await Promise.all([getPurchaseAllocationRows(), getSaleAllocationRows(), getDispatchRows()]);
      if (allocRes.success || saleRes.success) {
        // Group ALL dispatch records by allocation (an order can be dispatched in parts).
        const byAlloc = new Map<string, DispatchRecord[]>();
        dispRes.data.forEach((d) => {
          const k = (d.allocationId || '').trim().toLowerCase();
          if (!k) return;
          if (!byAlloc.has(k)) byAlloc.set(k, []);
          byAlloc.get(k)!.push(d);
        });

        const allAllocations = [...(allocRes.data || []), ...(saleRes.data || [])];
        const merged: DispatchQueueRow[] = allAllocations.map((a) => {
          const recs = byAlloc.get((a.allocationId || '').trim().toLowerCase()) || [];
          const dispatchedQty = recs.reduce((s, r) => s + (parseFloat(r.dispatchQuantity) || 0), 0);
          const targetQty = parseFloat(a.purchaseQuantity) || 0;
          const pendingQty = targetQty > 0 ? Math.max(0, targetQty - dispatchedQty) : 0;
          const last = recs[recs.length - 1];
          return {
            ...a,
            acDispatch: last ? last.timestamp : '',
            dispatchQuantity: last ? last.dispatchQuantity : '',
            deliveryDateTime: last ? last.deliveryDateTime : '',
            rateProfiled: last ? last.rate : '',
            materialSuppliedFrom: last ? last.materialSuppliedFrom : '',
            transportation: last ? last.transportation : '',
            rupeesPerLtr: last ? last.rupeesPerLtr : '',
            dispatchRemark: last ? last.dispatchRemark : '',
            targetQty,
            dispatchedQty,
            pendingQty,
            dispatchCount: recs.length,
            lastMaterial: last ? last.materialSuppliedFrom : '',
            lastTransportation: last ? last.transportation : '',
            lastRupees: last ? last.rupeesPerLtr : '',
            lastRate: last ? last.rate : ''
          };
        });

        setRows(merged);
        if (notify) onAddToast('success', 'Refreshed', 'Dispatch planning list synced with sheet.');
      } else {
        onAddToast('error', 'Load Failed', allocRes.error || saleRes.error || 'Could not read Allocation sheets.');
      }
    } catch (err: any) {
      if (!silent) onAddToast('error', 'Network Error', err.message || 'Failed to load dispatch data.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Auto-refresh: re-read the Dispatch/Allocation sheets when the tab regains
  // focus and on a short interval, so edits made directly in the sheet (adds or
  // removals) show up here without needing the manual Refresh button.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') loadRows(false, true);
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const intervalId = window.setInterval(refresh, 20000); // every 20s
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadRows();
    // Load the material-source options from the Master sheet (column A2:A).
    getMaterialSourcesFromMaster()
      .then((res) => {
        if (res.success) setMaterialSources(res.data);
      })
      .catch(() => { /* keep dropdown empty on failure */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build a fresh form for the next (partial) dispatch of a row.
  const buildFields = (row: DispatchQueueRow): DispatchFields => ({
    acDispatch: '',
    // Default the dispatch quantity to whatever is still pending.
    dispatchQuantity: row.pendingQty > 0 ? String(row.pendingQty) : '',
    deliveryDateTime: '',
    rateProfiled: row.lastRate || row.purchaseRate || '',
    materialSuppliedFrom: row.lastMaterial || '',
    transportation: row.lastTransportation || '',
    // Rupies/ltr only applies to Own Transport(PPPL); don't carry it otherwise.
    rupeesPerLtr: (row.isSale ? row.lastTransportation === 'Vender Transport' : row.lastTransportation === 'Own Transport(PPPL)') ? (row.lastRupees || '') : '',
    dispatchRemark: ''
  });

  const openUpdate = (row: DispatchQueueRow) => {
    setEditingRow(row);
    setFields(buildFields(row));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingRow) return;
    setIsSaving(true);
    const payload: DispatchFields = {
      ...fields,
      acDispatch: todayDDMMYYYY(),
      deliveryDateTime: datetimeLocalToDDMM(fields.deliveryDateTime),
      // Rupies/ltr is only valid for Own Transport(PPPL) — never store it otherwise.
      rupeesPerLtr: (editingRow.isSale ? fields.transportation === 'Vender Transport' : fields.transportation === 'Own Transport(PPPL)') ? fields.rupeesPerLtr : ''
    };
    const res = await saveDispatchRecord(editingRow, payload);
    setIsSaving(false);

    if (!res.success) {
      onAddToast('error', 'Update Failed', res.error || 'Could not save dispatch plan.');
      return;
    }

    const justDispatched = parseFloat(payload.dispatchQuantity) || 0;
    const newDispatched = editingRow.dispatchedQty + justDispatched;
    const newPending = editingRow.targetQty > 0 ? Math.max(0, editingRow.targetQty - newDispatched) : 0;

    loadRows(false, true); // refresh the queue in the background

    if (editingRow.targetQty > 0 && newPending <= 0) {
      // Fully dispatched — order is complete and moves out of the active queue.
      onAddToast('success', 'Dispatch Complete', `${editingRow.companyName || editingRow.id} fully dispatched.`);
      setEditingRow(null);
    } else {
      // Reset the form for the next partial dispatch and keep the modal open.
      onAddToast('success', 'Dispatch Saved', `Dispatched ${justDispatched}. Pending: ${newPending}.`);
      const updated: DispatchQueueRow = {
        ...editingRow,
        dispatchedQty: newDispatched,
        pendingQty: newPending,
        dispatchCount: editingRow.dispatchCount + 1,
        lastRate: payload.rateProfiled,
        lastMaterial: payload.materialSuppliedFrom,
        lastTransportation: payload.transportation,
        lastRupees: payload.rupeesPerLtr
      };
      setEditingRow(updated);
      setFields(buildFields(updated));
    }
  };

  const rowStatus = (r: DispatchQueueRow): DispatchStatus => {
    if (r.targetQty > 0 && r.dispatchedQty > 0 && r.pendingQty <= 0) return 'completed';
    if (r.dispatchedQty > 0) return 'partial';
    return 'pending';
  };

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch =
      (r.companyName || '').toLowerCase().includes(q) ||
      (r.id || '').toLowerCase().includes(q) ||
      (r.productName || '').toLowerCase().includes(q) ||
      (r.supplierName || '').toLowerCase().includes(q) ||
      (r.location || '').toLowerCase().includes(q);
    const status = rowStatus(r);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'completed' ? status === 'completed' : status !== 'completed');
    return matchesSearch && matchesStatus;
  });

  const activeCount = rows.filter((r) => rowStatus(r) !== 'completed').length;
  const completedCount = rows.filter((r) => rowStatus(r) === 'completed').length;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl border border-slate-200/70 dark:border-slate-800/80 bg-gradient-to-br from-white via-slate-50 to-indigo-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20 p-6 md:p-7"
      >
        <div aria-hidden className="absolute -right-10 -top-14 w-52 h-52 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/25 shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Dispatch Planning
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium max-w-md">
                Orders that cleared the L1 Confirmation stage. Plan their dispatch — delivery time, rate, transportation and more.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <div className="flex items-center gap-2 bg-white/70 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800 rounded-xl px-3 py-2 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                <div className="leading-none">
                  <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{rows.length}</span>
                  <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">Total</span>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white/70 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800 rounded-xl px-3 py-2 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <div className="leading-none">
                  <span className="text-sm font-black text-amber-600 dark:text-amber-400">{activeCount}</span>
                  <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">Active</span>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white/70 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800 rounded-xl px-3 py-2 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <div className="leading-none">
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{completedCount}</span>
                  <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">Completed</span>
                </div>
              </div>
            </div>

            <motion.button
              onClick={() => loadRows(true)}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* List card */}
      <div className="glass-card rounded-3xl p-6 md:p-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              Dispatch Queue
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/15 px-2 py-0.5 rounded-full">
                {rows.length} record{rows.length !== 1 ? 's' : ''}
              </span>
            </h3>
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
              Select any record to update its dispatch planning details.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {/* Status filter — active (pending/partial) vs completed */}
            <div className="flex bg-slate-100 dark:bg-slate-800/70 rounded-xl p-0.5 border border-slate-200/60 dark:border-slate-700/50 shrink-0">
              {([
                { key: 'active', label: 'Active', count: activeCount },
                { key: 'completed', label: 'Completed', count: completedCount },
                { key: 'all', label: 'All', count: rows.length }
              ] as const).map((opt) => {
                const active = statusFilter === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setStatusFilter(opt.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      active
                        ? 'bg-white dark:bg-slate-900 shadow-sm text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${active ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-slate-200/70 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400'}`}>
                      {opt.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="w-full md:w-64 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by company, product, supplier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none font-medium transition-all"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto -mx-6 md:-mx-8">
          <div className="inline-block min-w-full align-middle px-6 md:px-8">
            <div className="overflow-hidden border border-slate-100 dark:border-slate-800/80 rounded-2xl">
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
          .responsive-mobile-table td:nth-of-type(1)::before { content: "h"; }
        }
      `}</style>
<table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 responsive-mobile-table">
                <thead className="bg-gradient-to-b from-slate-50 to-slate-100/40 dark:from-slate-900/70 dark:to-slate-900/40">
                  <tr>
                    {['Company & Product', 'Supplier / L1 Party', 'Qty', 'Delivery', 'Status', 'Dispatch'].map((h, i) => (
                      <th
                        key={h}
                        className={`px-4 py-3.5 text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest ${i === 5 ? 'text-right' : 'text-left'}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3 text-slate-400">
                          <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
                          <p className="text-xs font-semibold">Loading dispatch queue…</p>
                        </div>
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-400">
                            <ClipboardList className="w-7 h-7" />
                          </div>
                          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium max-w-xs">
                            No dispatch records yet. Complete an L1 Confirmation with a supplier allocation and it will appear here.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => (
                      <tr key={r.rowIndex} className={`group transition-colors ${r.isSale ? "bg-amber-50/20 hover:bg-amber-100/40 dark:bg-amber-900/10 dark:hover:bg-amber-900/20" : "hover:bg-indigo-50/40 dark:hover:bg-slate-800/30"}`}>
                        {/* Company / Product */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2.5 max-w-xs">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/15 to-violet-500/15 border border-indigo-500/10 flex items-center justify-center text-[11px] font-black text-indigo-600 dark:text-indigo-400 shrink-0 uppercase">
                              {(r.companyName || '?').trim().charAt(0)}
                            </div>
                            <div className="space-y-0.5 min-w-0">
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                {r.companyName || r.id}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate flex items-center gap-1 font-medium">
                                <Box className="w-3 h-3 shrink-0" />
                                <span>{r.productName || '—'}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        {/* Supplier */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">{r.supplierName || '—'}</div>
                            {r.isSale && (
                              <span className="text-[9px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full uppercase tracking-wider">L1</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">{r.allocationId}</div>
                        </td>
                        {/* Purchase Qty + dispatch progress */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{r.purchaseQuantity || '—'}</span>
                          {r.targetQty > 0 && (
                            <div className="mt-1 space-y-1">
                              <div className="flex items-center gap-2 text-[10px] font-bold">
                                <span className="text-emerald-600 dark:text-emerald-400">▲ {r.dispatchedQty.toLocaleString()}</span>
                                <span className={r.pendingQty > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}>
                                  ⏳ {r.pendingQty.toLocaleString()}
                                </span>
                              </div>
                              <div className="w-24 h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${r.pendingQty <= 0 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                  style={{ width: `${Math.min(100, (r.dispatchedQty / r.targetQty) * 100)}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </td>
                        {/* Delivery */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                            {r.deliveryDateTime ? (
                              <>
                                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                {formatDeliveryDDMMYYYY(r.deliveryDateTime)}
                              </>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </span>
                          {r.acDispatch && (
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                              AC: {formatDeliveryDDMMYYYY(r.acDispatch)}
                            </div>
                          )}
                        </td>
                        {/* Status */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          {(() => {
                            const st = rowStatus(r);
                            if (st === 'completed') {
                              return (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Completed
                                </span>
                              );
                            }
                            if (st === 'partial') {
                              return (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                  Partial ({r.dispatchCount})
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                Pending
                              </span>
                            );
                          })()}
                        </td>
                        {/* Update — hidden for completed (history) rows */}
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          {rowStatus(r) !== 'completed' ? (
                            <button
                              onClick={() => openUpdate(r)}
                              className="px-3.5 py-1.5 bg-white dark:bg-slate-800/80 hover:bg-indigo-600 dark:hover:bg-indigo-600 text-slate-700 dark:text-slate-200 hover:text-white dark:hover:text-white text-[11px] font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-600 shadow-sm hover:shadow-md hover:shadow-indigo-600/20 transition-all flex items-center gap-1.5 ml-auto cursor-pointer group/btn"
                            >
                              <Truck className="w-3.5 h-3.5 text-indigo-500 group-hover/btn:text-white transition-colors" />
                              <span>Update Dispatch</span>
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Update Dispatch Modal */}
      {editingRow && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setEditingRow(null)}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl max-w-2xl w-full shadow-2xl p-6 sm:p-8 overflow-y-auto max-h-[90vh] z-10 space-y-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/25 shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">Update Dispatch Planning</h3>
                  <p className="text-[11px] text-slate-400 font-semibold flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{editingRow.companyName || editingRow.id}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{editingRow.location || '—'}</span>
                    {editingRow.supplierName && <span className="text-indigo-500 font-bold">{editingRow.supplierName}</span>}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingRow(null)}
                className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Allocation / dispatch progress banner */}
            {editingRow.targetQty > 0 && (
              <div className="flex items-center justify-between gap-3 bg-indigo-500/5 border border-indigo-500/15 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-4 text-[11px] font-bold">
                  <span className="text-slate-500 dark:text-slate-400">Order: <span className="text-slate-800 dark:text-slate-200">{editingRow.targetQty.toLocaleString()}</span></span>
                  <span className="text-emerald-600 dark:text-emerald-400">Dispatched: {editingRow.dispatchedQty.toLocaleString()}</span>
                  <span className="text-amber-600 dark:text-amber-400">Pending: {editingRow.pendingQty.toLocaleString()}</span>
                </div>
                {editingRow.dispatchCount > 0 && (
                  <span className="text-[10px] font-bold text-slate-400">Part {editingRow.dispatchCount + 1}</span>
                )}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Quantity (this dispatch) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1">
                    Dispatch Quantity {editingRow.targetQty > 0 && <span className="text-amber-500 normal-case">(pending {editingRow.pendingQty.toLocaleString()})</span>}
                  </label>
                  <div className="relative">
                    <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      value={fields.dispatchQuantity}
                      onChange={(e) => setFields({ ...fields, dispatchQuantity: e.target.value })}
                      placeholder="e.g. 4500"
                      className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 shadow-sm rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold transition-all"
                    />
                  </div>
                </div>

                {/* Delivery Date Time */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1">Delievrt Date Time</label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="datetime-local"
                      value={fields.deliveryDateTime}
                      onChange={(e) => setFields({ ...fields, deliveryDateTime: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 shadow-sm rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold transition-all"
                    />
                  </div>
                </div>

                {/* Rate-Profiled */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1">Rate-Prifiled</label>
                  <input
                    type="text"
                    value={fields.rateProfiled}
                    onChange={(e) => setFields({ ...fields, rateProfiled: e.target.value })}
                    placeholder="e.g. 92.50"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 shadow-sm rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold transition-all"
                  />
                </div>

                {/* Material To Be supplied From — dropdown from Master sheet (A2:A) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1">Matreial To Be supplied From</label>
                  <div className="relative">
                    <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                    <select
                      value={fields.materialSuppliedFrom}
                      onChange={(e) => setFields({ ...fields, materialSuppliedFrom: e.target.value })}
                      className="w-full pl-10 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 shadow-sm rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Select source…</option>
                      {/* Keep a previously-saved value even if it's no longer in the Master list */}
                      {fields.materialSuppliedFrom && !materialSources.includes(fields.materialSuppliedFrom) && (
                        <option value={fields.materialSuppliedFrom}>{fields.materialSuppliedFrom}</option>
                      )}
                      {materialSources.map((src) => (
                        <option key={src} value={src}>{src}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                  </div>
                </div>

                {/* Transportation — dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1">Transportation</label>
                  <div className="relative">
                    <Truck className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                    <select
                      value={fields.transportation}
                      onChange={(e) => {
                        const t = e.target.value;
                        // Clear Rupies/ltr whenever transport isn't Own Transport(PPPL).
                        setFields((prev) => ({
                          ...prev,
                          transportation: t,
                          rupeesPerLtr: (editingRow.isSale ? t === 'Vender Transport' : t === 'Own Transport(PPPL)') ? prev.rupeesPerLtr : ''
                        }));
                      }}
                      className="w-full pl-10 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 shadow-sm rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Select transport…</option>
                      <option value="Own Transport(PPPL)">Own Transport(PPPL)</option>
                      <option value="Vender Transport">Vender Transport</option>
                      <option value="Other transport">Other transport</option>
                      {/* Keep a previously-saved custom value if present */}
                      {fields.transportation &&
                        !['Own Transport(PPPL)', 'Vender Transport', 'Other transport'].includes(fields.transportation) && (
                          <option value={fields.transportation}>{fields.transportation}</option>
                        )}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Rupies / ltr — only for Own Transport(PPPL); preset dropdown + free input */}
              {(editingRow.isSale ? fields.transportation === 'Vender Transport' : fields.transportation === 'Own Transport(PPPL)') && (
                <div className="space-y-1.5 bg-indigo-500/5 border border-indigo-500/15 rounded-2xl p-3.5">
                  <label className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">Rupies / ltr</label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      list="rupees-per-ltr-presets"
                      value={fields.rupeesPerLtr}
                      onChange={(e) => setFields({ ...fields, rupeesPerLtr: e.target.value })}
                      placeholder="Select a preset or enter a rate"
                      className="w-full pl-10 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold transition-all"
                    />
                    <datalist id="rupees-per-ltr-presets">
                      <option value="10000">10 KL</option>
                      <option value="20000">20 KL</option>
                      <option value="25000">25 KL</option>
                      <option value="40000">40 KL</option>
                    </datalist>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                  </div>
                  {/* Preset reference + note */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {[['10 KL', '10000'], ['20 KL', '20000'], ['25 KL', '25000'], ['40 KL', '40000']].map(([kl, val]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFields({ ...fields, rupeesPerLtr: val })}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer"
                      >
                        {kl} = {val}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                    Note: These rates are applicable only for the East Cluster.
                  </p>
                </div>
              )}

              {/* Remark */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1">Remark</label>
                <textarea
                  rows={2}
                  value={fields.dispatchRemark}
                  onChange={(e) => setFields({ ...fields, dispatchRemark: e.target.value })}
                  placeholder="Any dispatch notes..."
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 shadow-sm rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold transition-all resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingRow(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  {editingRow.dispatchCount > 0 ? 'Done' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/15 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{isSaving ? 'Saving...' : 'Save Dispatch'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
