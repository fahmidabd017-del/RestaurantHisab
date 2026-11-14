import { hashString } from './crypto';

export const SITE_LOCK_STORAGE_KEY = 'restauranthisab_site_lock_hash';
export const SITE_LOCK_TIME_KEY = 'restauranthisab_site_lock_at';
export const MAX_LOCK_PIN_LENGTH = 4;

const BENGALI_DIGITS: Record<string, string> = {
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9',
};

/**
 * Normalizes Bengali or ASCII digits to ASCII 0-9, strips all non-digits,
 * and caps length to MAX_LOCK_PIN_LENGTH (4 digits).
 */
export function sanitizeLockPinInput(rawValue: string): string {
  if (!rawValue || typeof rawValue !== 'string') return '';
  let digits = '';
  for (const ch of rawValue) {
    const mapped = BENGALI_DIGITS[ch] ?? ch;
    if (mapped >= '0' && mapped <= '9') {
      digits += mapped;
      if (digits.length >= MAX_LOCK_PIN_LENGTH) break;
    }
  }
  return digits;
}

export interface PinValidationResult {
  valid: boolean;
  normalizedPin: string;
  error?: string;
}

/**
 * Validates that the raw PIN contains only digits (Bengali or English)
 * and has length between 1 and 4 digits inclusive.
 */
export function validateLockPin(rawValue: string): PinValidationResult {
  if (!rawValue || typeof rawValue !== 'string' || !rawValue.trim()) {
    return {
      valid: false,
      normalizedPin: '',
      error: 'কমপক্ষে ১ থেকে সর্বোচ্চ ৪ ডিজিটের সংখ্যার পাসওয়ার্ড দিন।',
    };
  }

  let allDigits = '';
  for (const ch of rawValue.trim()) {
    const mapped = BENGALI_DIGITS[ch] ?? ch;
    if (mapped >= '0' && mapped <= '9') {
      allDigits += mapped;
    } else {
      return {
        valid: false,
        normalizedPin: '',
        error: 'পাসওয়ার্ডে শুধুমাত্র সংখ্যা (০-৯) ব্যবহার করা যাবে।',
      };
    }
  }

  if (allDigits.length === 0) {
    return {
      valid: false,
      normalizedPin: '',
      error: 'কমপক্ষে ১ থেকে সর্বোচ্চ ৪ ডিজিটের সংখ্যার পাসওয়ার্ড দিন।',
    };
  }

  if (allDigits.length > MAX_LOCK_PIN_LENGTH) {
    return {
      valid: false,
      normalizedPin: allDigits.slice(0, MAX_LOCK_PIN_LENGTH),
      error: 'পাসওয়ার্ড সর্বোচ্চ ৪ ডিজিটের হতে পারবে।',
    };
  }

  return {
    valid: true,
    normalizedPin: allDigits,
  };
}

export async function hashLockPin(rawPin: string): Promise<string> {
  const validation = validateLockPin(rawPin);
  if (!validation.valid) {
    throw new Error(validation.error || 'অবৈধ পিন');
  }
  return hashString(`LOCK_PIN:${validation.normalizedPin}`);
}

export async function verifyLockPin(rawPin: string, storedHash: string): Promise<boolean> {
  if (!storedHash) return false;
  const validation = validateLockPin(rawPin);
  if (!validation.valid) return false;
  const computed = await hashString(`LOCK_PIN:${validation.normalizedPin}`);
  return computed === storedHash;
}

/**
 * Resolves the active lock PIN hash from local device lock or global Admin entry lock.
 */
export function resolveActiveLockHash(
  localLockHash: string,
  globalLockEnabled?: boolean,
  globalLockPinHash?: string
): string {
  const local = (localLockHash || '').trim();
  if (local) return local;
  if (globalLockEnabled && globalLockPinHash && globalLockPinHash.trim()) {
    return globalLockPinHash.trim();
  }
  return '';
}

/**
 * Determines whether the entry lock screen should block access for the current visit.
 * Returns true whenever a lock PIN is configured and has not been unlocked during this visit.
 */
export function shouldShowSiteLockScreen(
  activeLockHash: string,
  unlockedInVisitHash: string
): boolean {
  const active = (activeLockHash || '').trim();
  if (!active) return false;
  return unlockedInVisitHash !== active;
}
