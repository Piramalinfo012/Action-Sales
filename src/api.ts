import { User, ActionEntry } from './types';

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
    // If it has 'T', e.g. "2026-08-06T18:30:00.000Z", extract YYYY-MM-DD first for timezone-safe parsing
    const matchHyphen = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (matchHyphen) {
      return `${matchHyphen[3]}/${matchHyphen[2]}/${matchHyphen[1]}`;
    }

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
    const response = await fetch(`${API_URL}?sheet=Login`);
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
    const response = await fetch(`${API_URL}?sheet=FMS`);
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
            else if (key.includes('quntity') || key.includes('quantity')) mappedKey = 'quntity';
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
          
          return {
            id: obj.id || `local-${index}`,
            timestamp: formatToDDMMYYYY(obj.timestamp),
            companyName: obj.companyName || '',
            quntity: parseFloat(obj.quntity) || 0,
            unit: obj.unit || '',
            productName: obj.productName || '',
            location: obj.location || '',
            remark: obj.remark || '',
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

// Update Action entry - L1 Confirmation columns and Purchase Allocation columns
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
  shortageCondition: string = ''
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    // Preserve other columns using rawRowValues if available, or create 32-length array
    let rowData = entry.rawRowValues ? [...entry.rawRowValues] : new Array(32).fill('');
    while (rowData.length < 32) {
      rowData.push('');
    }

    // Set first 8 columns to match current entry values
    rowData[0] = entry.timestamp;
    rowData[1] = entry.id;
    rowData[2] = entry.companyName;
    rowData[3] = entry.quntity;
    rowData[4] = entry.unit;
    rowData[5] = entry.productName;
    rowData[6] = entry.location;
    rowData[7] = entry.remark;

    // Set L1 Confirmation values in columns S (index 18), T (index 19), U (index 20), V (index 21)
    rowData[18] = planned1;
    rowData[19] = actual1;
    rowData[20] = timeDelay1;
    rowData[21] = areWeL1;

    // Set Purchase Allocation values starting from index 24 (Column Y) to 31 (Column AF)
    rowData[24] = timeDelay2;
    rowData[25] = willPurchase;
    rowData[26] = supplierName;
    rowData[27] = purchaseQuantity;
    rowData[28] = purchaseRate;
    rowData[29] = uploadPoCopy;
    rowData[30] = paymentTerms;
    rowData[31] = shortageCondition;

    const query = `?sheetName=FMS&action=update&rowIndex=${rowIndex}&rowData=${encodeURIComponent(JSON.stringify(rowData))}`;
    const response = await fetch(`${API_URL}${query}`, { method: 'POST' });
    const result = await response.json();
    if (result.success) {
      return { success: true, message: result.message };
    }
    return { success: false, error: result.error || 'Failed to update L1 Confirmation' };
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
    const response = await fetch(`${API_URL}?sheet=Master`);
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
