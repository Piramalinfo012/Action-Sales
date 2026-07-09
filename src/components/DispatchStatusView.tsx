import { useState, useEffect, FormEvent } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  Search,
  RefreshCw,
  X,
  Box,
  Building2,
  Calendar,
  Package,
  Loader2,
  ClipboardList,
  CheckCircle,
  FileText
} from 'lucide-react';
import { getDispatchRows, DispatchRecord, updateDispatchStatusInSheet } from '../api';

interface DispatchStatusViewProps {
  onAddToast?: (type: any, title: string, desc: string) => void;
}

export default function DispatchStatusView({ onAddToast }: DispatchStatusViewProps) {
  const [rows, setRows] = useState<DispatchRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal state
  const [editingRow, setEditingRow] = useState<DispatchRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fields, setFields] = useState({
    acDispatchStatus: '',
    statusTimeDelay1: '',
    dispatchStatus: '',
    statusDispatchQty: '',
    statusDispatchDate: '',
    invoiceVendor: '',
    taxInvoiceWayBill: ''
  });

  const loadRows = async (notify = false, silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await getDispatchRows();
      if (res.success) {
        setRows(res.data);
        if (notify && onAddToast) onAddToast('success', 'Refreshed', 'Dispatch status list synced with sheet.');
      } else {
        if (onAddToast) onAddToast('error', 'Load Failed', res.error || 'Could not read Dispatch sheet.');
      }
    } catch (err: any) {
      if (!silent && onAddToast) onAddToast('error', 'Network Error', err.message || 'Failed to load dispatch data.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
    const refresh = () => {
      if (document.visibilityState === 'visible') loadRows(false, true);
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const intervalId = window.setInterval(refresh, 20000);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openUpdate = (row: DispatchRecord) => {
    setEditingRow(row);
    setFields({
      acDispatchStatus: row.acDispatchStatus || '',
      statusTimeDelay1: row.statusTimeDelay1 || '',
      dispatchStatus: row.dispatchStatus || '',
      statusDispatchQty: row.statusDispatchQty || '',
      statusDispatchDate: row.statusDispatchDate || '',
      invoiceVendor: row.invoiceVendor || '',
      taxInvoiceWayBill: row.taxInvoiceWayBill || ''
    });
  };

  // Convert "YYYY-MM-DD" back to "DD/MM/YYYY" before saving
  const formatDateForSave = (dateStr: string) => {
    if (!dateStr) return '';
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return `${match[3]}/${match[2]}/${match[1]}`;
    return dateStr;
  };
  
  // For datetime picker, it wants YYYY-MM-DD
  const parseDateForInput = (dateStr: string) => {
    if (!dateStr) return '';
    const match = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
    return dateStr;
  };

  const formatDateTime = (val: string) => {
    if (!val || val === '—') return '—';
    try {
      const match = val.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
      if (match) {
        return `${match[3]}/${match[2]}/${match[1]} ${match[4]}:${match[5]}`;
      }
      return val;
    } catch {
      return val;
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingRow) return;
    setIsSaving(true);

    const payload = {
      ...fields,
      statusDispatchDate: formatDateForSave(fields.statusDispatchDate)
    };

    const res = await updateDispatchStatusInSheet(editingRow.rowIndex, payload);
    setIsSaving(false);

    if (!res.success) {
      if (onAddToast) onAddToast('error', 'Update Failed', res.error || 'Could not save status.');
      return;
    }

    if (onAddToast) onAddToast('success', 'Status Updated', 'Dispatch status saved successfully.');
    setEditingRow(null);
    loadRows(false, true);
  };

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return (
      (r.companyName || '').toLowerCase().includes(q) ||
      (r.id || '').toLowerCase().includes(q) ||
      (r.productName || '').toLowerCase().includes(q)
    );
  });

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
              <Activity className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Dispatch Status
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium max-w-md">
                Monitor the real-time status and delivery updates of dispatched orders.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
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
              Dispatch Items
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/15 px-2 py-0.5 rounded-full">
                {rows.length} record{rows.length !== 1 ? 's' : ''}
              </span>
            </h3>
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
              Update the status and details of dispatched orders.
            </p>
          </div>

          <div className="w-full md:w-64 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by company or product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none font-medium transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto -mx-6 md:-mx-8">
          <div className="inline-block min-w-full align-middle px-6 md:px-8">
            <div className="overflow-hidden border border-slate-100 dark:border-slate-800/80 rounded-2xl">
              <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                <thead className="bg-gradient-to-b from-slate-50 to-slate-100/40 dark:from-slate-900/70 dark:to-slate-900/40">
                  <tr>
                    {[
                      'Company & Product', 
                      'Order IDs', 
                      'AC Dispatch', 
                      'Dispatch QTY', 
                      'Delivery Date Time',
                      'Rate',
                      'Material From',
                      'Transportation',
                      'Rs / Ltr',
                      'Remark',
                      'Current Status', 
                      'Action'
                    ].map((h, i) => (
                      <th
                        key={h}
                        className={`px-4 py-3.5 text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest ${i === 11 ? 'text-right' : 'text-left'}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {isLoading ? (
                    <tr>
                      <td colSpan={12} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3 text-slate-400">
                          <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
                          <p className="text-xs font-semibold">Loading status data…</p>
                        </div>
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-400">
                            <ClipboardList className="w-7 h-7" />
                          </div>
                          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium max-w-xs">
                            No active dispatch records found.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => (
                      <tr key={r.rowIndex} className="group hover:bg-indigo-50/40 dark:hover:bg-slate-800/30 transition-colors">
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
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1.5">
                            {r.id && (
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 w-10">IND</span>
                                <span className="text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700/50">{r.id}</span>
                              </div>
                            )}
                            {r.allocationId && (
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 w-10">Alloc</span>
                                <span className="text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700/50">{r.allocationId}</span>
                              </div>
                            )}
                            {r.dispatchId && (
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400 w-10">Disp</span>
                                <span className="text-[11px] font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/20">{r.dispatchId}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {r.timestamp || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            {r.dispatchQuantity || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {r.deliveryDateTime && r.deliveryDateTime !== '—' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/20 shadow-sm">
                              <Calendar className="w-3.5 h-3.5 text-amber-500" />
                              {formatDateTime(r.deliveryDateTime)}
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {r.rate || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {r.materialSuppliedFrom || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {r.transportation || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {r.rupeesPerLtr || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-4 max-w-[150px] truncate" title={r.dispatchRemark}>
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {r.dispatchRemark || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {r.dispatchStatus ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                              {r.dispatchStatus}
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-400 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-full">
                              Pending Status
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => openUpdate(r)}
                            className="px-3.5 py-1.5 bg-white dark:bg-slate-800/80 hover:bg-indigo-600 dark:hover:bg-indigo-600 text-slate-700 dark:text-slate-200 hover:text-white dark:hover:text-white text-[11px] font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-600 shadow-sm hover:shadow-md hover:shadow-indigo-600/20 transition-all flex items-center gap-1.5 ml-auto cursor-pointer group/btn"
                          >
                            <Activity className="w-3.5 h-3.5 text-indigo-500 group-hover/btn:text-white transition-colors" />
                            <span>Update Status</span>
                          </button>
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

      {/* Update Modal */}
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
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">Update Dispatch Status</h3>
                  <p className="text-[11px] text-slate-400 font-semibold flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{editingRow.companyName || editingRow.id}</span>
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

            {/* Planned Details Context */}
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 md:p-5 border border-slate-100 dark:border-slate-800">
              <h4 className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-3">Planned Details</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3.5 gap-x-4 text-xs">
                <div>
                  <span className="block text-[10px] font-semibold text-slate-400 mb-0.5">Delivery Date & Time</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-500/20">{formatDateTime(editingRow.deliveryDateTime)}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold text-slate-400 mb-0.5">Rate</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{editingRow.rate || '—'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold text-slate-400 mb-0.5">Material From</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{editingRow.materialSuppliedFrom || '—'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold text-slate-400 mb-0.5">Transportation</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{editingRow.transportation || '—'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold text-slate-400 mb-0.5">Rupees / Ltr</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{editingRow.rupeesPerLtr || '—'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold text-slate-400 mb-0.5">Planning Remark</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{editingRow.dispatchRemark || '—'}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* AC Dispatch Status */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">AC Dispatch Status</label>
                  <input
                    type="text"
                    value={fields.acDispatchStatus}
                    onChange={(e) => setFields({ ...fields, acDispatchStatus: e.target.value })}
                    placeholder="e.g. Dispatched, Arrived..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold transition-all"
                  />
                </div>

                {/* Time Delay1 */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Time Delay1</label>
                  <input
                    type="text"
                    value={fields.statusTimeDelay1}
                    onChange={(e) => setFields({ ...fields, statusTimeDelay1: e.target.value })}
                    placeholder="e.g. 2 Hrs, None..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold transition-all"
                  />
                </div>

                {/* Dispatch Status */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Dispatch Status</label>
                  <input
                    type="text"
                    value={fields.dispatchStatus}
                    onChange={(e) => setFields({ ...fields, dispatchStatus: e.target.value })}
                    placeholder="e.g. In Transit, Delivered..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold transition-all"
                  />
                </div>

                {/* Dispatch QTY */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Dispatch QTY</label>
                  <div className="relative">
                    <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      value={fields.statusDispatchQty}
                      onChange={(e) => setFields({ ...fields, statusDispatchQty: e.target.value })}
                      placeholder="e.g. 4500"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold transition-all"
                    />
                  </div>
                </div>

                {/* Dispatch Date */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Dispatch Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="date"
                      value={parseDateForInput(fields.statusDispatchDate)}
                      onChange={(e) => setFields({ ...fields, statusDispatchDate: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Uploads */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Upload Invoice Recievd From Vender</label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      value={fields.invoiceVendor}
                      onChange={(e) => setFields({ ...fields, invoiceVendor: e.target.value })}
                      placeholder="Enter drive link or file name..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold transition-all"
                    />
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Uplaod Tax Invoice With way Bill</label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      value={fields.taxInvoiceWayBill}
                      onChange={(e) => setFields({ ...fields, taxInvoiceWayBill: e.target.value })}
                      placeholder="Enter drive link or file name..."
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingRow(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/15 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Save Status</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
