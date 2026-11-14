import test from 'node:test';
import assert from 'node:assert/strict';
import type { BillItem, FoodItem } from '../types';
import {
  normalizeBengaliDigits,
  parseQuantityToken,
  parseVoiceTranscriptToItems,
  extractCustomerNameFromTranscript,
  mergeDictatedItems,
} from './voiceOrderParser';

const menu: FoodItem[] = [
  {
    id: 'f1',
    name: 'কাচ্চি বিরিয়ানি',
    price: 320,
    categoryId: 'c1',
    categoryName: 'বিরিয়ানি',
    restaurantId: 'r1',
    createdAt: '2026-11-01T00:00:00Z',
  },
  {
    id: 'f2',
    name: 'বোরহানি',
    price: 60,
    categoryId: 'c2',
    categoryName: 'পানীয়',
    restaurantId: 'r1',
    createdAt: '2026-11-01T00:00:00Z',
  },
  {
    id: 'f3',
    name: 'চিকেন রোস্ট',
    price: 150,
    categoryId: 'c1',
    categoryName: 'মাংস',
    restaurantId: 'r1',
    createdAt: '2026-11-01T00:00:00Z',
  },
  {
    id: 'f4',
    name: 'Kacchi Biryani',
    price: 320,
    categoryId: 'c1',
    categoryName: 'Biryani',
    restaurantId: 'r1',
    createdAt: '2026-11-01T00:00:00Z',
  },
];

test('normalizeBengaliDigits converts Bengali numerals to ASCII digits', () => {
  assert.equal(normalizeBengaliDigits('১২৩৪৫'), '12345');
  assert.equal(normalizeBengaliDigits('টেবিল ৩'), 'টেবিল 3');
});

test('parseQuantityToken handles Bengali words, digits, and English words', () => {
  assert.equal(parseQuantityToken('দুইটা'), 2);
  assert.equal(parseQuantityToken('তিনটি'), 3);
  assert.equal(parseQuantityToken('৪'), 4);
  assert.equal(parseQuantityToken('five'), 5);
  assert.equal(parseQuantityToken('2টা'), 2);
  assert.equal(parseQuantityToken('বিরিয়ানি'), null);
});

test('parseVoiceTranscriptToItems parses multi-item Bengali voice order accurately', () => {
  const matched = parseVoiceTranscriptToItems(
    'দুইটা কাচ্চি বিরিয়ানি আর একটা বোরহানি এবং ৩ চিকেন রোস্ট',
    menu
  );

  assert.equal(matched.length, 3);
  assert.deepEqual(
    matched.map(m => ({ id: m.food.id, qty: m.quantity })),
    [
      { id: 'f1', qty: 2 },
      { id: 'f2', qty: 1 },
      { id: 'f3', qty: 3 },
    ]
  );
});

test('parseVoiceTranscriptToItems handles English and trailing quantities', () => {
  const matched = parseVoiceTranscriptToItems('2 kacchi biryani, বোরহানি ২টা', menu);
  assert.equal(matched.length, 2);
  assert.equal(matched[0].food.id, 'f4');
  assert.equal(matched[0].quantity, 2);
  assert.equal(matched[1].food.id, 'f2');
  assert.equal(matched[1].quantity, 2);
});

test('extractCustomerNameFromTranscript detects Bengali and English table numbers', () => {
  assert.equal(extractCustomerNameFromTranscript('টেবিল নম্বর ৫, দুইটা কাচ্চি'), 'টেবিল 5');
  assert.equal(extractCustomerNameFromTranscript('Table 2'), 'টেবিল 2');
  assert.equal(extractCustomerNameFromTranscript('দুইটা বোরহানি'), null);
});

test('mergeDictatedItems increments existing items and appends new ones cleanly', () => {
  const existing: BillItem[] = [
    { foodId: 'f1', name: 'কাচ্চি বিরিয়ানি', price: 320, quantity: 1, total: 320 },
  ];

  const merged = mergeDictatedItems(existing, [
    { food: menu[0], quantity: 2 },
    { food: menu[1], quantity: 3 },
  ]);

  assert.equal(merged.length, 2);
  assert.equal(merged[0].quantity, 3);
  assert.equal(merged[0].total, 960);
  assert.equal(merged[1].foodId, 'f2');
  assert.equal(merged[1].quantity, 3);
  assert.equal(merged[1].total, 180);
});
