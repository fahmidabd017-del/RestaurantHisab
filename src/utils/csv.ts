import type { Bill } from '../types';
import { formatBengaliDate, formatBengaliNumber } from './date';

function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exports a list of restaurant bills into a well-formatted CSV file for accounting and bookkeeping.
 * Includes UTF-8 BOM for crystal-clear Bengali characters in Microsoft Excel, Google Sheets, LibreOffice, and Tally.
 */
export function exportBillsToCSV(
  bills: Bill[],
  restaurantName: string,
  filterDate?: string
): boolean {
  if (!bills || bills.length === 0) {
    return false;
  }

  const rows: string[][] = [];

  // Header metadata rows for accounting ledger
  rows.push([`${restaurantName} - বিক্রয় ও হিসাব খাতা (Sales & Accounting Ledger)`]);
  rows.push([
    `তারিখ ফিল্টার: ${filterDate ? filterDate : 'সকল তারিখের বিল'}`,
    `মোট বিল সংখ্যা: ${bills.length}`,
    `রিপোর্ট জেনারেট: ${new Date().toLocaleString('en-GB')}`,
  ]);
  rows.push([]); // blank line

  // Column Headers (Both Bengali and English Accounting terms)
  rows.push([
    'ক্রমিক (SL)',
    'ইনভয়েস নং (Invoice No)',
    'তারিখ (Date)',
    'সময় (Time)',
    'গ্রাহকের নাম (Customer Name)',
    'পরিশোধ পদ্ধতি (Payment Method)',
    'আইটেম সংখ্যা (Items Count)',
    'খাবারের তালিকা ও পরিমাণ (Ordered Items & Quantities)',
    'মোট বিল ৳ (Grand Total BDT)',
    'স্ট্যাটাস (Status)',
  ]);

  let totalGrandTotal = 0;
  let totalItemsCount = 0;
  let cashTotal = 0;
  let digitalTotal = 0;

  bills.forEach((bill, idx) => {
    const sl = idx + 1;
    const invoiceNo = bill.invoiceNumber;
    
    // Parse date and time
    let dateStr = bill.dateStr;
    let timeStr = '';
    if (bill.createdAt) {
      const d = new Date(bill.createdAt);
      if (!isNaN(d.getTime())) {
        dateStr = d.toLocaleDateString('en-GB');
        timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      }
    }

    const customer = bill.customerName || 'সম্মানিত অতিথি';
    const method = bill.paymentMethod || 'ক্যাশ';
    
    const itemsCount = bill.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
    totalItemsCount += itemsCount;

    const itemsSummary = bill.items
      .map(item => `${item.name} (${item.quantity}টি x ৳${item.price} = ৳${item.total})`)
      .join('; ');

    const grandTotal = bill.grandTotal || 0;
    totalGrandTotal += grandTotal;

    if (method === 'ক্যাশ') {
      cashTotal += grandTotal;
    } else {
      digitalTotal += grandTotal;
    }

    rows.push([
      String(sl),
      invoiceNo,
      dateStr,
      timeStr,
      customer,
      method,
      String(itemsCount),
      itemsSummary,
      String(grandTotal),
      bill.status || 'PAID',
    ]);
  });

  // Blank separator line before Accounting Summary
  rows.push([]);
  rows.push(['--- হিসাব খাতা সারাংশ (ACCOUNTING SUMMARY) ---']);
  rows.push(['মোট ইনভয়েস সংখ্যা (Total Invoices)', String(bills.length)]);
  rows.push(['মোট বিক্রিত খাবারের পরিমাণ (Total Items Sold)', String(totalItemsCount)]);
  rows.push(['নগদ বিক্রয় (Cash Sales BDT)', String(cashTotal)]);
  rows.push(['ডিজিটাল / অনলাইন বিক্রয় (Digital/Online Sales BDT)', String(digitalTotal)]);
  rows.push(['সর্বমোট বিক্রয় রেভিনিউ ৳ (Grand Total Revenue BDT)', String(totalGrandTotal)]);
  rows.push([
    'গড় বিল মূল্য ৳ (Average Bill Value BDT)',
    bills.length > 0 ? String(Math.round(totalGrandTotal / bills.length)) : '0',
  ]);

  // Convert array of rows to CSV string
  const csvContent = rows
    .map(row => row.map(escapeCSV).join(','))
    .join('\r\n');

  // \uFEFF Byte Order Mark ensures Microsoft Excel & Google Sheets display UTF-8 Bengali properly
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const safeName = (restaurantName || 'Restaurant')
    .replace(/[^a-zA-Z0-9_\u0980-\u09FF]/g, '_')
    .slice(0, 30);
  const dateTag = filterDate || new Date().toISOString().slice(0, 10);
  const filename = `${safeName}_Bills_Ledger_${dateTag}.csv`;

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return true;
}
