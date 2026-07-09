import { motion } from 'motion/react';
import { CreditCard } from 'lucide-react';

export default function MakePaymentView() {
  return (
    <div className="space-y-8 pb-12">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-slate-200/70 dark:border-slate-800/80 bg-gradient-to-br from-white via-slate-50 to-blue-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/20 p-6 md:p-7"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shrink-0">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">Make Payment To Vendor</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Process and record vendor payments.</p>
          </div>
        </div>
      </motion.div>
      <div className="glass-card rounded-3xl p-8 text-center text-slate-500 font-medium">
        Module coming soon...
      </div>
    </div>
  );
}
