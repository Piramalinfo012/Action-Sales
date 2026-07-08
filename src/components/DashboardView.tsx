import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Calendar, 
  Database, 
  ChevronRight, 
  PlusCircle, 
  AlertTriangle,
  Info,
  FolderOpen,
  Building2,
  Box,
  MapPin,
  Clock,
  WifiOff
} from 'lucide-react';
import { ActionEntry, User } from '../types';

interface DashboardViewProps {
  actions: ActionEntry[];
  isOffline: boolean;
  user: User | null;
  onNavigate: (tab: any) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function DashboardView({ 
  actions, 
  isOffline, 
  user, 
  onNavigate,
  onRefresh,
  isRefreshing 
}: DashboardViewProps) {
  
  // 1. Calculations
  const totalActions = actions.length;
  
  // Sum of quantities
  const totalQuantity = actions.reduce((sum, item) => sum + (item.quntity || 0), 0);
  
  // Unique Companies
  const uniqueCompanies = Array.from(new Set(actions.map(a => a.companyName).filter(Boolean))).length;
  
  // Unique Products
  const uniqueProducts = Array.from(new Set(actions.map(a => a.productName).filter(Boolean))).length;
  
  // Unique Locations
  const uniqueLocations = Array.from(new Set(actions.map(a => a.location).filter(Boolean))).length;

  // Offline Drafts (no rowIndex)
  const offlineDrafts = actions.filter(a => !a.rowIndex || a.id.startsWith('local-')).length;

  // Find most active location (Top Location)
  const locationCounts: { [key: string]: number } = {};
  actions.forEach(a => {
    if (a.location) {
      locationCounts[a.location] = (locationCounts[a.location] || 0) + 1;
    }
  });
  let topLocation = '-';
  let maxLocCount = 0;
  Object.keys(locationCounts).forEach(loc => {
    if (locationCounts[loc] > maxLocCount) {
      maxLocCount = locationCounts[loc];
      topLocation = loc;
    }
  });

  // Recent 5 entries
  const recentEntries = [...actions]
    .sort((a, b) => {
      const parseDate = (dStr: string) => {
        const p = dStr.split('/');
        if (p.length === 3) return new Date(`${p[2]}-${p[1]}-${p[0]}`).getTime();
        return new Date(dStr).getTime() || 0;
      };
      return parseDate(b.timestamp) - parseDate(a.timestamp);
    })
    .slice(0, 5);

  const stats = [
    { 
      label: 'Total Transactions', 
      value: totalActions, 
      color: 'blue', 
      icon: TrendingUp, 
      description: 'Logged rows in FMS database' 
    },
    { 
      label: 'Total Quntity', 
      value: `${totalQuantity.toLocaleString()} ltr/kg`, 
      color: 'emerald', 
      icon: Database, 
      description: 'Sum of all logged volumes' 
    },
    { 
      label: 'Offline Drafts', 
      value: offlineDrafts, 
      color: 'amber', 
      icon: offlineDrafts > 0 ? WifiOff : Clock, 
      description: 'Drafts pending sheet synchronization' 
    },
    { 
      label: 'Client Companies', 
      value: uniqueCompanies, 
      color: 'indigo', 
      icon: Building2, 
      description: 'Distinct company entities' 
    },
    { 
      label: 'Active Products', 
      value: uniqueProducts, 
      color: 'violet', 
      icon: Box, 
      description: 'Distinct product lines' 
    },
    { 
      label: 'Top Location', 
      value: topLocation, 
      color: 'sky', 
      icon: MapPin, 
      description: `Most active hub (${maxLocCount} entries)` 
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-5 md:p-6 text-white shadow-xl shadow-blue-900/10 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center justify-center translate-x-12 scale-150">
          <TrendingUp className="w-96 h-96" />
        </div>
        <div className="relative z-10 space-y-1">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">
            Good day, {user?.name || 'User'}!
          </h2>
          <p className="text-blue-100 text-xs md:text-sm max-w-xl font-medium leading-relaxed">
            Welcome to your **FMS Auction Registry**. Create transactions, view logs, and synchronize data directly with Google Sheets.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2.5 relative z-10">
          {user?.role !== 'Manager' && (
            <button
              onClick={() => onNavigate('new-action')}
              className="bg-white text-blue-800 hover:bg-blue-50 transition-all duration-300 px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-black/10 cursor-pointer"
            >
              <PlusCircle className="w-4.5 h-4.5" />
              <span>Create Auction</span>
            </button>
          )}

          <button 
            onClick={() => onNavigate('drive-folder')}
            className="bg-white/15 hover:bg-white/25 text-white border border-white/10 backdrop-blur-md transition-all duration-300 px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-black/5"
          >
            <FolderOpen className="w-4.5 h-4.5" />
            <span>Shared Drive</span>
          </button>
          
          <button 
            onClick={onRefresh}
            disabled={isRefreshing}
            className="bg-blue-600/30 backdrop-blur-md text-white border border-white/20 hover:bg-blue-600/50 transition-all duration-300 px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Database className={`w-4.5 h-4.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Database Connection / Offline Assistant */}
      {isOffline && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-900 dark:to-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-3xl p-6 space-y-4"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-500 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 flex-1">
              <h3 className="text-amber-800 dark:text-amber-400 font-bold tracking-tight text-base">
                Google Sheets Table Setup Required (Running in Offline Mode)
              </h3>
              <p className="text-amber-700/90 dark:text-slate-300 text-sm leading-relaxed max-w-3xl font-medium">
                The connection is active, but the sheet named <strong className="text-amber-900 dark:text-amber-300 underline font-extrabold">"FMS"</strong> was not found in your Google Spreadsheet. 
                Don't worry! All auctions you log right now are saved in **Offline Storage (LocalStorage)**.
              </p>
            </div>
          </div>
          
          <div className="pl-0 md:pl-16 grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-sm border border-amber-100 dark:border-amber-950/40 p-4 rounded-2xl">
              <h4 className="font-bold text-amber-900 dark:text-amber-300 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-amber-500" />
                Step 1: Open Google Spreadsheet
              </h4>
              <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed font-medium">
                Open the Google Sheet spreadsheet that you deployed your Google Apps Script on.
              </p>
            </div>
            
            <div className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-sm border border-amber-100 dark:border-amber-950/40 p-4 rounded-2xl">
              <h4 className="font-bold text-amber-900 dark:text-amber-300 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-amber-500" />
                Step 2: Add "FMS" Sheet
              </h4>
              <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed font-medium">
                Add a new sheet tab exactly named <code className="bg-amber-100 dark:bg-amber-900/40 px-1 py-0.5 rounded text-amber-800 dark:text-amber-300 font-mono font-bold">"FMS"</code> and enter these column headers on row 5:
                <span className="block mt-1 font-mono font-bold text-[10px] bg-slate-100 dark:bg-slate-950 px-1.5 py-1 rounded select-all break-all overflow-auto text-slate-800 dark:text-slate-200">
                  Timetamp, ID, Company Name, Quntity, Unit, Product Name, Location, Remark
                </span>
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const colorStyles: any = {
            blue: 'text-blue-600 dark:text-blue-400 bg-blue-500/8 border-blue-500/10',
            amber: 'text-amber-600 dark:text-amber-400 bg-amber-500/8 border-amber-500/10',
            emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/8 border-emerald-500/10',
            indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/8 border-indigo-500/10',
            violet: 'text-violet-600 dark:text-violet-400 bg-violet-500/8 border-violet-500/10',
            sky: 'text-sky-600 dark:text-sky-400 bg-sky-500/8 border-sky-500/10'
          };
          
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="glass-card rounded-2xl p-4.5 sm:p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:hover:shadow-black/30 border border-slate-100/80 dark:border-slate-800/80 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                  {stat.label}
                </span>
                <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center border shrink-0 ${colorStyles[stat.color]}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3.5">
                <span className={`font-bold text-slate-900 dark:text-white tracking-tight leading-none block truncate ${
                  stat.label === 'Top Location' ? 'text-base md:text-lg' : 'text-xl md:text-2xl font-sans'
                }`} title={String(stat.value)}>
                  {stat.value}
                </span>
                <p className="text-slate-400 dark:text-slate-500 text-[10.5px] mt-1 font-medium leading-normal truncate">
                  {stat.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Grid Bottom: Recent activities & Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent sales entries list */}
        <div className="lg:col-span-2 glass-card rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-slate-900 dark:text-white font-bold tracking-tight text-lg">
                Recent Transactions Logged
              </h3>
              <button 
                onClick={() => onNavigate('history')}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
              >
                <span>View All</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentEntries.length === 0 ? (
                <div className="py-8 text-center text-slate-400 font-medium text-sm">
                  No auctions found. Click "Create Auction" to log your first transaction.
                </div>
              ) : (
                recentEntries.map((action) => (
                  <div key={action.id + '-' + action.rowIndex} className="py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 overflow-hidden">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500/10 text-blue-500 shrink-0">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                          {action.companyName}
                        </p>
                        <p className="text-slate-400 dark:text-slate-500 text-xs truncate">
                          {action.productName} • {action.location}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <p className="font-bold text-slate-900 dark:text-white text-sm">
                        {(action.quntity || 0).toLocaleString()} {action.unit}
                      </p>
                      <p className="text-slate-400 dark:text-slate-500 text-[10px] font-semibold">
                        {action.timestamp}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Info panel / User role permissions guide */}
        <div className="glass-card bg-slate-900/60 dark:bg-slate-950/60 rounded-3xl p-6 text-white flex flex-col justify-between">
          <div>
            <h3 className="font-bold tracking-tight text-lg text-white mb-4">
              Your Profile & Access
            </h3>
            <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800 flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-sm">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="font-semibold text-sm text-white truncate">{user?.name}</p>
                <p className="text-xs text-slate-400 truncate">@{user?.username} ({user?.role})</p>
              </div>
            </div>

            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Role Capabilities
            </h4>
            
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex items-start gap-2.5">
                <ChevronRight className="w-4 h-5 text-blue-400 shrink-0 mt-0.5" />
                <span><strong>View Dashboard</strong> — Overall real-time analytical summary</span>
              </li>
              <li className="flex items-start gap-2.5">
                <ChevronRight className="w-4 h-5 text-blue-400 shrink-0 mt-0.5" />
                <span><strong>Create Auction</strong> — Log new transactions (Admin & Sales only)</span>
              </li>
              <li className="flex items-start gap-2.5">
                <ChevronRight className="w-4 h-5 text-blue-400 shrink-0 mt-0.5" />
                <span><strong>Modify Entries</strong> — Edit or delete existing records (Admin & Manager only)</span>
              </li>
              <li className="flex items-start gap-2.5">
                <ChevronRight className="w-4 h-5 text-blue-400 shrink-0 mt-0.5" />
                <span><strong>Reports View</strong> — Access interactive analytics charts (Admin & Manager only)</span>
              </li>
            </ul>
          </div>
          
          <div className="border-t border-slate-800 pt-4 mt-6 text-[11px] text-slate-500 font-medium">
            Auction FMS System v1.2.0 • Connected securely to Google Sheet FMS.
          </div>
        </div>
      </div>
    </div>
  );
}
