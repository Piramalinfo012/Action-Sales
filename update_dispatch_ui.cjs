const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'DispatchPlanningView.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Update header
content = content.replace(
  /'Company & Product', 'Supplier', 'Purchase Qty', 'Delivery', 'Status', 'Dispatch'/,
  "'Company & Product', 'Supplier / L1 Party', 'Qty', 'Delivery', 'Status', 'Dispatch'"
);

// Update row styling
content = content.replace(
  /<tr key=\{r\.rowIndex\} className="group hover:bg-indigo-50\/40 dark:hover:bg-slate-800\/30 transition-colors">/g,
  '<tr key={r.rowIndex} className={`group transition-colors ${r.isSale ? "bg-amber-50/20 hover:bg-amber-100/40 dark:bg-amber-900/10 dark:hover:bg-amber-900/20" : "hover:bg-indigo-50/40 dark:hover:bg-slate-800/30"}`}>'
);

// Update Supplier cell to show Sale badge
content = content.replace(
  /<div className="text-xs font-semibold text-slate-700 dark:text-slate-200">\{r\.supplierName \|\| '—'\}<\/div>/g,
  `<div className="flex items-center gap-2">
                            <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">{r.supplierName || '—'}</div>
                            {r.isSale && (
                              <span className="text-[9px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Sale</span>
                            )}
                          </div>`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated Dispatch UI successfully');
