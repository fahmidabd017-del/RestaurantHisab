import test from 'node:test';
import assert from 'node:assert/strict';
import type { AdminNotification, Restaurant } from '../types';
import {
  countUnreadNotifications,
  filterRestaurantsForAdmin,
  generateTemporaryPassword,
  maskDigestForDisplay,
  removeNotificationFromList,
  removeRestaurantFromList,
} from './adminDirectory';

const sampleRestaurants: Restaurant[] = [
  {
    id: 'rest_1',
    name: 'ঢাকা বিরিয়ানি হাউজ',
    ownerName: 'মোহাম্মদ করিম',
    address: 'মিরপুর ১০, ঢাকা',
    mobile: '01711111111',
    email: 'dhaka@example.com',
    passwordHash: 'abcd1234abcd1234abcd1234',
    securityQuestion: 'প্রিয় খাবার?',
    securityAnswerHash: 'efgh5678',
    createdAt: '2026-11-10T10:00:00.000Z',
    trialEndsAt: '2026-12-10T10:00:00.000Z',
    isLifetime: false,
    paymentStatus: 'none',
  },
  {
    id: 'rest_2',
    name: 'চট্টগ্রাম মেজবান',
    ownerName: 'তানভীর আহমেদ',
    address: 'জিইসি মোড়, চট্টগ্রাম',
    mobile: '01822222222',
    email: 'ctg@example.com',
    passwordHash: '9999888877776666',
    securityQuestion: 'জন্মস্থান?',
    securityAnswerHash: '11112222',
    createdAt: '2026-11-11T10:00:00.000Z',
    trialEndsAt: '2026-12-11T10:00:00.000Z',
    isLifetime: true,
    paymentStatus: 'approved',
  },
];

const sampleNotifications: AdminNotification[] = [
  {
    id: 'notif_1',
    type: 'NEW_REGISTRATION',
    title: 'নতুন রেজিস্ট্রেশন',
    message: 'ঢাকা বিরিয়ানি হাউজ যুক্ত হয়েছে',
    restaurantId: 'rest_1',
    isRead: false,
    createdAt: '2026-11-10T10:00:00.000Z',
  },
  {
    id: 'notif_2',
    type: 'NEW_PAYMENT',
    title: 'নতুন পেমেন্ট',
    message: 'চট্টগ্রাম মেজবান পেমেন্ট জমা দিয়েছে',
    restaurantId: 'rest_2',
    isRead: true,
    createdAt: '2026-11-11T10:00:00.000Z',
  },
];

test('filterRestaurantsForAdmin matches name, owner, mobile, email, and address', () => {
  assert.equal(filterRestaurantsForAdmin(sampleRestaurants, '').length, 2);
  assert.equal(filterRestaurantsForAdmin(sampleRestaurants, '018222').length, 1);
  assert.equal(filterRestaurantsForAdmin(sampleRestaurants, 'DHAKA@EXAMPLE.COM')[0].id, 'rest_1');
  assert.equal(filterRestaurantsForAdmin(sampleRestaurants, 'জিইসি')[0].id, 'rest_2');
});

test('maskDigestForDisplay hides digest by default and reveals full digest when toggled', () => {
  assert.equal(maskDigestForDisplay('', false), 'সেট করা নেই');
  const masked = maskDigestForDisplay('abcdef1234567890', false);
  assert.ok(masked.startsWith('••••'));
  assert.ok(masked.endsWith('(567890)'));
  assert.equal(maskDigestForDisplay('abcdef1234567890', true), 'abcdef1234567890');
});

test('generateTemporaryPassword enforces safe length bounds and non-empty characters', () => {
  const pDefault = generateTemporaryPassword();
  assert.equal(pDefault.length, 8);
  const pMin = generateTemporaryPassword(2);
  assert.equal(pMin.length, 6);
  assert.ok(/^[A-Za-z0-9@#]+$/.test(pDefault));
});

test('notification & restaurant removal helpers update counts and lists cleanly', () => {
  assert.equal(countUnreadNotifications(sampleNotifications), 1);
  const afterNotifDelete = removeNotificationFromList(sampleNotifications, 'notif_1');
  assert.equal(afterNotifDelete.length, 1);
  assert.equal(countUnreadNotifications(afterNotifDelete), 0);

  const afterRestDelete = removeRestaurantFromList(sampleRestaurants, 'rest_1');
  assert.equal(afterRestDelete.length, 1);
  assert.equal(afterRestDelete[0].id, 'rest_2');
});
