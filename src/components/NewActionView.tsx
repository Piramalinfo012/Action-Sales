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
  Clock3
} from 'lucide-react';
import { ActionEntry, User as UserType } from '../types';
import { getProductsFromMasterSheet, getOfflineProducts, API_URL } from '../api';

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
    shortageCondition?: string
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

  // L1 Confirmation edit states
  const [l1EditingEntry, setL1EditingEntry] = useState<ActionEntry | null>(null);
  const [l1Planned1, setL1Planned1] = useState('');
  const [l1Actual1, setL1Actual1] = useState('');
  const [l1TimeDelay1, setL1TimeDelay1] = useState('');
  const [l1AreWeL1, setL1AreWeL1] = useState('Yes');
  const [isL1Saving, setIsL1Saving] = useState(false);

  // Purchase Allocation states
  const [l1WillPurchase, setL1WillPurchase] = useState('No');
  const [l1SupplierName, setL1SupplierName] = useState('');
  const [l1PurchaseQuantity, setL1PurchaseQuantity] = useState('');
  const [l1PurchaseRate, setL1PurchaseRate] = useState('');
  const [l1UploadPoCopy, setL1UploadPoCopy] = useState('');
  const [l1PaymentTerms, setL1PaymentTerms] = useState('');
  const [l1ShortageCondition, setL1ShortageCondition] = useState('');
  const [l1TimeDelay2, setL1TimeDelay2] = useState('0 days');

  // File Upload states for PO Copy
  const [poCopyMode, setPoCopyMode] = useState<'upload' | 'link'>('upload');
  const [isUploadingPo, setIsUploadingPo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedPoFile, setUploadedPoFile] = useState<{ name: string; size: string; dataUrl: string; type?: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit. Please upload a smaller file.");
      return;
    }

    setIsUploadingPo(true);
    setUploadProgress(10);

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 15;
      });
    }, 150);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const formattedSize = file.size > 1024 * 1024 
        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` 
        : `${(file.size / 1024).toFixed(1)} KB`;

      try {
        const dataUrl = event.target?.result as string;
        
        const base64Content = dataUrl.split(',')[1];
        
        // Call Apps Script uploadFile action
        const response = await fetch(`${API_URL}?action=uploadFile`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            folderId: '1HBi8BusMyDY_lQ1b7iJEJQvcuqayThu_',
            fileName: file.name,
            fileData: base64Content,
            mimeType: file.type || 'application/octet-stream'
          })
        });

        clearInterval(interval);
        setUploadProgress(100);

        const resData = await response.json();
        
        // Find URL in response
        const findUrlInObject = (obj: any): string | null => {
          if (typeof obj === 'string' && (obj.startsWith('http://') || obj.startsWith('https://'))) {
            return obj;
          }
          if (obj && typeof obj === 'object') {
            for (const key of Object.keys(obj)) {
              const val = obj[key];
              const found = findUrlInObject(val);
              if (found) return found;
            }
          }
          return null;
        };

        const driveUrl = findUrlInObject(resData);

        if (resData.success && driveUrl) {
          const fileObj = {
            name: file.name,
            size: formattedSize,
            dataUrl: driveUrl,
            type: file.type
          };
          setUploadedPoFile(fileObj);
          setL1UploadPoCopy(driveUrl);
        } else if (resData.error && resData.error.includes("Sheet 'Data' not found")) {
          // Alert user to create sheet 'Data' if missing
          alert(`Google Drive Upload successful, but your Google Spreadsheet is missing a sheet tab named 'Data' to record the upload logs.\n\nPlease add an empty sheet tab named 'Data' in your Google Spreadsheet to prevent this error message.\n\n(We have generated a search link in your Drive folder so you can save and proceed!)`);
          
          const searchUrl = `https://drive.google.com/drive/folders/1HBi8BusMyDY_lQ1b7iJEJQvcuqayThu_`;
          const fileObj = {
            name: file.name,
            size: formattedSize,
            dataUrl: searchUrl,
            type: file.type
          };
          setUploadedPoFile(fileObj);
          setL1UploadPoCopy(searchUrl);
        } else {
          const errorMsg = resData.error || "Unknown error";
          alert(`Google Drive upload failed: ${errorMsg}. Falling back to your shared folder link.`);
          
          const searchUrl = `https://drive.google.com/drive/folders/1HBi8BusMyDY_lQ1b7iJEJQvcuqayThu_`;
          const fileObj = {
            name: file.name,
            size: formattedSize,
            dataUrl: searchUrl,
            type: file.type
          };
          setUploadedPoFile(fileObj);
          setL1UploadPoCopy(searchUrl);
        }
      } catch (err: any) {
        clearInterval(interval);
        console.error("Upload error:", err);
        alert(`Network error uploading to Google Drive: ${err.message}. Falling back to your shared folder link.`);
        
        const searchUrl = `https://drive.google.com/drive/folders/1HBi8BusMyDY_lQ1b7iJEJQvcuqayThu_`;
        const fileObj = {
          name: file.name,
          size: formattedSize,
          dataUrl: searchUrl,
          type: file.type
        };
        setUploadedPoFile(fileObj);
        setL1UploadPoCopy(searchUrl);
      } finally {
        setIsUploadingPo(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleViewPoCopy = (action: ActionEntry) => {
    if (!action.uploadPoCopy) return;
    
    const savedFileJson = localStorage.getItem(`fms_uploaded_file_${action.id}`);
    if (savedFileJson) {
      try {
        const parsed = JSON.parse(savedFileJson);
        if (parsed.dataUrl) {
          const link = document.createElement('a');
          link.href = parsed.dataUrl;
          link.download = parsed.name || 'po_copy';
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          return;
        }
      } catch (e) {
        console.error("Error opening uploaded file:", e);
      }
    }
    
    const text = action.uploadPoCopy.trim();
    if (text.startsWith('http://') || text.startsWith('https://')) {
      window.open(text, '_blank');
    } else {
      const cleaned = text.startsWith('📄') ? text.slice(1).trim() : text;
      alert(`PO Copy Detail: ${cleaned}\n\n(Local file binary data is only accessible on the browser/device that uploaded it).`);
    }
  };

  const handleOpenL1Modal = (entry: ActionEntry) => {
    setL1EditingEntry(entry);
    setL1Planned1(entry.planned1 || '');
    setL1Actual1(entry.actual1 || '');
    setL1TimeDelay1(entry.timeDelay1 || '');
    setL1AreWeL1(entry.areWeL1 || 'Yes');
    setL1WillPurchase(entry.willPurchase || 'No');
    setL1SupplierName(entry.supplierName || '');
    setL1PurchaseQuantity(entry.purchaseQuantity || '');
    setL1PurchaseRate(entry.purchaseRate || '');
    setL1UploadPoCopy(entry.uploadPoCopy || '');
    setL1PaymentTerms(entry.paymentTerms || '');
    setL1ShortageCondition(entry.shortageCondition || '');
    setL1TimeDelay2(entry.timeDelay2 || '0 days');

    // Load file upload details if any
    const savedFileJson = localStorage.getItem(`fms_uploaded_file_${entry.id}`);
    if (savedFileJson) {
      try {
        const parsed = JSON.parse(savedFileJson);
        setUploadedPoFile(parsed);
        setPoCopyMode('upload');
      } catch (e) {
        setUploadedPoFile(null);
        setPoCopyMode('link');
      }
    } else {
      setUploadedPoFile(null);
      // If it looks like a URL, go to link mode. Else default to upload
      if (entry.uploadPoCopy && (entry.uploadPoCopy.trim().startsWith('http') || entry.uploadPoCopy.trim().includes('://') || !entry.uploadPoCopy.startsWith('📄'))) {
        setPoCopyMode('link');
      } else {
        setPoCopyMode('upload');
      }
    }
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
    const finalSupplierName = (l1AreWeL1 === 'Yes' && finalWillPurchase === 'Yes') ? l1SupplierName : '';
    const finalPurchaseQuantity = (l1AreWeL1 === 'Yes' && finalWillPurchase === 'Yes') ? l1PurchaseQuantity : '';
    const finalPurchaseRate = (l1AreWeL1 === 'Yes' && finalWillPurchase === 'Yes') ? l1PurchaseRate : '';
    
    let finalUploadPoCopy = '';
    if (l1AreWeL1 === 'Yes' && finalWillPurchase === 'Yes') {
      if (poCopyMode === 'upload' && uploadedPoFile) {
        finalUploadPoCopy = uploadedPoFile.dataUrl;
        localStorage.setItem(`fms_uploaded_file_${l1EditingEntry.id}`, JSON.stringify(uploadedPoFile));
      } else {
        finalUploadPoCopy = l1UploadPoCopy;
        localStorage.removeItem(`fms_uploaded_file_${l1EditingEntry.id}`);
      }
    } else {
      localStorage.removeItem(`fms_uploaded_file_${l1EditingEntry.id}`);
    }

    const finalPaymentTerms = (l1AreWeL1 === 'Yes' && finalWillPurchase === 'Yes') ? l1PaymentTerms : '';
    const finalShortageCondition = (l1AreWeL1 === 'Yes' && finalWillPurchase === 'Yes') ? l1ShortageCondition : '';
    const finalTimeDelay2 = (l1AreWeL1 === 'Yes' && finalWillPurchase === 'Yes') ? l1TimeDelay2 : '';

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
      finalShortageCondition
    );
    setIsL1Saving(false);
    if (success) {
      setL1EditingEntry(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Create & Manage Entries
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">
            Log new auction records and update their L1 confirmations in real-time.
          </p>
        </div>
        <div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20 transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Auction</span>
          </button>
        </div>
      </div>

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
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
              Filled Auction Entries
            </h3>
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
              Select any filled record below to update its L1 Confirmation values.
            </p>
          </div>

          {/* Quick Search */}
          <div className="w-full md:w-80 relative">
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

        {/* Responsive Table */}
        <div className="overflow-x-auto -mx-6 md:-mx-8">
          <div className="inline-block min-w-full align-middle px-6 md:px-8">
            <div className="overflow-hidden border border-slate-100 dark:border-slate-800/80 rounded-2xl">
              <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                <thead className="bg-slate-50/50 dark:bg-slate-900/50">
                  <tr>
                    <th className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      ID / Date
                    </th>
                    <th className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Company & Product
                    </th>
                    <th className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Qty / Unit
                    </th>
                    <th className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-4 py-3.5 text-left text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      L1 Confirmation Details
                    </th>
                    <th className="px-4 py-3.5 text-right text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Auction
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-transparent">
                  {[...actions]
                    .filter(action => {
                      const lower = listSearchTerm.toLowerCase();
                      return (
                        (action.id || '').toLowerCase().includes(lower) ||
                        (action.companyName || '').toLowerCase().includes(lower) ||
                        (action.productName || '').toLowerCase().includes(lower) ||
                        (action.location || '').toLowerCase().includes(lower) ||
                        (action.timestamp || '').toLowerCase().includes(lower)
                      );
                    })
                    .reverse() // Display newest entries on top
                    .map((action) => {
                      const hasL1 = action.areWeL1 && action.areWeL1.trim().length > 0;
                      const isL1Yes = action.areWeL1 && action.areWeL1.toLowerCase() === 'yes';

                      return (
                        <tr 
                          key={action.id} 
                          className="hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-colors"
                        >
                          {/* ID / Date */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
                                {action.id}
                              </div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                                {action.timestamp}
                              </div>
                            </div>
                          </td>

                          {/* Company / Product */}
                          <td className="px-4 py-4">
                            <div className="space-y-1 max-w-xs">
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                {action.companyName}
                              </div>
                              <div className="text-[11px] text-slate-400 dark:text-slate-400 truncate flex items-center gap-1 font-medium">
                                <Box className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{action.productName}</span>
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
                            <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
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

                              {/* Detailed values hidden per user request */}
                              {action.uploadPoCopy && action.uploadPoCopy.trim().length > 0 && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewPoCopy(action);
                                  }}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-50/70 hover:bg-blue-100/90 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/30 transition-all cursor-pointer"
                                  title="Click to download/open PO Copy"
                                >
                                  <FileText className="w-3 h-3" />
                                  <span>View PO</span>
                                </button>
                              )}
                            </div>
                          </td>

                          {/* Action Button */}
                          <td className="px-4 py-4 whitespace-nowrap text-right">
                            <button
                              onClick={() => handleOpenL1Modal(action)}
                              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-[11px] font-bold rounded-xl transition-all flex items-center gap-1 ml-auto cursor-pointer"
                            >
                              <Clock3 className="w-3.5 h-3.5 text-blue-500" />
                              <span>L1 Confirmation</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                  {actions.filter(action => {
                    const lower = listSearchTerm.toLowerCase();
                    return (
                      (action.id || '').toLowerCase().includes(lower) ||
                      (action.companyName || '').toLowerCase().includes(lower) ||
                      (action.productName || '').toLowerCase().includes(lower) ||
                      (action.location || '').toLowerCase().includes(lower)
                    );
                  }).length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-xs text-slate-400 dark:text-slate-500 italic">
                        No transactions logged yet or matched your search. Click "Log New Entry" to create one.
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
            className="relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl max-w-md w-full shadow-2xl p-6 overflow-y-auto max-h-[90vh] z-10 space-y-6"
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

                {/* Purchase Allocation Form Fields */}
                {l1AreWeL1 === 'Yes' && l1WillPurchase === 'Yes' && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/80"
                  >
                    <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-3 space-y-3">
                      <h4 className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Purchase Allocation Details</span>
                      </h4>

                      {/* Supplier Name */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                          Supplier Name
                        </label>
                        <input
                          type="text"
                          value={l1SupplierName}
                          onChange={(e) => setL1SupplierName(e.target.value)}
                          placeholder="Enter Supplier Name"
                          required
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
                            value={l1PurchaseQuantity}
                            onChange={(e) => setL1PurchaseQuantity(e.target.value)}
                            placeholder="Qty"
                            required
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
                            value={l1PurchaseRate}
                            onChange={(e) => setL1PurchaseRate(e.target.value)}
                            placeholder="Rate"
                            required
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-semibold"
                          />
                        </div>
                      </div>

                      {/* Upload Po Copy */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                            PO Copy (URL or File Upload)
                          </label>
                          
                          {/* Mode Toggle Tabs */}
                          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200/50 dark:border-slate-700/50">
                            <button
                              type="button"
                              onClick={() => setPoCopyMode('upload')}
                              className={`px-2 py-0.5 rounded-md text-[9px] font-bold transition-all cursor-pointer ${
                                poCopyMode === 'upload'
                                  ? 'bg-white dark:bg-slate-900 shadow-sm text-blue-650 font-extrabold dark:text-blue-400'
                                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                              }`}
                            >
                              Upload File
                            </button>
                            <button
                              type="button"
                              onClick={() => setPoCopyMode('link')}
                              className={`px-2 py-0.5 rounded-md text-[9px] font-bold transition-all cursor-pointer ${
                                poCopyMode === 'link'
                                  ? 'bg-white dark:bg-slate-900 shadow-sm text-blue-655 font-extrabold dark:text-blue-400'
                                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                              }`}
                            >
                              Web Link / Text
                            </button>
                          </div>
                        </div>

                        {poCopyMode === 'upload' ? (
                          <div className="space-y-2">
                            {/* Drag & Drop Zone */}
                            {!uploadedPoFile && !isUploadingPo && (
                              <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleFileDrop}
                                className={`border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-1.5 ${
                                  isDragging
                                    ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/10'
                                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/20'
                                }`}
                                onClick={() => document.getElementById('po-file-input')?.click()}
                              >
                                <input
                                  id="po-file-input"
                                  type="file"
                                  className="hidden"
                                  onChange={handleFileChange}
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
                            {isUploadingPo && (
                              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-white dark:bg-slate-900 space-y-2">
                                <div className="flex items-center justify-between text-[9px]">
                                  <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1.5 animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                                    Uploading PO Copy...
                                  </span>
                                  <span className="text-slate-500 font-bold">{uploadProgress}%</span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                                  <div 
                                    className="bg-blue-600 h-full rounded-full transition-all duration-150" 
                                    style={{ width: `${uploadProgress}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Uploaded File View Card */}
                            {uploadedPoFile && !isUploadingPo && (
                              <div className="border border-slate-100 dark:border-slate-800/80 rounded-xl p-2.5 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between gap-3 shadow-sm border-l-2 border-l-emerald-500">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="p-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0 space-y-0.5">
                                    <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate max-w-[130px]">
                                      {uploadedPoFile.name}
                                    </p>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[8px] text-slate-400 font-semibold">{uploadedPoFile.size}</span>
                                      <span className="w-0.5 h-0.5 rounded-full bg-slate-300" />
                                      <span className="text-[8px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                                        <Check className="w-2.5 h-2.5" /> Ready
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const link = document.createElement('a');
                                      link.href = uploadedPoFile.dataUrl;
                                      link.download = uploadedPoFile.name;
                                      link.click();
                                    }}
                                    className="px-1.5 py-0.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-[8px] font-bold rounded-md border border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
                                  >
                                    Get
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setUploadedPoFile(null);
                                      setL1UploadPoCopy('');
                                    }}
                                    className="p-1 rounded-md bg-white dark:bg-slate-900 hover:bg-rose-50 text-rose-600 border border-slate-200/60 dark:border-slate-800 cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Paste Link Input */
                          <div className="relative">
                            <input
                              type="text"
                              value={l1UploadPoCopy.startsWith('📄') ? '' : l1UploadPoCopy}
                              onChange={(e) => setL1UploadPoCopy(e.target.value)}
                              placeholder="Paste Google Drive, OneDrive Link or enter details..."
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-semibold"
                            />
                          </div>
                        )}
                      </div>

                      {/* Payment Terms and Condition */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                          Payment Terms & Conditions
                        </label>
                        <textarea
                          rows={2}
                          value={l1PaymentTerms}
                          onChange={(e) => setL1PaymentTerms(e.target.value)}
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
                          value={l1ShortageCondition}
                          onChange={(e) => setL1ShortageCondition(e.target.value)}
                          placeholder="Enter shortage condition..."
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-semibold resize-none"
                        />
                      </div>

                      {/* Time Delay 2 */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
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
    </div>
  );
}
