import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  PlusCircle, 
  MapPin, 
  Box, 
  Building2, 
  Hash, 
  Calendar,
  ArrowRight,
  Tag,
  Scale,
  FileText,
  Search,
  ChevronDown,
  Check,
  X,
  Save,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock3,
  Users,
  Trash2,
  Layers
} from 'lucide-react';
import { ActionEntry, Supplier, User as UserType } from '../types';
import { getProductsFromMasterSheet, getOfflineProducts, getSuppliersForEntry, API_URL } from '../api';

interface NewActionViewProps {
  onAddAction: (entry: ActionEntry) => Promise<boolean>;
  user: UserType | null;
  isOffline: boolean;
  actions: ActionEntry[];
  onUpdateL1Confirmation: (
    rowIndex: number,
    entry: ActionEntry,
    planned1: string,
    actual1: string,
    timeDelay1: string,
    areWeL1: string,
    timeDelay2?: string,
    willPurchase?: string,
    supplierName?: string,
    purchaseQuantity?: string,
    purchaseRate?: string,
    uploadPoCopy?: string,
    paymentTerms?: string,
    shortageCondition?: string,
    suppliers?: Supplier[]
  ) => Promise<boolean>;
}

export default function NewActionView({ 
  onAddAction, 
  user, 
  isOffline, 
  actions,
  onUpdateL1Confirmation
}: NewActionViewProps) {
  // Get today's date formatted as YYYY-MM-DD for standard html date input
  const todayStr = new Date().toISOString().split('T')[0];

  // Form visibility state
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Table search state
  const [listSearchTerm, setListSearchTerm] = useState('');

  // L1 Confirmation status filter
  const [l1StatusFilter, setL1StatusFilter] = useState<'all' | 'completed' | 'pending'>('all');

  // Derive an entry's L1 status the same way the status badge does.
  const getL1Status = (action: ActionEntry): 'completed' | 'pending' | 'notscheduled' => {
    if (action.actual1 && action.actual1.trim().length > 0) return 'completed';
    if (action.planned1 && action.planned1.trim().length > 0) return 'pending';
    return 'notscheduled';
  };

  // Shared row filter: search text + selected L1 status.
  const matchesFilters = (action: ActionEntry): boolean => {
    const lower = listSearchTerm.toLowerCase();
    const matchesSearch =
      (action.id || '').toLowerCase().includes(lower) ||
      (action.companyName || '').toLowerCase().includes(lower) ||
      (action.productName || '').toLowerCase().includes(lower) ||
      (action.location || '').toLowerCase().includes(lower) ||
      (action.timestamp || '').toLowerCase().includes(lower);
    const matchesStatus = l1StatusFilter === 'all' || getL1Status(action) === l1StatusFilter;
    return matchesSearch && matchesStatus;
  };

  // L1 Confirmation edit states
  const [l1EditingEntry, setL1EditingEntry] = useState<ActionEntry | null>(null);
  const [l1Planned1, setL1Planned1] = useState('');
  const [l1Actual1, setL1Actual1] = useState('');
  const [l1TimeDelay1, setL1TimeDelay1] = useState('');
  const [l1AreWeL1, setL1AreWeL1] = useState('Yes');
  const [isL1Saving, setIsL1Saving] = useState(false);

  // Supplier details viewer (read-only) — shows all suppliers from Purchase Allocation
  const [supplierModalEntry, setSupplierModalEntry] = useState<ActionEntry | null>(null);
  const [supplierModalList, setSupplierModalList] = useState<Supplier[]>([]);
  const [supplierModalLoading, setSupplierModalLoading] = useState(false);

  const handleViewSuppliers = async (action: ActionEntry) => {
    setSupplierModalEntry(action);
    setSupplierModalList([]);
    setSupplierModalLoading(true);
    try {
      const list = await getSuppliersForEntry(action.id);
      setSupplierModalList(list);
    } catch {
      setSupplierModalList([]);
    } finally {
      setSupplierModalLoading(false);
    }
  };

  // Purchase Allocation states
  const [l1WillPurchase, setL1WillPurchase] = useState('No');
  const [l1TimeDelay2, setL1TimeDelay2] = useState('0 days');

  // Multi-supplier allocation: an order can be split across several suppliers
  // (e.g. 300 = 100 + 100 + 100). Each supplier holds its own PO copy & terms.
  const [l1Suppliers, setL1Suppliers] = useState<Supplier[]>([]);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  // Factory for a fresh empty supplier row
  const makeBlankSupplier = (): Supplier => ({
    supplierName: '',
    purchaseQuantity: '',
    purchaseRate: '',
    uploadPoCopy: '',
    paymentTerms: '',
    shortageCondition: '',
    poMode: 'upload'
  });

  // Immutable helpers for the supplier list
  const updateSupplier = (index: number, patch: Partial<Supplier>) => {
    setL1Suppliers(prev => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };
  const addSupplier = () => setL1Suppliers(prev => [...prev, makeBlankSupplier()]);
  const removeSupplier = (index: number) =>
    setL1Suppliers(prev => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));

  // Helper to generate the next sequential ID based on existing actions list
  const generateSequentialID = () => {
    let maxNum = 0;
    let prefix = 'IND';
    
    if (actions && actions.length > 0) {
      actions.forEach(action => {
        if (!action.id) return;
        
        // Match a pattern like: non-digits followed by a slash followed by digits
        // e.g. "IND/414" matches, group 1 is "IND", group 2 is "414"
        const match = action.id.match(/^([a-zA-Z]+)\/([0-9]+)$/);
        if (match) {
          const num = parseInt(match[2], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
            prefix = match[1];
          }
        } else {
          // Fallback if it is just a number
          const numOnlyMatch = action.id.match(/^([0-9]+)$/);
          if (numOnlyMatch) {
            const num = parseInt(numOnlyMatch[1], 10);
            if (!isNaN(num) && num > maxNum) {
              maxNum = num;
            }
          }
        }
      });
    }

    // Default starting point is 1 if no sequence is found
    const nextNum = maxNum > 0 ? maxNum + 1 : 1;
    return `${prefix}/${nextNum}`;
  };

  const initialProducts = getOfflineProducts();
  const [products, setProducts] = useState<string[]>(initialProducts);

  const [date, setDate] = useState(todayStr);
  const [txnId, setTxnId] = useState(() => generateSequentialID());
  const [companyName, setCompanyName] = useState('');
  const [quntity, setQuntity] = useState('');
  const [unit, setUnit] = useState('Ltr');
  const [productName, setProductName] = useState(() => initialProducts[0] || 'Fuel Oil (Purcha)');
  const [location, setLocation] = useState('RPR');
  const [remark, setRemark] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update txnId when actions array loads/changes and form is untouched
  useEffect(() => {
    if (!companyName && !quntity && !remark) {
      setTxnId(generateSequentialID());
    }
  }, [actions]);

  // Fetch product list dynamically from Master sheet B2:B on mount
  useEffect(() => {
    let active = true;
    const loadProducts = async () => {
      const res = await getProductsFromMasterSheet();
      if (res.success && res.data && active) {
        setProducts(res.data);
        // If current product name is not in the fetched list, select the first one as default
        if (res.data.length > 0 && !res.data.includes(productName)) {
          setProductName(res.data[0]);
        }
      }
    };
    loadProducts();
    return () => {
      active = false;
    };
  }, []);

  // Location presets matching screenshot (e.g. RPR, Mumbai)
  const locations = ['RPR', 'Mumbai', 'Delhi', 'Bengaluru', 'Chennai', 'Kolkata', 'Pune'];

  // Unit presets
  const units = ['Ltr', 'Kg', 'M3', 'Brl', 'Pcs'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    // Validations
    if (!txnId.trim()) {
      setErrorMsg('Please specify a Transaction ID.');
      return;
    }
    if (!companyName.trim()) {
      setErrorMsg('Please specify a Company Name.');
      return;
    }
    const qVal = parseFloat(quntity);
    if (isNaN(qVal) || qVal <= 0) {
      setErrorMsg('Please enter a valid positive quantity.');
      return;
    }
    if (!productName.trim()) {
      setErrorMsg('Please specify a Product Name.');
      return;
    }
    if (!location.trim()) {
      setErrorMsg('Please specify a Location.');
      return;
    }

    setIsSubmitting(true);

    // Format YYYY-MM-DD input date into DD/MM/YYYY
    const parts = date.split('-');
    const formattedTimestamp = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : date;

    const newEntry: ActionEntry = {
      id: txnId.trim(),
      timestamp: formattedTimestamp,
      companyName: companyName.trim(),
      quntity: qVal,
      unit: unit.trim(),
      productName: productName.trim(),
      location: location.trim(),
      remark: remark.trim()
    };

    const success = await onAddAction(newEntry);
    setIsSubmitting(false);

    if (success) {
      // Reset form fields
      setCompanyName('');
      setQuntity('');
      setRemark('');
      setTxnId(generateSequentialID());
      setDate(todayStr);
      setIsFormOpen(false); // Close form drawer on successful insert
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDraggingIndex(index);
  };

  const handleDragLeave = () => {
    setDraggingIndex(null);
  };

  const handleFileDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDraggingIndex(null);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processSupplierFile(files[0], index);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processSupplierFile(files[0], index);
    }
  };

  // Upload a PO copy for a specific supplier row and store the resulting URL on it.
  const processSupplierFile = (file: File, index: number) => {
    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit. Please upload a smaller file.");
      return;
    }

    updateSupplier(index, { isUploading: true, uploadProgress: 10 });

    const interval = setInterval(() => {
      setL1Suppliers(prev => prev.map((s, i) =>
        i === index ? { ...s, uploadProgress: Math.min(90, (s.uploadProgress || 10) + 15) } : s
      ));
    }, 150);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const formattedSize = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
        : `${(file.size / 1024).toFixed(1)} KB`;

      const fallbackUrl = `https://drive.google.com/drive/folders/1HBi8BusMyDY_lQ1b7iJEJQvcuqayThu_`;

      try {
        const dataUrl = event.target?.result as string;
        const base64Content = dataUrl.split(',')[1];

        // Call Apps Script uploadFile action.
        // NOTE: Apps Script only reads params from e.parameter (query string or
        // form-encoded body), NOT from a JSON body. We also must avoid the
        // 'application/json' content-type, which triggers a CORS preflight that
        // Apps Script cannot answer. So we send form-urlencoded fields whose keys
        // exactly match the backend (base64Data, fileName, mimeType, folderId).
        const uploadBody = new URLSearchParams();
        uploadBody.append('action', 'uploadFile');
        uploadBody.append('folderId', '1HBi8BusMyDY_lQ1b7iJEJQvcuqayThu_');
        uploadBody.append('fileName', file.name);
        uploadBody.append('base64Data', base64Content);
        uploadBody.append('mimeType', file.type || 'application/octet-stream');

        const response = await fetch(API_URL, { method: 'POST', body: uploadBody });

        clearInterval(interval);
        const resData = await response.json();

        // Find URL in response
        const findUrlInObject = (obj: any): string | null => {
          if (typeof obj === 'string' && (obj.startsWith('http://') || obj.startsWith('https://'))) {
            return obj;
          }
          if (obj && typeof obj === 'object') {
            for (const key of Object.keys(obj)) {
              const found = findUrlInObject(obj[key]);
              if (found) return found;
            }
          }
          return null;
        };

        const driveUrl = findUrlInObject(resData);

        if (resData.success && driveUrl) {
          updateSupplier(index, {
            uploadPoCopy: driveUrl,
            poFileName: file.name,
            poFileSize: formattedSize,
            poMode: 'upload',
            isUploading: false,
            uploadProgress: 100
          });
        } else {
          const errorMsg = resData.error || "Unknown error";
          alert(`Google Drive upload failed: ${errorMsg}. Falling back to your shared folder link.`);
          updateSupplier(index, {
            uploadPoCopy: fallbackUrl,
            poFileName: file.name,
            poFileSize: formattedSize,
            poMode: 'upload',
            isUploading: false,
            uploadProgress: 100
          });
        }
      } catch (err: any) {
        clearInterval(interval);
        console.error("Upload error:", err);
        alert(`Network error uploading to Google Drive: ${err.message}. Falling back to your shared folder link.`);
        updateSupplier(index, {
          uploadPoCopy: fallbackUrl,
          poFileName: file.name,
          poFileSize: formattedSize,
          poMode: 'upload',
          isUploading: false,
          uploadProgress: 100
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleViewPoCopy = (action: ActionEntry) => {
    if (!action.uploadPoCopy) return;

    // Multiple suppliers store their PO links newline-joined; open each real URL.
    const parts = action.uploadPoCopy.split('\n').map(s => s.trim()).filter(Boolean);
    const urls = parts.filter(p => p.startsWith('http://') || p.startsWith('https://'));
    if (urls.length > 0) {
      urls.forEach(u => window.open(u, '_blank'));
      return;
    }

    const text = (parts[0] || action.uploadPoCopy).trim();
    const cleaned = text.startsWith('📄') ? text.slice(1).trim() : text;
    alert(`PO Copy Detail: ${cleaned}\n\n(Local file binary data is only accessible on the browser/device that uploaded it).`);
  };

  const handleOpenL1Modal = (entry: ActionEntry) => {
    setL1EditingEntry(entry);
    setL1Planned1(entry.planned1 || '');
    setL1Actual1(entry.actual1 || '');
    setL1TimeDelay1(entry.timeDelay1 || '');
    setL1AreWeL1(entry.areWeL1 || 'Yes');
    setL1WillPurchase(entry.willPurchase || 'No');
    setL1TimeDelay2(entry.timeDelay2 || '0 days');

    // Reconstruct the supplier list from the newline-joined sheet columns.
    const splitField = (v?: string) => (v ? String(v).split('\n') : []);
    const names = splitField(entry.supplierName);
    const qtys = splitField(entry.purchaseQuantity);
    const rates = splitField(entry.purchaseRate);
    const pos = splitField(entry.uploadPoCopy);
    const terms = splitField(entry.paymentTerms);
    const shortages = splitField(entry.shortageCondition);
    const count = Math.max(names.length, qtys.length, rates.length, pos.length, terms.length, shortages.length);

    const parsed: Supplier[] = [];
    for (let i = 0; i < count; i++) {
      const po = (pos[i] || '').trim();
      parsed.push({
        supplierName: names[i] || '',
        purchaseQuantity: qtys[i] || '',
        purchaseRate: rates[i] || '',
        uploadPoCopy: po,
        paymentTerms: terms[i] || '',
        shortageCondition: shortages[i] || '',
        poMode: po.startsWith('http') || po.includes('://') ? 'link' : 'upload'
      });
    }

    // Restore uploaded-file display metadata (name/size/mode) saved per supplier.
    try {
      const savedMeta = localStorage.getItem(`fms_suppliers_${entry.id}`);
      if (savedMeta) {
        const meta = JSON.parse(savedMeta);
        if (Array.isArray(meta)) {
          meta.forEach((m: any, i: number) => {
            if (parsed[i]) {
              if (m.poFileName) parsed[i].poFileName = m.poFileName;
              if (m.poFileSize) parsed[i].poFileSize = m.poFileSize;
              if (m.poMode) parsed[i].poMode = m.poMode;
            }
          });
        }
      }
    } catch {
      // ignore metadata parse errors
    }

    setL1Suppliers(parsed.length > 0 ? parsed : [makeBlankSupplier()]);
    setDraggingIndex(null);

    // The 'Purchase Allocation' sheet is the source of truth for suppliers now,
    // so load the authoritative list from there (falls back to the FMS-parsed
    // list above if offline or nothing is stored yet).
    getSuppliersForEntry(entry.id)
      .then((allocSuppliers) => {
        if (!allocSuppliers || allocSuppliers.length === 0) return;

        // Restore uploaded-file display metadata (name/size) saved locally, by index.
        let meta: any[] = [];
        try {
          const raw = localStorage.getItem(`fms_suppliers_${entry.id}`);
          if (raw) meta = JSON.parse(raw) || [];
        } catch {
          // ignore metadata parse errors
        }

        const restored: Supplier[] = allocSuppliers.map((s, i) => {
          const po = (s.uploadPoCopy || '').trim();
          return {
            ...s,
            uploadPoCopy: po,
            poMode: 'upload',
            poFileName: meta[i]?.poFileName || (po ? 'PO Copy' : undefined),
            poFileSize: meta[i]?.poFileSize
          };
        });

        setL1Suppliers(restored);
        setL1WillPurchase('Yes');
      })
      .catch(() => {
        // offline or allocation sheet unavailable — keep the FMS-parsed list
      });
  };

  const handleL1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!l1EditingEntry) return;
    setIsL1Saving(true);

    // Get today's date in DD/MM/YYYY
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const todayDDMMYYYY = `${day}/${month}/${year}`;

    // Auto-calculate delay in days
    let calculatedDelay = '0 days';
    const plannedStr = l1EditingEntry.planned1 || '';
    if (plannedStr) {
      const pParts = plannedStr.split('/');
      if (pParts.length === 3) {
        const pDate = new Date(`${pParts[2]}-${pParts[1]}-${pParts[0]}`);
        const aDate = new Date(`${year}-${month}-${day}`);
        const diffTime = aDate.getTime() - pDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (!isNaN(diffDays)) {
          calculatedDelay = diffDays <= 0 ? '0 days' : `${diffDays} days`;
        }
      }
    }

    // Determine final cleared values based on selections
    const finalWillPurchase = l1AreWeL1 === 'Yes' ? l1WillPurchase : 'No';
    const purchasing = l1AreWeL1 === 'Yes' && finalWillPurchase === 'Yes';

    // Keep single-line values so every supplier occupies exactly one line per column.
    const sanitize = (v: any) => String(v ?? '').replace(/\r?\n/g, ' ').trim();

    // Only keep suppliers that have at least a name or a quantity.
    const activeSuppliers = purchasing
      ? l1Suppliers.filter(s => sanitize(s.supplierName) || sanitize(s.purchaseQuantity))
      : [];

    const joinField = (key: keyof Supplier) => activeSuppliers.map(s => sanitize(s[key])).join('\n');

    const finalSupplierName = joinField('supplierName');
    const finalPurchaseQuantity = joinField('purchaseQuantity');
    const finalPurchaseRate = joinField('purchaseRate');
    const finalUploadPoCopy = joinField('uploadPoCopy');
    const finalPaymentTerms = joinField('paymentTerms');
    const finalShortageCondition = joinField('shortageCondition');
    const finalTimeDelay2 = purchasing ? l1TimeDelay2 : '';

    // Persist per-supplier uploaded-file display metadata (name/size/mode).
    if (activeSuppliers.length > 0) {
      localStorage.setItem(
        `fms_suppliers_${l1EditingEntry.id}`,
        JSON.stringify(activeSuppliers.map(s => ({
          poFileName: s.poFileName || '',
          poFileSize: s.poFileSize || '',
          poMode: s.poMode || 'upload'
        })))
      );
    } else {
      localStorage.removeItem(`fms_suppliers_${l1EditingEntry.id}`);
    }

    const success = await onUpdateL1Confirmation(
      l1EditingEntry.rowIndex || 0,
      l1EditingEntry,
      l1EditingEntry.planned1 || '', // Keep original formula-generated planned1
      todayDDMMYYYY,                 // Automatically filled Actual1 with today's date
      calculatedDelay,               // Automatically calculated Time Delay1
      l1AreWeL1,                     // User confirmed 'Yes' or 'No'
      finalTimeDelay2,
      finalWillPurchase,
      finalSupplierName,
      finalPurchaseQuantity,
      finalPurchaseRate,
      finalUploadPoCopy,
      finalPaymentTerms,
      finalShortageCondition,
      activeSuppliers
    );
    setIsL1Saving(false);
    if (success) {
      setL1EditingEntry(null);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl border border-slate-200/70 dark:border-slate-800/80 bg-gradient-to-br from-white via-slate-50 to-blue-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/20 p-6 md:p-7"
      >
        <div aria-hidden className="absolute -right-10 -top-14 w-52 h-52 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/25 shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Create & Manage Entries
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium max-w-md">
                Log new auction records and update their L1 confirmations in real-time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* KPI chips */}
            {(() => {
              const total = actions.length;
              const completed = actions.filter(a => a.actual1 && a.actual1.trim().length > 0).length;
              const pending = actions.filter(a => a.planned1 && a.planned1.trim().length > 0 && !(a.actual1 && a.actual1.trim().length > 0)).length;
              const chips = [
                { label: 'Total', value: total, dot: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
                { label: 'Completed', value: completed, dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'Pending', value: pending, dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' }
              ];
              return (
                <div className="hidden sm:flex items-center gap-2">
                  {chips.map(c => (
                    <div key={c.label} className="flex items-center gap-2 bg-white/70 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800 rounded-xl px-3 py-2 backdrop-blur-sm">
                      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                      <div className="leading-none">
                        <span className={`text-sm font-black ${c.text}`}>{c.value}</span>
                        <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">{c.label}</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            <motion.button
              onClick={() => setIsFormOpen(true)}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Auction</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Log Entry Overlay Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <div 
            className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsFormOpen(false)}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl max-w-2xl w-full shadow-2xl p-6 md:p-8 overflow-y-auto max-h-[90vh] z-10 space-y-6 animate-in fade-in duration-200"
          >
            <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                Log New Auction Entry
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isOffline && (
              <div className="bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/15 rounded-2xl p-4 flex items-center gap-2.5 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                <span>Logged in Offline Mode. This auction will save directly in Local Storage until Sheet connection is live.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMsg && (
                <div className="p-4 bg-rose-500/10 text-rose-600 border border-rose-500/15 rounded-2xl text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Timestamp (Date Selector) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Transaction Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none font-semibold transition-all"
                      required
                    />
                  </div>
                </div>

                {/* ID */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block flex justify-between items-center">
                    <span>Transaction ID</span>
                    <button
                      type="button"
                      onClick={() => setTxnId(generateSequentialID())}
                      className="text-[9px] text-blue-500 hover:underline capitalize font-bold"
                    >
                      regenerate
                    </button>
                  </label>
                  <div className="relative">
                    <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="e.g. IND/0"
                      value={txnId}
                      onChange={(e) => setTxnId(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none font-semibold transition-all font-mono"
                      required
                    />
                  </div>
                </div>

                {/* Company Name */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Company Name
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="e.g. demo"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none font-semibold transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Quantity */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Quantity (Quntity)
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="number"
                      placeholder="e.g. 150000"
                      value={quntity}
                      onChange={(e) => setQuntity(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none font-semibold transition-all"
                      min="0.0001"
                      step="any"
                      required
                    />
                  </div>
                </div>

                {/* Unit */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Unit
                  </label>
                  <div className="relative">
                    <Scale className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none font-semibold transition-all appearance-none text-left"
                    >
                      {units.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Product Name */}
                <div className="space-y-1.5 relative" ref={dropdownRef}>
                  <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Product Name
                  </label>
                  <div className="relative">
                    <Box className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search or enter product..."
                      value={productName}
                      onChange={(e) => {
                        setProductName(e.target.value);
                        setShowProductDropdown(true);
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      className="w-full pl-10 pr-10 py-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none font-semibold transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowProductDropdown(!showProductDropdown)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showProductDropdown ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {showProductDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-60 overflow-y-auto overflow-x-hidden backdrop-blur-lg">
                      <div className="px-3.5 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/80 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                        <span>Products List</span>
                        {productName && <span className="text-blue-500 font-medium font-sans">Filtered</span>}
                      </div>
                      
                      {products.filter(prod => 
                        prod.toLowerCase().includes(productName.toLowerCase())
                      ).length === 0 ? (
                        <div className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 italic">
                          No matching product. Type to add custom.
                        </div>
                      ) : (
                        products
                          .filter(prod => prod.toLowerCase().includes(productName.toLowerCase()))
                          .map((prod) => (
                            <button
                              key={prod}
                              type="button"
                              onClick={() => {
                                setProductName(prod);
                                setShowProductDropdown(false);
                              }}
                              className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between"
                            >
                              <span>{prod}</span>
                              {productName.toLowerCase() === prod.toLowerCase() && (
                                <Check className="w-4 h-4 text-emerald-500" />
                              )}
                            </button>
                          ))
                      )}
                    </div>
                  )}
                </div>

                {/* Location */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Location
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="e.g. RPR"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none font-semibold transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Remark */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Remark
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="e.g. DEMO"
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none font-semibold transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-xs transition-all cursor-pointer border border-slate-100 dark:border-slate-700/50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-semibold text-xs shadow-lg shadow-blue-600/10 flex items-center justify-center gap-1.5 transition-all duration-300 disabled:opacity-50 cursor-pointer"
                >
                  <span>{isSubmitting ? 'Submitting...' : 'Submit Entry'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Auctions Log List/Table */}
      <div className="glass-card rounded-3xl p-6 md:p-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              Filled Auction Entries
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/15 px-2 py-0.5 rounded-full">
                {actions.length} record{actions.length !== 1 ? 's' : ''}
              </span>
            </h3>
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
              Select any filled record below to update its L1 Confirmation values.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {/* L1 Status Filter */}
            <div className="flex bg-slate-100 dark:bg-slate-800/70 rounded-xl p-0.5 border border-slate-200/60 dark:border-slate-700/50 shrink-0">
              {([
                { key: 'all', label: 'All' },
                { key: 'pending', label: 'Pending' },
                { key: 'completed', label: 'Completed' }
              ] as const).map((opt) => {
                const count = opt.key === 'all'
                  ? actions.length
                  : actions.filter(a => getL1Status(a) === opt.key).length;
                const active = l1StatusFilter === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setL1StatusFilter(opt.key)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      active
                        ? 'bg-white dark:bg-slate-900 shadow-sm text-blue-600 dark:text-blue-400'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {opt.key === 'pending' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                    {opt.key === 'completed' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    <span>{opt.label}</span>
                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                      active ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-slate-200/70 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Search */}
            <div className="w-full md:w-72 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by company, product or ID..."
                value={listSearchTerm}
                onChange={(e) => setListSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 glass-input rounded-xl text-slate-900 dark:text-white text-xs focus:outline-none font-medium transition-all"
              />
              {listSearchTerm && (
                <button
                  onClick={() => setListSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Responsive Table */}
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
          .responsive-mobile-table td:nth-of-type(1)::before { content: "ID  Date"; }
          .responsive-mobile-table td:nth-of-type(2)::before { content: "Company  Product"; }
          .responsive-mobile-table td:nth-of-type(3)::before { content: "Qty  Unit"; }
          .responsive-mobile-table td:nth-of-type(4)::before { content: "Location"; }
          .responsive-mobile-table td:nth-of-type(5)::before { content: "L1 Confirmation Details"; }
          .responsive-mobile-table td:nth-of-type(6)::before { content: "Auction"; }
        }
      `}</style>
<table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 responsive-mobile-table">
                <thead className="bg-gradient-to-b from-slate-50 to-slate-100/40 dark:from-slate-900/70 dark:to-slate-900/40">
                  <tr>
                    <th className="px-4 py-3.5 text-left text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                      ID / Date
                    </th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                      Company & Product
                    </th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                      Qty / Unit
                    </th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                      Location
                    </th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                      L1 Confirmation Details
                    </th>
                    <th className="px-4 py-3.5 text-right text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                      Auction
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-transparent">
                  {[...actions]
                    .filter(matchesFilters)
                    .reverse() // Display newest entries on top
                    .map((action) => {
                      const hasL1 = action.areWeL1 && action.areWeL1.trim().length > 0;
                      const isL1Yes = action.areWeL1 && action.areWeL1.toLowerCase() === 'yes';

                      return (
                        <tr
                          key={action.id}
                          className="group hover:bg-blue-50/40 dark:hover:bg-slate-800/30 transition-colors relative"
                        >
                          {/* ID / Date */}
                          <td className="px-4 py-4 whitespace-nowrap relative">
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-0.5 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="space-y-1">
                              <div className="text-[11px] font-mono font-extrabold text-blue-600 dark:text-blue-400 bg-blue-500/8 border border-blue-500/15 rounded-md px-1.5 py-0.5 w-fit">
                                {action.id}
                              </div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" />
                                {action.timestamp}
                              </div>
                            </div>
                          </td>

                          {/* Company / Product */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2.5 max-w-xs">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/15 to-indigo-500/15 border border-blue-500/10 flex items-center justify-center text-[11px] font-black text-blue-600 dark:text-blue-400 shrink-0 uppercase">
                                {(action.companyName || '?').trim().charAt(0)}
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                  {action.companyName}
                                </div>
                                <div className="text-[11px] text-slate-400 dark:text-slate-400 truncate flex items-center gap-1 font-medium">
                                  <Box className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>{action.productName}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Qty / Unit */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                              {Number(action.quntity).toLocaleString()}
                              <span className="ml-1 text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                                {action.unit}
                              </span>
                            </div>
                          </td>

                          {/* Location */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              {action.location}
                            </div>
                          </td>

                           {/* L1 Details */}
                          <td className="px-4 py-4">
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

                              {/* View all supplier allocation details (from Purchase Allocation sheet) */}
                              {((action.uploadPoCopy && action.uploadPoCopy.trim().length > 0) ||
                                (action.willPurchase && action.willPurchase.toLowerCase() === 'yes') ||
                                (action.supplierName && action.supplierName.trim().length > 0)) && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewSuppliers(action);
                                  }}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-50/70 hover:bg-blue-100/90 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/30 transition-all cursor-pointer"
                                  title="View all supplier details"
                                >
                                  <FileText className="w-3 h-3" />
                                  <span>View Details</span>
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Action Button */}
                          <td className="px-4 py-4 whitespace-nowrap text-right">
                            <button
                              onClick={() => handleOpenL1Modal(action)}
                              className="px-3.5 py-1.5 bg-white dark:bg-slate-800/80 hover:bg-blue-600 dark:hover:bg-blue-600 text-slate-700 dark:text-slate-200 hover:text-white dark:hover:text-white text-[11px] font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-600 shadow-sm hover:shadow-md hover:shadow-blue-600/20 transition-all flex items-center gap-1.5 ml-auto cursor-pointer group/btn"
                            >
                              <Clock3 className="w-3.5 h-3.5 text-blue-500 group-hover/btn:text-white transition-colors" />
                              <span>L1 Confirmation</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                  {actions.filter(matchesFilters).length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-14 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-400">
                            <Search className="w-7 h-7" />
                          </div>
                          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium max-w-xs">
                            {l1StatusFilter !== 'all'
                              ? `No ${l1StatusFilter} entries found. Try a different filter.`
                              : 'No transactions logged yet or matched your search. Click "Create Auction" to create one.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* L1 Confirmation Overlay Modal */}
      {l1EditingEntry && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <div 
            className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setL1EditingEntry(null)}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl max-w-3xl w-full shadow-2xl p-6 sm:p-8 overflow-y-auto max-h-[90vh] z-10 space-y-6"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-mono font-bold tracking-wider">
                  ROW INDEX: {l1EditingEntry.rowIndex || 'Unknown'}
                </span>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">
                  Update L1 Confirmation
                </h3>
              </div>
              <button
                onClick={() => setL1EditingEntry(null)}
                className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selected Item Details */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl text-[11px] space-y-1.5 border border-slate-100/50 dark:border-slate-800/50">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Company:</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold truncate max-w-[180px]">
                  {l1EditingEntry.companyName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Product:</span>
                <span className="text-slate-600 dark:text-slate-400 font-semibold truncate max-w-[180px]">
                  {l1EditingEntry.productName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold">Quantity:</span>
                <span className="text-slate-600 dark:text-slate-400 font-semibold">
                  {Number(l1EditingEntry.quntity).toLocaleString()} {l1EditingEntry.unit}
                </span>
              </div>
            </div>

            {/* Confirmation Inputs */}
            <form onSubmit={handleL1Submit} className="space-y-5">
              <div className="space-y-4">
                {/* Visual info about automatic calculations */}
                <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold">Planned (Target Date):</span>
                    <span className="text-slate-800 dark:text-slate-200 font-mono font-bold">
                      {l1EditingEntry.planned1 || <span className="italic text-slate-400">Not Scheduled</span>}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold">Actual (Completion Date):</span>
                    <span className="text-blue-600 dark:text-blue-400 font-mono font-bold flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      {(() => {
                        const d = new Date();
                        const day = String(d.getDate()).padStart(2, '0');
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const year = d.getFullYear();
                        return `${day}/${month}/${year} (Today)`;
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold">Estimated Time Delay:</span>
                    <span className="text-slate-700 dark:text-slate-300 font-mono font-bold">
                      {(() => {
                        const plannedStr = l1EditingEntry.planned1 || '';
                        if (!plannedStr) return <span className="italic text-slate-400">No Target</span>;
                        const pParts = plannedStr.split('/');
                        if (pParts.length === 3) {
                          const pDate = new Date(`${pParts[2]}-${pParts[1]}-${pParts[0]}`);
                          const d = new Date();
                          const pDateVal = pDate.getTime();
                          const todayVal = new Date(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`).getTime();
                          const diffTime = todayVal - pDateVal;
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          if (!isNaN(diffDays)) {
                            return diffDays <= 0 ? '0 days' : `${diffDays} days`;
                          }
                        }
                        return <span className="italic text-slate-400">-</span>;
                      })()}
                    </span>
                  </div>
                </div>

                {/* Are We L1? */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Are We L1?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setL1AreWeL1('Yes')}
                      className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        l1AreWeL1 === 'Yes'
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-500 dark:border-emerald-500/80'
                          : 'bg-transparent border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Yes</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setL1AreWeL1('No')}
                      className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        l1AreWeL1 === 'No'
                          ? 'bg-rose-500/15 border-rose-500 text-rose-600 dark:text-rose-500 dark:border-rose-500/80'
                          : 'bg-transparent border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <XCircle className="w-4 h-4 shrink-0" />
                      <span>No</span>
                    </button>
                  </div>
                </div>

                {/* Will We Purchase Material from Another Party? */}
                {l1AreWeL1 === 'Yes' && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80"
                  >
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                      Will We Purchase Material from Another Party?
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setL1WillPurchase('Yes')}
                        className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          l1WillPurchase === 'Yes'
                            ? 'bg-blue-500/15 border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-500/80'
                            : 'bg-transparent border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Yes</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setL1WillPurchase('No')}
                        className={`py-2.5 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          l1WillPurchase === 'No'
                            ? 'bg-slate-500/15 border-slate-500 text-slate-600 dark:text-slate-400 dark:border-slate-500/80'
                            : 'bg-transparent border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <XCircle className="w-4 h-4 shrink-0" />
                        <span>No</span>
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Purchase Allocation Form Fields — supports splitting one order across multiple suppliers */}
                {l1AreWeL1 === 'Yes' && l1WillPurchase === 'Yes' && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/80"
                  >
                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-3 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          <span>Purchase Allocation Details</span>
                        </h4>
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">
                          {l1Suppliers.length} supplier{l1Suppliers.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Allocation tracker: order qty vs. total allocated across suppliers */}
                      {(() => {
                        const orderQty = l1EditingEntry?.quntity || 0;
                        const allocated = l1Suppliers.reduce((sum, s) => sum + (parseFloat(s.purchaseQuantity) || 0), 0);
                        const remaining = orderQty - allocated;
                        const pct = orderQty > 0 ? Math.min(100, (allocated / orderQty) * 100) : 0;
                        const over = remaining < 0;
                        return (
                          <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-xl p-2.5 space-y-2">
                            <div className="flex items-center justify-between text-[10px] font-bold">
                              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <Layers className="w-3 h-3" /> Allocated
                              </span>
                              <span className="text-slate-800 dark:text-slate-200 tabular-nums">
                                {allocated.toLocaleString()} / {orderQty.toLocaleString()} {l1EditingEntry?.unit || ''}
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${over ? 'bg-rose-500' : pct >= 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                                style={{ width: `${over ? 100 : pct}%` }}
                              />
                            </div>
                            <div className={`text-[9px] font-bold ${over ? 'text-rose-500' : remaining === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                              {over
                                ? `Over-allocated by ${Math.abs(remaining).toLocaleString()} ${l1EditingEntry?.unit || ''}`
                                : remaining === 0 && orderQty > 0
                                  ? 'Fully allocated ✓'
                                  : `Remaining: ${remaining.toLocaleString()} ${l1EditingEntry?.unit || ''}`}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Supplier cards — two-column form layout on wider screens */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {l1Suppliers.map((sup, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25 }}
                          className="bg-white dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 rounded-xl p-3 space-y-3 relative"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-lg bg-blue-500/10 flex items-center justify-center text-[9px]">{idx + 1}</span>
                              Supplier {idx + 1}
                            </span>
                            {l1Suppliers.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeSupplier(idx)}
                                className="p-1 rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-transparent hover:border-rose-200/60 dark:hover:border-rose-900/40 transition-all cursor-pointer"
                                title="Remove this supplier"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Supplier Name */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                              Supplier Name
                            </label>
                            <input
                              type="text"
                              value={sup.supplierName}
                              onChange={(e) => updateSupplier(idx, { supplierName: e.target.value })}
                              placeholder="Enter Supplier Name"
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-semibold"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {/* Purchase Quantity */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                                Purchase Qty
                              </label>
                              <input
                                type="number"
                                step="any"
                                value={sup.purchaseQuantity}
                                onChange={(e) => updateSupplier(idx, { purchaseQuantity: e.target.value })}
                                placeholder="Qty"
                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-semibold"
                              />
                            </div>

                            {/* Purchase Rate */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                                Purchase Rate
                              </label>
                              <input
                                type="number"
                                step="any"
                                value={sup.purchaseRate}
                                onChange={(e) => updateSupplier(idx, { purchaseRate: e.target.value })}
                                placeholder="Rate"
                                className="w-full px-3 py-2 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-semibold"
                              />
                            </div>
                          </div>

                          {/* Upload Po Copy */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                              PO Copy (File Upload)
                            </label>

                            <div className="space-y-2">
                                {/* Drag & Drop Zone */}
                                {!sup.uploadPoCopy && !sup.isUploading && (
                                  <div
                                    onDragOver={(e) => handleDragOver(e, idx)}
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) => handleFileDrop(e, idx)}
                                    className={`border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-1.5 ${
                                      draggingIndex === idx
                                        ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/10'
                                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/20'
                                    }`}
                                    onClick={() => document.getElementById(`po-file-input-${idx}`)?.click()}
                                  >
                                    <input
                                      id={`po-file-input-${idx}`}
                                      type="file"
                                      className="hidden"
                                      onChange={(e) => handleFileChange(e, idx)}
                                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                                    />
                                    <div className="p-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-850">
                                      <FileText className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <div className="space-y-0.5">
                                      <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                                        Drag & drop file or <span className="text-blue-500 hover:underline font-bold">browse</span>
                                      </p>
                                      <p className="text-[8px] text-slate-400 dark:text-slate-500 font-semibold">
                                        PDF, JPG, PNG, Excel up to 5MB
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {/* Uploading State */}
                                {sup.isUploading && (
                                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-white dark:bg-slate-900 space-y-2">
                                    <div className="flex items-center justify-between text-[9px]">
                                      <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1.5 animate-pulse">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                                        Uploading PO Copy...
                                      </span>
                                      <span className="text-slate-500 font-bold">{sup.uploadProgress || 0}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                                      <div
                                        className="bg-blue-600 h-full rounded-full transition-all duration-150"
                                        style={{ width: `${sup.uploadProgress || 0}%` }}
                                      />
                                    </div>
                                  </div>
                                )}

                                {/* Uploaded File View Card */}
                                {sup.uploadPoCopy && !sup.isUploading && (
                                  <div className="border border-slate-100 dark:border-slate-800/80 rounded-xl p-2.5 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between gap-3 shadow-sm border-l-2 border-l-emerald-500">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="p-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
                                        <FileText className="w-4 h-4" />
                                      </div>
                                      <div className="min-w-0 space-y-0.5">
                                        <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate max-w-[130px]">
                                          {sup.poFileName || 'PO Copy'}
                                        </p>
                                        <div className="flex items-center gap-1">
                                          {sup.poFileSize && <span className="text-[8px] text-slate-400 font-semibold">{sup.poFileSize}</span>}
                                          <span className="w-0.5 h-0.5 rounded-full bg-slate-300" />
                                          <span className="text-[8px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                                            <Check className="w-2.5 h-2.5" /> Ready
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {sup.uploadPoCopy && (
                                        <button
                                          type="button"
                                          onClick={() => window.open(sup.uploadPoCopy, '_blank')}
                                          className="px-1.5 py-0.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-[8px] font-bold rounded-md border border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
                                        >
                                          Get
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => updateSupplier(idx, { uploadPoCopy: '', poFileName: undefined, poFileSize: undefined, uploadProgress: 0 })}
                                        className="p-1 rounded-md bg-white dark:bg-slate-900 hover:bg-rose-50 text-rose-600 border border-slate-200/60 dark:border-slate-800 cursor-pointer"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                            </div>
                          </div>

                          {/* Payment Terms and Condition */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                              Payment Terms & Conditions
                            </label>
                            <textarea
                              rows={2}
                              value={sup.paymentTerms}
                              onChange={(e) => updateSupplier(idx, { paymentTerms: e.target.value })}
                              placeholder="e.g. Within 1 to 2 weeks"
                              className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-semibold resize-none"
                            />
                          </div>

                          {/* Shortage Condition */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                              Shortage Condition
                            </label>
                            <textarea
                              rows={2}
                              value={sup.shortageCondition}
                              onChange={(e) => updateSupplier(idx, { shortageCondition: e.target.value })}
                              placeholder="Enter shortage condition..."
                              className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-semibold resize-none"
                            />
                          </div>
                        </motion.div>
                      ))}
                      </div>

                      {/* Add Supplier button */}
                      <button
                        type="button"
                        onClick={addSupplier}
                        className="w-full py-2.5 rounded-xl border border-dashed border-blue-300 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 text-[11px] font-bold flex items-center justify-center gap-1.5 hover:bg-blue-50/60 dark:hover:bg-blue-950/20 transition-all cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4" />
                        Add Another Supplier
                      </button>

                      {/* Time Delay 2 (order level) */}
                      <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block pt-2">
                          Time Delay 2
                        </label>
                        <input
                          type="text"
                          value={l1TimeDelay2}
                          onChange={(e) => setL1TimeDelay2(e.target.value)}
                          placeholder="e.g. 0 days"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-semibold"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setL1EditingEntry(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isL1Saving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-blue-600/15 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isL1Saving ? 'Saving...' : 'Save Confirmation'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Supplier Allocation Details (read-only) Modal */}
      {supplierModalEntry && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setSupplierModalEntry(null)}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl max-w-2xl w-full shadow-2xl p-6 sm:p-8 overflow-y-auto max-h-[90vh] z-10 space-y-5"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/25 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">Supplier Allocation Details</h3>
                  <p className="text-[11px] text-slate-400 font-semibold">
                    {supplierModalEntry.companyName} · {supplierModalEntry.id} · {Number(supplierModalEntry.quntity).toLocaleString()} {supplierModalEntry.unit}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSupplierModalEntry(null)}
                className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {supplierModalLoading ? (
              <div className="py-12 flex flex-col items-center gap-3 text-slate-400">
                <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                <p className="text-xs font-semibold">Loading supplier details…</p>
              </div>
            ) : supplierModalList.length === 0 ? (
              <div className="py-12 flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-400">
                  <Users className="w-7 h-7" />
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium max-w-xs">
                  No supplier allocation found for this entry in the Purchase Allocation sheet.
                </p>
              </div>
            ) : (
              <>
                {/* Allocation summary */}
                {(() => {
                  const total = supplierModalList.reduce((sum, x) => sum + (parseFloat(x.purchaseQuantity) || 0), 0);
                  return (
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" /> {supplierModalList.length} supplier{supplierModalList.length !== 1 ? 's' : ''}
                      </span>
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                        Allocated {total.toLocaleString()} {supplierModalEntry.unit}
                      </span>
                    </div>
                  );
                })()}

                {/* Supplier cards */}
                <div className="space-y-3">
                  {supplierModalList.map((s, i) => (
                    <div key={i} className="border border-slate-200/70 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 min-w-0">
                          <span className="w-5 h-5 rounded-lg bg-blue-500/10 flex items-center justify-center text-[10px] shrink-0">{i + 1}</span>
                          <span className="truncate">{s.supplierName || `Supplier ${i + 1}`}</span>
                        </span>
                        {s.uploadPoCopy && s.uploadPoCopy.startsWith('http') && (
                          <a
                            href={s.uploadPoCopy}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all cursor-pointer shrink-0"
                          >
                            <FileText className="w-3 h-3" /> View PO
                          </a>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Purchase Qty</span>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{s.purchaseQuantity || '—'}</p>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Purchase Rate</span>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{s.purchaseRate || '—'}</p>
                        </div>
                        <div className="space-y-0.5 col-span-2">
                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Payment Terms &amp; Conditions</span>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{s.paymentTerms || '—'}</p>
                        </div>
                        <div className="space-y-0.5 col-span-2">
                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Shortage Condition</span>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{s.shortageCondition || '—'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSupplierModalEntry(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
