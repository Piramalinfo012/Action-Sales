import { User, ActionEntry, Supplier } from './types';

export function formatToDDMMYYYY(dateInput: any): string {
  if (!dateInput) return '';
  const str = String(dateInput).trim();
  if (!str || str === '-') return '';
  
  // If it matches DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const parts = str.split('/');
    const d = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    const y = parts[2];
    return `${d}/${m}/${y}`;
  }

  // If it's YYYY-MM-DD or similar hyphenated format
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const parts = str.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  try {
    // For ISO datetime strings (e.g. "2026-08-06T18:30:00.000Z"), Apps Script stores
    // a sheet date as local-midnight, which serializes to the PREVIOUS day in UTC.
    // So we must read the LOCAL calendar date, not the raw UTC date part — otherwise
    // the day comes out one behind what the sheet shows.
    const parsedDate = new Date(str);
    if (!isNaN(parsedDate.getTime())) {
      const day = String(parsedDate.getDate()).padStart(2, '0');
      const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
      const year = parsedDate.getFullYear();
      return `${day}/${month}/${year}`;
    }
  } catch (e) {
    // Ignore error
  }

  return str;
}

export const API_URL = 'https://script.google.com/macros/s/AKfycbyFc-5tbzm5yGpl1c-Q_SJxddiKLqVyFwZjyv3GtI4dRWqCrA5nN3TzuHRdSGu2Q_sn/exec';

// Fetch users from Google Sheet 'Login'
export async function getUsersFromSheet(): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    const response = await fetch(`${API_URL}?sheet=Login&t=${Date.now()}`, { cache: 'no-store' });
    const result = await response.json();
    if (result.success && result.data) {
      // Map 2D array to objects
      const headers = result.data[0];
      const rows = result.data.slice(1).map((row: any[], index: number) => {
        const obj: any = {};
        headers.forEach((header: string, hIdx: number) => {
          obj[header.toLowerCase()] = row[hIdx];
        });
        obj.rowIndex = index + 2; // Row index is 2-indexed since row 1 is header
        return obj;
      });
      return { success: true, data: rows };
    }
    return { success: false, error: result.error || 'Failed to read users' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error fetching users' };
  }
}

// Update user password in 'Login' sheet
export async function updateUserPasswordInSheet(
  rowIndex: number,
  name: string,
  username: string,
  role: string,
  newPassword: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const rowData = [name, username, newPassword, role];
    const query = `?sheetName=Login&action=update&rowIndex=${rowIndex}&rowData=${encodeURIComponent(JSON.stringify(rowData))}`;
    const response = await fetch(`${API_URL}${query}`, { method: 'POST' });
    const result = await response.json();
    if (result.success) {
      return { success: true, message: result.message };
    }
    return { success: false, error: result.error || 'Failed to update password' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error updating password' };
  }
}

// Fetch Action sales data from Google Sheet 'FMS'
export async function getActionsFromSheet(): Promise<{ success: boolean; data?: ActionEntry[]; isOffline?: boolean; error?: string }> {
  try {
    // Cache-bust so edits made directly in the sheet always show up on refresh.
    const response = await fetch(`${API_URL}?sheet=FMS&t=${Date.now()}`, { cache: 'no-store' });
    const result = await response.json();
    
    if (result.success && result.data) {
      let headerIdx = 0;
      // Scan for the row containing header keywords to robustly identify headers at row 5 or row 1
      for (let i = 0; i < result.data.length; i++) {
        const row = result.data[i];
        if (Array.isArray(row) && row.some(cell => 
          typeof cell === 'string' && 
          (cell.toLowerCase().includes('timetamp') || 
           cell.toLowerCase().includes('timestamp') || 
           cell.toLowerCase().includes('company name'))
        )) {
          headerIdx = i;
          break;
        }
      }
      
      const headers = result.data[headerIdx];
      const dataRows = result.data.slice(headerIdx + 1);
      
      const entries: ActionEntry[] = dataRows
        .filter((row: any[]) => row && row.length > 0 && row.some(cell => cell !== null && cell !== ''))
        .map((row: any[], index: number) => {
          const obj: any = {};
          headers.forEach((header: string, hIdx: number) => {
            if (!header) return;
            const key = header.trim().toLowerCase().replace(/\s+/g, '');
            let mappedKey = key;
            if (key.includes('timetamp') || key.includes('timestamp')) mappedKey = 'timestamp';
            else if (key.includes('id')) mappedKey = 'id';
            else if (key.includes('companyname') || key.includes('company')) mappedKey = 'companyName';
            // Match the order Quntity column EXACTLY so sibling columns like
            // "Total Quantity" / "Pending Quantity" / "Purchase Quantity" don't
            // hijack it (which was making the displayed quantity read as 0).
            else if (key === 'quntity' || key === 'quantity') mappedKey = 'quntity';
            else if (key.includes('unit')) mappedKey = 'unit';
            else if (key.includes('productname') || key.includes('product')) mappedKey = 'productName';
            else if (key.includes('location')) mappedKey = 'location';
            else if (key.includes('remark')) mappedKey = 'remark';
            else if (key.includes('planned1')) mappedKey = 'planned1';
            else if (key.includes('actual1')) mappedKey = 'actual1';
            else if (key.includes('timedelay1') || key.includes('delay1')) mappedKey = 'timeDelay1';
            else if (key.includes('arewel1') || key.includes('wel1') || key.includes('l1?')) mappedKey = 'areWeL1';
            else if (key.includes('timedelay2') || key.includes('delay2')) mappedKey = 'timeDelay2';
            else if (key.includes('willwepurchasematerial') || key.includes('purchasefromanother') || key.includes('anotherparty')) mappedKey = 'willPurchase';
            else if (key.includes('suppliername') || key.includes('supplier')) mappedKey = 'supplierName';
            else if (key.includes('purchasequantity')) mappedKey = 'purchaseQuantity';
            else if (key.includes('purchaserate')) mappedKey = 'purchaseRate';
            else if (key.includes('uploadpocopy') || key.includes('pocopy') || key.includes('uploadpo')) mappedKey = 'uploadPoCopy';
            else if (key.includes('paymentterms') || key.includes('paymentcondition')) mappedKey = 'paymentTerms';
            else if (key.includes('shortagecondition') || key.includes('shortage')) mappedKey = 'shortageCondition';
            
            obj[mappedKey] = row[hIdx];
          });
          
          // FMS core columns are always in fixed positions A-H, so read them by
          // index. This guarantees the quantity comes from column D (index 3) and
          // can never be hijacked by the newer "...Quantity" status columns.
          const colA = row[0];  // A  Timetamp
          const colB = row[1];  // B  ID
          const colC = row[2];  // C  Company Name
          const colD = row[3];  // D  Quntity  <-- quantity source
          const colE = row[4];  // E  Unit
          const colF = row[5];  // F  Product Name
          const colG = row[6];  // G  Location
          const colH = row[7];  // H  Remark

          // Prefer column D; fall back to the header-matched value, then the
          // 'Total Quantity' column, so a blank D never silently shows 0.
          const qtySource = (colD !== '' && colD != null) ? colD
            : (obj.quntity !== '' && obj.quntity != null) ? obj.quntity
            : obj.totalquantity;
          const parsedQty = parseFloat(String(qtySource).replace(/,/g, ''));

          return {
            id: (colB ?? obj.id) || `local-${index}`,
            timestamp: formatToDDMMYYYY(colA ?? obj.timestamp),
            companyName: (colC ?? obj.companyName) || '',
            quntity: isNaN(parsedQty) ? 0 : parsedQty,
            unit: (colE ?? obj.unit) || '',
            productName: (colF ?? obj.productName) || '',
            location: (colG ?? obj.location) || '',
            remark: (colH ?? obj.remark) || '',
            planned1: formatToDDMMYYYY(obj.planned1),
            actual1: formatToDDMMYYYY(obj.actual1),
            timeDelay1: obj.timeDelay1 || '',
            areWeL1: obj.areWeL1 || '',
            timeDelay2: obj.timeDelay2 || '',
            willPurchase: obj.willPurchase || '',
            supplierName: obj.supplierName || '',
            purchaseQuantity: obj.purchaseQuantity || '',
            purchaseRate: obj.purchaseRate || '',
            uploadPoCopy: obj.uploadPoCopy || '',
            paymentTerms: obj.paymentTerms || '',
            shortageCondition: obj.shortageCondition || '',
            rowIndex: headerIdx + index + 2, // Row index is 2-indexed since row 1 is 1-indexed and we sliced from headerIdx + 1
            rawRowValues: row
          } as ActionEntry;
        });
      
      // Fetch Sale Allocations to merge L1 Party Name back into entries
      try {
        const saleRes = await getSaleAllocationRows();
        if (saleRes.success && saleRes.data) {
          const saleMap = new Map();
          for (const s of saleRes.data) {
            saleMap.set(s.id, s.supplierName); // For sale, supplierName holds L1 Party Name
          }
          for (const entry of entries) {
            if (entry.areWeL1 === 'No' && saleMap.has(entry.id)) {
              entry.l1PartyName = saleMap.get(entry.id);
            }
          }
        }
      } catch(e) { /* ignore */ }

      return { success: true, data: entries };

    }
    
    if (result.error && result.error.includes("not found")) {
      // Sheet FMS not found. Fallback to offline mode
      return { success: true, data: getOfflineActions(), isOffline: true };
    }
    
    return { success: false, error: result.error || 'Failed to read entries' };
  } catch (err: any) {
    // If network fails completely or has CORS issue, run offline with warning
    return { success: true, data: getOfflineActions(), isOffline: true, error: err.message || 'Offline mode fallback' };
  }
}

// Insert Action entry
export async function insertActionToSheet(
  entry: ActionEntry
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const rowData = [
      entry.timestamp,   // Timetamp
      entry.id,          // ID
      entry.companyName, // Company Name
      entry.quntity,     // Quntity
      entry.unit,        // Unit
      entry.productName, // Product Name
      entry.location,    // Location
      entry.remark       // Remark
    ];
    const query = `?sheetName=FMS&action=insert&rowData=${encodeURIComponent(JSON.stringify(rowData))}`;
    const response = await fetch(`${API_URL}${query}`, { method: 'POST' });
    const result = await response.json();
    if (result.success) {
      return { success: true, message: result.message };
    }
    return { success: false, error: result.error || 'Failed to insert entry' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error inserting entry' };
  }
}

// Update Action entry
export async function updateActionInSheet(
  rowIndex: number,
  entry: ActionEntry
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const rowData = [
      entry.timestamp,
      entry.id,
      entry.companyName,
      entry.quntity,
      entry.unit,
      entry.productName,
      entry.location,
      entry.remark
    ];
    const query = `?sheetName=FMS&action=update&rowIndex=${rowIndex}&rowData=${encodeURIComponent(JSON.stringify(rowData))}`;
    const response = await fetch(`${API_URL}${query}`, { method: 'POST' });
    const result = await response.json();
    if (result.success) {
      return { success: true, message: result.message };
    }
    return { success: false, error: result.error || 'Failed to update entry' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error updating entry' };
  }
}

// Write a single cell via the backend 'updateCell' action. Uses a form-encoded
// body so long values / special characters are safe and no CORS preflight fires.
async function updateCellValue(
  sheetName: string,
  rowIndex: number,
  columnIndex: number,
  value: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const body = new URLSearchParams();
    body.append('sheetName', sheetName);
    body.append('action', 'updateCell');
    body.append('rowIndex', String(rowIndex));
    body.append('columnIndex', String(columnIndex));
    body.append('value', value === null || value === undefined ? '' : String(value));
    const res = await fetch(API_URL, { method: 'POST', body });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error updating cell' };
  }
}

// Update Action entry - L1 Confirmation columns and Purchase Allocation columns.
// IMPORTANT: Planned1 (column 19 / index 18) is a sheet formula — it is READ ONLY
// and never written here. We update only the specific L1 / allocation cells (via
// per-cell writes) so the Planned1 formula and any other untouched columns stay
// intact. The 'planned1' and 'entry' parameters are kept for signature stability.
export async function updateL1ConfirmationInSheet(
  rowIndex: number,
  entry: ActionEntry,
  planned1: string,
  actual1: string,
  timeDelay1: string,
  areWeL1: string,
  timeDelay2: string = '',
  willPurchase: string = '',
  supplierName: string = '',
  purchaseQuantity: string = '',
  purchaseRate: string = '',
  uploadPoCopy: string = '',
  paymentTerms: string = '',
  shortageCondition: string = '',
  l1PartyName: string = '',
  l1PartyPurchase: string = '',
  saleQuantity: string = '',
  saleRate: string = '',
  saleUploadSoCopy: string = '',
  salePaymentTerms: string = '',
  saleShortageCondition: string = ''
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    // FMS stores ONLY the L1 basics. The per-supplier purchase details are stored
    // in the 'Purchase Allocation' sheet (see syncSuppliersToAllocation), so we do
    // NOT write columns 27-32 here. Planned1 (col 19) is a formula and never written.
    // Writes run SEQUENTIALLY — firing many concurrent POSTs at Apps Script makes it
    // return an HTML error page ("Unexpected token '<'"), which broke the save.
    const writes: Array<[number, any]> = [
      [20, actual1],       // Actual1
      [21, timeDelay1],    // Time Delay1
      [22, areWeL1],       // Are We L1?
      [25, timeDelay2],    // Time Delay 2
      [26, willPurchase]   // Will We Purchase Material from Another Party?
    ];

    for (const [col, val] of writes) {
      const r = await updateCellValue('FMS', rowIndex, col, val);
      if (!r.success) {
        return { success: false, error: r.error || 'Failed to update L1 Confirmation' };
      }
    }

    // Write to Sale Allocation if Are We L1? is No
    if (areWeL1 === 'No') {
      
      await syncSaleAllocation(
        entry,
        l1PartyName,
        l1PartyPurchase,
        saleQuantity,
        saleRate,
        saleUploadSoCopy,
        salePaymentTerms,
        saleShortageCondition
      );
    }
    
    return { success: true, message: 'L1 Confirmation updated' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error updating L1 Confirmation' };
  }
}

// Delete Action entry
export async function deleteActionFromSheet(
  rowIndex: number
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const query = `?sheetName=FMS&action=delete&rowIndex=${rowIndex}`;
    const response = await fetch(`${API_URL}${query}`, { method: 'POST' });
    const result = await response.json();
    if (result.success) {
      return { success: true, message: result.message };
    }
    return { success: false, error: result.error || 'Failed to delete entry' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error deleting entry' };
  }
}

// Fetch Product Names from Google Sheet 'Master' Column B (B2:B)
export async function getProductsFromMasterSheet(): Promise<{ success: boolean; data?: string[]; error?: string }> {
  try {
    const response = await fetch(`${API_URL}?sheet=Master&t=${Date.now()}`, { cache: 'no-store' });
    const result = await response.json();
    if (result.success && result.data) {
      const products: string[] = [];
      // Start from index 1 (row 2 corresponds to index 1 of the 2D array, since row 1 is header at index 0)
      for (let i = 1; i < result.data.length; i++) {
        const row = result.data[i];
        if (Array.isArray(row) && row.length > 1) {
          const productVal = row[1]; // Column B (index 1)
          if (productVal !== undefined && productVal !== null && productVal.toString().trim() !== '') {
            products.push(productVal.toString().trim());
          }
        }
      }
      if (products.length > 0) {
        saveOfflineProducts(products);
      }
      return { success: true, data: products };
    }
    return { success: false, error: result.error || 'Failed to read Master sheet' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error fetching Master sheet' };
  }
}

// Fetch L1 Confirmation terms and conditions from Master sheet
export async function getL1TermsFromMaster(): Promise<{
  success: boolean;
  data: { yesTerms: string; yesShortage: string; noTerms: string; noShortage: string; };
  error?: string;
}> {
  try {
    const response = await fetch(`${API_URL}?sheet=Master&t=${Date.now()}`, { cache: 'no-store' });
    const result = await response.json();
    if (result.success && Array.isArray(result.data)) {
      // Row 3 is index 2
      const row3 = result.data[2] || [];
      return {
        success: true,
        data: {
          yesTerms: row3[2] !== undefined ? row3[2].toString().trim() : '',
          yesShortage: row3[3] !== undefined ? row3[3].toString().trim() : '',
          noTerms: row3[4] !== undefined ? row3[4].toString().trim() : '',
          noShortage: row3[5] !== undefined ? row3[5].toString().trim() : '',
        }
      };
    }
    return { success: false, data: { yesTerms: '', yesShortage: '', noTerms: '', noShortage: '' }, error: result.error || 'Failed to read Master sheet' };
  } catch (err: any) {
    return { success: false, data: { yesTerms: '', yesShortage: '', noTerms: '', noShortage: '' }, error: err.message || 'Network error' };
  }
}

// Fetch Material Sources from Google Sheet 'Master' Column A (A2:A). Used as the
// "Material To Be supplied From" dropdown options in Dispatch Planning.
export async function getMaterialSourcesFromMaster(): Promise<{ success: boolean; data: string[]; error?: string }> {
  try {
    const response = await fetch(`${API_URL}?sheet=Master&t=${Date.now()}`, { cache: 'no-store' });
    const result = await response.json();
    if (result.success && Array.isArray(result.data)) {
      const sources: string[] = [];
      // Start from index 1 (row 2), Column A (index 0).
      for (let i = 1; i < result.data.length; i++) {
        const row = result.data[i];
        if (Array.isArray(row) && row.length > 0) {
          const val = row[0];
          if (val !== undefined && val !== null && val.toString().trim() !== '') {
            sources.push(val.toString().trim());
          }
        }
      }
      return { success: true, data: sources };
    }
    return { success: false, data: [], error: result.error || 'Failed to read Master sheet' };
  } catch (err: any) {
    return { success: false, data: [], error: err.message || 'Network error fetching Master sheet' };
  }
}

// Offline/LocalStorage Fallbacks for Products
export function getOfflineProducts(): string[] {
  const data = localStorage.getItem('master_products');
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {
      // ignore parsing errors
    }
  }
  return [
    'Fuel Oil (Purcha)',
    'Piramal Fuel Premium',
    'Lubricant Ultra-Heavy',
    'Industrial Grease G-400',
    'Aviation Biofuel Jet-A',
    'Marine Fuel Diesel XL'
  ];
}

export function saveOfflineProducts(products: string[]) {
  localStorage.setItem('master_products', JSON.stringify(products));
}

// Offline/LocalStorage Fallbacks for Actions
export function getOfflineActions(): ActionEntry[] {
  const data = localStorage.getItem('offline_actions');
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }
  // Populate with beautiful mock data initially so the app looks extremely premium if first opened in offline mode
  const defaultOffline: ActionEntry[] = [
    { id: 'IND/0', timestamp: '08/07/2026', companyName: 'demo', quntity: 1, unit: 'Ltr', productName: 'Fuel Oil (Purcha', location: 'RPR', remark: 'DEMO' },
    { id: 'IND/1', timestamp: '08/07/2026', companyName: 'Reliance Industries', quntity: 50000, unit: 'Ltr', productName: 'Piramal Fuel Premium', location: 'Mumbai', remark: 'Urgent Delivery' },
    { id: 'IND/2', timestamp: '09/07/2026', companyName: 'Tata Motors', quntity: 12000, unit: 'Kg', productName: 'Industrial Grease G-400', location: 'Bengaluru', remark: 'Regular Supply' }
  ];
  localStorage.setItem('offline_actions', JSON.stringify(defaultOffline));
  return defaultOffline;
}

export function saveOfflineActions(actions: ActionEntry[]) {
  localStorage.setItem('offline_actions', JSON.stringify(actions));
}

// ============== PURCHASE ALLOCATION SUB-SHEET ==============
// Each supplier of an order is stored as its own row in the 'Purchase Allocation'
// sheet (columns A-O). The L1 basics (Actual1 / Time Delay1 / Are We L1?) continue
// to live in the FMS sheet — only the supplier/purchase details are mirrored here.
export const PURCHASE_ALLOCATION_SHEET = 'Purchase Allocation';

// Read the raw allocation rows for a parent entry ID. Returns the reconstructed
// suppliers plus their sheet row indexes (needed to replace them on re-edit).
async function fetchAllocationRows(entryId: string): Promise<{ suppliers: Supplier[]; rowIndexes: number[] }> {
  const empty = { suppliers: [] as Supplier[], rowIndexes: [] as number[] };
  try {
    const response = await fetch(`${API_URL}?sheet=${encodeURIComponent(PURCHASE_ALLOCATION_SHEET)}&t=${Date.now()}`, { cache: 'no-store' });
    const result = await response.json();
    if (!result.success || !Array.isArray(result.data)) return empty;

    const data: any[][] = result.data;

    // Locate the header row (row 5 in the sheet, but scan to be robust).
    let headerIdx = -1;
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (Array.isArray(row) && row.some(c =>
        typeof c === 'string' &&
        (c.toLowerCase().includes('supplier name') || c.toLowerCase().includes('allocation id'))
      )) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) return empty;

    const headers = data[headerIdx].map((h: any) => String(h || '').trim().toLowerCase());
    const findCol = (pred: (h: string) => boolean) => headers.findIndex(pred);
    const cols = {
      id: headers.indexOf('id'), // exact 'ID' column (not 'Allocation ID')
      supplierName: findCol(h => h.includes('supplier name')),
      purchaseQuantity: findCol(h => h.includes('purchase quantity')),
      purchaseRate: findCol(h => h.includes('purchase rate')),
      uploadPoCopy: findCol(h => h.includes('po copy') || h.includes('upload po')),
      paymentTerms: findCol(h => h.includes('payment terms')),
      shortageCondition: findCol(h => h.includes('shortage'))
    };

    const suppliers: Supplier[] = [];
    const rowIndexes: number[] = [];
    const target = entryId.trim().toLowerCase();

    for (let i = headerIdx + 1; i < data.length; i++) {
      const row = data[i];
      if (!Array.isArray(row)) continue;
      const rowId = cols.id >= 0 ? String(row[cols.id] ?? '').trim() : '';
      if (!rowId || rowId.toLowerCase() !== target) continue;

      rowIndexes.push(i + 1); // data[i] corresponds to sheet row (i + 1)
      suppliers.push({
        supplierName: cols.supplierName >= 0 ? String(row[cols.supplierName] ?? '') : '',
        purchaseQuantity: cols.purchaseQuantity >= 0 ? String(row[cols.purchaseQuantity] ?? '') : '',
        purchaseRate: cols.purchaseRate >= 0 ? String(row[cols.purchaseRate] ?? '') : '',
        uploadPoCopy: cols.uploadPoCopy >= 0 ? String(row[cols.uploadPoCopy] ?? '') : '',
        paymentTerms: cols.paymentTerms >= 0 ? String(row[cols.paymentTerms] ?? '') : '',
        shortageCondition: cols.shortageCondition >= 0 ? String(row[cols.shortageCondition] ?? '') : '',
        poMode: 'upload'
      });
    }

    return { suppliers, rowIndexes };
  } catch {
    return empty;
  }
}

// Read the suppliers stored for an entry (used when re-opening the L1 modal).
export async function getSuppliersForEntry(entryId: string): Promise<Supplier[]> {
  const { suppliers } = await fetchAllocationRows(entryId);
  return suppliers;
}

// Replace all allocation rows for an entry with the provided suppliers.
// Existing rows for the same ID are deleted first so re-editing never duplicates.
export async function syncSuppliersToAllocation(
  entry: ActionEntry,
  willPurchase: string,
  suppliers: Supplier[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1) Delete existing rows for this entry (descending so indexes stay valid).
    const { rowIndexes } = await fetchAllocationRows(entry.id);
    const descending = [...rowIndexes].sort((a, b) => b - a);
    for (const r of descending) {
      await fetch(`${API_URL}?sheetName=${encodeURIComponent(PURCHASE_ALLOCATION_SHEET)}&action=delete&rowIndex=${r}`, { method: 'POST' });
    }

    // 2) Insert one row per supplier (columns A-O). Column P (PL) is left untouched.
    if (!suppliers || suppliers.length === 0) return { success: true };

    const rowsData = suppliers.map((s, i) => [
      entry.timestamp || '',            // A  Timetamp
      `${entry.id}/A${i + 1}`,          // B  Allocation ID
      entry.id || '',                   // C  ID
      entry.companyName || '',          // D  Company Name
      entry.quntity ?? '',              // E  Quntity
      entry.productName || '',          // F  Product Name
      entry.location || '',             // G  Location
      entry.remark || '',               // H  Remark
      willPurchase || '',               // I  Will We Purchase Material from Another Party?
      s.supplierName || '',             // J  Supplier Name
      s.purchaseQuantity || '',         // K  Purchase Quantity
      s.purchaseRate || '',             // L  Purchase Rate
      s.uploadPoCopy || '',             // M  Upload Po Copy
      s.paymentTerms || '',             // N  Payment Terms and Condition
      s.shortageCondition || ''         // O  Shortage Condition
    ]);

    const query = `?sheetName=${encodeURIComponent(PURCHASE_ALLOCATION_SHEET)}&action=batchInsert&rowsData=${encodeURIComponent(JSON.stringify(rowsData))}`;
    const res = await fetch(`${API_URL}${query}`, { method: 'POST' });
    const j = await res.json();
    if (j.success) return { success: true };
    return { success: false, error: j.error || 'Failed to write Purchase Allocation rows' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error writing Purchase Allocation' };
  }
}

// ============== SALE ALLOCATION SUB-SHEET ==============
export const SALE_ALLOCATION_SHEET = 'Sale Allocation';

async function fetchSaleAllocationRows(entryId: string): Promise<{ rowIndexes: number[] }> {
  const empty = { rowIndexes: [] as number[] };
  try {
    const response = await fetch(`${API_URL}?sheet=${encodeURIComponent(SALE_ALLOCATION_SHEET)}&t=${Date.now()}`, { cache: 'no-store' });
    const result = await response.json();
    if (!result.success || !Array.isArray(result.data)) return empty;

    const data: any[][] = result.data;
    let headerIdx = -1;
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (Array.isArray(row) && row.some(c => typeof c === 'string' && c.toLowerCase().includes('l1 party name'))) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) return empty;

    const headers = data[headerIdx].map((h: any) => String(h || '').trim().toLowerCase());
    const idCol = headers.indexOf('id');
    const rowIndexes: number[] = [];
    const target = entryId.trim().toLowerCase();

    for (let i = headerIdx + 1; i < data.length; i++) {
      const row = data[i];
      if (!Array.isArray(row)) continue;
      const rowId = idCol >= 0 ? String(row[idCol] ?? '').trim() : '';
      if (rowId.toLowerCase() === target) {
        rowIndexes.push(i + 1);
      }
    }
    return { rowIndexes };
  } catch {
    return empty;
  }
}

export async function syncSaleAllocation(
  entry: ActionEntry,
  l1PartyName: string,
  l1PartyPurchase: string,
  saleQuantity: string,
  saleRate: string,
  saleUploadSoCopy: string,
  salePaymentTerms: string,
  saleShortageCondition: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { rowIndexes } = await fetchSaleAllocationRows(entry.id);
    const descending = [...rowIndexes].sort((a, b) => b - a);
    for (const r of descending) {
      await fetch(`${API_URL}?sheetName=${encodeURIComponent(SALE_ALLOCATION_SHEET)}&action=delete&rowIndex=${r}`, { method: 'POST' });
    }

    const rowData = [
      entry.timestamp || '',            // A  Timetamp
      `${entry.id}/S1`,                 // B  Allocation ID
      entry.id || '',                   // C  ID
      entry.companyName || '',          // D  Company Name
      entry.quntity ?? '',              // E  Quntity
      entry.productName || '',          // F  Product Name
      entry.location || '',             // G  Location
      entry.remark || '',               // H  Remark
      l1PartyName || '',                // I  L1 Party Name
      l1PartyPurchase || '',            // J  Will the L1 Party Purchase...
      saleQuantity || '',               // K  Sales Quantity
      saleRate || '',                   // L  Sale Material Sale Rate
      saleUploadSoCopy || '',           // M  Upload So Copy
      salePaymentTerms || '',           // N  Sale Payment Terms and Condition
      saleShortageCondition || ''       // O  Sales Shortage Condition
    ];

    const query = `?sheetName=${encodeURIComponent(SALE_ALLOCATION_SHEET)}&action=batchInsert&rowsData=${encodeURIComponent(JSON.stringify([rowData]))}`;
    const res = await fetch(`${API_URL}${query}`, { method: 'POST' });
    const j = await res.json();
    if (j.success) return { success: true };
    return { success: false, error: j.error || 'Failed to write Sale Allocation row' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error writing Sale Allocation' };
  }
}

// ============== DISPATCH PLANNING (Purchase Allocation columns R-X) ==============
// Each Purchase Allocation row (one per supplier, created after L1 confirmation)
// carries the dispatch-planning fields in columns R-X. Dispatch Planning reads all
// allocation rows and writes those columns.
export interface AllocationRow {
  rowIndex: number;
  timestamp: string;
  allocationId: string;
  id: string;               // parent FMS entry ID
  companyName: string;
  quntity: string;
  productName: string;
  location: string;
  supplierName: string;
  purchaseQuantity: string;
  purchaseRate: string;
  isSale?: boolean;
  // Dispatch planning fields (columns Q-X)
  acDispatch: string;       // Q  AC Dispatch (actual dispatch date)
  dispatchQuantity: string; // R
  deliveryDateTime: string; // S
  rateProfiled: string;     // T
  materialSuppliedFrom: string; // U
  transportation: string;   // V
  rupeesPerLtr: string;     // W
  dispatchRemark: string;   // X
}

export interface DispatchFields {
  acDispatch: string;
  dispatchQuantity: string;
  deliveryDateTime: string;
  rateProfiled: string;
  materialSuppliedFrom: string;
  transportation: string;
  rupeesPerLtr: string;
  dispatchRemark: string;
}

// Read all Purchase Allocation rows (with dispatch fields) by fixed column position.

export async function getSaleAllocationRows(): Promise<{ success: boolean; data: AllocationRow[]; error?: string }> {
  try {
    const response = await fetch(`${API_URL}?sheet=${encodeURIComponent(SALE_ALLOCATION_SHEET)}&t=${Date.now()}`, { cache: 'no-store' });
    const result = await response.json();
    if (!result.success || !Array.isArray(result.data)) {
      return { success: false, data: [], error: result.error || 'Failed to read Sale Allocation' };
    }

    const data: any[][] = result.data;

    let headerIdx = -1;
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (Array.isArray(row) && row.some(c =>
        typeof c === 'string' &&
        (c.toLowerCase().includes('l1 party name') || c.toLowerCase().includes('allocation id'))
      )) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) return { success: true, data: [] };

    const str = (v: any) => (v === null || v === undefined) ? '' : String(v);
    const rows: AllocationRow[] = [];

    for (let i = headerIdx + 1; i < data.length; i++) {
      const row = data[i];
      if (!Array.isArray(row)) continue;
      const id = str(row[2]).trim();          // C  ID
      const supplier = str(row[8]).trim();     // I  L1 Party Name
      if (!id && !supplier) continue;          // skip blank rows

      rows.push({
        rowIndex: i + 1,
        timestamp: str(row[0]),                // A
        allocationId: str(row[1]),             // B
        id,                                    // C
        companyName: str(row[3]),              // D
        quntity: str(row[4]),                  // E
        productName: str(row[5]),              // F
        location: str(row[6]),                 // G
        // Map Sale fields to Dispatch fields
        supplierName: supplier,                // I L1 Party Name -> Supplier Name
        purchaseQuantity: str(row[10]),        // K Sales Quantity -> Purchase Quantity
        purchaseRate: str(row[11]),            // L Sale Material Sale Rate -> Purchase Rate
        acDispatch: formatToDDMMYYYY(row[15]), // P (assuming Dispatch data starts after O)
        dispatchQuantity: str(row[16]),        // Q
        deliveryDateTime: str(row[17]),        // R
        rateProfiled: str(row[18]),            // S
        materialSuppliedFrom: str(row[19]),    // T
        transportation: str(row[20]),          // U
        rupeesPerLtr: str(row[21]),            // V
        dispatchRemark: str(row[22]),          // W
        isSale: true
      });
    }

    return { success: true, data: rows };
  } catch (err: any) {
    return { success: false, data: [], error: err.message || 'Network error reading Sale Allocation' };
  }
}

export async function getPurchaseAllocationRows(): Promise<{ success: boolean; data: AllocationRow[]; error?: string }> {
  try {
    const response = await fetch(`${API_URL}?sheet=${encodeURIComponent(PURCHASE_ALLOCATION_SHEET)}&t=${Date.now()}`, { cache: 'no-store' });
    const result = await response.json();
    if (!result.success || !Array.isArray(result.data)) {
      return { success: false, data: [], error: result.error || 'Failed to read Purchase Allocation' };
    }

    const data: any[][] = result.data;

    // Locate header row (row 5 in the sheet).
    let headerIdx = -1;
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (Array.isArray(row) && row.some(c =>
        typeof c === 'string' &&
        (c.toLowerCase().includes('supplier name') || c.toLowerCase().includes('allocation id'))
      )) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) return { success: true, data: [] };

    const str = (v: any) => (v === null || v === undefined) ? '' : String(v);
    const rows: AllocationRow[] = [];

    for (let i = headerIdx + 1; i < data.length; i++) {
      const row = data[i];
      if (!Array.isArray(row)) continue;
      const id = str(row[2]).trim();          // C  ID
      const supplier = str(row[9]).trim();     // J  Supplier Name
      if (!id && !supplier) continue;          // skip blank rows

      rows.push({
        rowIndex: i + 1,
        timestamp: str(row[0]),                // A
        allocationId: str(row[1]),             // B
        id,                                    // C
        companyName: str(row[3]),              // D
        quntity: str(row[4]),                  // E
        productName: str(row[5]),              // F
        location: str(row[6]),                 // G
        supplierName: supplier,                // J
        purchaseQuantity: str(row[10]),        // K
        purchaseRate: str(row[11]),            // L
        acDispatch: formatToDDMMYYYY(row[16]), // Q
        dispatchQuantity: str(row[17]),        // R
        deliveryDateTime: str(row[18]),        // S
        rateProfiled: str(row[19]),            // T
        materialSuppliedFrom: str(row[20]),    // U
        transportation: str(row[21]),          // V
        rupeesPerLtr: str(row[22]),            // W
        dispatchRemark: str(row[23])           // X
      });
    }

    return { success: true, data: rows };
  } catch (err: any) {
    return { success: false, data: [], error: err.message || 'Network error reading Purchase Allocation' };
  }
}

// Write the dispatch-planning fields (columns R-X = 18-24) for one allocation row.
export async function updateDispatchPlanning(
  rowIndex: number,
  f: DispatchFields
): Promise<{ success: boolean; error?: string }> {
  try {
    const writes: Array<[number, any]> = [
      [17, f.acDispatch],             // Q  AC Dispatch (actual dispatch date)
      [18, f.dispatchQuantity],       // R  Dispatch Quantity
      [19, f.deliveryDateTime],       // S  Delivery Date Time
      [20, f.rateProfiled],           // T  Rate
      [21, f.materialSuppliedFrom],   // U  Matreial To Be supplied From
      [22, f.transportation],         // V  Transportation
      [23, f.rupeesPerLtr],           // W  Rupies /ltr
      [24, f.dispatchRemark]          // X  Remark
    ];
    for (const [col, val] of writes) {
      const r = await updateCellValue(PURCHASE_ALLOCATION_SHEET, rowIndex, col, val);
      if (!r.success) return { success: false, error: r.error || 'Failed to update dispatch planning' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error updating dispatch planning' };
  }
}

// ============== DISPATCH SHEET ==============
// Dispatch updates are stored as one row per allocation in the 'Dispatch' sheet
// (columns A-N). Re-editing an allocation replaces its existing Dispatch row.
export const DISPATCH_SHEET = 'Dispatch';

export interface DispatchRecord {
  rowIndex: number;
  timestamp: string;            // A  Timetamp
  dispatchId: string;           // B  Dispatch ID
  allocationId: string;         // C  Allocation ID
  id: string;                   // D  ID
  companyName: string;          // E  Company Name
  quntity: string;              // F  Quntity
  productName: string;          // G  Product Name
  dispatchQuantity: string;     // H  Dispatch Quantity
  deliveryDateTime: string;     // I  Delivery Date Time
  rate: string;                 // J  Rate
  materialSuppliedFrom: string; // K  Matreial To Be supplied From
  transportation: string;       // L  Transportation
  rupeesPerLtr: string;         // M  Rupies /ltr
  dispatchRemark: string;       // N  Remark
  acDispatchStatus?: string;    // P  AC Dispatch Status
  uploadTransportationBill?: string; // Q Upload Transportation Bill
  dispatchStatus?: string;      // R  Dispatch Status
  statusDispatchQty?: string;   // S  Dispatch QTY
  statusDispatchDate?: string;  // T  Dispatch Date
  invoiceVendor?: string;       // U  Upload Invoice Recievd From Vender
  taxInvoiceWayBill?: string;   // V  Uplaod Tax Invoice With way Bill
  // Material Receipt Confirmation (columns W-AD)
  plReceiptMaterial?: string;      // W  PL Reciept Material
  acReceiptMaterial?: string;      // X  AC Reciept Material
  receiptTimeDelay2?: string;      // Y  Time Delay2
  uploadReceiving?: string;        // Z  Uplaod Recieving
  shortageQty?: string;            // AA Shortage Qty (If Any)
  creditNoteRequested?: string;    // AB Credit Note Requested by Party (If Any)
  invoiceReviewDecision?: string;  // AC Invoice Review & Credit Note Decision
  uploadVendorCreditNote?: string; // AD Upload Vendor Credit Note
  // Credit Note Creation (columns AE-AI)
  plCreditNote?: string;           // AE PI Credit Note
  acCreditNote?: string;           // AF Ac Credit Note
  creditNoteTimeDelay1?: string;   // AG Time Delay1
  uploadCreditNotePPPL?: string;   // AH Uplaod Credit Note issued By PPPL
  creditNoteMailCustomer?: string; // AI Creadint Not Mail To Customer
  // Payment Confirmation (columns AJ-AO)
  piPaymentConfirmation?: string;   // AJ PI Payment Confirmation
  acPaymentConfirmation?: string;   // AK Ac Payment Confirmation
  paymentTimeDelay1?: string;       // AL Time Delay1
  uploadReceivedOfPayment?: string; // AM Upload Recived Of Payment
  paymentReceivedDate?: string;     // AN Payment Recievd Date
  paymentRemark?: string;           // AO Remark
  
  // Make Payment To Vender (columns AR-AW)
  piMakePayment?: string;           // AR PI Make Payment
  acMakePayment?: string;           // AS Ac Make Payment
  makePaymentTimeDelay1?: string;   // AT Time Delay1
  uploadInvoiceEwayBill?: string;   // AU Uplaod Invoice /E-way Bill
  transportBill?: string;           // AV Tranport Bill
  makePaymentRemark?: string;       // AW Remark
  
  gateInDateTime?: string;          // AX Gate In Date Time
  gateOutDateTime?: string;         // AY Gate Out Date Time
}

const makeDispatchId = (allocationId: string): string => {
  if (!allocationId) return `DSP-${Date.now()}/D1`;
  // Keep the full allocation ID and append the dispatch suffix, e.g. IND/1/A2 -> IND/1/A2/D1
  return `${allocationId}/D1`;
};

// Read all rows from the 'Dispatch' sheet by fixed column position (A-N).
export async function getDispatchRows(): Promise<{ success: boolean; data: DispatchRecord[]; error?: string }> {
  try {
    const response = await fetch(`${API_URL}?sheet=${encodeURIComponent(DISPATCH_SHEET)}&t=${Date.now()}`, { cache: 'no-store' });
    const result = await response.json();
    if (!result.success || !Array.isArray(result.data)) {
      return { success: false, data: [], error: result.error || 'Failed to read Dispatch sheet' };
    }

    const data: any[][] = result.data;
    let headerIdx = -1;
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (Array.isArray(row) && row.some(c =>
        typeof c === 'string' &&
        (c.toLowerCase().includes('dispatch id') || c.toLowerCase().includes('allocation id'))
      )) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) return { success: true, data: [] };

    const str = (v: any) => (v === null || v === undefined) ? '' : String(v);
    const rows: DispatchRecord[] = [];
    for (let i = headerIdx + 1; i < data.length; i++) {
      const row = data[i];
      if (!Array.isArray(row)) continue;
      const allocationId = str(row[2]).trim();
      const id = str(row[3]).trim();
      if (!allocationId && !id) continue;

      rows.push({
        rowIndex: i + 1,
        timestamp: formatToDDMMYYYY(row[0]),
        dispatchId: str(row[1]),
        allocationId,
        id,
        companyName: str(row[4]),
        quntity: str(row[5]),
        productName: str(row[6]),
        dispatchQuantity: str(row[7]),
        deliveryDateTime: str(row[8]),
        rate: str(row[9]),
        materialSuppliedFrom: str(row[10]),
        transportation: str(row[11]),
        rupeesPerLtr: str(row[12]),
        dispatchRemark: str(row[13]),      // N  Remark
        // O (row[14]) = "PI Dispatch Staus" — not a form field, skipped.
        acDispatchStatus: formatToDDMMYYYY(row[15]), // P  AC Dispatch Status
        uploadTransportationBill: str(row[16]),    // Q  Upload Transportation Bill
        dispatchStatus: str(row[17]),      // R  Dispatch Status
        statusDispatchQty: str(row[18]),   // S  Dispatch QTY
        statusDispatchDate: formatToDDMMYYYY(row[19]), // T  Dispatch Date
        invoiceVendor: str(row[20]),       // U  Upload Invoice Recievd From Vender
        taxInvoiceWayBill: str(row[21]),   // V  Uplaod Tax Invoice With way Bill
        plReceiptMaterial: formatToDDMMYYYY(row[22]), // W  PL Reciept Material
        acReceiptMaterial: formatToDDMMYYYY(row[23]), // X  AC Reciept Material
        receiptTimeDelay2: str(row[24]),      // Y  Time Delay2
        uploadReceiving: str(row[25]),        // Z  Uplaod Recieving
        shortageQty: str(row[26]),            // AA Shortage Qty (If Any)
        creditNoteRequested: str(row[27]),    // AB Credit Note Requested by Party (If Any)
        invoiceReviewDecision: str(row[28]),  // AC Invoice Review & Credit Note Decision
        uploadVendorCreditNote: str(row[29]), // AD Upload Vendor Credit Note
        plCreditNote: formatToDDMMYYYY(row[30]),      // AE PI Credit Note
        acCreditNote: formatToDDMMYYYY(row[31]),      // AF Ac Credit Note
        creditNoteTimeDelay1: str(row[32]),   // AG Time Delay1
        uploadCreditNotePPPL: str(row[33]),   // AH Uplaod Credit Note issued By PPPL
        creditNoteMailCustomer: str(row[34]), // AI Creadint Not Mail To Customer
        piPaymentConfirmation: formatToDDMMYYYY(row[35]), // AJ PI Payment Confirmation
        acPaymentConfirmation: formatToDDMMYYYY(row[36]), // AK Ac Payment Confirmation
        paymentTimeDelay1: str(row[37]),          // AL Time Delay1
        uploadReceivedOfPayment: str(row[38]),    // AM Upload Recived Of Payment
        paymentReceivedDate: formatToDDMMYYYY(row[39]), // AN Payment Recievd Date
        paymentRemark: str(row[40]),              // AO Remark
        // AP (row[41]), AQ (row[42]) are not shown in user request as used.
        piMakePayment: formatToDDMMYYYY(row[43]), // AR PI Make Payment
        acMakePayment: formatToDDMMYYYY(row[44]), // AS Ac Make Payment
        makePaymentTimeDelay1: str(row[45]),      // AT Time Delay1
        uploadInvoiceEwayBill: str(row[46]),      // AU Uplaod Invoice /E-way Bill
        transportBill: str(row[47]),              // AV Tranport Bill
        makePaymentRemark: str(row[48]),          // AW Remark
        gateInDateTime: str(row[49]),             // AX Gate In Date Time
        gateOutDateTime: str(row[50])             // AY Gate Out Date Time
      });
    }
    return { success: true, data: rows };
  } catch (err: any) {
    return { success: false, data: [], error: err.message || 'Network error reading Dispatch sheet' };
  }
}

// Append a dispatch record to the 'Dispatch' sheet. Each save is a separate
// (partial) dispatch — an order can be dispatched in several parts — so we do
// NOT delete prior rows; we just number the new one (…/D1, …/D2, …).
export async function saveDispatchRecord(
  row: AllocationRow,
  f: DispatchFields
): Promise<{ success: boolean; error?: string }> {
  try {
    // Number the new dispatch based on how many already exist for this allocation.
    const existing = await getDispatchRows();
    const target = (row.allocationId || '').trim().toLowerCase();
    const priorCount = target
      ? existing.data.filter(d => d.allocationId.trim().toLowerCase() === target).length
      : 0;

    const timestamp = f.acDispatch || '';
    const dispatchId = row.allocationId
      ? `${row.allocationId}/D${priorCount + 1}`
      : makeDispatchId(row.allocationId);

    // Insert the new row (columns A-N).
    const rowData = [
      timestamp,                    // A  Timetamp
      dispatchId,                   // B  Dispatch ID
      row.allocationId || '',       // C  Allocation ID
      row.id || '',                 // D  ID
      row.companyName || '',        // E  Company Name
      row.quntity || '',            // F  Quntity
      row.productName || '',        // G  Product Name
      f.dispatchQuantity || '',     // H  Dispatch Quantity
      f.deliveryDateTime || '',     // I  Delivery Date Time
      f.rateProfiled || '',         // J  Rate
      f.materialSuppliedFrom || '', // K  Matreial To Be supplied From
      f.transportation || '',       // L  Transportation
      f.rupeesPerLtr || '',         // M  Rupies /ltr
      f.dispatchRemark || ''        // N  Remark
    ];

    // Send as a form-encoded POST body (robust for longer values, no URL limit).
    const body = new URLSearchParams();
    body.append('sheetName', DISPATCH_SHEET);
    body.append('action', 'insert');
    body.append('rowData', JSON.stringify(rowData));
    const res = await fetch(API_URL, { method: 'POST', body });
    const j = await res.json();
    if (j.success) return { success: true };
    return { success: false, error: j.error || 'Failed to write Dispatch row' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error writing Dispatch sheet' };
  }
}

export async function updateDispatchStatusInSheet(
  rowIndex: number,
  fields: {
    acDispatchStatus: string;
    uploadTransportationBill: string;
    dispatchStatus: string;
    statusDispatchQty: string;
    statusDispatchDate: string;
    invoiceVendor: string;
    taxInvoiceWayBill: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Column O ("PI Dispatch Staus") is left untouched. Columns are 1-indexed.
    const writes: Array<[number, any]> = [
      [16, fields.acDispatchStatus],     // P  AC Dispatch Status (auto date)
      [17, fields.uploadTransportationBill], // Q  Upload Transportation Bill
      [18, fields.dispatchStatus],       // R  Dispatch Status
      [19, fields.statusDispatchQty],    // S  Dispatch QTY
      [20, fields.statusDispatchDate],   // T  Dispatch Date
      [21, fields.invoiceVendor],        // U  Upload Invoice Recievd From Vender
      [22, fields.taxInvoiceWayBill]     // V  Uplaod Tax Invoice With way Bill
    ];
    for (const [col, val] of writes) {
      const r = await updateCellValue(DISPATCH_SHEET, rowIndex, col, val);
      if (!r.success) return { success: false, error: r.error || 'Failed to update dispatch status' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error updating dispatch status' };
  }
}

// Update the Material Receipt Confirmation fields (columns X-AD). Column W
// ("PL Reciept Material") is the trigger/planned value and is left untouched.
export async function updateMaterialReceiptInSheet(
  rowIndex: number,
  fields: {
    acReceiptMaterial: string;
    receiptTimeDelay2: string;
    uploadReceiving: string;
    shortageQty: string;
    creditNoteRequested: string;
    invoiceReviewDecision: string;
    uploadVendorCreditNote: string;
    gateInDateTime: string;
    gateOutDateTime: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Columns are 1-indexed.
    const writes: Array<[number, any]> = [
      [24, fields.acReceiptMaterial],      // X  AC Reciept Material (auto date)
      [25, fields.receiptTimeDelay2],      // Y  Time Delay2
      [26, fields.uploadReceiving],        // Z  Uplaod Recieving
      [27, fields.shortageQty],            // AA Shortage Qty (If Any)
      [28, fields.creditNoteRequested],    // AB Credit Note Requested by Party (If Any)
      [29, fields.invoiceReviewDecision],  // AC Invoice Review & Credit Note Decision
      [30, fields.uploadVendorCreditNote], // AD Upload Vendor Credit Note
      [50, fields.gateInDateTime],         // AX Gate In Date Time
      [51, fields.gateOutDateTime]         // AY Gate Out Date Time
    ];
    for (const [col, val] of writes) {
      const r = await updateCellValue(DISPATCH_SHEET, rowIndex, col, val);
      if (!r.success) return { success: false, error: r.error || 'Failed to update material receipt' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error updating material receipt' };
  }
}

// Update the Credit Note Creation fields (columns AF-AI). Column AE
// ("PI Credit Note") is the trigger/planned value and is left untouched.
export async function updateCreditNoteInSheet(
  rowIndex: number,
  fields: {
    acCreditNote: string;
    creditNoteTimeDelay1: string;
    uploadCreditNotePPPL: string;
    creditNoteMailCustomer: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Columns are 1-indexed.
    const writes: Array<[number, any]> = [
      [32, fields.acCreditNote],             // AF Ac Credit Note (auto date)
      [33, fields.creditNoteTimeDelay1],     // AG Time Delay1
      [34, fields.uploadCreditNotePPPL],     // AH Uplaod Credit Note issued By PPPL
      [35, fields.creditNoteMailCustomer],   // AI Creadint Not Mail To Customer
    ];
    for (const [col, val] of writes) {
      const r = await updateCellValue(DISPATCH_SHEET, rowIndex, col, val);
      if (!r.success) return { success: false, error: r.error || 'Failed to update credit note' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error updating credit note' };
  }
}

// Update the Payment Confirmation fields (columns AK, AM, AN, AO). Column AJ
// ("PI Payment Confirmation") is the trigger and AL ("Time Delay1") is left
// untouched (hidden / not stored).
export async function updatePaymentConfirmationInSheet(
  rowIndex: number,
  fields: {
    acPaymentConfirmation: string;
    uploadReceivedOfPayment: string;
    paymentReceivedDate: string;
    paymentRemark: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Columns are 1-indexed.
    const writes: Array<[number, any]> = [
      [37, fields.acPaymentConfirmation],    // AK Ac Payment Confirmation (auto date)
      [39, fields.uploadReceivedOfPayment],  // AM Upload Recived Of Payment
      [40, fields.paymentReceivedDate],      // AN Payment Recievd Date
      [41, fields.paymentRemark]             // AO Remark
    ];
    for (const [col, val] of writes) {
      const r = await updateCellValue(DISPATCH_SHEET, rowIndex, col, val);
      if (!r.success) return { success: false, error: r.error || 'Failed to update payment confirmation' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error updating payment confirmation' };
  }
}

// Update the Make Payment To Vendor fields (columns AS-AW). Column AR
// ("PI Make Payment") is the trigger. Time Delay1 (AT) is hidden.
export async function updateMakePaymentInSheet(
  rowIndex: number,
  fields: {
    acMakePayment: string;
    uploadInvoiceEwayBill: string;
    transportBill: string;
    makePaymentRemark: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Columns are 1-indexed.
    // AS = 45, AT = 46, AU = 47, AV = 48, AW = 49
    const writes: Array<[number, any]> = [
      [45, fields.acMakePayment],         // AS Ac Make Payment (auto date)
      [47, fields.uploadInvoiceEwayBill], // AU Uplaod Invoice /E-way Bill
      [48, fields.transportBill],         // AV Tranport Bill
      [49, fields.makePaymentRemark]      // AW Remark
    ];
    for (const [col, val] of writes) {
      const r = await updateCellValue(DISPATCH_SHEET, rowIndex, col, val);
      if (!r.success) return { success: false, error: r.error || 'Failed to update make payment' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error updating make payment' };
  }
}

// Update user profile in 'Login' sheet
export async function updateUserProfileInSheet(
  rowIndex: number,
  name: string,
  username: string,
  password: string,
  role: string,
  profileUrl: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const rowData = [name, username, password, role, profileUrl];
    const query = "?sheetName=Login&action=update&rowIndex=" + rowIndex + "&rowData=" + encodeURIComponent(JSON.stringify(rowData));
    const response = await fetch(API_URL + query, { method: 'POST' });
    const result = await response.json();
    if (result.success) {
      return { success: true, message: result.message };
    }
    return { success: false, error: result.error || 'Failed to update profile' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error updating profile' };
  }
}
