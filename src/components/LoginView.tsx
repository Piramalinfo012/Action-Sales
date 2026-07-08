import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Database, 
  ShieldCheck,
  Building2,
  AlertCircle,
  Flame,
  MapPin,
  TrendingUp,
  Layers,
  Zap,
  CheckCircle,
  HelpCircle,
  Clock,
  Terminal,
  Server,
  Activity,
  Cpu,
  RefreshCw,
  Gauge,
  Droplet
} from 'lucide-react';
import { getUsersFromSheet } from '../api';
import { User as UserType } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: UserType) => void;
  onAddToast: (type: any, title: string, desc: string) => void;
}

type TabType = 'hubs' | 'products' | 'security';

export default function LoginView({ onLoginSuccess, onAddToast }: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('hubs');
  const [currentTime, setCurrentTime] = useState('');
  
  // Interactive Live Telemetry state
  const [fuelLevels, setFuelLevels] = useState({
    diesel: 74.5,
    furnace: 58.2,
    lube: 88.4
  });
  
  // Custom click interaction to "refuel"
  const handleRefuel = (product: 'diesel' | 'furnace' | 'lube') => {
    setFuelLevels(prev => {
      const nextVal = Math.min(100, Math.floor(prev[product] + 8));
      return {
        ...prev,
        [product]: nextVal
      };
    });
    
    const label = product === 'diesel' ? 'Premium Diesel' : product === 'furnace' ? 'Furnace Oil' : 'Lube Premium';
    setSystemLogs(prev => [
      `[COMMAND] Manual pressure purge & refuel triggered for ${label}`,
      `Sensor calibration verified at ${new Date().toLocaleTimeString()}`,
      ...prev.slice(0, 3)
    ]);
    
    onAddToast('info', 'Valve Opened', `Refueling simulation for ${label} triggered.`);
  };

  const [systemLogs, setSystemLogs] = useState<string[]>([
    'Secure TLS 1.3 cryptographic handshake established.',
    'Ready for authorized secure biometric or credential login.',
    'Pipeline telemetry streams activated on Node BOM-4.',
  ]);

  // Dynamic Time of Day Greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Clock Update & Live Telemetry Fluctuations
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);

    // Micro fluctuations of petroleum levels to make the UI look alive
    const teleTimer = setInterval(() => {
      setFuelLevels(prev => ({
        diesel: Math.max(10, Math.min(98, +(prev.diesel + (Math.random() * 0.8 - 0.4)).toFixed(1))),
        furnace: Math.max(10, Math.min(98, +(prev.furnace + (Math.random() * 0.6 - 0.3)).toFixed(1))),
        lube: Math.max(10, Math.min(98, +(prev.lube + (Math.random() * 0.4 - 0.2)).toFixed(1)))
      }));
    }, 3000);

    const logEvents = [
      'G-Sheet Database API: Synchronized successfully.',
      'Active active-node relay validated with latency < 15ms.',
      'Mumbai Port Terminal: Oil Pipeline status: nominal.',
      'Delhi distribution terminal tank pressure: 1.04 bar.',
      'Aviation fuel volume parameters validated under ISO 9001.',
      'Database connection handshake refresh initiated...',
      'Secure security token lookup cache cleared.'
    ];

    const logTimer = setInterval(() => {
      const randomLog = logEvents[Math.floor(Math.random() * logEvents.length)];
      setSystemLogs(prev => [randomLog, ...prev.slice(0, 4)]);
    }, 5500);

    return () => {
      clearInterval(timer);
      clearInterval(teleTimer);
      clearInterval(logTimer);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!username.trim() || !password) {
      setErrorMsg('Please input both credentials.');
      return;
    }

    setIsLoading(true);
    setSystemLogs(prev => [`Authorizing credentials for [${username.trim()}] via Google Sheet endpoint...`, ...prev]);

    try {
      const result = await getUsersFromSheet();
      
      if (!result.success || !result.data) {
        setErrorMsg(result.error || 'Connection failed. Please check network.');
        setIsLoading(false);
        setSystemLogs(prev => [`Authorization failure. Node timeout or bad configuration.`, ...prev]);
        return;
      }

      const userRow = result.data.find(u => 
        u.username.toLowerCase() === username.trim().toLowerCase() && 
        u.password === password
      );

      if (userRow) {
        const authenticatedUser: UserType = {
          name: userRow.name,
          username: userRow.username,
          role: userRow.role as any,
          rowIndex: userRow.rowIndex
        };

        localStorage.setItem('currentUser', JSON.stringify(authenticatedUser));
        setSystemLogs(prev => [`Access GRANTED for [${authenticatedUser.name}]. Starting session manager...`, ...prev]);
        
        onAddToast('success', 'Access Granted', `Welcome back, ${authenticatedUser.name}!`);
        
        // Timeout for high-fidelity sensory feedback
        setTimeout(() => {
          onLoginSuccess(authenticatedUser);
        }, 900);
      } else {
        setErrorMsg('Invalid Username or Password.');
        onAddToast('error', 'Login Failed', 'Incorrect username or security key.');
        setSystemLogs(prev => [`Access REJECTED for [${username.trim()}]. Audit trail logged.`, ...prev]);
      }

    } catch (err: any) {
      setErrorMsg(err.message || 'System error. Contact tech lead.');
      onAddToast('error', 'Network Error', 'Google Sheets communication interrupted.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoPass = (userRole: 'sales' | 'manager' | 'admin') => {
    setSystemLogs(prev => [`Demo quick-token loaded: Role [${userRole}]`, ...prev]);
    if (userRole === 'sales') {
      setUsername('sales');
      setPassword('sales123');
    } else if (userRole === 'manager') {
      setUsername('manager');
      setPassword('manager123');
    } else if (userRole === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    }
  };

  const petroleumPrices = [
    { city: 'Mumbai', diesel: '₹94.27', furnace: '₹52.18', lube: '₹310.50' },
    { city: 'Delhi', diesel: '₹96.72', furnace: '₹54.30', lube: '₹315.20' },
    { city: 'Chennai', diesel: '₹95.12', furnace: '₹53.40', lube: '₹308.90' },
    { city: 'Kolkata', diesel: '₹97.45', furnace: '₹55.10', lube: '₹318.00' }
  ];

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 overflow-hidden font-sans sleek-bg-dark text-slate-100 relative selection:bg-indigo-500/35">
      
      {/* Premium CSS Keyframe Styles built directly inside React for absolute modular portability */}
      <style>{`
        @keyframes wave-flow {
          0% { transform: translateX(0) translateZ(0) scaleY(1); }
          50% { transform: translateX(-25%) translateZ(0) scaleY(0.9); }
          100% { transform: translateX(-50%) translateZ(0) scaleY(1); }
        }
        .liquid-wave-animation {
          animation: wave-flow 5s cubic-bezier(0.36, 0.45, 0.63, 0.53) infinite;
        }
        .liquid-wave-animation-back {
          animation: wave-flow 8s cubic-bezier(0.36, 0.45, 0.63, 0.53) infinite;
          opacity: 0.6;
        }
        @keyframes subtle-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.02); }
        }
        .pulse-ambient {
          animation: subtle-pulse 4s ease-in-out infinite;
        }
        @keyframes text-marquee {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .marquee-container {
          display: flex;
          overflow: hidden;
          white-space: nowrap;
          width: 100%;
        }
        .marquee-content {
          display: inline-flex;
          animation: text-marquee 25s linear infinite;
        }
        .marquee-content:hover {
          animation-play-state: paused;
        }
        @keyframes security-grid {
          0% { background-position: 0% 0%; }
          100% { background-position: 0% 24px; }
        }
        .security-grid-bg {
          background-image: 
            linear-gradient(to right, rgba(99, 102, 241, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(99, 102, 241, 0.03) 1px, transparent 1px);
          background-size: 24px 24px;
          animation: security-grid 20s linear infinite;
        }
      `}</style>

      {/* Cybernetic Tech Grid and Cosmic Glowing Nodes */}
      <div className="absolute inset-0 security-grid-bg pointer-events-none" />
      <div className="absolute top-[-10%] left-[-15%] w-[650px] h-[650px] bg-gradient-to-tr from-blue-600/10 to-indigo-600/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-violet-600/10 to-blue-600/5 rounded-full blur-[140px] pointer-events-none" />

      {/* LEFT COLUMN: Visual Showcase, Real-time Operations & Interactive Telemetry */}
      <div className="hidden lg:flex lg:col-span-7 flex-col justify-between p-12 relative border-r border-slate-900/80 bg-slate-950/50 backdrop-blur-xl overflow-y-auto">
        
        {/* Top bar: Brand logo & SSL status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 relative">
              <Building2 className="w-6 h-6" />
              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-white tracking-tight text-xl leading-none uppercase">
                  Piramal Petroleum
                </span>
                <span className="text-[9px] font-bold text-blue-400 bg-blue-950/60 border border-blue-900/60 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Enterprise
                </span>
              </div>
              <p className="text-slate-400 font-semibold text-[10px] uppercase tracking-widest mt-1">
                Refining & Sales Core System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800/80 rounded-full py-1.5 px-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-400 tracking-wider">TLS 1.3 CLIENT VERIFIED</span>
          </div>
        </div>

        {/* Central Dynamic Showcase & Telemetry Widgets */}
        <div className="my-auto py-10 space-y-8 max-w-xl">
          <div className="space-y-3">
            <span className="text-xs font-bold text-indigo-400 bg-indigo-950/50 border border-indigo-900/40 px-3 py-1 rounded-full w-fit flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-indigo-400" />
              <span>LIVE DISTRIBUTION CONTROL CONSOLE</span>
            </span>
            <h1 className="text-3xl xl:text-4.5xl font-black text-white tracking-tight leading-none bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-300">
              Integrated Fuel Logistics & Pipeline Terminal
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed font-medium">
              Enterprise portal for transaction entries, real-time volume calculations, and L1 operations validation with seamless spreadsheet ledger replication.
            </p>
          </div>

          {/* Interactive Telemetry Tanks (Fuel simulation - Clickable refuel feature) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-indigo-400" />
                Live Tank Telemetry <span className="text-[10px] text-slate-500 font-semibold">(Interactive)</span>
              </span>
              <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                Fluctuations Auto-updating
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4">
              
              {/* Diesel Tank */}
              <button 
                onClick={() => handleRefuel('diesel')} 
                className="group text-left focus:outline-none cursor-pointer"
              >
                <div className="relative w-full h-28 bg-slate-900/85 border border-slate-800/80 rounded-2xl overflow-hidden flex flex-col justify-end group-hover:border-amber-500/45 transition-colors shadow-inner">
                  {/* Glass reflection accent */}
                  <div className="absolute top-0 inset-x-0 h-10 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                  
                  {/* Dynamic wave */}
                  <div 
                    className="w-full absolute bottom-0 bg-gradient-to-t from-amber-600 via-amber-500 to-amber-400 transition-all duration-700 overflow-hidden"
                    style={{ height: `${fuelLevels.diesel}%` }}
                  >
                    {/* SVG wave effect */}
                    <div className="absolute top-0 left-0 right-0 h-3 bg-amber-400/30 liquid-wave-animation" />
                    <div className="absolute top-0 left-0 right-0 h-3 bg-amber-300/25 liquid-wave-animation-back" />
                  </div>

                  {/* Level readout */}
                  <div className="relative z-10 p-3 flex flex-col justify-between h-full pointer-events-none">
                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-amber-300 transition-colors bg-slate-950/40 w-fit px-1.5 py-0.5 rounded-md">DIESEL</span>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-lg font-black text-white">{fuelLevels.diesel}%</span>
                      <span className="text-[8px] text-amber-300 font-bold">L-1</span>
                    </div>
                  </div>
                </div>
                <div className="text-center mt-1.5">
                  <span className="text-[9px] text-slate-500 font-bold group-hover:text-amber-400 transition-colors">Click to Refuel</span>
                </div>
              </button>

              {/* Furnace Oil Tank */}
              <button 
                onClick={() => handleRefuel('furnace')} 
                className="group text-left focus:outline-none cursor-pointer"
              >
                <div className="relative w-full h-28 bg-slate-900/85 border border-slate-800/80 rounded-2xl overflow-hidden flex flex-col justify-end group-hover:border-indigo-500/45 transition-colors shadow-inner">
                  <div className="absolute top-0 inset-x-0 h-10 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                  
                  <div 
                    className="w-full absolute bottom-0 bg-gradient-to-t from-indigo-600 via-indigo-500 to-indigo-400 transition-all duration-700 overflow-hidden"
                    style={{ height: `${fuelLevels.furnace}%` }}
                  >
                    <div className="absolute top-0 left-0 right-0 h-3 bg-indigo-400/30 liquid-wave-animation" />
                    <div className="absolute top-0 left-0 right-0 h-3 bg-indigo-300/25 liquid-wave-animation-back" />
                  </div>

                  <div className="relative z-10 p-3 flex flex-col justify-between h-full pointer-events-none">
                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-indigo-300 transition-colors bg-slate-950/40 w-fit px-1.5 py-0.5 rounded-md">FURNACE</span>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-lg font-black text-white">{fuelLevels.furnace}%</span>
                      <span className="text-[8px] text-indigo-300 font-bold">L-2</span>
                    </div>
                  </div>
                </div>
                <div className="text-center mt-1.5">
                  <span className="text-[9px] text-slate-500 font-bold group-hover:text-indigo-400 transition-colors">Click to Refuel</span>
                </div>
              </button>

              {/* Lube Premium */}
              <button 
                onClick={() => handleRefuel('lube')} 
                className="group text-left focus:outline-none cursor-pointer"
              >
                <div className="relative w-full h-28 bg-slate-900/85 border border-slate-800/80 rounded-2xl overflow-hidden flex flex-col justify-end group-hover:border-blue-500/45 transition-colors shadow-inner">
                  <div className="absolute top-0 inset-x-0 h-10 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                  
                  <div 
                    className="w-full absolute bottom-0 bg-gradient-to-t from-blue-600 via-blue-500 to-blue-400 transition-all duration-700 overflow-hidden"
                    style={{ height: `${fuelLevels.lube}%` }}
                  >
                    <div className="absolute top-0 left-0 right-0 h-3 bg-blue-400/30 liquid-wave-animation" />
                    <div className="absolute top-0 left-0 right-0 h-3 bg-blue-300/25 liquid-wave-animation-back" />
                  </div>

                  <div className="relative z-10 p-3 flex flex-col justify-between h-full pointer-events-none">
                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-300 transition-colors bg-slate-950/40 w-fit px-1.5 py-0.5 rounded-md">LUBE OIL</span>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-lg font-black text-white">{fuelLevels.lube}%</span>
                      <span className="text-[8px] text-blue-300 font-bold">L-3</span>
                    </div>
                  </div>
                </div>
                <div className="text-center mt-1.5">
                  <span className="text-[9px] text-slate-500 font-bold group-hover:text-blue-400 transition-colors">Click to Refuel</span>
                </div>
              </button>

            </div>
          </div>

          {/* Interactive Navigation Tabs for Hub Info / Showcase details */}
          <div className="flex bg-slate-900/50 border border-slate-850 p-1.5 rounded-2xl">
            {(['hubs', 'products', 'security'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all capitalize cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab === 'hubs' && <MapPin className="w-3.5 h-3.5" />}
                {tab === 'products' && <Flame className="w-3.5 h-3.5" />}
                {tab === 'security' && <Layers className="w-3.5 h-3.5" />}
                {tab}
              </button>
            ))}
          </div>

          {/* Dynamic Interactive Panel Details with AnimatePresence */}
          <div className="min-h-[160px] relative">
            <AnimatePresence mode="wait">
              {activeTab === 'hubs' && (
                <motion.div
                  key="hubs"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/40 border border-slate-900/80 p-4 rounded-2xl flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 font-black text-xs">MUM</div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-300">Mumbai Hub</h4>
                        <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                          Delivery Active
                        </p>
                      </div>
                    </div>
                    <div className="bg-slate-900/40 border border-slate-900/80 p-4 rounded-2xl flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-black text-xs">DEL</div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-300">Delhi Hub</h4>
                        <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                          Tunnel Secured
                        </p>
                      </div>
                    </div>
                    <div className="bg-slate-900/40 border border-slate-900/80 p-4 rounded-2xl flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 font-black text-xs">CHN</div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-300">Chennai Hub</h4>
                        <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                          Online
                        </p>
                      </div>
                    </div>
                    <div className="bg-slate-900/40 border border-slate-900/80 p-4 rounded-2xl flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 font-black text-xs">KOL</div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-300">Kolkata Hub</h4>
                        <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                          Nominal Standby
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'products' && (
                <motion.div
                  key="products"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-3"
                >
                  <p className="text-xs text-slate-400 leading-normal">
                    Direct access to log sales transactions across our key product lines with built-in density-volume conversion algorithms:
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-900/40 border border-slate-900/80 p-3.5 rounded-2xl text-center">
                      <Flame className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
                      <span className="text-[10px] font-bold text-slate-300 block">Premium Diesel</span>
                      <span className="text-[9px] text-amber-400/80 font-bold">High Density</span>
                    </div>
                    <div className="bg-slate-900/40 border border-slate-900/80 p-3.5 rounded-2xl text-center">
                      <Flame className="w-5 h-5 text-indigo-400 mx-auto mb-1.5" />
                      <span className="text-[10px] font-bold text-slate-300 block">Furnace Oil</span>
                      <span className="text-[9px] text-indigo-400/80 font-bold">Viscous Heavy</span>
                    </div>
                    <div className="bg-slate-900/40 border border-slate-900/80 p-3.5 rounded-2xl text-center">
                      <Flame className="w-5 h-5 text-blue-400 mx-auto mb-1.5" />
                      <span className="text-[10px] font-bold text-slate-300 block">Lube Premium</span>
                      <span className="text-[9px] text-blue-400/80 font-bold">Friction Shield</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'security' && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-3 text-xs text-slate-300"
                >
                  <div className="bg-slate-900/40 border border-slate-900/80 p-4 rounded-2xl space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center text-[10px] font-bold text-emerald-400 shrink-0">1</div>
                      <p><strong>Sales Executive View:</strong> Insert order records, track active entries, edit personal logs before locking.</p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-indigo-500/10 flex items-center justify-center text-[10px] font-bold text-indigo-400 shrink-0">2</div>
                      <p><strong>Operations Manager View:</strong> Complete view of charts, approve / confirm (L1 Status) logs, filter sheets instantly.</p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-violet-500/10 flex items-center justify-center text-[10px] font-bold text-violet-400 shrink-0">3</div>
                      <p><strong>Administrator View:</strong> Root access over all credentials, delete entries, and full database auditing powers.</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Real-time System Logs Terminal Output with Scanline CSS */}
        <div className="space-y-3 bg-slate-950 border border-slate-900 rounded-2xl p-5 font-mono max-w-xl relative overflow-hidden scanline-effect shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-400 animate-pulse" />
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">SECURE TELEMETRY HANDSHAKE</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold">
              <Server className="w-3.5 h-3.5 text-slate-600" />
              <span>Node: AWS-BOM-4</span>
            </div>
          </div>
          <div className="space-y-1.5 text-[10px] text-slate-400 leading-relaxed min-h-[95px] flex flex-col justify-end">
            {systemLogs.map((log, index) => (
              <div key={index} className={`flex items-start gap-2 transition-opacity duration-300 ${index === 0 ? 'text-indigo-300 font-bold' : 'text-slate-500 opacity-80'}`}>
                <span className="text-slate-600 shrink-0">[{currentTime || 'Active'}]</span>
                <span>{log}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Continuous Fuel Price Ticker (High end UI detail) */}
        <div className="marquee-container mt-4 bg-slate-950/30 border border-slate-900/60 py-2 rounded-xl max-w-xl overflow-hidden">
          <div className="marquee-content gap-8 text-[11px] font-mono text-slate-500">
            {petroleumPrices.map((p, i) => (
              <div key={i} className="flex items-center gap-3 shrink-0">
                <span className="font-bold text-slate-400">{p.city} Hub:</span>
                <span className="flex items-center gap-1"><Droplet className="w-3 h-3 text-amber-500" /> Diesel: <strong className="text-slate-300">{p.diesel}</strong></span>
                <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-indigo-400" /> Furnace: <strong className="text-slate-300">{p.furnace}</strong></span>
                <span className="flex items-center gap-1"><Cpu className="w-3 h-3 text-blue-400" /> Lube: <strong className="text-slate-300">{p.lube}</strong></span>
              </div>
            ))}
            {/* Duplicated for smooth infinite loop */}
            {petroleumPrices.map((p, i) => (
              <div key={`dup-${i}`} className="flex items-center gap-3 shrink-0">
                <span className="font-bold text-slate-400">{p.city} Hub:</span>
                <span className="flex items-center gap-1"><Droplet className="w-3 h-3 text-amber-500" /> Diesel: <strong className="text-slate-300">{p.diesel}</strong></span>
                <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-indigo-400" /> Furnace: <strong className="text-slate-300">{p.furnace}</strong></span>
                <span className="flex items-center gap-1"><Cpu className="w-3 h-3 text-blue-400" /> Lube: <strong className="text-slate-300">{p.lube}</strong></span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info branding */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-900/60 pt-6 mt-6 max-w-xl">
          <p>© {new Date().getFullYear()} Piramal Petroleum Ltd. Secure Access System.</p>
          <div className="flex items-center gap-4">
            <span className="hover:text-indigo-400 transition-colors cursor-pointer">Helpdesk</span>
            <span className="hover:text-indigo-400 transition-colors cursor-pointer">Security Protocol</span>
          </div>
        </div>
      </div>


      {/* RIGHT COLUMN: Modern Access Form Panel */}
      <div className="lg:col-span-5 flex flex-col justify-center items-center p-6 sm:p-12 relative">
        
        {/* Mobile Header Bar (Only visible if mobile/tablet) */}
        <div className="lg:hidden flex flex-col items-center text-center space-y-3 mb-8 mt-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
            <Building2 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="font-extrabold text-white tracking-tight text-xl">
              Piramal Petroleum
            </h1>
            <p className="text-indigo-400 font-bold text-xs uppercase tracking-widest mt-0.5">
              Action Sales System
            </p>
          </div>
        </div>

        {/* Access Box Card: Beautiful specular glass highlight */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="w-full max-w-md glass-card rounded-3xl p-8 relative overflow-hidden flex flex-col gap-6 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        >
          {/* Subtle accent corner light */}
          <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 rounded-full blur-2xl" />

          {/* Form Header Title */}
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest block bg-indigo-950/40 border border-indigo-900/50 w-fit px-2.5 py-0.5 rounded-full">
              {getGreeting()}, Officer
            </span>
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Secure Login Portal
            </h2>
            <p className="text-xs text-slate-400 font-medium leading-relaxed">
              Authenticate using credentials linked to your G-Sheet database records.
            </p>
          </div>

          {/* Quick Demo Passes Panel: Premium Microchip style cards */}
          <div className="space-y-2.5 bg-slate-900/50 border border-slate-900 p-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                Demo Credentials Quick-Pass
              </span>
              <span className="text-[9px] text-slate-500 font-bold">One-click load</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoPass('sales')}
                className="py-2.5 px-1.5 text-[10px] font-bold text-slate-300 hover:text-white bg-slate-950/70 border border-slate-900 hover:border-blue-500/50 hover:bg-blue-950/10 rounded-xl transition-all cursor-pointer text-center truncate flex flex-col items-center gap-1.5 group"
              >
                <div className="w-5 h-5 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-[9px] group-hover:bg-blue-500/20 transition-all">SE</div>
                <span>Sales Exec</span>
              </button>
              
              <button
                type="button"
                onClick={() => handleQuickDemoPass('manager')}
                className="py-2.5 px-1.5 text-[10px] font-bold text-slate-300 hover:text-white bg-slate-950/70 border border-slate-900 hover:border-indigo-500/50 hover:bg-indigo-950/10 rounded-xl transition-all cursor-pointer text-center truncate flex flex-col items-center gap-1.5 group"
              >
                <div className="w-5 h-5 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold text-[9px] group-hover:bg-indigo-500/20 transition-all">MN</div>
                <span>Manager</span>
              </button>
              
              <button
                type="button"
                onClick={() => handleQuickDemoPass('admin')}
                className="py-2.5 px-1.5 text-[10px] font-bold text-slate-300 hover:text-white bg-slate-950/70 border border-slate-900 hover:border-violet-500/50 hover:bg-violet-950/10 rounded-xl transition-all cursor-pointer text-center truncate flex flex-col items-center gap-1.5 group"
              >
                <div className="w-5 h-5 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 font-bold text-[9px] group-hover:bg-violet-500/20 transition-all">AD</div>
                <span>Admin Root</span>
              </button>
            </div>
          </div>

          {/* Core Authorization Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs font-semibold flex items-center gap-2.5 shadow-md"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </motion.div>
            )}

            {/* Username Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                Username Identifier
              </label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5">
                  <User className="text-slate-500 group-focus-within:text-indigo-400 transition-colors w-4.5 h-4.5" />
                </div>
                <input
                  type="text"
                  placeholder="Enter username (e.g., sales, manager)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-950/60 border border-slate-900/80 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none rounded-2xl text-white text-sm font-medium transition-all disabled:opacity-50 placeholder-slate-600"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                Security Password
              </label>
              <div className="relative group">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5">
                  <Lock className="text-slate-500 group-focus-within:text-indigo-400 transition-colors w-4.5 h-4.5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-11 pr-11 py-3.5 bg-slate-950/60 border border-slate-900/80 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none rounded-2xl text-white text-sm font-medium transition-all disabled:opacity-50 placeholder-slate-600"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer flex items-center justify-center w-6 h-6"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-bold text-sm py-4 rounded-2xl shadow-lg shadow-blue-500/10 hover:shadow-indigo-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-55 cursor-pointer mt-2"
            >
              <span>{isLoading ? 'ESTABLISHING API HANDSHAKE...' : 'CONNECT TO SECURE SERVER'}</span>
              {!isLoading && <ArrowRight className="w-4.5 h-4.5" />}
            </button>
          </form>

          {/* Secure Audit Badges */}
          <div className="border-t border-slate-900/80 pt-5 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-slate-600" />
              <span>G-Sheet Live Replication</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>SHA-256 TLS Tunnel</span>
            </div>
          </div>
        </motion.div>

        {/* Corporate Security Warning */}
        <p className="mt-8 text-center text-[11px] text-slate-500 max-w-sm px-6 font-semibold leading-relaxed">
          WARNING: Unauthorised access attempt will be tracked and flagged. Access activity subject to corporate IT guidelines and regulatory logging.
        </p>
      </div>
    </div>
  );
}
