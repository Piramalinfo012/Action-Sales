import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'motion/react';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Building2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Box,
  Layers,
  Activity
} from 'lucide-react';
import { getUsersFromSheet } from '../api';
import { User as UserType } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: UserType) => void;
  onAddToast: (type: any, title: string, desc: string) => void;
}

// Reusable 3D Tilt Wrapper for the form
const TiltWrapper = ({ children }: { children: React.ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth springs for fluid 3D motion
  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });

  // Map mouse position to rotation angles (subtle but premium)
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div className="perspective-1000 w-full max-w-[420px]">
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="w-full relative z-10"
      >
        <div 
          style={{ transform: "translateZ(40px)" }} // Pop out the card content
          className="w-full bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-[0_30px_60px_rgba(0,0,0,0.12)] border border-white/60 relative"
        >
          {children}
        </div>
      </motion.div>
    </div>
  );
};


export default function LoginView({ onLoginSuccess, onAddToast }: LoginViewProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!username.trim() || !password) {
      setErrorMsg('Please enter your credentials to continue.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await getUsersFromSheet();
      
      if (!result.success || !result.data) {
        setErrorMsg(result.error || 'Connection failed. Please check network.');
        setIsLoading(false);
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
          rowIndex: userRow.rowIndex,
          profileUrl: userRow['profile url'] || userRow['profileUrl'] || '',
          pageAccess: userRow['page access'] || userRow['pageAccess'] || ''
        };

        localStorage.setItem('currentUser', JSON.stringify(authenticatedUser));
        onAddToast('success', 'Access Granted', `Welcome back, ${authenticatedUser.name}!`);
        
        setTimeout(() => {
          onLoginSuccess(authenticatedUser);
        }, 800);
      } else {
        setErrorMsg('Invalid Username or Password.');
        onAddToast('error', 'Login Failed', 'Incorrect credentials provided.');
      }

    } catch (err: any) {
      setErrorMsg(err.message || 'System error. Contact support.');
      onAddToast('error', 'Network Error', 'Google Sheets communication interrupted.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoPass = (userRole: 'sales' | 'manager' | 'admin') => {
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

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-[#f4f7fb] font-sans overflow-hidden">
      
      {/* 3D Global Perspective Class */}
      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .perspective-2000 { perspective: 2000px; }
        .preserve-3d { transform-style: preserve-3d; }
        
        /* 3D Isometric Cube Styles */
        .cube-container {
          width: 120px;
          height: 120px;
          position: absolute;
          transform-style: preserve-3d;
        }
        .cube-face {
          position: absolute;
          width: 120px;
          height: 120px;
          background: rgba(16, 185, 129, 0.15); /* Emerald tint */
          border: 1px solid rgba(16, 185, 129, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 0 20px rgba(16, 185, 129, 0.2);
        }
        .face-front  { transform: rotateY(  0deg) translateZ(60px); }
        .face-back   { transform: rotateY(180deg) translateZ(60px); }
        .face-right  { transform: rotateY( 90deg) translateZ(60px); }
        .face-left   { transform: rotateY(-90deg) translateZ(60px); }
        .face-top    { transform: rotateX( 90deg) translateZ(60px); }
        .face-bottom { transform: rotateX(-90deg) translateZ(60px); }
      `}</style>

      {/* LEFT COLUMN: 3D Animated Branding */}
      <div className="hidden lg:flex flex-col relative overflow-hidden bg-[#0a0f1c] perspective-2000">
        
        {/* Dynamic 3D Floating Geometry */}
        <div className="absolute inset-0 z-0 flex items-center justify-center preserve-3d">
          
          {/* Main Rotating 3D Cube */}
          <motion.div 
            animate={{ 
              rotateX: [0, 360], 
              rotateY: [0, 360],
              rotateZ: [0, 360]
            }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="cube-container z-10"
            style={{ left: '25%', top: '30%' }}
          >
            <div className="cube-face face-front"><Building2 className="w-8 h-8 text-emerald-400 opacity-50" /></div>
            <div className="cube-face face-back"></div>
            <div className="cube-face face-right"><Box className="w-8 h-8 text-emerald-400 opacity-50" /></div>
            <div className="cube-face face-left"></div>
            <div className="cube-face face-top"></div>
            <div className="cube-face face-bottom"></div>
          </motion.div>

          {/* Secondary Orbiting Cube (Smaller) */}
          <motion.div 
            animate={{ 
              rotateX: [360, 0], 
              rotateY: [360, 0],
              y: [-50, 50, -50]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="cube-container"
            style={{ right: '20%', bottom: '25%', transform: 'scale(0.5)' }}
          >
            <div className="cube-face face-front" style={{ background: 'rgba(56, 189, 248, 0.1)', borderColor: 'rgba(56, 189, 248, 0.4)' }}></div>
            <div className="cube-face face-back" style={{ background: 'rgba(56, 189, 248, 0.1)', borderColor: 'rgba(56, 189, 248, 0.4)' }}></div>
            <div className="cube-face face-right" style={{ background: 'rgba(56, 189, 248, 0.1)', borderColor: 'rgba(56, 189, 248, 0.4)' }}></div>
            <div className="cube-face face-left" style={{ background: 'rgba(56, 189, 248, 0.1)', borderColor: 'rgba(56, 189, 248, 0.4)' }}></div>
            <div className="cube-face face-top" style={{ background: 'rgba(56, 189, 248, 0.1)', borderColor: 'rgba(56, 189, 248, 0.4)' }}></div>
            <div className="cube-face face-bottom" style={{ background: 'rgba(56, 189, 248, 0.1)', borderColor: 'rgba(56, 189, 248, 0.4)' }}></div>
          </motion.div>

          {/* 3D Ambient Orbs */}
          <motion.div
            animate={{ scale: [1, 1.2, 1], z: [0, 200, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/4 left-1/2 w-96 h-96 bg-emerald-500/20 rounded-full blur-[100px]"
          />
          <motion.div
            animate={{ scale: [1, 1.5, 1], z: [0, -200, 0], x: [0, 50, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px]"
          />
        </div>

        {/* Foreground Content */}
        <div className="relative z-20 p-12 xl:p-20 flex flex-col h-full justify-between pointer-events-none">
          <motion.div 
            initial={{ opacity: 0, z: -100 }}
            animate={{ opacity: 1, z: 0 }}
            transition={{ duration: 1 }}
            className="flex items-center gap-3.5"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-xl shadow-emerald-500/40">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-extrabold text-white tracking-tight text-xl leading-none">
                Auction Sales
              </h1>
              <span className="text-[11px] font-bold text-emerald-400 tracking-[0.2em] uppercase mt-1 block drop-shadow-md">
                Management
              </span>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="max-w-xl"
          >
            <h2 className="text-4xl xl:text-6xl font-bold text-white tracking-tight leading-[1.1] mb-6 drop-shadow-lg">
              Next-Gen <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">3D Operations</span>
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed mb-10 max-w-md font-light">
              Experience unparalleled depth in dispatch management and live tracking.
            </p>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full backdrop-blur-md">
                <Layers className="w-4 h-4" /> 3D Spatial Interface
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-4 py-2 rounded-full backdrop-blur-md">
                <Activity className="w-4 h-4" /> Real-time Sync
              </div>
            </div>
          </motion.div>

          <div className="flex flex-col gap-2 text-xs font-medium text-slate-500 mt-10">
            <div className="flex items-center gap-4">
              <span>© {new Date().getFullYear()} Auction Sales Management.</span>
              <a href="#" className="hover:text-emerald-400 transition-colors pointer-events-auto">Privacy Policy</a>
            </div>
            <span className="text-emerald-500/80 font-bold tracking-wider">DEVELOPED BY DEEPAK SAHU</span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: 3D Tilt Login Form */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12 relative bg-gradient-to-br from-slate-50 to-slate-100 overflow-y-auto">
        
        {/* Mobile Branding */}
        <div className="lg:hidden flex flex-col items-center mb-10 mt-6 z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-xl shadow-emerald-500/30 mb-4">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="font-bold text-slate-900 tracking-tight text-2xl">
            Auction Sales Management
          </h1>
        </div>

        {/* 3D Tilt Wrapper */}
        <TiltWrapper>
          <div className="mb-8" style={{ transform: "translateZ(30px)" }}>
            <span className="inline-block py-1 px-3 rounded-full bg-emerald-50 text-emerald-600 text-xs font-bold tracking-wide uppercase mb-4 border border-emerald-100 shadow-sm">
              {getGreeting()}
            </span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2 drop-shadow-sm">
              Welcome back
            </h2>
            <p className="text-slate-500 text-sm font-medium">
              Enter your credentials to enter the 3D workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" style={{ transform: "translateZ(40px)" }}>
            <AnimatePresence>
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className="bg-red-50 text-red-600 border border-red-100 rounded-xl p-4 text-sm font-medium flex items-start gap-3 shadow-inner"
                >
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>{errorMsg}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide ml-1 transition-colors group-focus-within:text-emerald-600">Username</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <User className="w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g., manager"
                  disabled={isLoading}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-slate-900 font-bold transition-all outline-none disabled:opacity-50 placeholder-slate-400 shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5 group">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide ml-1 transition-colors group-focus-within:text-emerald-600">Password</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <Lock className="w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isLoading}
                  className="w-full pl-12 pr-12 py-3.5 bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-xl text-slate-900 font-bold transition-all outline-none disabled:opacity-50 placeholder-slate-400 shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2" style={{ transform: "translateZ(20px)" }}>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer shadow-sm" />
                <span className="text-sm text-slate-600 font-medium group-hover:text-slate-900 transition-colors">Remember me</span>
              </label>
              <a href="#" className="text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors">
                Forgot password?
              </a>
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: isLoading ? 1 : 1.02, rotateX: 5 }}
              whileTap={{ scale: isLoading ? 1 : 0.95, rotateX: -5 }}
              style={{ transformStyle: "preserve-3d" }}
              className="w-full py-4 mt-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-[0_10px_20px_rgba(0,0,0,0.2)] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group relative overflow-hidden"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              
              <div style={{ transform: "translateZ(20px)" }} className="flex items-center gap-2">
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In Securely</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </div>
            </motion.button>
          </form>

          {/* Quick Demo Access (For Testing) */}
          <div className="mt-10 pt-8 border-t border-slate-100" style={{ transform: "translateZ(20px)" }}>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-center mb-4">
              Demo Access Accounts
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'sales', label: 'Sales Exec' },
                { id: 'manager', label: 'Manager' },
                { id: 'admin', label: 'Admin' }
              ].map((role) => (
                <motion.button
                  key={role.id}
                  whileHover={{ y: -2, scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleQuickDemoPass(role.id as any)}
                  className="py-2.5 px-2 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-[11px] font-bold text-slate-600 hover:text-emerald-700 transition-colors text-center shadow-sm"
                >
                  {role.label}
                </motion.button>
              ))}
            </div>
          </div>
          
          <div className="mt-8 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-400" style={{ transform: "translateZ(10px)" }}>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            End-to-End Encrypted Handshake
          </div>
        </TiltWrapper>
        
        {/* Mobile ONLY Developer Tag */}
        <div className="lg:hidden mt-12 text-center text-[10px] font-bold text-slate-400 tracking-widest">
          DEVELOPED BY DEEPAK SAHU
        </div>
      </div>

      {/* Inline animation styles for shimmer */}
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
