import { useState, useEffect, FormEvent } from 'react';
import { motion } from 'motion/react';
import {
  PackageCheck,
  Search,
  RefreshCw,
  X,
  Box,
  Calendar,
  Loader2,
  ClipboardList,
  CheckCircle,
  FileText,
  Save
} from 'lucide-react';
import { getDispatchRows, DispatchRecord, updateMaterialReceiptInSheet, API_URL } from '../api';

const RECEIPT_FOLDER_ID = '1HBi8BusMyDY_lQ1b7iJEJQvcuqayThu_';
type UploadKey = 'uploadReceiving' | 'uploadVendorCreditNote' | 'creditNoteRequested';

interface MaterialReceiptViewProps {
  onAddToast?: (type: any, title: string, desc: string) => void;
}

export default function MaterialReceiptView({ onAddToast }: MaterialReceiptViewProps) {
  const [rows, setRows] = useState<DispatchRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  const [editingRow, setEditingRow] = useState<DispatchRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fields, setFields] = useState({
    acReceiptMaterial: '',
    receiptTimeDelay2: '',
    uploadReceiving: '',
    shortageQty: '',
    creditNoteRequested: '',
    invoiceReviewDecision: '',
    uploadVendorCreditNote: '',
    gateInDateTime: '',
    gateOutDateTime: ''
  });

  const [uploads, setUploads] = useState<Record<UploadKey, { uploading: boolean; progress: number; fileName?: string; fileSize?: string }>>({
    uploadReceiving: { uploading: false, progress: 0 },
    uploadVendorCreditNote: { uploading: false, progress: 0 },
    creditNoteRequested: { uploading: false, progress: 0 }
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

  const loadRows = async (notify = false, silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await getDispatchRows();
      if (res.success) {
        // Only rows that reached the receipt stage: PL Reciept Material <> ""
        const receiptRows = res.data.filter(r => (r.plReceiptMaterial || '').trim() !== '');
        setRows(receiptRows);
        if (notify && onAddToast) onAddToast('success', 'Refreshed', 'Material receipt list synced with sheet.');
      } else {
        if (onAddToast) onAddToast('error', 'Load Failed', res.error || 'Could not read Dispatch sheet.');
      }
    } catch (err: any) {
      if (!silent && onAddToast) onAddToast('error', 'Network Error', err.message || 'Failed to load receipt data.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Auto-refresh on focus + interval.
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

  // Upload a file to Google Drive and store its URL in the matching field.
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
      acReceiptMaterial: row.acReceiptMaterial || '',
      receiptTimeDelay2: row.receiptTimeDelay2 || '',
      uploadReceiving: row.uploadReceiving || '',
      shortageQty: row.shortageQty || '',
      creditNoteRequested: row.creditNoteRequested || '',
      invoiceReviewDecision: row.invoiceReviewDecision || '',
      uploadVendorCreditNote: row.uploadVendorCreditNote || '',
      gateInDateTime: row.gateInDateTime || '',
      gateOutDateTime: row.gateOutDateTime || ''
    });
    setUploads({
      uploadReceiving: { uploading: false, progress: row.uploadReceiving ? 100 : 0, fileName: row.uploadReceiving ? 'Uploaded file' : undefined },
      uploadVendorCreditNote: { uploading: false, progress: row.uploadVendorCreditNote ? 100 : 0, fileName: row.uploadVendorCreditNote ? 'Uploaded file' : undefined },
      creditNoteRequested: { uploading: false, progress: row.creditNoteRequested ? 100 : 0, fileName: row.creditNoteRequested ? 'Uploaded file' : undefined }
    });
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingRow) return;
    // AC Reciept Material auto-stamps today's date (YYYY-MM-DD for native Google Sheets date parsing).
    const d = new Date();
    const todayYMD = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const payload = { ...fields, acReceiptMaterial: todayYMD };
    
    // Optimistic Update
    setRows(prev => prev.map(r => r.rowIndex === editingRow.rowIndex ? { ...r, ...payload } : r));
    setEditingRow(null);
    if (onAddToast) onAddToast('success', 'Receipt Confirmed', 'Material receipt saved successfully.');

    // Background Sync
    updateMaterialReceiptInSheet(editingRow.rowIndex, payload).then(res => {
      if (!res.success) {
        if (onAddToast) onAddToast('error', 'Update Failed', res.error || 'Could not save receipt.');
      } else {
        loadRows(false, true);
      }
    });
  };

  const filtered = rows.filter((r) => {
    const isReceived = (r.acReceiptMaterial || '').trim() !== '';
    if (activeTab === 'pending' && isReceived) return false;
    if (activeTab === 'history' && !isReceived) return false;

    const q = search.toLowerCase();
    return (
      (r.companyName || '').toLowerCase().includes(q) ||
      (r.id || '').toLowerCase().includes(q) ||
      (r.productName || '').toLowerCase().includes(q) ||
      (r.dispatchId || '').toLowerCase().includes(q)
    );
  });

  const confirmedCount = rows.filter(r => (r.acReceiptMaterial || '').trim() !== '').length;

  // Compact file-upload widget used for the two upload fields.
  const renderUpload = (key: UploadKey, label: string) => {
    const up = uploads[key];
    const url = (fields as any)[key] as string;
    const inputId = `receipt-file-${key}`;
    return (
      <div className="space-y-1.5">
        <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1">{label}</label>
        {!url && !up.uploading && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) processFile(f, key); }}
            onClick={() => document.getElementById(inputId)?.click()}
            className="border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 border-slate-300 dark:border-slate-600 shadow-sm hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/50 dark:bg-slate-950/20"
          >
            <input id={inputId} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f, key); }} accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx" />
            <div className="p-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
              <FileText className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">Drag &amp; drop or <span className="text-indigo-500 font-bold">browse</span></p>
            <p className="text-[8px] text-slate-400 dark:text-slate-500 font-semibold">PDF, JPG, PNG, Excel up to 5MB</p>
          </div>
        )}
        {up.uploading && (
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-white dark:bg-slate-900 space-y-2">
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" /> Uploading…</span>
              <span className="text-slate-500 font-bold">{up.progress}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-full rounded-full transition-all duration-150" style={{ width: `${up.progress}%` }} />
            </div>
          </div>
        )}
        {url && !up.uploading && (
          <div className="border border-slate-100 dark:border-slate-800/80 rounded-xl p-2.5 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between gap-3 shadow-sm border-l-2 border-l-emerald-500">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0"><FileText className="w-4 h-4" /></div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate max-w-[130px]">{up.fileName || 'Uploaded file'}</p>
                <div className="flex items-center gap-1">
                  {up.fileSize && <span className="text-[8px] text-slate-400 font-semibold">{up.fileSize}</span>}
                  <span className="text-[8px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5"><CheckCircle className="w-2.5 h-2.5" /> Ready</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button type="button" onClick={() => window.open(url, '_blank')} className="px-1.5 py-0.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-[8px] font-bold rounded-md border border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer">Get</button>
              <button type="button" onClick={() => clearUpload(key)} className="p-1 rounded-md bg-white dark:bg-slate-900 hover:bg-rose-50 text-rose-600 border border-slate-200/60 dark:border-slate-800 cursor-pointer"><X className="w-3 h-3" /></button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl border border-slate-200/70 dark:border-slate-800/80 bg-gradient-to-br from-white via-slate-50 to-emerald-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/20 p-6 md:p-7"
      >
        <div aria-hidden className="absolute -right-10 -top-14 w-52 h-52 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/25 shrink-0">
              <PackageCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Material Receipt Confirmation
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium max-w-md">
                Confirm receipt of dispatched material — receiving, shortages, and credit-note handling.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <div className="flex items-center gap-2 bg-white/70 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800 rounded-xl px-3 py-2 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <div className="leading-none">
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{rows.length}</span>
                  <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">Awaiting</span>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white/70 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800 rounded-xl px-3 py-2 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                <div className="leading-none">
                  <span className="text-sm font-black text-teal-600 dark:text-teal-400">{confirmedCount}</span>
                  <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">Confirmed</span>
                </div>
              </div>
            </div>

            <motion.button
              onClick={() => loadRows(true)}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
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
              Receipt Queue
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 px-2 py-0.5 rounded-full">
                {filtered.length} record{filtered.length !== 1 ? 's' : ''}
              </span>
            </h3>
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
              Dispatched items ready for material receipt confirmation.
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
            <div className="flex bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'pending'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                History
              </button>
            </div>

            <div className="w-full md:w-64 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by company, product, dispatch ID..."
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
                    {['Company & Product', 'Dispatch ID', 'Dispatch QTY', 'Dispatch Date', 'Invoice (Vendor)', 'Tax Invoice / Way Bill', 'PL Receipt', 'Receipt Status', 'Action'].map((h, i) => (
                      <th key={h} className={`px-4 py-3.5 text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest ${i === 8 ? 'text-right' : 'text-left'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {isLoading ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3 text-slate-400">
                          <Loader2 className="w-7 h-7 animate-spin text-emerald-500" />
                          <p className="text-xs font-semibold">Loading receipt data…</p>
                        </div>
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-400">
                            <ClipboardList className="w-7 h-7" />
                          </div>
                          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium max-w-xs">
                            No items awaiting material receipt. Rows appear here once "PL Reciept Material" is set.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => {
                      const isSale = r.allocationId?.includes('/S');
                      return (
                        <tr key={r.rowIndex} className={`${isSale ? 'bg-purple-50/40 hover:bg-purple-50/60 dark:bg-purple-900/20 dark:hover:bg-purple-900/40' : 'group hover:bg-emerald-50/40 dark:hover:bg-slate-800/30 transition-colors'}`}>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2.5 max-w-xs">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/15 to-teal-500/15 border border-emerald-500/10 flex items-center justify-center text-[11px] font-black text-emerald-600 dark:text-emerald-400 shrink-0 uppercase">
                              {(r.companyName || '?').trim().charAt(0)}
                            </div>
                            <div className="space-y-0.5 min-w-0">
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate flex items-center gap-1.5">
                                  {r.companyName || r.id}
                                  {isSale && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800 bg-purple-100 dark:bg-purple-900/40 text-[8px] font-black uppercase tracking-widest text-purple-700 dark:text-purple-300">
                                      L1
                                    </span>
                                  )}
                                </div>
                              <div className="text-[11px] text-slate-400 truncate flex items-center gap-1 font-medium">
                                <Box className="w-3 h-3 shrink-0" />
                                <span>{r.productName || '—'}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20">{r.dispatchId || '—'}</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{r.dispatchQuantity || '—'}</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {r.statusDispatchDate ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/20">
                              <Calendar className="w-3.5 h-3.5 text-amber-500" />
                              {formatDate(r.statusDispatchDate)}
                            </span>
                          ) : <span className="text-xs text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap max-w-[120px]">
                          {r.invoiceVendor ? (
                            <button onClick={() => window.open(r.invoiceVendor, '_blank')} className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 truncate max-w-[110px]">
                              <FileText className="w-3 h-3 shrink-0" />
                              <span className="truncate">View Invoice</span>
                            </button>
                          ) : <span className="text-xs text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap max-w-[120px]">
                          {r.taxInvoiceWayBill ? (
                            <button onClick={() => window.open(r.taxInvoiceWayBill, '_blank')} className="text-[10px] font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 truncate max-w-[110px]">
                              <FileText className="w-3 h-3 shrink-0" />
                              <span className="truncate">View Tax Invoice</span>
                            </button>
                          ) : <span className="text-xs text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{formatDate(r.plReceiptMaterial || '')}</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {(r.acReceiptMaterial || '').trim() ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Received
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                            <button
                              onClick={() => openUpdate(r)}
                              className="px-3.5 py-1.5 bg-white dark:bg-slate-800/80 hover:bg-emerald-600 dark:hover:bg-emerald-600 text-slate-700 dark:text-slate-200 hover:text-white dark:hover:text-white text-[11px] font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-600 shadow-sm hover:shadow-md hover:shadow-emerald-600/20 transition-all flex items-center gap-1.5 ml-auto cursor-pointer group/btn"
                            >
                              <PackageCheck className="w-3.5 h-3.5 text-emerald-500 group-hover/btn:text-white transition-colors" />
                              <span>{(r.acReceiptMaterial || '').trim() === '' ? 'Confirm Receipt' : 'Update Receipt'}</span>
                            </button>
                        </td>
                      </tr>
                      );
                    })
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
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm transition-opacity" onClick={() => setEditingRow(null)} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl max-w-2xl w-full shadow-2xl p-6 sm:p-8 overflow-y-auto max-h-[90vh] z-10 space-y-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/25 shrink-0">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">Material Receipt Confirmation</h3>
                  <p className="text-[11px] text-slate-400 font-semibold">{editingRow.companyName || editingRow.id} · {editingRow.dispatchId}</p>
                </div>
              </div>
              <button onClick={() => setEditingRow(null)} className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dispatch details (read-only) */}
            <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
              <h4 className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-3">Dispatch Details</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-[11px]">
                <div><span className="block text-slate-400 font-bold uppercase tracking-wider text-[9px]">Dispatch Qty</span><span className="font-bold text-slate-800 dark:text-slate-200">{editingRow.dispatchQuantity || '—'}</span></div>
                <div><span className="block text-slate-400 font-bold uppercase tracking-wider text-[9px]">Dispatch Date</span><span className="font-bold text-slate-800 dark:text-slate-200">{formatDate(editingRow.statusDispatchDate || '')}</span></div>
                <div><span className="block text-slate-400 font-bold uppercase tracking-wider text-[9px]">PL Receipt</span><span className="font-bold text-slate-800 dark:text-slate-200">{formatDate(editingRow.plReceiptMaterial || '')}</span></div>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              {/* AC Reciept Material is auto-stamped on save (hidden). */}
              
              {/* Gate Timings Section */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest border-b border-emerald-500/10 pb-1.5">Timing Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1">Gate In Date &amp; Time</label>
                    <input
                      type="datetime-local"
                      value={fields.gateInDateTime}
                      onChange={(e) => setFields({ ...fields, gateInDateTime: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 shadow-sm rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1">Gate Out Date &amp; Time</label>
                    <input
                      type="datetime-local"
                      value={fields.gateOutDateTime}
                      onChange={(e) => setFields({ ...fields, gateOutDateTime: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 shadow-sm rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold transition-all"
                    />
                  </div>

                  {fields.gateInDateTime && fields.gateOutDateTime && (
                    <div className="col-span-1 md:col-span-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-3 flex items-center justify-between mt-1">
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Unloading Duration</span>
                      <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                        {(() => {
                          const d1 = new Date(fields.gateInDateTime);
                          const d2 = new Date(fields.gateOutDateTime);
                          if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
                            const diff = (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
                            return diff > 0 ? diff.toFixed(2) + ' days' : '0 days';
                          }
                          return '—';
                        })()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Receiving Section */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest border-b border-emerald-500/10 pb-1.5">Material Receiving</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1">Shortage Qty (If Any)</label>
                    <input
                      type="text"
                      value={fields.shortageQty}
                      onChange={(e) => setFields({ ...fields, shortageQty: e.target.value })}
                      placeholder="e.g. 0"
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 shadow-sm rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold transition-all"
                    />
                  </div>
                  {renderUpload('uploadReceiving', 'Upload Receiving')}
                </div>
              </div>

              {/* Credit Note Section */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest border-b border-emerald-500/10 pb-1.5">Credit Note &amp; Invoice</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1">Invoice Review &amp; Decision</label>
                    <input
                      type="text"
                      value={fields.invoiceReviewDecision}
                      onChange={(e) => setFields({ ...fields, invoiceReviewDecision: e.target.value })}
                      placeholder="e.g. Approved, Rejected..."
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 shadow-sm rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold transition-all"
                    />
                  </div>
                  {renderUpload('creditNoteRequested', 'Credit Note Requested by Customer')}
                  <div className="md:col-span-2">
                    {renderUpload('uploadVendorCreditNote', editingRow.allocationId?.includes('/S') ? 'Upload Debit Note Received from L1' : 'Upload Vendor Credit Note')}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button type="button" onClick={() => setEditingRow(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl transition-all cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-emerald-600/15 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{isSaving ? 'Saving...' : 'Save Receipt'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
