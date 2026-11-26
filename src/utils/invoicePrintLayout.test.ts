import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_INVOICE_PRINT_LAYOUT,
  sanitizeInvoicePrintLayout,
  applyPaperPreset,
  getPaperDimensionsMeta,
  buildDynamicPrintPageCSS,
} from './invoicePrintLayout';

test('sanitizeInvoicePrintLayout falls back to safe defaults on invalid inputs', () => {
  const defaulted = sanitizeInvoicePrintLayout(null);
  assert.deepEqual(defaulted, DEFAULT_INVOICE_PRINT_LAYOUT);

  const sanitized = sanitizeInvoicePrintLayout({
    paperSize: 'INVALID_SIZE' as never,
    fontScale: 'huge' as never,
    copies: 99 as never,
    headerLabel: '   ',
    footerNote: 'ধন্যবাদ',
    showSignatures: false,
  });

  assert.equal(sanitized.paperSize, 'A4');
  assert.equal(sanitized.fontScale, 'normal');
  assert.equal(sanitized.copies, 1);
  assert.equal(sanitized.headerLabel, DEFAULT_INVOICE_PRINT_LAYOUT.headerLabel);
  assert.equal(sanitized.footerNote, 'ধন্যবাদ');
  assert.equal(sanitized.showSignatures, false);
});

test('applyPaperPreset adjusts thermal 58mm/80mm ergonomics while keeping custom notes', () => {
  const custom = {
    ...DEFAULT_INVOICE_PRINT_LAYOUT,
    footerNote: 'আবার দেখা হবে',
    copies: 2 as const,
  };

  const pos58 = applyPaperPreset('THERMAL_58MM', custom);
  assert.equal(pos58.paperSize, 'THERMAL_58MM');
  assert.equal(pos58.density, 'compact');
  assert.equal(pos58.fontScale, 'compact');
  assert.equal(pos58.showSignatures, false);
  assert.equal(pos58.showSerialNumbers, false);
  assert.equal(pos58.showUnitPrice, false);
  assert.equal(pos58.footerNote, 'আবার দেখা হবে');
  assert.equal(pos58.copies, 2);

  const backToA4 = applyPaperPreset('A4', pos58);
  assert.equal(backToA4.paperSize, 'A4');
  assert.equal(backToA4.density, 'cozy');
  assert.equal(backToA4.showSignatures, true);
  assert.equal(backToA4.showSerialNumbers, true);
  assert.equal(backToA4.showUnitPrice, true);
});

test('getPaperDimensionsMeta and buildDynamicPrintPageCSS produce valid @page print rules', () => {
  const thermal80 = getPaperDimensionsMeta('THERMAL_80MM');
  assert.equal(thermal80.pageCssSize, '80mm auto');
  assert.equal(thermal80.isWideSheet, false);

  const css80 = buildDynamicPrintPageCSS({
    ...DEFAULT_INVOICE_PRINT_LAYOUT,
    paperSize: 'THERMAL_80MM',
  });
  assert.ok(css80.includes('size: 80mm auto;'));
  assert.ok(css80.includes('margin: 3mm;'));
  assert.ok(css80.includes('#invoice-print-preview-printable'));
  assert.ok(css80.includes('@media print'));
});
