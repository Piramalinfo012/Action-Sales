import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard,
  PlusCircle,
  Truck,
  History,
  BarChart3, 
  FolderOpen,
  Settings as SettingsIcon, 
  LogOut,
  User,
  Users,
  Shield,
  Activity,
  PackageCheck,
  ChevronDown,
  ChevronRight,
  Wallet,
  Receipt,
  CheckCircle,
  CreditCard
} from 'lucide-react';
import { SidebarTab, User as UserType } from '../types';

interface SidebarProps {
  activeTab: SidebarTab;
  setActiveTab: (tab: SidebarTab) => void;
  user: UserType | null;
  onLogout: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, user, onLogout }: SidebarProps) {
  const [isDispatchOpen, setIsDispatchOpen] = useState(activeTab === 'pending' || activeTab === 'dispatch-status');
  const [isAccountsOpen, setIsAccountsOpen] = useState(activeTab === 'credit-note' || activeTab === 'payment-confirmation' || activeTab === 'make-payment');

  const menuItems = [
    { id: 'dashboard' as SidebarTab, label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Sales', 'Manager'] },
    { id: 'new-action' as SidebarTab, label: 'Auction Indent', icon: PlusCircle, roles: ['Admin', 'Sales'] },
    { id: 'pending' as SidebarTab, label: 'Dispatch', icon: Truck, roles: ['Admin', 'Manager'] },
    { id: 'material-receipt' as SidebarTab, label: 'Material Receipt', icon: PackageCheck, roles: ['Admin', 'Manager'] },
    { id: 'accounts-group' as any, label: 'Accounts', icon: Wallet, roles: ['Admin', 'Manager'] },
    { id: 'history' as SidebarTab, label: 'History', icon: History, roles: ['Admin', 'Sales', 'Manager'] },
    { id: 'reports' as SidebarTab, label: 'Reports', icon: BarChart3, roles: ['Admin', 'Manager'] },
    { id: 'drive-folder' as SidebarTab, label: 'Shared Drive', icon: FolderOpen, roles: ['Admin', 'Sales', 'Manager'] },
    { id: 'user-settings' as SidebarTab, label: 'User Settings', icon: Users, roles: ['Admin'] },
    { id: 'settings' as SidebarTab, label: 'Settings', icon: SettingsIcon, roles: ['Admin', 'Sales', 'Manager'] },
  ];

  // Filter menu items by user role
  const allowedMenuItems = menuItems.filter(item => {
    if (!user) return false;
    return item.roles.includes(user.role);
  });

  return (
    <aside className="hidden md:flex flex-col w-64 glass-sidebar text-slate-300 h-full sticky top-0 overflow-y-auto custom-scrollbar border-r border-slate-800/40">
      {/* Brand Section */}
      <div className="p-6 border-b border-slate-850 flex items-center gap-3 bg-slate-950/45 relative overflow-hidden group">
        <div className="absolute -left-12 -top-12 w-28 h-28 rounded-full bg-blue-500/10 blur-xl pointer-events-none group-hover:bg-blue-500/15 transition-all duration-500" />
        <motion.div 
          whileHover={{ scale: 1.06, rotate: 4 }}
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-blue-500/20 relative z-10"
        >
          AS
        </motion.div>
        <div className="relative z-10">
          <h1 className="font-bold text-white tracking-tight text-sm uppercase">Auction Sales</h1>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mt-0.5">Management System</span>
        </div>
      </div>



      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1.5">
        {allowedMenuItems.map((item) => {
          if (item.id === 'pending') {
            const isDispatchActive = activeTab === 'pending' || activeTab === 'dispatch-status';
            return (
              <div key="dispatch-group" className="space-y-1">
                <button
                  onClick={() => setIsDispatchOpen(!isDispatchOpen)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer ${
                    isDispatchActive && !isDispatchOpen
                      ? 'bg-blue-600/10 text-blue-400'
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <Truck className={`w-5 h-5 transition-transform duration-300 ${isDispatchActive ? 'text-blue-400 scale-110' : ''}`} />
                    <span>{item.label}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isDispatchOpen ? 'rotate-0' : '-rotate-90'}`} />
                </button>
                
                <AnimatePresence initial={false}>
                  {isDispatchOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="pl-11 pr-2 space-y-1 mt-1 overflow-hidden"
                    >
                      <button
                        onClick={() => setActiveTab('pending')}
                        className="relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors duration-250 cursor-pointer group"
                      >
                        {activeTab === 'pending' && (
                          <motion.div
                            layoutId="active-sub-pill"
                            className="absolute inset-0 bg-blue-600 rounded-lg shadow-md shadow-blue-500/10"
                            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                          />
                        )}
                        <span className="relative z-10 flex items-center gap-3 w-full">
                          <Truck className={`w-4 h-4 shrink-0 transition-all duration-350 ${activeTab === 'pending' ? 'text-white scale-110' : 'text-slate-400 group-hover:text-slate-200'}`} />
                          <span className={`leading-tight transition-all duration-350 ${activeTab === 'pending' ? 'text-white font-bold' : 'text-slate-400 group-hover:text-white'}`}>Dispatch Planning</span>
                        </span>
                      </button>
                      
                      <button
                        onClick={() => setActiveTab('dispatch-status')}
                        className="relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors duration-250 cursor-pointer group"
                      >
                        {activeTab === 'dispatch-status' && (
                          <motion.div
                            layoutId="active-sub-pill"
                            className="absolute inset-0 bg-blue-600 rounded-lg shadow-md shadow-blue-500/10"
                            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                          />
                        )}
                        <span className="relative z-10 flex items-center gap-3 w-full">
                          <Activity className={`w-4 h-4 shrink-0 transition-all duration-350 ${activeTab === 'dispatch-status' ? 'text-white scale-110' : 'text-slate-400 group-hover:text-slate-200'}`} />
                          <span className={`leading-tight transition-all duration-350 ${activeTab === 'dispatch-status' ? 'text-white font-bold' : 'text-slate-400 group-hover:text-white'}`}>Dispatch Status</span>
                        </span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          if (item.id === 'accounts-group') {
            const isAccountsActive = activeTab === 'credit-note' || activeTab === 'payment-confirmation' || activeTab === 'make-payment';
            return (
              <div key="accounts-group" className="space-y-1">
                <button
                  onClick={() => setIsAccountsOpen(!isAccountsOpen)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer ${
                    isAccountsActive && !isAccountsOpen
                      ? 'bg-blue-600/10 text-blue-400'
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <Wallet className={`w-5 h-5 transition-transform duration-300 ${isAccountsActive ? 'text-blue-400 scale-110' : ''}`} />
                    <span>{item.label}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isAccountsOpen ? 'rotate-0' : '-rotate-90'}`} />
                </button>
                
                <AnimatePresence initial={false}>
                  {isAccountsOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="pl-11 pr-2 space-y-1 mt-1 overflow-hidden"
                    >
                      <button
                        onClick={() => setActiveTab('credit-note')}
                        className="relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors duration-250 cursor-pointer group"
                      >
                        {activeTab === 'credit-note' && (
                          <motion.div
                            layoutId="active-sub-pill"
                            className="absolute inset-0 bg-blue-600 rounded-lg shadow-md shadow-blue-500/10"
                            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                          />
                        )}
                        <span className="relative z-10 flex items-center gap-3 w-full">
                          <Receipt className={`w-4 h-4 shrink-0 transition-all duration-350 ${activeTab === 'credit-note' ? 'text-white scale-110' : 'text-slate-400 group-hover:text-slate-200'}`} />
                          <span className={`leading-tight transition-all duration-350 ${activeTab === 'credit-note' ? 'text-white font-bold' : 'text-slate-400 group-hover:text-white'}`}>Credit Note Creation</span>
                        </span>
                      </button>
                      
                      <button
                        onClick={() => setActiveTab('payment-confirmation')}
                        className="relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors duration-250 cursor-pointer group"
                      >
                        {activeTab === 'payment-confirmation' && (
                          <motion.div
                            layoutId="active-sub-pill"
                            className="absolute inset-0 bg-blue-600 rounded-lg shadow-md shadow-blue-500/10"
                            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                          />
                        )}
                        <span className="relative z-10 flex items-center gap-3 w-full">
                          <CheckCircle className={`w-4 h-4 shrink-0 transition-all duration-350 ${activeTab === 'payment-confirmation' ? 'text-white scale-110' : 'text-slate-400 group-hover:text-slate-200'}`} />
                          <span className={`leading-tight transition-all duration-350 ${activeTab === 'payment-confirmation' ? 'text-white font-bold' : 'text-slate-400 group-hover:text-white'}`}>Payment Confirmation</span>
                        </span>
                      </button>
                      
                      <button
                        onClick={() => setActiveTab('make-payment')}
                        className="relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors duration-250 cursor-pointer group"
                      >
                        {activeTab === 'make-payment' && (
                          <motion.div
                            layoutId="active-sub-pill"
                            className="absolute inset-0 bg-blue-600 rounded-lg shadow-md shadow-blue-500/10"
                            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                          />
                        )}
                        <span className="relative z-10 flex items-center gap-3 w-full">
                          <CreditCard className={`w-4 h-4 shrink-0 transition-all duration-350 ${activeTab === 'make-payment' ? 'text-white scale-110' : 'text-slate-400 group-hover:text-slate-200'}`} />
                          <span className={`leading-tight transition-all duration-350 ${activeTab === 'make-payment' ? 'text-white font-bold' : 'text-slate-400 group-hover:text-white'}`}>Make Payment</span>
                        </span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="relative w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-colors duration-250 cursor-pointer group"
            >
              {isActive && (
                <motion.div
                  layoutId="active-pill"
                  className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20"
                  transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-3.5 w-full">
                <Icon className={`w-5 h-5 transition-all duration-350 ${isActive ? 'text-white scale-110' : 'text-slate-400 group-hover:text-slate-200 group-hover:scale-105'}`} />
                <span className={`transition-all duration-350 ${isActive ? 'text-white font-bold' : 'text-slate-400 group-hover:text-white'}`}>{item.label}</span>
              </span>
            </button>
          );
        })}
      </nav>

    </aside>
  );
}
