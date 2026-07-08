import { 
  LayoutDashboard, 
  PlusCircle, 
  Clock, 
  History, 
  BarChart3, 
  FolderOpen,
  Settings as SettingsIcon, 
  LogOut,
  User,
  Shield
} from 'lucide-react';
import { SidebarTab, User as UserType } from '../types';

interface SidebarProps {
  activeTab: SidebarTab;
  setActiveTab: (tab: SidebarTab) => void;
  user: UserType | null;
  onLogout: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, user, onLogout }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard' as SidebarTab, label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Sales', 'Manager'] },
    { id: 'new-action' as SidebarTab, label: 'Auction Ident', icon: PlusCircle, roles: ['Admin', 'Sales'] },
    { id: 'pending' as SidebarTab, label: 'Pending Sync', icon: Clock, roles: ['Admin', 'Manager'] },
    { id: 'history' as SidebarTab, label: 'History', icon: History, roles: ['Admin', 'Sales', 'Manager'] },
    { id: 'reports' as SidebarTab, label: 'Reports', icon: BarChart3, roles: ['Admin', 'Manager'] },
    { id: 'drive-folder' as SidebarTab, label: 'Shared Drive', icon: FolderOpen, roles: ['Admin', 'Sales', 'Manager'] },
    { id: 'settings' as SidebarTab, label: 'Settings', icon: SettingsIcon, roles: ['Admin', 'Sales', 'Manager'] },
  ];

  // Filter menu items by user role
  const allowedMenuItems = menuItems.filter(item => {
    if (!user) return false;
    return item.roles.includes(user.role);
  });

  return (
    <aside className="hidden md:flex flex-col w-64 glass-sidebar text-slate-300 min-h-screen sticky top-0">
      {/* Brand Section */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3 bg-slate-950/40">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20">
          AS
        </div>
        <div>
          <h1 className="font-semibold text-white tracking-tight text-sm">Auction Sales</h1>
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Management System</span>
        </div>
      </div>

      {/* User Section */}
      {user && (
        <div className="p-5 border-b border-slate-800 bg-slate-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <User className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <p className="font-semibold text-white text-sm truncate">{user.name}</p>
              <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                <span>{user.role}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1.5">
        {allowedMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/15'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} />
              <span>{item.label}</span>
              {item.id === 'pending' && (
                <span className="ml-auto bg-amber-500/10 text-amber-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/20 animate-pulse">
                  Alert
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout button */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/20">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all duration-300 cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
