import test from 'node:test';
import assert from 'node:assert/strict';
import type { Bill } from '../types';
import {
  filterPaidBillsByPeriod,
  computeHourlyAnalytics,
  computePeakHour,
  computeTopSellingFoods,
  getBengaliHourLabel,
} from './analytics';

const sampleBills: Bill[] = [
  {
    id: 'b1',
    restaurantId: 'r1',
    invoiceNumber: 'INV-101',
    customerName: 'রহিম',
    paymentMethod: 'ক্যাশ',
    items: [
      { foodId: 'f1', name: 'কাচ্চি বিরিয়ানি', price: 320, quantity: 2, total: 640 },
      { foodId: 'f2', name: 'বোরহানি', price: 60, quantity: 2, total: 120 },
    ],
    grandTotal: 760,
    dateStr: '2026-11-13',
    createdAt: '2026-11-13T07:30:00.000Z', // 13:30 Asia/Dhaka (1 PM)
    status: 'PAID',
  },
  {
    id: 'b2',
    restaurantId: 'r1',
    invoiceNumber: 'INV-102',
    customerName: 'করিম',
    paymentMethod: 'বিকাশ',
    items: [
      { foodId: 'f2', name: 'বোরহানি', price: 60, quantity: 5, total: 300 },
    ],
    grandTotal: 300,
    dateStr: '2026-11-13',
    createdAt: '2026-11-13T07:45:00.000Z', // 13:45 Asia/Dhaka (1 PM)
    status: 'PAID',
  },
  {
    id: 'b3',
    restaurantId: 'r1',
    invoiceNumber: 'INV-103',
    customerName: 'জামাল',
    paymentMethod: 'নগদ',
    items: [
      { foodId: 'f1', name: 'কাচ্চি বিরিয়ানি', price: 320, quantity: 3, total: 960 },
    ],
    grandTotal: 960,
    dateStr: '2026-11-12',
    createdAt: '2026-11-12T13:15:00.000Z', // 19:15 Asia/Dhaka (7 PM)
    status: 'PAID',
  },
  {
    id: 'b4',
    restaurantId: 'r1',
    invoiceNumber: 'INV-104',
    customerName: 'বাতিল',
    paymentMethod: 'ক্যাশ',
    items: [{ foodId: 'f1', name: 'কাচ্চি বিরিয়ানি', price: 320, quantity: 10, total: 3200 }],
    grandTotal: 3200,
    dateStr: '2026-11-13',
    createdAt: '2026-11-13T08:00:00.000Z',
    status: 'CANCELLED' as unknown as Bill['status'],
  },
];

test('filterPaidBillsByPeriod excludes cancelled bills and filters by period', () => {
  const today = filterPaidBillsByPeriod(sampleBills, 'today', '2026-11-13');
  assert.equal(today.length, 2);

  const all = filterPaidBillsByPeriod(sampleBills, 'all', '2026-11-13');
  assert.equal(all.length, 3);
});

test('computeHourlyAnalytics and computePeakHour detect peak ordering hour', () => {
  const today = filterPaidBillsByPeriod(sampleBills, 'today', '2026-11-13');
  const hourly = computeHourlyAnalytics(today);
  assert.equal(hourly.length, 16); // 8..23

  const peakByOrders = computePeakHour(hourly, 'orders');
  assert.ok(peakByOrders);
  assert.equal(peakByOrders.hour, 13);
  assert.equal(peakByOrders.orders, 2);
  assert.equal(peakByOrders.revenue, 1060);
});

test('computeTopSellingFoods ranks by revenue vs quantity accurately', () => {
  const today = filterPaidBillsByPeriod(sampleBills, 'today', '2026-11-13');
  const byRevenue = computeTopSellingFoods(today, 'revenue');
  assert.equal(byRevenue[0].name, 'কাচ্চি বিরিয়ানি');
  assert.equal(byRevenue[0].revenue, 640);

  const byQty = computeTopSellingFoods(today, 'quantity');
  assert.equal(byQty[0].name, 'বোরহানি');
  assert.equal(byQty[0].quantity, 7);
});

test('getBengaliHourLabel formats period in Bengali', () => {
  assert.match(getBengaliHourLabel(13), /দুপুর/);
  assert.match(getBengaliHourLabel(20), /রাত/);
});
