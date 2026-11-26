import test from 'node:test';
import assert from 'node:assert/strict';
import type { Bill, BillDraft } from '../types';
import { computeDashboardSummary, extractNormalizedTable } from './dashboardSummary';

function makeBill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: 'bill_1',
    invoiceNumber: '20261126-001',
    dateStr: '2026-11-26',
    customerName: 'জনাব করিম',
    paymentMethod: 'ক্যাশ',
    items: [
      {
        foodId: 'f1',
        name: 'চিকেন বিরিয়ানি',
        price: 180,
        quantity: 2,
        total: 360,
      },
    ],
    grandTotal: 360,
    status: 'PAID',
    restaurantId: 'rest_1',
    createdAt: '2026-11-26T06:00:00.000Z',
    ...overrides,
  };
}

test('extractNormalizedTable normalizes Bengali, English, and short table formats', () => {
  assert.deepEqual(extractNormalizedTable('টেবিল ৩'), {
    key: 'table:3',
    label: 'টেবিল ৩',
  });
  assert.deepEqual(extractNormalizedTable('Table 03'), {
    key: 'table:3',
    label: 'টেবিল ৩',
  });
  assert.deepEqual(extractNormalizedTable('T-3'), {
    key: 'table:3',
    label: 'টেবিল ৩',
  });
  assert.equal(extractNormalizedTable('জনাব করিম'), null);
});

test('computeDashboardSummary returns zeroes when there are no bills or drafts', () => {
  const result = computeDashboardSummary({
    bills: [],
    draft: null,
    todayStr: '2026-11-26',
  });

  assert.equal(result.todayTotalSales, 0);
  assert.equal(result.todayPaidBillsCount, 0);
  assert.equal(result.activeTablesCount, 0);
  assert.deepEqual(result.activeTableLabels, []);
  assert.equal(result.pendingOrdersCount, 0);
  assert.equal(result.pendingOrdersAmount, 0);
  assert.equal(result.hasActiveDraft, false);
});

test('computeDashboardSummary aggregates today sales, deduplicates active tables, and includes active draft as pending order', () => {
  const bills: Bill[] = [
    makeBill({ id: 'b1', dateStr: '2026-11-26', customerName: 'টেবিল ১', grandTotal: 400 }),
    makeBill({ id: 'b2', dateStr: '2026-11-26', customerName: 'Table 1', grandTotal: 250 }),
    makeBill({ id: 'b3', dateStr: '2026-11-26', customerName: 'জনাব করিম', grandTotal: 150 }),
    // Yesterday's bill must not count toward today's sales or today's tables
    makeBill({ id: 'b4', dateStr: '2026-11-25', customerName: 'টেবিল ৯', grandTotal: 900 }),
  ];

  const draft: BillDraft = {
    customerName: 'টেবিল ৫',
    paymentMethod: 'ক্যাশ',
    items: [
      { foodId: 'f2', name: 'মাটন কাচ্চি', price: 260, quantity: 2, total: 520 },
      { foodId: 'f3', name: 'দুধ চা', price: 15, quantity: 1, total: 15 },
    ],
    updatedAt: '2026-11-26T08:30:00.000Z',
  };

  const result = computeDashboardSummary({
    bills,
    draft,
    todayStr: '2026-11-26',
  });

  assert.equal(result.todayTotalSales, 800);
  assert.equal(result.todayPaidBillsCount, 3);
  assert.equal(result.activeTablesCount, 2); // টেবিল ৫ (draft) + টেবিল ১ (deduplicated from today)
  assert.deepEqual(result.activeTableLabels, ['টেবিল ৫', 'টেবিল ১']);
  assert.equal(result.pendingOrdersCount, 1);
  assert.equal(result.pendingOrdersAmount, 535);
  assert.equal(result.pendingItemsCount, 3);
  assert.equal(result.hasActiveDraft, true);
});

test('computeDashboardSummary counts non-PAID bills alongside an active draft', () => {
  const unpaidBill = {
    ...makeBill({
      id: 'b_pending',
      customerName: 'টেবিল ৪',
      grandTotal: 420,
      items: [{ foodId: 'f1', name: 'বিফ তেহারি', price: 140, quantity: 3, total: 420 }],
    }),
    status: 'PENDING',
  } as unknown as Bill;

  const draft: BillDraft = {
    customerName: 'রহিম সাহেব',
    paymentMethod: 'বিকাশ',
    items: [{ foodId: 'f5', name: 'ফিরনি', price: 50, quantity: 2, total: 100 }],
    updatedAt: '2026-11-26T09:00:00.000Z',
  };

  const result = computeDashboardSummary({
    bills: [unpaidBill],
    draft,
    todayStr: '2026-11-26',
  });

  assert.equal(result.todayTotalSales, 0);
  assert.equal(result.pendingOrdersCount, 2);
  assert.equal(result.pendingOrdersAmount, 520);
  assert.equal(result.pendingItemsCount, 5);
  assert.equal(result.activeTablesCount, 2); // রহিম সাহেব (active draft) + টেবিল ৪ (pending bill)
});
