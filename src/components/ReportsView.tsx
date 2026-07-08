import React, { useState } from 'react';
import { motion } from 'motion/react';
import { BarChart3, TrendingUp, PieChart, Map, Award, Percent } from 'lucide-react';
import { ActionEntry } from '../types';

interface ReportsViewProps {
  actions: ActionEntry[];
}

export default function ReportsView({ actions }: ReportsViewProps) {
  const [hoveredIndex, setHoveredIndex] = useState<string | null>(null);

  // --- 1. Monthly Aggregation ---
  // Returns array of { month: "YYYY-MM", qty: number } sorted by date
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

  // --- 2. Location Wise Aggregation ---
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

  // --- 3. Product Wise Aggregation ---
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

  // --- 4. Company Wise Aggregation ---
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

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <span>Interactive Performance Reports</span>
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-medium">
          Analyze sales performance across monthly timelines, geographic distribution hubs, product lines, and top clients.
        </p>
      </div>

      {/* Grid of 4 charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Chart 1: Monthly Timeline */}
        <div className="glass-card rounded-3xl p-6 flex flex-col justify-between min-h-[350px]">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <span>Monthly Volume Trends</span>
            </h3>
            
            {monthlyData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-400 text-sm font-semibold">
                No historical monthly data available.
              </div>
            ) : (
              <div className="h-56 flex items-end gap-5 pt-6 pb-2 px-2 border-b border-slate-100 dark:border-slate-800">
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
                        <div className="absolute top-0 bg-slate-950 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-lg z-25 -translate-y-8 text-center border border-slate-800">
                          {d.qty.toLocaleString()}
                        </div>
                      )}
                      
                      {/* Bar */}
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: heightPercent }}
                        transition={{ duration: 0.5, delay: i * 0.05 }}
                        className={`w-full rounded-t-xl transition-all duration-300 ${
                          isHovered ? 'bg-blue-600 shadow-md shadow-blue-500/25' : 'bg-blue-500/80'
                        }`}
                      />
                      
                      {/* Label */}
                      <span className="text-[10px] font-bold text-slate-400 mt-2.5 truncate w-full text-center">
                        {d.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="text-slate-400 text-xs font-semibold pt-4 mt-2 border-t border-slate-100 dark:border-slate-800/40">
            Total output volume measured from recorded quantities
          </div>
        </div>

        {/* Chart 2: Location Wise */}
        <div className="glass-card rounded-3xl p-6 flex flex-col justify-between min-h-[350px]">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight mb-4 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-emerald-500" />
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
                          className="transition-all duration-300"
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
                    <div key={d.name} className="flex items-center justify-between text-xs font-semibold">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                        <span className="text-slate-700 dark:text-slate-300 truncate">{d.name}</span>
                      </div>
                      <span className="text-slate-400 font-bold shrink-0">{d.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="text-slate-400 text-xs font-semibold pt-4 mt-2 border-t border-slate-100 dark:border-slate-800/40 flex items-center gap-1">
            <Percent className="w-3.5 h-3.5 text-emerald-500" />
            <span>Percentage of total sales volume</span>
          </div>
        </div>

        {/* Chart 3: Product Wise */}
        <div className="glass-card rounded-3xl p-6 flex flex-col justify-between min-h-[350px]">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
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
                        <span className="text-slate-700 dark:text-slate-300 truncate pr-2">{d.name}</span>
                        <span className="text-slate-500 shrink-0">{d.qty.toLocaleString()}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-950 overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: widthPercent }}
                          transition={{ duration: 0.5, delay: i * 0.05 }}
                          className="h-full rounded-full bg-amber-500" 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="text-slate-400 text-xs font-semibold pt-4 mt-2 border-t border-slate-100 dark:border-slate-800/40">
            Top product classifications based on logged quantities
          </div>
        </div>

        {/* Chart 4: Company Wise Leaderboard */}
        <div className="glass-card rounded-3xl p-6 flex flex-col justify-between min-h-[350px]">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-violet-500" />
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
                        <span className="text-slate-700 dark:text-slate-300 truncate pr-2">{d.name}</span>
                        <span className="text-slate-500 shrink-0">{d.qty.toLocaleString()}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-950 overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: widthPercent }}
                          transition={{ duration: 0.5, delay: i * 0.05 }}
                          className="h-full rounded-full bg-violet-600" 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="text-slate-400 text-xs font-semibold pt-4 mt-2 border-t border-slate-100 dark:border-slate-800/40">
            Highest volume purchasing company clients
          </div>
        </div>

      </div>
    </div>
  );
}
