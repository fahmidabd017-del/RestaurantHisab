import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeRecoveryEmail,
  isValidRecoveryEmail,
  parseFirebaseResetParams,
  mapFirebaseResetErrorToBengali,
} from './passwordRecovery';

test('normalizeRecoveryEmail and isValidRecoveryEmail clean and validate emails', () => {
  assert.equal(normalizeRecoveryEmail('  Cafe@Dhaka.COM '), 'cafe@dhaka.com');
  assert.equal(isValidRecoveryEmail('  owner@dhakabites.com '), true);
  assert.equal(isValidRecoveryEmail('invalid-email'), false);
  assert.equal(isValidRecoveryEmail('   '), false);
});

test('parseFirebaseResetParams extracts oobCode when mode=resetPassword', () => {
  assert.deepEqual(
    parseFirebaseResetParams('?mode=resetPassword&oobCode=ABC123xyz&apiKey=test'),
    { mode: 'resetPassword', oobCode: 'ABC123xyz' }
  );
  assert.equal(parseFirebaseResetParams('?mode=verifyEmail&oobCode=ABC123xyz'), null);
  assert.equal(parseFirebaseResetParams(''), null);
});

test('mapFirebaseResetErrorToBengali maps Firebase error codes accurately', () => {
  const notAllowed = mapFirebaseResetErrorToBengali('Firebase: Error (auth/operation-not-allowed).');
  assert.equal(notAllowed.needsConsoleEnable, true);
  assert.equal(notAllowed.suggestFallback, true);

  const notFound = mapFirebaseResetErrorToBengali('auth/user-not-found');
  assert.equal(notFound.suggestFallback, true);
  assert.equal(notFound.needsConsoleEnable, false);

  const expired = mapFirebaseResetErrorToBengali('auth/expired-action-code');
  assert.equal(expired.suggestFallback, false);
  assert.match(expired.message, /মেয়াদ শেষ/);
});
