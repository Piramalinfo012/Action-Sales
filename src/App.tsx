import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Menu, 
  X, 
  Database, 
  AlertCircle, 
  CheckCircle, 
  Info, 
  LayoutDashboard, 
  PlusCircle, 
  Clock, 
  History, 
  BarChart3, 
  FolderOpen,
  Settings as SettingsIcon, 
  LogOut, 
  BellRing,
  Sun,
  Moon,
  Activity,
  ChevronDown,
  ChevronRight,
  Truck,
  PackageCheck,
  FileText,
  CreditCard,
  Users,
  User as UserIcon
} from 'lucide-react';
import { User, ActionEntry, Supplier, SidebarTab } from './types';
import {
  getActionsFromSheet,
  insertActionToSheet,
  updateActionInSheet,
  updateL1ConfirmationInSheet,
  deleteActionFromSheet,
  getUsersFromSheet,
  syncSuppliersToAllocation
} from './api';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import NewActionView from './components/NewActionView';
import DispatchPlanningView from './components/DispatchPlanningView';
import DispatchStatusView from './components/DispatchStatusView';
import MaterialReceiptView from './components/MaterialReceiptView';
import HistoryView from './components/HistoryView';
import CreditNoteView from './components/CreditNoteView';
import PaymentConfirmView from './components/PaymentConfirmView';
import MakePaymentView from './components/MakePaymentView';
import SettingsView from './components/SettingsView';
import UserSettingsView from './components/UserSettingsView';
import LoginView from './components/LoginView';
import DriveFolderView from './components/DriveFolderView';
import ChatboxWidget from './components/ChatboxWidget';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  desc: string;
}

function TypewriterDeveloperText() {
  const [displayedDevText, setDisplayedDevText] = useState("");

  useEffect(() => {
    const fullText = "DEVELOPED BY DEEPAK SAHU";
    let index = 0;
    let isDeleting = false;
    let timer: any;

    const type = () => {
      setDisplayedDevText(fullText.slice(0, index));

      if (!isDeleting && index < fullText.length) {
        index++;
        timer = setTimeout(type, 150);
      } else if (isDeleting && index > 0) {
        index--;
        timer = setTimeout(type, 75);
      } else if (index === fullText.length) {
        timer = setTimeout(() => {
          isDeleting = true;
          type();
        }, 3000);
      } else if (index === 0) {
        isDeleting = false;
        timer = setTimeout(type, 800);
      }
    };

    type();
    return () => clearTimeout(timer);
  }, []);

  return (
    <span className="text-transparent bg-clip-text animate-shine drop-shadow-sm flex items-center gap-1.5 font-black">
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 dark:bg-emerald-400 opacity-60"></span>
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-600 dark:bg-emerald-500"></span>
      </span>
      <span>{displayedDevText}</span>
      <span className="animate-pulse w-1 h-3 bg-indigo-600 dark:bg-cyan-400 inline-block ml-0.5 shrink-0" />
    </span>
  );
}

export default function App() {
  // --- 1. Authentic Session Management ---
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState<SidebarTab>('dashboard');
  const [actions, setActions] = useState<ActionEntry[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const [driveFolderId, setDriveFolderId] = useState(() => {
    return localStorage.getItem('driveFolderId') || '1HBi8BusMyDY_lQ1b7iJEJQvcuqayThu_';
  });

  const handleUpdateDriveFolderId = (id: string) => {
    setDriveFolderId(id);
    localStorage.setItem('driveFolderId', id);
    addToast('success', 'Shared Drive Synchronized', 'Google Drive shared folder reference has been updated successfully!');
  };
  
  // Mobile drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileDispatchOpen, setIsMobileDispatchOpen] = useState(activeTab === 'pending' || activeTab === 'dispatch-status');

  // Toast notifications state
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, desc: string) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, type, title, desc }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  // Toggle dark mode classes
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Remove duplicate entries so counts never appear doubled. IDs (e.g. IND/1)
  // are unique, so we collapse by ID; rows without an ID fall back to their
  // content so distinct blank-ID rows are still kept separate.
  const dedupeActions = (list: ActionEntry[]): ActionEntry[] => {
    const seen = new Set<string>();
    return list.filter((a) => {
      const id = (a.id ?? '').trim();
      // Skip blank local-* offline entries that have no real data
      if (id.startsWith('local-') && !a.companyName?.trim() && !a.productName?.trim()) return false;
      const key = id && !id.startsWith('local-')
        ? `id:${id.toLowerCase()}`
        : `row:${a.rowIndex ?? Math.random()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  // Load action logs from Google Sheet or Offline fallback
  const loadActions = async (showNotification = false) => {
    setIsRefreshing(true);
    try {
      const res = await getActionsFromSheet();
      if (res.success && res.data) {
        setActions(dedupeActions(res.data));
        setIsOffline(false);
        if (showNotification) {
          addToast('success', 'Database Synchronized', 'Fetched latest transactions from Google Sheet!');
        }
      } else {
        // Fallback to offline LocalStorage
        setIsOffline(true);
        const stored = localStorage.getItem('offlineActions');
        if (stored) {
          setActions(dedupeActions(JSON.parse(stored)));
        }
        if (showNotification) {
          addToast('info', 'Offline Cache', 'Loaded local sales auctions offline (Sheet "Data" not ready yet).');
        }
      }
    } catch (err: any) {
      setIsOffline(true);
      const stored = localStorage.getItem('offlineActions');
      if (stored) {
        setActions(dedupeActions(JSON.parse(stored)));
      }
      addToast('error', 'Sync Timed Out', 'Operating in Offline Mode due to slow sheets connectivity.');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Remove hash from URL if it exists (cleanup from old dummy links)
  useEffect(() => {
    if (window.location.hash === '#') {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  // Trigger loading logs on mount or session change
  useEffect(() => {
    if (user) {
      loadActions();
    }
  }, [user]);

  // Keep the list in sync with the sheet: re-fetch when the tab regains focus
  // and poll periodically, so edits made directly in Google Sheets show up here
  // without needing a manual refresh.
  useEffect(() => {
    if (!user) return;

    const refresh = () => {
      if (document.visibilityState === 'visible') {
        loadActions();
      }
    };

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    const intervalId = window.setInterval(refresh, 30000); // every 30s

    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.clearInterval(intervalId);
    };
  }, [user]);

  // Re-fetch every time the user switches views so any edits made directly in the
  // sheet are reflected immediately when navigating (not just on the 30s poll).
  useEffect(() => {
    if (user) {
      loadActions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // --- CRUD API handlers ---
  const handleAddAction = async (newEntry: ActionEntry): Promise<boolean> => {
    let success = false;
    
    if (isOffline) {
      // Local fallback insert
      const updated = [newEntry, ...actions];
      setActions(updated);
      localStorage.setItem('offlineActions', JSON.stringify(updated));
      success = true;
      addToast('success', 'Transaction Saved Offline', 'Sales action logged in Local Storage cache!');
    } else {
      // Remote insert
      const res = await insertActionToSheet(newEntry);
      if (res.success) {
        // Show the new row instantly, then re-sync row indexes from the sheet in
        // the background so the modal closes without waiting for a second fetch.
        setActions((prev: ActionEntry[]) => dedupeActions([newEntry, ...prev]));
        success = true;
        addToast('success', 'Database Updated', 'Sales action saved securely to Google Sheets!');
        loadActions(); // background refresh (not awaited)
      } else {
        addToast('error', 'Remote Sync Failed', res.error || 'Failed to insert to Google Sheet.');
      }
    }
    return success;
  };

  const handleUpdateAction = async (rowIndex: number, updatedEntry: ActionEntry): Promise<boolean> => {
    let success = false;
    
    if (isOffline) {
      // Local fallback update
      const updatedList = actions.map((a) => a.id === updatedEntry.id ? updatedEntry : a);
      setActions(updatedList);
      localStorage.setItem('offlineActions', JSON.stringify(updatedList));
      success = true;
      addToast('success', 'Transaction Updated', 'Changes saved locally.');
    } else {
      // Remote sheet update
      const res = await updateActionInSheet(rowIndex, updatedEntry);
      if (res.success) {
        setActions((prev) => prev.map((a) => a.id === updatedEntry.id ? updatedEntry : a));
        loadActions(); // background refresh
        success = true;
        addToast('success', 'Record Modified', 'Successfully updated record in Google Sheet database!');
      } else {
        addToast('error', 'Update Failed', res.error || 'Failed to save edits to Google Sheets.');
      }
    }
    return success;
  };

  const handleUpdateL1Confirmation = async (
    rowIndex: number,
    entry: ActionEntry,
    planned1: string,
    actual1: string,
    timeDelay1: string,
    areWeL1: string,
    timeDelay2: string = '',
    willPurchase: string = '',
    supplierName: string = '',
    purchaseQuantity: string = '',
    purchaseRate: string = '',
    uploadPoCopy: string = '',
    paymentTerms: string = '',
    shortageCondition: string = '',
    suppliers: Supplier[] = [],
    l1PartyName: string = '',
    l1PartyPurchase: string = '',
    saleQuantity: string = '',
    saleRate: string = '',
    saleUploadSoCopy: string = '',
    salePaymentTerms: string = '',
    saleShortageCondition: string = ''
  ): Promise<boolean> => {
    let success = false;
    const updatedEntry: ActionEntry = {
      ...entry,
      planned1,
      actual1,
      timeDelay1,
      areWeL1,
      timeDelay2,
      willPurchase,
      supplierName,
      purchaseQuantity,
      purchaseRate,
      uploadPoCopy,
      paymentTerms,
      shortageCondition,
      l1PartyName
    };

    if (isOffline) {
      // Local fallback update
      const updatedList = actions.map((a) => a.id === entry.id ? updatedEntry : a);
      setActions(updatedList);
      localStorage.setItem('offlineActions', JSON.stringify(updatedList));
      success = true;
      addToast('success', 'L1 Confirmation Saved', 'L1 details updated locally.');
    } else {
      // Optimistic local update so UI reflects immediately and closes modal fast
      setActions((prev) => prev.map((a) => a.id === entry.id ? updatedEntry : a));
      success = true; // Return success immediately for fast UI
      
      // Run remote sheet update in the background
      updateL1ConfirmationInSheet(
        rowIndex,
        entry,
        planned1,
        actual1,
        timeDelay1,
        areWeL1,
        timeDelay2,
        willPurchase,
        supplierName,
        purchaseQuantity,
        purchaseRate,
        uploadPoCopy,
        paymentTerms,
        shortageCondition,
        l1PartyName,
        l1PartyPurchase,
        saleQuantity,
        saleRate,
        saleUploadSoCopy,
        salePaymentTerms,
        saleShortageCondition
      ).then(res => {
        if (res.success) {
          // Background tasks
          syncSuppliersToAllocation(entry, willPurchase, suppliers).then(allocRes => {
            if (!allocRes.success) {
              addToast('info', 'Allocation Sheet', allocRes.error || 'Saved L1, but could not update the Purchase Allocation sheet.');
            }
          });
          loadActions(); // background refresh
          addToast('success', 'L1 Confirmed', 'Successfully updated L1 Confirmation in Google Sheet database!');
        } else {
          addToast('error', 'Update Failed', res.error || 'Failed to save L1 Confirmation to Google Sheets.');
          loadActions(); // Revert to remote state on error
        }
      });
    }
    return success;
  };

  const handleDeleteAction = async (rowIndex: number, actionId: string): Promise<boolean> => {
    let success = false;
    
    if (isOffline) {
      // Local fallback delete
      const updatedList = actions.filter((a) => a.id !== actionId);
      setActions(updatedList);
      localStorage.setItem('offlineActions', JSON.stringify(updatedList));
      success = true;
      addToast('success', 'Record Deleted', 'Action removed from local database.');
    } else {
      // Remote sheet delete
      const res = await deleteActionFromSheet(rowIndex);
      if (res.success) {
        setActions((prev) => prev.filter((a) => a.id !== actionId));
        loadActions(); // background refresh
        success = true;
        addToast('success', 'Record Deleted', 'Permanently removed from Google Spreadsheet.');
      } else {
        addToast('error', 'Delete Failed', res.error || 'Failed to delete row from Google Sheet.');
      }
    }
    return success;
  };

  const handleSyncDraft = async (action: ActionEntry): Promise<boolean> => {
    const res = await insertActionToSheet(action);
    if (res.success) {
      const remainingLocal = actions.filter(a => a.id !== action.id);
      localStorage.setItem('offlineActions', JSON.stringify(remainingLocal));
      await loadActions();
      addToast('success', 'Draft Uploaded', `Successfully uploaded transaction ${action.id} to Google Sheets!`);
      return true;
    } else {
      addToast('error', 'Upload Failed', res.error || 'Failed to sync draft.');
      return false;
    }
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setUser(null);
    addToast('info', 'Session Ended', 'Logged out successfully. Passwords cleared from memory.');
  };

  // Return Login page if not authenticated
  if (!user) {
    return (
      <div className={darkMode ? 'dark sleek-bg-dark min-h-screen' : 'sleek-bg-light min-h-screen'}>
        <LoginView 
          onLoginSuccess={(u) => setUser(u)} 
          onAddToast={(type, title, desc) => addToast(type as any, title, desc)} 
        />
        
        {/* Interactive Toasts inside Login */}
        <div className="fixed bottom-5 right-5 z-50 space-y-3 pointer-events-none w-full max-w-sm px-4">
          <AnimatePresence>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                className={`p-4 rounded-2xl shadow-xl flex items-start gap-3 border pointer-events-auto bg-slate-900 border-slate-800`}
              >
                {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />}
                {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
                {toast.type === 'info' && <Info className="w-5 h-5 text-blue-400 shrink-0" />}
                <div>
                  <h4 className="font-bold text-xs text-white uppercase tracking-wider">{toast.title}</h4>
                  <p className="text-xs text-slate-400 mt-1 font-semibold leading-normal">{toast.desc}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // --- Render App Content (Role Based Navigation Guard) ---
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView 
            actions={actions} 
            isOffline={isOffline} 
            user={user} 
            onNavigate={(tab) => setActiveTab(tab)}
            onRefresh={() => loadActions(true)}
            isRefreshing={isRefreshing}
          />
        );
      case 'new-action':
        // Guard tab for allowed roles
        if (user.role === 'Manager') {
          return <div className="p-8 text-center text-slate-500 font-semibold">Access Denied. Sales role required.</div>;
        }
        return (
          <NewActionView 
            onAddAction={handleAddAction} 
            user={user} 
            isOffline={isOffline} 
            actions={actions}
            onUpdateL1Confirmation={handleUpdateL1Confirmation}
          />
        );
      case 'pending':
        if (user.role === 'Sales') {
          return <div className="p-8 text-center text-slate-500 font-semibold">Access Denied. Managerial clearance required.</div>;
        }
        return (
          <DispatchPlanningView
            onAddToast={(type, title, desc) => addToast(type, title, desc)}
          />
        );
      case 'dispatch-status':
        if (user.role === 'Sales') {
          return <div className="p-8 text-center text-slate-500 font-semibold">Access Denied. Managerial clearance required.</div>;
        }
        return (
          <DispatchStatusView
            onAddToast={(type, title, desc) => addToast(type, title, desc)}
          />
        );
      case 'material-receipt':
        if (user.role === 'Sales') {
          return <div className="p-8 text-center text-slate-500 font-semibold">Access Denied. Managerial clearance required.</div>;
        }
        return (
          <MaterialReceiptView
            onAddToast={(type, title, desc) => addToast(type, title, desc)}
          />
        );
      case 'credit-note':
        if (user.role === 'Sales') {
          return <div className="p-8 text-center text-slate-500 font-semibold">Access Denied. Managerial clearance required.</div>;
        }
        return <CreditNoteView />;
      case 'payment-confirmation':
        if (user.role === 'Sales') {
          return <div className="p-8 text-center text-slate-500 font-semibold">Access Denied. Managerial clearance required.</div>;
        }
        return <PaymentConfirmView onAddToast={(type, title, desc) => addToast(type, title, desc)} />;
      case 'make-payment':
        if (user.role === 'Sales') {
          return <div className="p-8 text-center text-slate-500 font-semibold">Access Denied. Managerial clearance required.</div>;
        }
        return <MakePaymentView />;
      case 'history':
        return (
          <HistoryView 
            actions={actions} 
            user={user} 
            onUpdateAction={handleUpdateAction}
            onDeleteAction={handleDeleteAction}
            isOffline={isOffline}
          />
        );

      case 'drive-folder':
        return (
          <DriveFolderView 
            folderId={driveFolderId}
            onAddToast={(type, title, desc) => addToast(type, title, desc)}
          />
        );
      case 'settings':
        return (
          <SettingsView 
            user={user} 
            darkMode={darkMode} 
            onToggleDarkMode={() => setDarkMode(!darkMode)}
            onAddToast={(type, title, desc) => addToast(type as any, title, desc)}
            driveFolderId={driveFolderId}
            onUpdateDriveFolderId={handleUpdateDriveFolderId}
          />
        );
      case 'user-settings':
        if (user.role !== 'Admin') {
          return <div className="p-8 text-center text-slate-500 font-semibold">Access Denied. Administrator clearance required.</div>;
        }
        return (
          <UserSettingsView 
            user={user} 
            onAddToast={(type, title, desc) => addToast(type as any, title, desc)} 
          />
        );
      default:
        return <div>Tab not found</div>;
    }
  };

  // Nav items list for mobile rendering
  const menuItems = [
    { id: 'dashboard' as SidebarTab, label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Sales', 'Manager'] },
    { id: 'pending' as SidebarTab, label: 'Dispatch Planning', icon: Truck, roles: ['Admin', 'Manager'] },
    { id: 'dispatch-status' as SidebarTab, label: 'Dispatch Status', icon: Activity, roles: ['Admin', 'Manager'] },
    { id: 'material-receipt' as SidebarTab, label: 'Material Receipt', icon: PackageCheck, roles: ['Admin', 'Manager'] },
    { id: 'credit-note' as SidebarTab, label: 'Credit Note Creation', icon: FileText, roles: ['Admin', 'Manager'] },
    { id: 'payment-confirmation' as SidebarTab, label: 'Payment Confirmation', icon: CheckCircle, roles: ['Admin', 'Manager'] },
    { id: 'make-payment' as SidebarTab, label: 'Make Payment', icon: CreditCard, roles: ['Admin', 'Manager'] },
    { id: 'history' as SidebarTab, label: 'History', icon: History, roles: ['Admin', 'Sales', 'Manager'] },
    { id: 'reports' as SidebarTab, label: 'Reports', icon: BarChart3, roles: ['Admin', 'Manager'] },
    { id: 'drive-folder' as SidebarTab, label: 'Shared Drive', icon: FolderOpen, roles: ['Admin', 'Sales', 'Manager'] },
    { id: 'user-settings' as SidebarTab, label: 'User Settings', icon: Users, roles: ['Admin'] },
    { id: 'settings' as SidebarTab, label: 'Settings', icon: SettingsIcon, roles: ['Admin', 'Sales', 'Manager'] },
  ];

  const allowedMobileItems = menuItems.filter(item => {
    if (!user) return false;
    
    if (user.pageAccess && user.pageAccess.toLowerCase() !== 'all') {
      const accessList = user.pageAccess.split(',').map(s => s.trim().toLowerCase());
      
      // Handle the pending group
      if (item.id === 'pending') {
        return accessList.includes('pending') || accessList.includes('dispatch-status');
      }
      
      return accessList.includes(item.id.toLowerCase());
    }

    // Fallback to role based
    if (user.role === 'Admin') return true;
    return item.roles.includes(user.role);
  });

  return (
    <div className={`h-screen overflow-hidden font-sans transition-colors duration-300 ${darkMode ? 'dark sleek-bg-dark text-slate-100' : 'sleek-bg-light text-slate-800'}`}>
      
      <div className="flex h-full">
        {/* Desktop Left Navigation Sidebar */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          user={user} 
          onLogout={handleLogout} 
        />

        {/* Right workspace contents */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          
          {/* Header Bar */}
          <header className="h-16 glass-nav sticky top-0 z-40 flex items-center justify-between px-6">
            
            {/* Left side: Hamburger menu button for mobile / Tablet */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden sm:block">
                  Current View:
                </span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-500/10 border border-blue-500/15 px-2.5 py-1 rounded-xl">
                  {activeTab.replace('-', ' ')}
                </span>
              </div>
            </div>

            {/* Right side status */}
            <div className="flex items-center gap-4">
              {/* Database sync pill */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-bold ${
                isOffline 
                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/15' 
                  : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/15'
              }`}>
                <Database className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isOffline ? 'Offline Mode (Local)' : 'Synced (Sheets DB)'}</span>
              </div>

              {/* Theme quick switcher */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 border border-slate-200 dark:border-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-all cursor-pointer"
              >
                {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* User Details & Logout */}
              {user && (
                <div className="hidden sm:flex items-center gap-4 pl-4 border-l border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-500">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">{user.name}</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-tight">{user.role}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                    title="Logout"
                  >
                    <LogOut className="w-4.5 h-4.5" />
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* Render Active tab content */}
          <main className="flex-1 p-6 md:p-8 overflow-y-auto">
            {renderTabContent()}
          </main>
          
          <footer className="shrink-0 py-3 border-t border-slate-200/60 dark:border-slate-800/60 relative overflow-hidden flex items-center justify-center bg-slate-50/90 dark:bg-[#0a0f1c]/90 backdrop-blur-md z-40">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-100/30 dark:via-slate-800/10 to-transparent"></div>
              <div className="relative flex items-center justify-center flex-wrap gap-2.5 text-[10px] sm:text-xs font-bold tracking-[0.15em] uppercase">
                <TypewriterDeveloperText />
              </div>
            </footer>
        </div>
      </div>

      {/* Mobile Sidebar overlay Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-72 bg-slate-900 border-r border-slate-800 text-slate-300 min-h-screen p-6 flex flex-col justify-between"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                      AS
                    </div>
                    <div>
                      <h1 className="font-semibold text-white tracking-tight text-sm">Auction Sales</h1>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest">Management</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <nav className="space-y-2">
                  {allowedMobileItems.map((item) => {
                    if (item.id === 'pending') {
                      const isDispatchActive = activeTab === 'pending' || activeTab === 'dispatch-status';
                      return (
                        <div key="dispatch-group" className="space-y-1">
                          <button
                            onClick={() => setIsMobileDispatchOpen(!isMobileDispatchOpen)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                              isDispatchActive && !isMobileDispatchOpen
                                ? 'bg-blue-600/10 text-blue-400'
                                : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-3.5">
                              <Truck className="w-5 h-5" />
                              <span>{item.label}</span>
                            </div>
                            {isMobileDispatchOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                          
                          {isMobileDispatchOpen && (
                            <div className="pl-12 pr-2 space-y-1 mt-1">
                              {(!user?.pageAccess || user.pageAccess.toLowerCase() === 'all' || user.pageAccess.toLowerCase().includes('pending')) && (
                                <button
                                  onClick={() => {
                                    setActiveTab('pending');
                                    setIsMobileMenuOpen(false);
                                  }}
                                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                                    activeTab === 'pending'
                                      ? 'bg-blue-600 text-white'
                                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                                  }`}
                                >
                                  <Truck className="w-4 h-4" />
                                  <span>Dispatch Planning</span>
                                </button>
                              )}
                              {(!user?.pageAccess || user.pageAccess.toLowerCase() === 'all' || user.pageAccess.toLowerCase().includes('dispatch-status')) && (
                                <button
                                  onClick={() => {
                                    setActiveTab('dispatch-status');
                                    setIsMobileMenuOpen(false);
                                  }}
                                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                                    activeTab === 'dispatch-status'
                                      ? 'bg-blue-600 text-white'
                                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                                  }`}
                                >
                                  <Activity className="w-4 h-4" />
                                  <span>Dispatch Status</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    }

                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="border-t border-slate-800 pt-5">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic Alert Toasts Portal */}
      <div className="fixed bottom-5 right-5 z-50 space-y-3 pointer-events-none w-full max-w-sm px-4">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className={`p-4 rounded-2xl shadow-xl flex items-start gap-3 border pointer-events-auto bg-slate-900 border-slate-800`}
            >
              {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-blue-400 shrink-0" />}
              <div>
                <h4 className="font-bold text-xs text-white uppercase tracking-wider">{toast.title}</h4>
                <p className="text-xs text-slate-400 mt-1 font-semibold leading-normal">{toast.desc}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {/* Global Team Chatbox */}
      {user && <ChatboxWidget user={user} />}

    </div>
  );
}
