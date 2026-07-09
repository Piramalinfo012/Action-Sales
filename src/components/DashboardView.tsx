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

  // Time-of-day greeting for a more personal welcome
  const greetHour = new Date().getHours();
  const greeting = greetHour < 12 ? 'Good morning' : greetHour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-br from-blue-600 via-indigo-700 to-violet-800 rounded-3xl p-6 md:p-8 text-white shadow-2xl shadow-indigo-900/30 relative overflow-hidden"
      >
        {/* Animated ambient orbs */}
        <motion.div
          aria-hidden
          className="absolute -right-16 -top-20 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none"
          animate={{ scale: [1, 1.25, 1], opacity: [0.5, 0.85, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden
          className="absolute -left-10 -bottom-24 w-64 h-64 rounded-full bg-violet-400/20 blur-3xl pointer-events-none"
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
        {/* Decorative faint grid + icon */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.6) 1px,transparent 1px)', backgroundSize: '28px 28px' }}
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-[0.08] pointer-events-none scale-150">
          <TrendingUp className="w-72 h-72" />
        </div>

        <div className="relative z-10 space-y-2">
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest bg-white/15 border border-white/20 backdrop-blur-md px-2.5 py-1 rounded-full"
          >
            <Calendar className="w-3 h-3" />
            {greeting}
          </motion.span>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">
            {greeting}, {user?.name || 'User'}! 👋
          </h2>
          <p className="text-blue-100/90 text-xs md:text-sm max-w-xl font-medium leading-relaxed">
            Welcome to your <strong className="font-bold text-white">FMS Auction Registry</strong>. Create transactions, view logs, and synchronize data directly with Google Sheets.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 relative z-10">
          {user?.role !== 'Manager' && (
            <motion.button
              onClick={() => onNavigate('new-action')}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className="bg-white text-indigo-800 hover:bg-blue-50 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-black/20 cursor-pointer"
            >
              <PlusCircle className="w-4.5 h-4.5" />
              <span>Create Auction</span>
            </motion.button>
          )}

          <motion.button
            onClick={() => onNavigate('drive-folder')}
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            className="bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur-md px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-black/5"
          >
            <FolderOpen className="w-4.5 h-4.5" />
            <span>Shared Drive</span>
          </motion.button>

          <motion.button
            onClick={onRefresh}
            disabled={isRefreshing}
            whileHover={{ scale: isRefreshing ? 1 : 1.04, y: isRefreshing ? 0 : -2 }}
            whileTap={{ scale: isRefreshing ? 1 : 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 18 }}
            className="bg-indigo-600/40 backdrop-blur-md text-white border border-white/20 hover:bg-indigo-600/60 px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Database className={`w-4.5 h-4.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </motion.button>
        </div>
      </motion.div>

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
      <motion.div
        variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } } }}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {stats.map((stat) => {
          const Icon = stat.icon;
          const colorStyles: any = {
            blue: { icon: 'from-blue-500 to-blue-600 shadow-blue-500/30', glow: 'bg-blue-500/10', accent: 'bg-blue-500' },
            amber: { icon: 'from-amber-500 to-orange-600 shadow-amber-500/30', glow: 'bg-amber-500/10', accent: 'bg-amber-500' },
            emerald: { icon: 'from-emerald-500 to-teal-600 shadow-emerald-500/30', glow: 'bg-emerald-500/10', accent: 'bg-emerald-500' },
            indigo: { icon: 'from-indigo-500 to-indigo-600 shadow-indigo-500/30', glow: 'bg-indigo-500/10', accent: 'bg-indigo-500' },
            violet: { icon: 'from-violet-500 to-purple-600 shadow-violet-500/30', glow: 'bg-violet-500/10', accent: 'bg-violet-500' },
            sky: { icon: 'from-sky-500 to-cyan-600 shadow-sky-500/30', glow: 'bg-sky-500/10', accent: 'bg-sky-500' }
          };
          const c = colorStyles[stat.color];

          return (
            <motion.div
              key={stat.label}
              variants={{ hidden: { opacity: 0, y: 18, scale: 0.97 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } }}
              whileHover={{ y: -5 }}
              className="group glass-card rounded-2xl p-5 relative overflow-hidden border border-slate-100/80 dark:border-slate-800/80 flex flex-col justify-between transition-shadow duration-300 hover:shadow-xl dark:hover:shadow-black/40"
            >
              {/* Left accent bar */}
              <span className={`absolute left-0 top-0 bottom-0 w-1 ${c.accent} opacity-70 group-hover:opacity-100 transition-opacity`} />
              {/* Corner glow on hover */}
              <div className={`absolute -right-8 -top-8 w-28 h-28 rounded-full ${c.glow} blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

              <div className="flex items-center justify-between gap-3 relative">
                <span className="text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                  {stat.label}
                </span>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br text-white shadow-lg shrink-0 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-300 ${c.icon}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 relative">
                <span className={`font-black text-slate-900 dark:text-white tracking-tight leading-none block truncate ${
                  stat.label === 'Top Location' ? 'text-base md:text-lg' : 'text-2xl md:text-3xl font-sans'
                }`} title={String(stat.value)}>
                  {stat.value}
                </span>
                <p className="text-slate-400 dark:text-slate-500 text-[10.5px] mt-1.5 font-medium leading-normal truncate">
                  {stat.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Grid Bottom: Recent activities & Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent sales entries list */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="lg:col-span-2 glass-card rounded-3xl p-6 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-slate-900 dark:text-white font-bold tracking-tight text-lg flex items-center gap-2">
                <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600" />
                Recent Transactions Logged
              </h3>
              <button
                onClick={() => onNavigate('history')}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer group"
              >
                <span>View All</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="space-y-1">
              {recentEntries.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center text-slate-400">
                    <TrendingUp className="w-7 h-7" />
                  </div>
                  <p className="text-slate-400 font-medium text-sm max-w-xs">
                    No auctions found. Click "Create Auction" to log your first transaction.
                  </p>
                </div>
              ) : (
                recentEntries.map((action, i) => (
                  <motion.div
                    key={action.id + '-' + action.rowIndex}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.06 }}
                    className="py-3 px-3 -mx-3 rounded-2xl flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    <div className="flex items-center gap-3.5 overflow-hidden">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500/15 to-indigo-500/15 text-blue-500 dark:text-blue-400 border border-blue-500/10 shrink-0 group-hover:scale-105 transition-transform">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                          {action.companyName}
                        </p>
                        <p className="text-slate-400 dark:text-slate-500 text-xs truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 shrink-0" />
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
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </motion.div>

        {/* Info panel / User role permissions guide */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.5 }}
          className="rounded-3xl p-6 text-white flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-xl"
        >
          {/* Ambient accent glow */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
          <div className="relative">
            <h3 className="font-bold tracking-tight text-lg text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-blue-400 to-violet-500" />
              Your Profile & Access
            </h3>
            <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10 flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-base shadow-lg shadow-blue-500/30 shrink-0">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="font-bold text-sm text-white truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-slate-400 truncate">@{user?.username} · <span className="text-blue-400 font-semibold">{user?.role}</span></p>
              </div>
            </div>

            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Role Capabilities
            </h4>

            <ul className="space-y-2.5 text-sm text-slate-300">
              {[
                ['View Dashboard', 'Overall real-time analytical summary'],
                ['Create Auction', 'Log new transactions (Admin & Sales only)'],
                ['Modify Entries', 'Edit or delete existing records (Admin & Manager only)'],
                ['Reports View', 'Access interactive analytics charts (Admin & Manager only)']
              ].map(([title, desc], i) => (
                <motion.li
                  key={title}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.07 }}
                  className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <ChevronRight className="w-4 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <span><strong className="text-white">{title}</strong> — {desc}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          <div className="border-t border-slate-800 pt-4 mt-6 text-[11px] text-slate-500 font-medium relative">
            Auction FMS System v1.2.0 • Connected securely to Google Sheet FMS.
          </div>
        </motion.div>
      </div>
    </div>
  );
}
