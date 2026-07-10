import { useState, useEffect, FormEvent } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle,
  Search,
  RefreshCw,
  X,
  Calendar,
  Loader2,
  FileText,
  Save
} from 'lucide-react';
import { getDispatchRows, DispatchRecord, updatePaymentConfirmationInSheet, API_URL } from '../api';

const RECEIPT_FOLDER_ID = '1HBi8BusMyDY_lQ1b7iJEJQvcuqayThu_';
type UploadKey = 'uploadReceivedOfPayment';

interface PaymentConfirmViewProps {
  onAddToast?: (type: any, title: string, desc: string) => void;
}

export default function PaymentConfirmView({ onAddToast }: PaymentConfirmViewProps) {
  const [rows, setRows] = useState<DispatchRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  // Active = payment not yet confirmed; History = AC Payment Confirmation set.
  const [viewFilter, setViewFilter] = useState<'active' | 'history' | 'all'>('active');

  const [editingRow, setEditingRow] = useState<DispatchRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fields, setFields] = useState({
    acPaymentConfirmation: '',
    uploadReceivedOfPayment: '',
    paymentReceivedDate: '', // stored DD/MM/YYYY; the date input uses YYYY-MM-DD
    paymentRemark: ''
  });

  const [uploads, setUploads] = useState<Record<UploadKey, { uploading: boolean; progress: number; fileName?: string; fileSize?: string }>>({
    uploadReceivedOfPayment: { uploading: false, progress: 0 }
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr || dateStr.trim() === '') return '—';
    if (!dateStr.includes('T') && dateStr.includes('/')) return dateStr;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  // DD/MM/YYYY -> YYYY-MM-DD (for the date input)
  const parseDateForInput = (dateStr: string) => {
    if (!dateStr) return '';
    const m = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return '';
  };
  // YYYY-MM-DD -> DD/MM/YYYY (for storing)
  const formatDateForSave = (dateStr: string) => {
    if (!dateStr) return '';
    const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    return dateStr;
  };

  const loadRows = async (notify = false, silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await getDispatchRows();
      if (res.success) {
        // Only rows that reached the payment stage: PI Payment Confirmation (AJ) <> ""
        const validRows = res.data.filter(r => (r.piPaymentConfirmation || '').trim() !== '');
        setRows(validRows);
        if (notify && onAddToast) onAddToast('success', 'Refreshed', 'Payment confirmation list synced with sheet.');
      } else {
        if (onAddToast) onAddToast('error', 'Load Failed', res.error || 'Could not read Dispatch sheet.');
      }
    } catch (err: any) {
      if (!silent && onAddToast) onAddToast('error', 'Network Error', err.message || 'Failed to load payment data.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') loadRows(false, true); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const id = window.setInterval(refresh, 20000);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processFile = (file: File, key: UploadKey) => {
    if (file.size > 5 * 1024 * 1024) {
      onAddToast?.('error', 'File too large', 'Please upload a file under 5MB.');
      return;
    }
    setUploads(prev => ({ ...prev, [key]: { uploading: true, progress: 10 } }));
    const interval = setInterval(() => {
      setUploads(prev => ({ ...prev, [key]: { ...prev[key], progress: Math.min(90, (prev[key].progress || 10) + 15) } }));
    }, 150);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const formattedSize = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
        : `${(file.size / 1024).toFixed(1)} KB`;
      const fallbackUrl = `https://drive.google.com/drive/folders/${RECEIPT_FOLDER_ID}`;
      try {
        const dataUrl = event.target?.result as string;
        const base64Content = dataUrl.split(',')[1];
        const body = new URLSearchParams();
        body.append('action', 'uploadFile');
        body.append('folderId', RECEIPT_FOLDER_ID);
        body.append('fileName', file.name);
        body.append('base64Data', base64Content);
        body.append('mimeType', file.type || 'application/octet-stream');
        const response = await fetch(API_URL, { method: 'POST', body });
        clearInterval(interval);
        const resData = await response.json();

        const findUrl = (obj: any): string | null => {
          if (typeof obj === 'string' && (obj.startsWith('http://') || obj.startsWith('https://'))) return obj;
          if (obj && typeof obj === 'object') {
            for (const k of Object.keys(obj)) {
              const f = findUrl(obj[k]);
              if (f) return f;
            }
          }
          return null;
        };
        const url = findUrl(resData);

        if (resData.success && url) {
          setFields(prev => ({ ...prev, [key]: url }));
          setUploads(prev => ({ ...prev, [key]: { uploading: false, progress: 100, fileName: file.name, fileSize: formattedSize } }));
        } else {
          onAddToast?.('error', 'Upload Failed', resData.error || 'Google Drive upload failed. Saved folder link instead.');
          setFields(prev => ({ ...prev, [key]: fallbackUrl }));
          setUploads(prev => ({ ...prev, [key]: { uploading: false, progress: 100, fileName: file.name, fileSize: formattedSize } }));
        }
      } catch (err: any) {
        clearInterval(interval);
        onAddToast?.('error', 'Network Error', err.message || 'Upload failed.');
        setUploads(prev => ({ ...prev, [key]: { uploading: false, progress: 0 } }));
      }
    };
    reader.readAsDataURL(file);
  };

  const clearUpload = (key: UploadKey) => {
    setFields(prev => ({ ...prev, [key]: '' }));
    setUploads(prev => ({ ...prev, [key]: { uploading: false, progress: 0 } }));
  };

  const openUpdate = (row: DispatchRecord) => {
    setEditingRow(row);
    setFields({
      acPaymentConfirmation: row.acPaymentConfirmation || '',
      uploadReceivedOfPayment: row.uploadReceivedOfPayment || '',
      paymentReceivedDate: parseDateForInput(row.paymentReceivedDate || ''),
      paymentRemark: row.paymentRemark || ''
    });
    setUploads({
      uploadReceivedOfPayment: { uploading: false, progress: row.uploadReceivedOfPayment ? 100 : 0, fileName: row.uploadReceivedOfPayment ? 'Uploaded file' : undefined }
    });
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingRow) return;
    setIsSaving(true);

    // AC Payment Confirmation auto-stamps today's date (DD/MM/YYYY).
    const d = new Date();
    const todayDDMM = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

    const payload = {
      acPaymentConfirmation: todayDDMM,
      uploadReceivedOfPayment: fields.uploadReceivedOfPayment,
      paymentReceivedDate: formatDateForSave(fields.paymentReceivedDate),
      paymentRemark: fields.paymentRemark
    };
    const res = await updatePaymentConfirmationInSheet(editingRow.rowIndex, payload);
    setIsSaving(false);

    if (!res.success) {
      if (onAddToast) onAddToast('error', 'Update Failed', res.error || 'Could not save payment confirmation.');
      return;
    }
    if (onAddToast) onAddToast('success', 'Payment Confirmed', 'Payment confirmation saved successfully.');
    setEditingRow(null);
    loadRows(false, true);
  };

  const renderUpload = (key: UploadKey, label: string) => {
    const isUploading = uploads[key]?.uploading;
    const progress = uploads[key]?.progress || 0;
    const isSuccess = progress === 100 && (fields as any)[key];
    const fileName = uploads[key]?.fileName;
    const fileSize = uploads[key]?.fileSize;

    return (
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">{label}</label>
        {!isUploading && !isSuccess ? (
          <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group">
            <input type="file" onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0], key)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" accept=".pdf,image/*,.csv,.xlsx,.xls" />
            <FileText className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-2 group-hover:text-blue-500 transition-colors" />
            <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">Drag &amp; drop or <span className="text-blue-500">browse</span></p>
            <p className="text-[9px] font-medium text-slate-400 mt-1">PDF, JPG, PNG, Excel up to 5MB</p>
          </div>
        ) : isUploading ? (
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-950/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Uploading...</span>
              <span className="text-[11px] font-bold text-blue-600">{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : (
          <div className="border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-4 bg-emerald-50 dark:bg-emerald-500/5 flex items-center justify-between group">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 truncate">{fileName || 'File attached'}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-semibold text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-wider">{fileSize || 'Link saved'}</span>
                  <a href={(fields as any)[key]} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-600 hover:underline z-20 relative">View</a>
                </div>
              </div>
            </div>
            <button type="button" onClick={(e) => { e.preventDefault(); clearUpload(key); }} className="p-1.5 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-all z-20 relative cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  };

  // Payment is "done" (goes to History) once AC Payment Confirmation is set.
  const isConfirmed = (r: DispatchRecord) => (r.acPaymentConfirmation || '').trim() !== '';

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      (r.companyName || '').toLowerCase().includes(q) ||
      (r.productName || '').toLowerCase().includes(q) ||
      (r.dispatchId || '').toLowerCase().includes(q);
    const matchesView =
      viewFilter === 'all' ||
      (viewFilter === 'history' ? isConfirmed(r) : !isConfirmed(r));
    return matchesSearch && matchesView;
  });

  const activeCount = rows.filter(r => !isConfirmed(r)).length;
  const historyCount = rows.filter(r => isConfirmed(r)).length;

  return (
    <div className="space-y-6 pb-12">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-slate-200/70 dark:border-slate-800/80 bg-gradient-to-br from-white via-slate-50 to-blue-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/20 p-6 md:p-8"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 shrink-0">
              <CheckCircle className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Payment Confirmation</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">Confirm payments received from customers.</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-6 px-5 py-3 rounded-2xl bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/60 shadow-sm">
              <div className="text-center">
                <p className="text-2xl font-black text-blue-600 dark:text-blue-400 leading-none">{rows.filter(r => !(r.acPaymentConfirmation || '').trim()).length}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Awaiting</p>
              </div>
              <div className="w-px h-10 bg-slate-200 dark:bg-slate-800" />
              <div className="text-center">
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none">{rows.filter(r => (r.acPaymentConfirmation || '').trim()).length}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">Confirmed</p>
              </div>
            </div>

            <button
              onClick={() => loadRows(true)}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-2xl shadow-lg shadow-blue-600/20 transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </motion.div>

      <div className="glass-card rounded-3xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Payment Queue</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-bold">{filtered.length} record(s)</span>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Items flagged for payment confirmation.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {/* Active vs History filter */}
            <div className="flex bg-slate-100 dark:bg-slate-800/70 rounded-xl p-0.5 border border-slate-200/60 dark:border-slate-700/50 shrink-0">
              {([
                { key: 'active', label: 'Active', count: activeCount },
                { key: 'history', label: 'History', count: historyCount },
                { key: 'all', label: 'All', count: rows.length }
              ] as const).map((opt) => {
                const active = viewFilter === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setViewFilter(opt.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      active
                        ? 'bg-white dark:bg-slate-900 shadow-sm text-blue-600 dark:text-blue-400'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <span>{opt.label}</span>
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${active ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-slate-200/70 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400'}`}>
                      {opt.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative w-full md:w-auto">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by company, product..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full md:w-64 pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest w-48">Company &amp; Product</th>
                <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Dispatch Qty</th>
                <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">PI Payment</th>
                <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Payment Received Date</th>
                <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Remark</th>
                <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Upload</th>
                <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-4 py-3.5 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-500">Loading records...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500 font-medium">
                    No records awaiting payment confirmation.
                  </td>
                </tr>
              ) : (
                filtered.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 font-bold text-xs shrink-0 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {(r.companyName || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{r.companyName || '—'}</p>
                          <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                            <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{r.dispatchId || '—'}</span>
                            <span>{r.productName || '—'}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{r.statusDispatchQty || r.dispatchQuantity || '—'}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{r.piPaymentConfirmation || '—'}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {r.paymentReceivedDate || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {r.paymentRemark || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {r.uploadReceivedOfPayment ? (
                        <a href={r.uploadReceivedOfPayment} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" /> View
                        </a>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {(r.acPaymentConfirmation || '').trim() ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20">
                          <CheckCircle className="w-3 h-3" /> Confirmed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      {!isConfirmed(r) ? (
                        <button
                          onClick={() => openUpdate(r)}
                          className="px-3.5 py-1.5 bg-white dark:bg-slate-800/80 hover:bg-blue-600 dark:hover:bg-blue-600 text-slate-700 dark:text-slate-200 hover:text-white dark:hover:text-white text-[11px] font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-600 shadow-sm hover:shadow-md hover:shadow-blue-600/20 transition-all flex items-center gap-1.5 ml-auto cursor-pointer group/btn"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-blue-500 group-hover/btn:text-white transition-colors" />
                          <span>Confirm Payment</span>
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

      {editingRow && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm transition-opacity" onClick={() => setEditingRow(null)} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl max-w-2xl w-full shadow-2xl p-6 sm:p-8 overflow-y-auto max-h-[90vh] z-10 space-y-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/25 shrink-0">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">Payment Confirmation</h3>
                  <p className="text-[11px] text-slate-400 font-semibold">{editingRow.companyName || editingRow.id} • {editingRow.dispatchId}</p>
                </div>
              </div>
              <button onClick={() => setEditingRow(null)} className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Context (read-only) */}
            <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
              <h4 className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3">Context Details</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-[11px]">
                <div><span className="block text-slate-400 font-bold uppercase tracking-wider text-[9px]">Dispatch Qty</span><span className="font-bold text-slate-800 dark:text-slate-200">{editingRow.statusDispatchQty || editingRow.dispatchQuantity || '—'}</span></div>
                <div><span className="block text-slate-400 font-bold uppercase tracking-wider text-[9px]">Dispatch Date</span><span className="font-bold text-slate-800 dark:text-slate-200">{formatDate(editingRow.statusDispatchDate || '')}</span></div>
                <div><span className="block text-slate-400 font-bold uppercase tracking-wider text-[9px]">PI Payment</span><span className="font-bold text-slate-800 dark:text-slate-200">{editingRow.piPaymentConfirmation || '—'}</span></div>
              </div>
            </div>

            {/* AC Payment Confirmation (auto date) and Time Delay1 are hidden. */}
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Payment Recievd Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                    <input
                      type="date"
                      value={fields.paymentReceivedDate}
                      onChange={(e) => setFields({ ...fields, paymentReceivedDate: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Remark</label>
                  <input
                    type="text"
                    value={fields.paymentRemark}
                    onChange={(e) => setFields({ ...fields, paymentRemark: e.target.value })}
                    placeholder="e.g. Full payment received..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold transition-all"
                  />
                </div>

                <div className="md:col-span-2">
                  {renderUpload('uploadReceivedOfPayment', 'Upload Recived Of Payment')}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button type="button" onClick={() => setEditingRow(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl transition-all cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-blue-600/15 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{isSaving ? 'Saving...' : 'Confirm Payment'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
