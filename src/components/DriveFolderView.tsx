import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Folder, 
  ExternalLink, 
  Copy, 
  Check, 
  Grid, 
  List, 
  FileText, 
  RefreshCw,
  Search,
  ChevronRight,
  ArrowLeft,
  Download,
  Image as ImageIcon,
  FileSpreadsheet,
  FileArchive,
  Upload,
  Eye,
  Trash2,
  FolderOpen,
  LayoutGrid,
  Loader2
} from 'lucide-react';
import { getActionsFromSheet, getDispatchRows } from '../api';

interface DriveFolderViewProps {
  folderId: string;
  onAddToast?: (type: 'success' | 'error' | 'info', title: string, desc: string) => void;
}

interface FileItem {
  id: string;
  name: string;
  size: string;
  date: string;
  owner: string;
  type: 'image' | 'pdf' | 'excel' | 'archive' | 'doc';
  url: string;
  indentId?: string;
  companyName?: string;
}

interface FolderItem {
  id: string;
  name: string;
  color: string;
  description: string;
  itemCount: number;
  subtitle?: string; // e.g. Company Name for Indent mode
}

export default function DriveFolderView({ folderId, onAddToast }: DriveFolderViewProps) {
  // Browsing Mode: 'category' (Browse by type) or 'indent' (Browse by Indent ID)
  const [browsingMode, setBrowsingMode] = useState<'category' | 'indent'>('category');
  const [currentFolder, setCurrentFolder] = useState<string | null>(null); // null = root
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Form states for local file mock upload
  const [newFileName, setNewFileName] = useState('');
  const [newFileType, setNewFileType] = useState<'image' | 'pdf' | 'excel'>('image');
  const [newFileSize, setNewFileSize] = useState('145 KB');

  // Files state
  const [categoryFiles, setCategoryFiles] = useState<Record<string, FileItem[]>>({
    documents: [],
    reports: [],
    contracts: [],
    invoices: []
  });
  const [indentFiles, setIndentFiles] = useState<Record<string, FileItem[]>>({});
  const [indentMetadata, setIndentMetadata] = useState<Record<string, { companyName: string; date: string }>>({});

  // Fetch real files from Sheets database + merge with mock files
  const loadRealFiles = async (silent = false) => {
    if (!silent) setIsLoadingData(true);
    try {
      const [actionsRes, dispatchRes] = await Promise.all([
        getActionsFromSheet(),
        getDispatchRows()
      ]);

      const extractedFiles: FileItem[] = [];

      const isValidUrl = (url: any) => {
        if (!url || typeof url !== 'string') return false;
        const clean = url.trim();
        return clean.startsWith('http://') || clean.startsWith('https://');
      };

      const getFileName = (url: string, defaultName: string) => {
        try {
          const parts = url.split('/');
          const last = parts[parts.length - 1];
          if (last.includes('.')) return decodeURIComponent(last.split('?')[0]);
        } catch (e) {}
        return defaultName;
      };

      const getFileType = (name: string): FileItem['type'] => {
        const ext = name.split('.').pop()?.toLowerCase();
        if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return 'excel';
        if (ext === 'pdf') return 'pdf';
        if (ext === 'zip' || ext === 'rar') return 'archive';
        if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'gif') return 'image';
        return 'doc';
      };

      // 1. Extract from Actions (FMS)
      if (actionsRes.success && actionsRes.data) {
        actionsRes.data.forEach((action) => {
          if (isValidUrl(action.uploadPoCopy)) {
            const url = action.uploadPoCopy!.trim();
            const name = getFileName(url, `PO_Copy_${action.id}.pdf`);
            extractedFiles.push({
              id: `act-po-${action.id}`,
              name,
              size: '412 KB',
              date: action.timestamp || 'Jul 14',
              owner: 'Sales Dept',
              type: getFileType(name),
              url,
              indentId: action.id,
              companyName: action.companyName
            });
          }
        });
      }

      // 2. Extract from Dispatch
      if (dispatchRes.success && dispatchRes.data) {
        dispatchRes.data.forEach((row) => {
          const fileFields = [
            { key: 'uploadTransportationBill', label: 'Trans_Bill' },
            { key: 'invoiceVendor', label: 'Vendor_Invoice' },
            { key: 'taxInvoiceWayBill', label: 'Tax_Invoice_Waybill' },
            { key: 'uploadReceiving', label: 'Receiving_Challan' },
            { key: 'uploadVendorCreditNote', label: 'Vendor_Credit_Note' },
            { key: 'uploadCreditNotePPPL', label: 'PPPL_Credit_Note' },
            { key: 'uploadReceivedOfPayment', label: 'Payment_Receipt' },
            { key: 'uploadInvoiceEwayBill', label: 'Invoice_Eway_Bill' },
            { key: 'transportBill', label: 'Transport_Bill' }
          ];

          fileFields.forEach((field) => {
            const val = (row as any)[field.key];
            if (isValidUrl(val)) {
              const url = val.trim();
              const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase() || 'pdf';
              const name = `${field.label}_${row.dispatchId || row.id}.${ext}`;
              extractedFiles.push({
                id: `dsp-${field.key}-${row.rowIndex}`,
                name,
                size: '280 KB',
                date: row.timestamp || 'Jul 14',
                owner: 'Accounts Dept',
                type: getFileType(name),
                url,
                indentId: row.id,
                companyName: row.companyName
              });
            }
          });
        });
      }

      // Prepopulate Categories
      const newCategoryFiles: Record<string, FileItem[]> = {
        documents: [
          { id: 'doc-1', name: '61pPbNB0vCL._SY741_.jpg', size: '242 KB', date: '2:01 am', owner: 'Piramal Petroleum', type: 'image', url: '#' },
          { id: 'doc-2', name: '61pPbNB0vCL._SY741_.jpg', size: '242 KB', date: '2:01 am', owner: 'Piramal Petroleum', type: 'image', url: '#' },
          { id: 'doc-3', name: '61pPbNB0vCL._SY741_.jpg', size: '242 KB', date: '2:00 am', owner: 'Piramal Petroleum', type: 'image', url: '#' },
          { id: 'doc-4', name: '61pPbNB0vCL._SY741_.jpg', size: '242 KB', date: '1:58 am', owner: 'Piramal Petroleum', type: 'image', url: '#' },
          { id: 'doc-5', name: '61pPbNB0vCL._SY741_.jpg', size: '242 KB', date: '1:56 am', owner: 'Piramal Petroleum', type: 'image', url: '#' },
          { id: 'doc-6', name: '61pPbNB0vCL._SY741_.jpg', size: '242 KB', date: '1:54 am', owner: 'Piramal Petroleum', type: 'image', url: '#' },
          { id: 'doc-7', name: '61pPbNB0vCL._SY741_.jpg', size: '242 KB', date: '1:52 am', owner: 'Piramal Petroleum', type: 'image', url: '#' },
          { id: 'doc-8', name: '61pPbNB0vCL._SY741_.jpg', size: '242 KB', date: 'Jul 11', owner: 'Piramal Petroleum', type: 'image', url: '#' },
          { id: 'doc-9', name: '61ZVDxskrwL._SY741_.jpg', size: '318 KB', date: '2:01 am', owner: 'Piramal Petroleum', type: 'image', url: '#' },
          { id: 'doc-10', name: '61ZVDxskrwL._SY741_.jpg', size: '318 KB', date: '2:00 am', owner: 'Piramal Petroleum', type: 'image', url: '#' },
          { id: 'doc-11', name: 'a.png', size: '125 KB', date: 'Jul 13', owner: 'Piramal Petroleum', type: 'image', url: '#' }
        ],
        reports: [
          { id: 'rep-1', name: 'Monthly_Sales_Report_Q2.xlsx', size: '1.4 MB', date: 'Jul 10', owner: 'Admin User', type: 'excel', url: '#' },
          { id: 'rep-2', name: 'Logistics_Performance_Summary.pdf', size: '890 KB', date: 'Jul 08', owner: 'Manager', type: 'pdf', url: '#' },
          { id: 'rep-3', name: 'Auction_Summary_July.pdf', size: '2.1 MB', date: 'Jul 12', owner: 'Admin User', type: 'pdf', url: '#' }
        ],
        contracts: [
          { id: 'con-1', name: 'Piramal_Petroleum_Agreement_Final.pdf', size: '4.2 MB', date: 'Jun 28', owner: 'Legal Dept', type: 'pdf', url: '#' },
          { id: 'con-2', name: 'Supplier_Standard_Terms_v4.pdf', size: '1.1 MB', date: 'Jul 02', owner: 'Manager', type: 'pdf', url: '#' }
        ],
        invoices: [
          { id: 'inv-1', name: 'INV-2026-90812.pdf', size: '142 KB', date: 'Jul 13', owner: 'Accounts', type: 'pdf', url: '#' },
          { id: 'inv-2', name: 'INV-2026-90813.pdf', size: '158 KB', date: 'Jul 14', owner: 'Accounts', type: 'pdf', url: '#' }
        ]
      };

      // Prepopulate Indent IDs
      const newIndentFiles: Record<string, FileItem[]> = {
        'IND/0': [
          { id: 'ind-0-1', name: 'PO_Copy_IND-0.pdf', size: '180 KB', date: '08/07/2026', owner: 'demo', type: 'pdf', url: '#' }
        ],
        'IND/1': [
          { id: 'ind-1-1', name: 'PO_Copy_IND-1.pdf', size: '320 KB', date: '08/07/2026', owner: 'Reliance Industries', type: 'pdf', url: '#' }
        ],
        'IND/2': [
          { id: 'ind-2-1', name: 'PO_Copy_IND-2.pdf', size: '290 KB', date: '09/07/2026', owner: 'Tata Motors', type: 'pdf', url: '#' }
        ]
      };

      const newIndentMetadata: Record<string, { companyName: string; date: string }> = {
        'IND/0': { companyName: 'demo', date: '08/07/2026' },
        'IND/1': { companyName: 'Reliance Industries', date: '08/07/2026' },
        'IND/2': { companyName: 'Tata Motors', date: '09/07/2026' }
      };

      // Populate extracted files into the correct categories and indents
      extractedFiles.forEach((file) => {
        // Sort into categories
        if (file.type === 'image') {
          newCategoryFiles.documents.push(file);
        } else if (file.type === 'excel') {
          newCategoryFiles.reports.push(file);
        } else if (file.type === 'pdf' && file.name.toLowerCase().includes('invoice')) {
          newCategoryFiles.invoices.push(file);
        } else if (file.type === 'pdf' && file.name.toLowerCase().includes('contract')) {
          newCategoryFiles.contracts.push(file);
        } else {
          newCategoryFiles.documents.push(file);
        }

        // Sort into Indent ID folders
        if (file.indentId) {
          if (!newIndentFiles[file.indentId]) {
            newIndentFiles[file.indentId] = [];
          }
          newIndentFiles[file.indentId].push(file);
          newIndentMetadata[file.indentId] = {
            companyName: file.companyName || 'Unknown Party',
            date: file.date
          };
        }
      });

      setCategoryFiles(newCategoryFiles);
      setIndentFiles(newIndentFiles);
      setIndentMetadata(newIndentMetadata);

    } catch (err) {
      console.error('Failed to parse database files', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadRealFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadRealFiles(true).then(() => {
      setIsRefreshing(false);
      if (onAddToast) {
        onAddToast('success', 'Shared Drive Synced', 'Successfully refreshed files and folder hierarchy.');
      }
    });
  };

  const handleCopyLink = (fileId: string) => {
    navigator.clipboard.writeText(`https://drive.google.com/open?id=${fileId}`);
    setCopiedId(fileId);
    if (onAddToast) {
      onAddToast('success', 'Link Copied', 'Shared file link copied to clipboard.');
    }
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName || !currentFolder) return;

    const newFile: FileItem = {
      id: `custom-${Date.now()}`,
      name: newFileName.endsWith(`.${newFileType === 'excel' ? 'xlsx' : newFileType === 'pdf' ? 'pdf' : 'jpg'}`) 
        ? newFileName 
        : `${newFileName}.${newFileType === 'excel' ? 'xlsx' : newFileType === 'pdf' ? 'pdf' : 'jpg'}`,
      size: newFileSize || '120 KB',
      date: 'Just Now',
      owner: 'Admin User',
      type: newFileType,
      url: '#'
    };

    if (browsingMode === 'category') {
      setCategoryFiles(prev => ({
        ...prev,
        [currentFolder]: [newFile, ...(prev[currentFolder] || [])]
      }));
    } else {
      setIndentFiles(prev => ({
        ...prev,
        [currentFolder]: [newFile, ...(prev[currentFolder] || [])]
      }));
    }

    setIsUploadModalOpen(false);
    setNewFileName('');
    if (onAddToast) {
      onAddToast('success', 'File Uploaded', 'New document added successfully to the folder.');
    }
  };

  const handleDeleteFile = (fileId: string) => {
    if (!currentFolder) return;
    if (browsingMode === 'category') {
      setCategoryFiles(prev => ({
        ...prev,
        [currentFolder]: (prev[currentFolder] || []).filter(f => f.id !== fileId)
      }));
    } else {
      setIndentFiles(prev => ({
        ...prev,
        [currentFolder]: (prev[currentFolder] || []).filter(f => f.id !== fileId)
      }));
    }
    if (onAddToast) {
      onAddToast('info', 'File Deleted', 'Document removed from local shared view.');
    }
  };

  const getFileIcon = (type: FileItem['type']) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="w-5 h-5 text-blue-500" />;
      case 'pdf':
        return <FileText className="w-5 h-5 text-rose-500" />;
      case 'excel':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
      case 'archive':
        return <FileArchive className="w-5 h-5 text-amber-500" />;
      default:
        return <FileText className="w-5 h-5 text-slate-500" />;
    }
  };

  // Get active list of folders/categories
  const getFoldersList = (): FolderItem[] => {
    if (browsingMode === 'category') {
      return [
        { id: 'documents', name: 'Documents', color: 'from-blue-500 to-indigo-600', description: 'Receipt images, uploads, and media attachments.', itemCount: categoryFiles.documents?.length || 0 },
        { id: 'reports', name: 'Reports', color: 'from-emerald-500 to-teal-600', description: 'Excel spreadsheets, status sheets, and audits.', itemCount: categoryFiles.reports?.length || 0 },
        { id: 'contracts', name: 'Contracts', color: 'from-violet-500 to-purple-600', description: 'Legal agreements and supply conditions.', itemCount: categoryFiles.contracts?.length || 0 },
        { id: 'invoices', name: 'Invoices', color: 'from-amber-500 to-orange-600', description: 'Sales invoices and payment records.', itemCount: categoryFiles.invoices?.length || 0 }
      ];
    } else {
      // Group by Indent ID
      return Object.keys(indentFiles).map((id) => {
        const meta = indentMetadata[id] || { companyName: 'Mock Client', date: 'Jul 14' };
        return {
          id,
          name: id,
          color: 'from-slate-650 to-slate-800 dark:from-slate-800 dark:to-slate-900',
          description: `All files mapped to Order Indent ${id}`,
          itemCount: indentFiles[id]?.length || 0,
          subtitle: meta.companyName
        };
      });
    }
  };

  // Filter current files inside selected folder
  const currentFilesList = currentFolder 
    ? (browsingMode === 'category' ? categoryFiles[currentFolder] : indentFiles[currentFolder]) || [] 
    : [];

  const filteredFiles = currentFilesList.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    f.owner.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFolders = getFoldersList().filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.subtitle && f.subtitle.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Folder className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            <span>Shared Documents Drive</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-medium">
            Browse reports, contracts, invoices, and other distribution assets in real-time inside your shared drive.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Category vs Indent ID (Only visible at root level) */}
          {!currentFolder && (
            <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800 mr-2 shadow-sm">
              <button
                onClick={() => setBrowsingMode('category')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  browsingMode === 'category'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>By Category</span>
              </button>
              <button
                onClick={() => setBrowsingMode('indent')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  browsingMode === 'indent'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>By Indent ID</span>
              </button>
            </div>
          )}

          {/* Refresh Frame */}
          <button
            onClick={handleRefresh}
            className="p-2.5 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-950/60 rounded-xl transition-all cursor-pointer bg-white dark:bg-slate-900 shadow-sm"
            title="Refresh View"
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4.5 h-4.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* List vs Grid togglers (Only visible inside folder) */}
          {currentFolder && (
            <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800">
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
          )}

          {currentFolder && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Document</span>
            </button>
          )}
        </div>
      </div>

      {/* Explorer Controls: Breadcrumbs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-150 dark:border-slate-800/80">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-1.5 text-sm font-bold">
          <button 
            onClick={() => setCurrentFolder(null)}
            className={`transition-colors hover:text-blue-600 cursor-pointer ${!currentFolder ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'}`}
          >
            Drive Root ({browsingMode === 'category' ? 'Categories' : 'Indents'})
          </button>
          
          {currentFolder && (
            <>
              <ChevronRight className="w-4 h-4 text-slate-400" />
              <span className="text-slate-900 dark:text-white capitalize px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-xs font-extrabold text-blue-600 dark:text-blue-400">
                {browsingMode === 'indent' ? 'Indent ID: ' : ''}{currentFolder}
              </span>
            </>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder={currentFolder ? `Search in this folder...` : "Search folders..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 pl-10 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Loading State */}
      {isLoadingData ? (
        <div className="py-24 text-center">
          <Loader2 className="w-10 h-10 text-blue-650 dark:text-blue-405 animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Aggregating Shared Drive Documents...</p>
        </div>
      ) : (
        /* Explorer Body */
        <div>
          <AnimatePresence mode="wait">
            {/* Root Level: Folders View */}
            {!currentFolder && (
              <motion.div
                key="root-folders"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
              >
                {filteredFolders.map((folder) => (
                  <motion.div
                    key={folder.id}
                    whileHover={{ y: -4, scale: 1.01 }}
                    onClick={() => { setCurrentFolder(folder.id); setSearchQuery(''); }}
                    className="group relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer"
                  >
                    {/* Glowing background hint */}
                    <div className={`absolute top-0 left-0 w-2.5 h-full bg-gradient-to-b ${folder.color}`} />
                    
                    <div className="flex items-start justify-between">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${folder.color} flex items-center justify-center text-white shadow-md`}>
                        {browsingMode === 'category' ? (
                          <Folder className="w-6 h-6 fill-white/10" />
                        ) : (
                          <FolderOpen className="w-6 h-6 fill-white/10" />
                        )}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded-lg">
                        {folder.itemCount} items
                      </span>
                    </div>

                    <div className="mt-6 space-y-2">
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                        {folder.name}
                      </h3>
                      {folder.subtitle && (
                        <p className="text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-wider line-clamp-1">
                          {folder.subtitle}
                        </p>
                      )}
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed font-semibold">
                        {folder.description}
                      </p>
                    </div>
                  </motion.div>
                ))}

                {filteredFolders.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-400 font-bold">
                    No folders match your search query.
                  </div>
                )}
              </motion.div>
            )}

            {/* Folder Level: Files View */}
            {currentFolder && (
              <motion.div
                key="folder-files"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Back to Root Row */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => { setCurrentFolder(null); setSearchQuery(''); }}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer group"
                  >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    <span>Back to Folders</span>
                  </button>
                </div>

                {/* Gallery / Grid Style for Documents Folder */}
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredFiles.map((file) => (
                      <motion.div
                        key={file.id}
                        whileHover={{ y: -4 }}
                        className="group bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col"
                      >
                        {/* Visual Preview Section (Gallery Look) */}
                        <div className="relative aspect-video w-full bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200/60 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800/50 flex items-center justify-center overflow-hidden border-b border-slate-150 dark:border-slate-800/60">
                          {file.type === 'image' ? (
                            // Render beautiful premium dummy scan illustration/thumbnail
                            <div className="absolute inset-0 p-4 flex flex-col justify-between">
                              <div className="w-full flex items-center justify-between">
                                <span className="text-[8px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200/40 dark:border-blue-800/40">IMG</span>
                                <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                              </div>
                              <div className="space-y-1.5 text-center mt-2">
                                <div className="w-12 h-10 mx-auto rounded bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-sm">
                                  <span className="text-[9px] font-bold text-slate-400">JPG</span>
                                </div>
                                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">{file.size}</p>
                              </div>
                              <div className="flex items-center justify-between text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                                <span>Modified</span>
                                <span>{file.date}</span>
                              </div>
                            </div>
                          ) : (
                            // Render PDF or Excel card style
                            <div className="absolute inset-0 p-4 flex flex-col justify-between">
                              <div className="w-full flex items-center justify-between">
                                <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                                  file.type === 'pdf' 
                                    ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200/40 dark:border-rose-800/40' 
                                    : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/40 dark:border-emerald-800/40'
                                }`}>{file.type}</span>
                                {getFileIcon(file.type)}
                              </div>
                              <div className="space-y-1 text-center">
                                <FileText className={`w-8 h-8 mx-auto ${file.type === 'pdf' ? 'text-rose-400' : 'text-emerald-400'}`} />
                                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">{file.size}</p>
                              </div>
                              <div className="flex items-center justify-between text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                                <span>Modified</span>
                                <span>{file.date}</span>
                              </div>
                            </div>
                          )}

                          {/* Hover Overlay Controls */}
                          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                            <button
                              onClick={() => handleCopyLink(file.id)}
                              className="p-2 bg-white/95 text-slate-800 hover:text-blue-600 rounded-xl transition-all hover:scale-105 cursor-pointer shadow-md"
                              title="Copy Link"
                            >
                              {copiedId === file.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                            </button>
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 bg-white/95 text-slate-800 hover:text-blue-600 rounded-xl transition-all hover:scale-105 cursor-pointer shadow-md flex items-center justify-center"
                              title="View File"
                            >
                              <Eye className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => handleDeleteFile(file.id)}
                              className="p-2 bg-white/95 text-rose-600 hover:bg-rose-50 rounded-xl transition-all hover:scale-105 cursor-pointer shadow-md"
                              title="Delete File"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* File Info */}
                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div className="space-y-1">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" title={file.name}>
                              {file.name}
                            </h4>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
                              <span>{file.owner}</span>
                              <span>{file.size}</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  /* List Style */
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white/50 dark:bg-slate-900/50 shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          <th className="px-4 py-3">Title</th>
                          <th className="px-4 py-3">Owner</th>
                          <th className="px-4 py-3">Last Modified</th>
                          <th className="px-4 py-3">Size</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-semibold">
                        {filteredFiles.map((file) => (
                          <tr key={file.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors group">
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-2.5">
                                {getFileIcon(file.type)}
                                <span className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                  {file.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">
                              {file.owner}
                            </td>
                            <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400">
                              {file.date}
                            </td>
                            <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 uppercase">
                              {file.size}
                            </td>
                            <td className="px-4 py-3.5 text-right space-x-2">
                              <button
                                onClick={() => handleCopyLink(file.id)}
                                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 inline-block cursor-pointer transition-colors"
                                title="Copy Link"
                              >
                                {copiedId === file.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                              </button>
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 text-slate-400 hover:text-blue-600 inline-block cursor-pointer transition-colors"
                                title="Open File"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                              <button
                                onClick={() => handleDeleteFile(file.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 inline-block cursor-pointer transition-colors"
                                title="Delete File"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {filteredFiles.length === 0 && (
                  <div className="py-12 text-center text-slate-400 font-bold">
                    No files found in this folder.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Mock Document Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm transition-opacity" onClick={() => setIsUploadModalOpen(false)} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl max-w-md w-full shadow-2xl p-6 sm:p-8 z-10 space-y-6"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shrink-0">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">Upload New Document</h3>
                  <p className="text-[10px] text-slate-400 font-semibold">Adding to: {currentFolder}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleAddFile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1">File Name</label>
                <input
                  type="text"
                  required
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="e.g. Receipt_Invoice_981"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1">File Type</label>
                  <select
                    value={newFileType}
                    onChange={(e) => setNewFileType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-350 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                  >
                    <option value="image">Image (.jpg/png)</option>
                    <option value="pdf">PDF Document (.pdf)</option>
                    <option value="excel">Excel Sheet (.xlsx)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1">File Size</label>
                  <input
                    type="text"
                    value={newFileSize}
                    onChange={(e) => setNewFileSize(e.target.value)}
                    placeholder="e.g. 242 KB"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Upload</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
