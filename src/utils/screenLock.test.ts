import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeLockPinInput,
  validateLockPin,
  MAX_LOCK_PIN_LENGTH,
  resolveActiveLockHash,
  shouldShowSiteLockScreen,
} from './screenLock';

test('sanitizeLockPinInput normalizes Bengali and ASCII digits and enforces max 4 digits', () => {
  assert.equal(MAX_LOCK_PIN_LENGTH, 4);
  assert.equal(sanitizeLockPinInput('১২৩৪'), '1234');
  assert.equal(sanitizeLockPinInput('12a3b456'), '1234');
  assert.equal(sanitizeLockPinInput('০৯'), '09');
  assert.equal(sanitizeLockPinInput('abc!@#'), '');
});

test('validateLockPin accepts 1 to 4 digit PINs (English or Bengali)', () => {
  assert.deepEqual(validateLockPin('5'), { valid: true, normalizedPin: '5' });
  assert.deepEqual(validateLockPin('12'), { valid: true, normalizedPin: '12' });
  assert.deepEqual(validateLockPin('১২৩'), { valid: true, normalizedPin: '123' });
  assert.deepEqual(validateLockPin('4589'), { valid: true, normalizedPin: '4589' });
});

test('validateLockPin rejects empty, non-numeric, or >4 digit PINs', () => {
  const empty = validateLockPin('   ');
  assert.equal(empty.valid, false);

  const alpha = validateLockPin('12ab');
  assert.equal(alpha.valid, false);

  const tooLong = validateLockPin('12345');
  assert.equal(tooLong.valid, false);
  assert.equal(tooLong.normalizedPin, '1234');
});

test('resolveActiveLockHash prioritizes local lock hash then global admin lock', () => {
  assert.equal(resolveActiveLockHash('local_hash', true, 'global_hash'), 'local_hash');
  assert.equal(resolveActiveLockHash('', true, 'global_hash'), 'global_hash');
  assert.equal(resolveActiveLockHash('', false, 'global_hash'), '');
  assert.equal(resolveActiveLockHash('', true, ''), '');
});

test('shouldShowSiteLockScreen enforces lock on entry, unlocks for visit, and re-locks on new visit', () => {
  assert.equal(shouldShowSiteLockScreen('', ''), false);
  assert.equal(shouldShowSiteLockScreen('pin_hash_123', ''), true);
  assert.equal(shouldShowSiteLockScreen('pin_hash_123', 'pin_hash_123'), false);
  assert.equal(shouldShowSiteLockScreen('pin_hash_new', 'pin_hash_old'), true);
});
