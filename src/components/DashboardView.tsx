import { useState } from 'react';
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
  WifiOff,
  BarChart3,
  PieChart,
  Map,
  Award,
  Percent
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
  
  const [hoveredIndex, setHoveredIndex] = useState<string | null>(null);

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

  // --- Reports & Charts Data Logic ---
  const getMonthlyData = () => {
    const monthlyMap: Record<string, number> = {};
    actions.forEach(a => {
      if (!a.timestamp) return;
      const parts = a.timestamp.split('/');
      if (parts.length === 3) {
        const month = `${parts[2]}-${parts[1]}`; // "YYYY-MM"
        monthlyMap[month] = (monthlyMap[month] || 0) + (a.quntity || 0);
      } else {
        const dateObj = new Date(a.timestamp);
        if (!isNaN(dateObj.getTime())) {
          const month = dateObj.toISOString().substring(0, 7);
          monthlyMap[month] = (monthlyMap[month] || 0) + (a.quntity || 0);
        }
      }
    });

    return Object.entries(monthlyMap)
      .map(([month, qty]) => ({ month, qty }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6); // Last 6 months
  };

  const monthlyData = getMonthlyData();
  const maxMonthlyQty = Math.max(...monthlyData.map(m => m.qty), 1);

  const getLocationData = () => {
    const locMap: Record<string, number> = {};
    actions.forEach(a => {
      if (a.location) {
        locMap[a.location] = (locMap[a.location] || 0) + (a.quntity || 0);
      }
    });

    const totalQty = Object.values(locMap).reduce((sum, q) => sum + q, 0) || 1;
    return Object.entries(locMap).map(([loc, qty]) => ({
      name: loc,
      qty,
      percent: Math.round((qty / totalQty) * 100)
    })).sort((a, b) => b.qty - a.qty);
  };

  const locationData = getLocationData();

  const getProductData = () => {
    const prodMap: Record<string, number> = {};
    actions.forEach(a => {
      if (a.productName) {
        prodMap[a.productName] = (prodMap[a.productName] || 0) + (a.quntity || 0);
      }
    });

    return Object.entries(prodMap).map(([prod, qty]) => ({
      name: prod,
      qty
    })).sort((a, b) => b.qty - a.qty).slice(0, 5); // Top 5 products
  };

  const productData = getProductData();
  const maxProductQty = Math.max(...productData.map(p => p.qty), 1);

  const getCompanyData = () => {
    const compMap: Record<string, number> = {};
    actions.forEach(a => {
      if (a.companyName) {
        compMap[a.companyName] = (compMap[a.companyName] || 0) + (a.quntity || 0);
      }
    });

    return Object.entries(compMap).map(([comp, qty]) => ({
      name: comp,
      qty
    })).sort((a, b) => b.qty - a.qty).slice(0, 5); // Top 5 clients
  };

  const companyData = getCompanyData();
  const maxCompanyQty = Math.max(...companyData.map(c => c.qty), 1);

  const colors = [
    '#3b82f6', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#8b5cf6', // violet
    '#06b6d4', // cyan
  ];

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
            blue: { 
              icon: 'from-blue-500 to-blue-600 shadow-blue-500/30', 
              glowBg: 'from-blue-500/5 to-transparent dark:from-blue-500/2 to-transparent',
              accentLine: 'from-blue-400 to-blue-600',
              text: 'text-blue-500',
              bgClass: 'bg-blue-500/[0.03] dark:bg-blue-500/[0.02] hover:bg-blue-500/[0.06] dark:hover:bg-blue-500/[0.04]',
              borderClass: 'border-blue-500/15 dark:border-blue-500/10',
              shadowClass: 'hover:shadow-[0_20px_45px_-12px_rgba(59,130,246,0.12)]'
            },
            amber: { 
              icon: 'from-amber-500 to-orange-600 shadow-amber-500/30', 
              glowBg: 'from-amber-500/5 to-transparent dark:from-amber-500/2 to-transparent',
              accentLine: 'from-amber-400 to-orange-500',
              text: 'text-amber-500',
              bgClass: 'bg-amber-500/[0.03] dark:bg-amber-500/[0.02] hover:bg-amber-500/[0.06] dark:hover:bg-amber-500/[0.04]',
              borderClass: 'border-amber-500/15 dark:border-amber-500/10',
              shadowClass: 'hover:shadow-[0_20px_45px_-12px_rgba(245,158,11,0.12)]'
            },
            emerald: { 
              icon: 'from-emerald-500 to-teal-600 shadow-emerald-500/30', 
              glowBg: 'from-emerald-500/5 to-transparent dark:from-emerald-500/2 to-transparent',
              accentLine: 'from-emerald-400 to-teal-500',
              text: 'text-emerald-500',
              bgClass: 'bg-emerald-500/[0.03] dark:bg-emerald-500/[0.02] hover:bg-emerald-500/[0.06] dark:hover:bg-emerald-500/[0.04]',
              borderClass: 'border-emerald-500/15 dark:border-emerald-500/10',
              shadowClass: 'hover:shadow-[0_20px_45px_-12px_rgba(16,185,129,0.12)]'
            },
            indigo: { 
              icon: 'from-indigo-500 to-indigo-600 shadow-indigo-500/30', 
              glowBg: 'from-indigo-500/5 to-transparent dark:from-indigo-500/2 to-transparent',
              accentLine: 'from-indigo-400 to-indigo-600',
              text: 'text-indigo-500',
              bgClass: 'bg-indigo-500/[0.03] dark:bg-indigo-500/[0.02] hover:bg-indigo-500/[0.06] dark:hover:bg-indigo-500/[0.04]',
              borderClass: 'border-indigo-500/15 dark:border-indigo-500/10',
              shadowClass: 'hover:shadow-[0_20px_45px_-12px_rgba(99,102,241,0.12)]'
            },
            violet: { 
              icon: 'from-violet-500 to-purple-600 shadow-violet-500/30', 
              glowBg: 'from-violet-500/5 to-transparent dark:from-violet-500/2 to-transparent',
              accentLine: 'from-violet-400 to-purple-500',
              text: 'text-violet-500',
              bgClass: 'bg-violet-500/[0.03] dark:bg-violet-500/[0.02] hover:bg-violet-500/[0.06] dark:hover:bg-violet-500/[0.04]',
              borderClass: 'border-violet-500/15 dark:border-violet-500/10',
              shadowClass: 'hover:shadow-[0_20px_45px_-12px_rgba(139,92,246,0.12)]'
            },
            sky: { 
              icon: 'from-sky-500 to-cyan-600 shadow-sky-500/30', 
              glowBg: 'from-sky-500/5 to-transparent dark:from-sky-500/2 to-transparent',
              accentLine: 'from-sky-400 to-cyan-500',
              text: 'text-sky-500',
              bgClass: 'bg-sky-500/[0.03] dark:bg-sky-500/[0.02] hover:bg-sky-500/[0.06] dark:hover:bg-sky-500/[0.04]',
              borderClass: 'border-sky-500/15 dark:border-sky-500/10',
              shadowClass: 'hover:shadow-[0_20px_45px_-12px_rgba(14,165,233,0.12)]'
            }
          };
          const c = colorStyles[stat.color];

          return (
            <motion.div
              key={stat.label}
              variants={{ hidden: { opacity: 0, y: 18, scale: 0.97 }, show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } }}
              whileHover={{ y: -6, scale: 1.02 }}
              className={`group ${c.bgClass} backdrop-blur-md rounded-3xl p-6 relative overflow-hidden border ${c.borderClass} flex flex-col justify-between transition-all duration-300 ${c.shadowClass}`}
            >
              {/* Subtle ambient background glow */}
              <div className={`absolute inset-0 bg-gradient-to-br ${c.glowBg} opacity-50 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
              
              {/* Animated Left accent bar */}
              <span className={`absolute left-0 top-1/2 -translate-y-1/2 h-[40%] w-1.5 rounded-r-full bg-gradient-to-b ${c.accentLine} opacity-80 group-hover:h-[70%] group-hover:opacity-100 transition-all duration-500 ease-out shadow-sm`} />
              
              {/* Large faded icon in background */}
              <div className={`absolute -right-4 -bottom-4 opacity-[0.04] dark:opacity-[0.02] group-hover:opacity-[0.08] group-hover:-rotate-12 group-hover:scale-110 transition-all duration-500 pointer-events-none ${c.text}`}>
                <Icon className="w-32 h-32" />
              </div>

              <div className="flex items-center justify-between gap-3 relative z-10">
                <span className="text-slate-500 dark:text-slate-400 font-black text-[11px] uppercase tracking-widest">
                  {stat.label}
                </span>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br text-white shadow-lg shrink-0 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-400 ${c.icon}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-5 relative z-10">
                <span className={`font-black text-slate-900 dark:text-white tracking-tight leading-none block truncate ${
                  stat.label === 'Top Location' ? 'text-2xl md:text-3xl' : 'text-3xl md:text-4xl'
                }`} title={String(stat.value)}>
                  {stat.value}
                </span>
                <p className="text-slate-500/90 dark:text-slate-500 text-[11px] mt-2 font-bold leading-normal truncate">
                  {stat.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Reports & Charts Section */}
      {user?.role !== 'Sales' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="space-y-6"
        >
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <BarChart3 className="w-5.5 h-5.5" />
            </div>
            <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">Analytics Overview</h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart 1: Monthly Timeline */}
            <motion.div 
              whileHover={{ y: -4, scale: 1.01 }}
              className="bg-blue-500/[0.02] dark:bg-blue-500/[0.01] backdrop-blur-md rounded-3xl p-6 border border-blue-500/10 dark:border-blue-500/5 flex flex-col justify-between min-h-[350px] transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(59,130,246,0.08)]"
            >
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight mb-4 flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <span>Monthly Volume Trends</span>
                </h3>
                
                {monthlyData.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-slate-400 text-sm font-semibold">
                    No historical monthly data available.
                  </div>
                ) : (
                  <div className="h-56 flex items-end gap-5 pt-6 pb-2 px-2 border-b border-slate-500/10">
                    {monthlyData.map((d, i) => {
                      const heightPercent = `${(d.qty / maxMonthlyQty) * 85}%`;
                      const isHovered = hoveredIndex === `monthly-${i}`;
                      
                      return (
                        <div 
                          key={d.month} 
                          className="flex-1 flex flex-col items-center group relative h-full justify-end cursor-pointer"
                          onMouseEnter={() => setHoveredIndex(`monthly-${i}`)}
                          onMouseLeave={() => setHoveredIndex(null)}
                        >
                          {/* Tooltip */}
                          {isHovered && (
                            <div className="absolute top-0 bg-slate-900/95 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-lg z-25 -translate-y-8 text-center border border-slate-700/50">
                              {d.qty.toLocaleString()}
                            </div>
                          )}
                          
                          {/* Bar */}
                          <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: heightPercent }}
                            transition={{ duration: 0.5, delay: i * 0.05 }}
                            className={`w-full rounded-t-xl transition-all duration-300 ${
                              isHovered 
                                ? 'bg-gradient-to-t from-blue-600 to-blue-500 shadow-md shadow-blue-500/25' 
                                : 'bg-gradient-to-t from-blue-500/80 to-blue-400/80'
                            }`}
                          />
                          
                          {/* Label */}
                          <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 mt-2.5 truncate w-full text-center uppercase tracking-wider">
                            {d.month}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="text-slate-400 dark:text-slate-500 text-xs font-semibold pt-4 mt-2 border-t border-slate-500/10">
                Total output volume measured from recorded quantities
              </div>
            </motion.div>

            {/* Chart 2: Location Hub Distribution */}
            <motion.div 
              whileHover={{ y: -4, scale: 1.01 }}
              className="bg-emerald-500/[0.02] dark:bg-emerald-500/[0.01] backdrop-blur-md rounded-3xl p-6 border border-emerald-500/10 dark:border-emerald-500/5 flex flex-col justify-between min-h-[350px] transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.08)]"
            >
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight mb-4 flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    <PieChart className="w-5 h-5" />
                  </div>
                  <span>Location Hub Distribution</span>
                </h3>

                {locationData.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-slate-400 text-sm font-semibold">
                    No location records in database.
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-6 h-56 pt-2">
                    {/* Visual Circle Donut Segment */}
                    <div className="w-36 h-36 relative flex items-center justify-center shrink-0">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        {locationData.slice(0, 5).map((d, i) => {
                          const totalPercentPrior = locationData.slice(0, i).reduce((sum, loc) => sum + loc.percent, 0);
                          const strokeDasharray = `${d.percent} ${100 - d.percent}`;
                          const strokeDashoffset = -totalPercentPrior;
                          return (
                            <circle
                              key={d.name}
                              cx="50"
                              cy="50"
                              r="40"
                              fill="transparent"
                              stroke={colors[i % colors.length]}
                              strokeWidth="10"
                              strokeDasharray={strokeDasharray}
                              strokeDashoffset={strokeDashoffset}
                              className="transition-all duration-300 hover:stroke-[12px] cursor-pointer"
                            />
                          );
                        })}
                      </svg>
                      <div className="absolute inset-4 bg-white dark:bg-slate-900 rounded-full flex flex-col items-center justify-center text-center">
                        <Map className="w-5 h-5 text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">Hubs</span>
                      </div>
                    </div>

                    {/* Legends */}
                    <div className="flex-1 space-y-2.5 w-full overflow-y-auto max-h-48 pr-1">
                      {locationData.slice(0, 5).map((d, i) => (
                        <div key={d.name} className="flex items-center justify-between text-xs font-semibold hover:bg-slate-500/5 p-1.5 rounded-xl transition-colors duration-200 cursor-pointer">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                            <span className="text-slate-700 dark:text-slate-300 truncate">{d.name}</span>
                          </div>
                          <span className="text-slate-400 dark:text-slate-500 font-bold shrink-0">{d.percent}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="text-slate-400 dark:text-slate-500 text-xs font-semibold pt-4 mt-2 border-t border-slate-500/10 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-emerald-500" />
                <span>Percentage of total sales volume</span>
              </div>
            </motion.div>

            {/* Chart 3: Product Wise */}
            <motion.div 
              whileHover={{ y: -4, scale: 1.01 }}
              className="bg-amber-500/[0.02] dark:bg-amber-500/[0.01] backdrop-blur-md rounded-3xl p-6 border border-amber-500/10 dark:border-amber-500/5 flex flex-col justify-between min-h-[350px] transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(245,158,11,0.08)]"
            >
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight mb-4 flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <Award className="w-5 h-5" />
                  </div>
                  <span>Top Performing Products</span>
                </h3>

                {productData.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-slate-400 text-sm font-semibold">
                    No product distribution logs.
                  </div>
                ) : (
                  <div className="space-y-4 pt-2">
                    {productData.map((d, i) => {
                      const widthPercent = `${(d.qty / maxProductQty) * 100}%`;
                      return (
                        <div key={d.name} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-slate-700 dark:text-slate-300 truncate pr-2 font-semibold">{d.name}</span>
                            <span className="text-slate-500 dark:text-slate-400 shrink-0">{d.qty.toLocaleString()}</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-500/10 dark:bg-slate-950 overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: widthPercent }}
                              transition={{ duration: 0.5, delay: i * 0.05 }}
                              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500" 
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="text-slate-400 dark:text-slate-500 text-xs font-semibold pt-4 mt-2 border-t border-slate-500/10">
                Top product classifications based on logged quantities
              </div>
            </motion.div>

            {/* Chart 4: Company Wise Leaderboard */}
            <motion.div 
              whileHover={{ y: -4, scale: 1.01 }}
              className="bg-violet-500/[0.02] dark:bg-violet-500/[0.01] backdrop-blur-md rounded-3xl p-6 border border-violet-500/10 dark:border-violet-500/5 flex flex-col justify-between min-h-[350px] transition-all duration-300 hover:shadow-[0_20px_40px_-15px_rgba(139,92,246,0.08)]"
            >
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight mb-4 flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500">
                    <Award className="w-5 h-5 animate-pulse" />
                  </div>
                  <span>Top 5 Clients Leaderboard</span>
                </h3>

                {companyData.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-slate-400 text-sm font-semibold">
                    No active company client records.
                  </div>
                ) : (
                  <div className="space-y-4 pt-2">
                    {companyData.map((d, i) => {
                      const widthPercent = `${(d.qty / maxCompanyQty) * 100}%`;
                      return (
                        <div key={d.name} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-slate-700 dark:text-slate-300 truncate pr-2 font-semibold">{d.name}</span>
                            <span className="text-slate-500 dark:text-slate-400 shrink-0">{d.qty.toLocaleString()}</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-500/10 dark:bg-slate-950 overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: widthPercent }}
                              transition={{ duration: 0.5, delay: i * 0.05 }}
                              className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-500" 
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="text-slate-400 dark:text-slate-500 text-xs font-semibold pt-4 mt-2 border-t border-slate-500/10">
                Highest volume purchasing company clients
              </div>
            </motion.div>

          </div>
        </motion.div>
      )}

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
