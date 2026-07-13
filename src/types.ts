export interface User {
  name: string;
  username: string;
  role: 'Admin' | 'Sales' | 'Manager';
  rowIndex?: number; // Store the sheet row index to facilitate password updates
  profileUrl?: string;
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
  l1PartyName?: string; // L1 Party Name (Sale Allocation)
  rowIndex?: number; // Row index in Google Spreadsheet
  rawRowValues?: any[]; // Keep full row representation to avoid losing other columns on update
}

// A single supplier allocation within a Purchase Allocation. Multiple suppliers
// can share one order (e.g. 300 split as 100 + 100 + 100). The six data fields
// are serialized into the existing FMS sheet columns (newline-joined per column),
// so no backend/sheet schema change is required. The remaining fields are UI-only.
export interface Supplier {
  supplierName: string;
  purchaseQuantity: string;
  purchaseRate: string;
  uploadPoCopy: string;
  paymentTerms: string;
  shortageCondition: string;
  poMode?: 'upload' | 'link'; // UI-only: which PO input is active
  poFileName?: string;        // UI-only: uploaded file name for display
  poFileSize?: string;        // UI-only: uploaded file size for display
  isUploading?: boolean;      // UI-only: upload in progress
  uploadProgress?: number;    // UI-only: upload progress %
}

export type SidebarTab = 'dashboard' | 'new-action' | 'pending' | 'dispatch-status' | 'material-receipt' | 'credit-note' | 'payment-confirmation' | 'make-payment' | 'history' | 'reports' | 'drive-folder' | 'settings';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description: string;
}
