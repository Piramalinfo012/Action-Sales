export interface User {
  name: string;
  username: string;
  role: 'Admin' | 'Sales' | 'Manager';
  rowIndex?: number; // Store the sheet row index to facilitate password updates
}

export interface ActionEntry {
  id: string; // ID
  timestamp: string; // Timetamp (DD/MM/YYYY)
  companyName: string; // Company Name
  quntity: number; // Quntity
  unit: string; // Unit (e.g. Ltr, Kg)
  productName: string; // Product Name
  location: string; // Location
  remark: string; // Remark
  planned1?: string; // Planned1
  actual1?: string; // Actual1
  timeDelay1?: string; // Time Delay1
  areWeL1?: string; // Are We L1?
  timeDelay2?: string; // Time Delay 2
  willPurchase?: string; // Will We Purchase Material from Another Party?
  supplierName?: string; // Supplier Name
  purchaseQuantity?: string; // Purchase Quantity
  purchaseRate?: string; // Purchase Rate
  uploadPoCopy?: string; // Upload Po Copy
  paymentTerms?: string; // Payment Terms and Condition
  shortageCondition?: string; // Shortage Condition
  rowIndex?: number; // Row index in Google Spreadsheet
  rawRowValues?: any[]; // Keep full row representation to avoid losing other columns on update
}

export type SidebarTab = 'dashboard' | 'new-action' | 'pending' | 'history' | 'reports' | 'drive-folder' | 'settings';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description: string;
}
