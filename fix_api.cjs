const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'api.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Fix the interface
const brokenInterface = /export interface AllocationRow \{[\s\S]*?materialSuppliedFrom: string; \/\/ U/m;
const correctInterface = `export interface AllocationRow {
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
  materialSuppliedFrom: string; // U`;

content = content.replace(brokenInterface, correctInterface);

// Add isSale: true to getSaleAllocationRows
content = content.replace(
  /dispatchRemark: str\(row\[22\]\)\s*\/\/\s*W\s*\}/g,
  "dispatchRemark: str(row[22]),           // W\n        isSale: true"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed api.ts successfully');
