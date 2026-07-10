import fs from 'fs';
import path from 'path';

const dir = 'src/components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx') && !f.includes('DashboardView') && !f.includes('LoginView') && !f.includes('Sidebar'));

for (const file of files) {
  let filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes('<table')) continue;

  // We want to add a class to the table to target it in CSS
  if (!content.includes('responsive-mobile-table')) {
    content = content.replace(/<table className="([^"]*)"/g, '<table className="$1 responsive-mobile-table"');
  }

  // Find all <th> elements and extract text for data-label logic
  const theadMatch = content.match(/<thead[^>]*>([\s\S]*?)<\/thead>/);
  if (theadMatch) {
    const theadContent = theadMatch[1];
    
    // Simplistic extraction: just find text inside th or span inside th
    const ths = theadContent.match(/<th[^>]*>[\s\S]*?<\/th>/g) || [];
    let headers = [];
    for (const th of ths) {
      let textMatch = th.match(/<span>([^<]*?)<\/span>/);
      if (!textMatch || !textMatch[1].trim()) {
        textMatch = th.match(/<th[^>]*>([^<]+)<\/th>/);
      }
      let text = textMatch ? textMatch[1].trim() : '';
      if (!text && th.includes('Action')) text = 'Action';
      if (!text && th.includes('L1 Confirmation')) text = 'L1 Confirmation';
      if (!text && th.includes('Remark')) text = 'Remark';
      headers.push(text.replace(/[^a-zA-Z0-9 ]/g, ''));
    }

    if (headers.length > 0 && !content.includes('</style>')) {
      let styleCss = `
        @media (max-width: 768px) {
          .responsive-mobile-table { display: block; width: 100%; background: transparent !important; border: none !important; }
          .responsive-mobile-table thead { display: none; }
          .responsive-mobile-table tbody, .responsive-mobile-table tr, .responsive-mobile-table td { display: block; width: 100%; }
          .responsive-mobile-table tr { margin-bottom: 1.5rem; background: var(--bg-card, white); border: 1px solid rgba(0,0,0,0.1); border-radius: 1rem; padding: 1rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .dark .responsive-mobile-table tr { background: rgba(30, 41, 59, 0.5); border-color: rgba(255,255,255,0.05); }
          .responsive-mobile-table td { text-align: right !important; padding: 0.75rem 0 !important; border: none !important; position: relative; padding-left: 50% !important; min-height: 2.5rem; display: flex; justify-content: flex-end; align-items: center; white-space: normal !important; overflow: hidden; }
          .responsive-mobile-table td::before { position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 45%; text-align: left; font-weight: 700; color: #64748b; font-size: 0.7rem; text-transform: uppercase; }
          .dark .responsive-mobile-table td::before { color: #94a3b8; }
          /* Add horizontal lines between rows inside the card */
          .responsive-mobile-table td:not(:last-child) { border-bottom: 1px dashed rgba(148, 163, 184, 0.25) !important; }
`;
      
      headers.forEach((h, i) => {
        if (h) {
          styleCss += `          .responsive-mobile-table td:nth-of-type(${i+1})::before { content: "${h}"; }\n`;
        }
      });
      styleCss += `        }
      `;

      // Inject style before the table
      content = content.replace(/(<table[^>]*className="[^"]*responsive-mobile-table[^"]*"[^>]*>)/, `<style>{\`${styleCss}\`}</style>\n$1`);
    }
  }

  fs.writeFileSync(filePath, content);
  console.log('Processed', file);
}
