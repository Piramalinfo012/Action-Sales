const fs = require('fs');
const path = require('path');

const dir = 'd:\\action sales New\\Action-Sales\\src\\components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  let newContent = content;

  // Revert the label darkness slightly so it contrasts with input text, but make it extrabold
  newContent = newContent.replace(/font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block/g, 'font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1');
  
  // For NewActionView specifically which might have text-[11px]
  newContent = newContent.replace(/font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block flex/g, 'font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block flex mb-1');

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log('Updated ' + file);
  }
}
