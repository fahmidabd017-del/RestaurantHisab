export interface FirebaseResetParams {
  mode: 'resetPassword';
  oobCode: string;
}

export interface MappedFirebaseAuthError {
  message: string;
  suggestFallback: boolean;
  needsConsoleEnable: boolean;
}

const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeRecoveryEmail(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw.trim().toLowerCase();
}

export function isValidRecoveryEmail(raw: string): boolean {
  const normalized = normalizeRecoveryEmail(raw);
  return normalized.length > 0 && SIMPLE_EMAIL_REGEX.test(normalized);
}

/**
 * Extracts Firebase Auth password-reset query parameters when returning via an action URL.
 */
export function parseFirebaseResetParams(search: string): FirebaseResetParams | null {
  if (!search || typeof search !== 'string') return null;
  const query = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(query);
  const mode = params.get('mode');
  const oobCode = params.get('oobCode')?.trim();

  if (mode === 'resetPassword' && oobCode) {
    return { mode: 'resetPassword', oobCode };
  }
  return null;
}

/**
 * Maps Firebase Auth error codes cleanly to user-friendly Bengali feedback.
 */
export function mapFirebaseResetErrorToBengali(codeOrMessage: string): MappedFirebaseAuthError {
  const normalized = (codeOrMessage || '').toLowerCase();

  if (normalized.includes('auth/invalid-email')) {
    return {
      message: 'অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা লিখুন।',
      suggestFallback: false,
      needsConsoleEnable: false,
    };
  }

  if (normalized.includes('auth/user-not-found')) {
    return {
      message: 'এই ইমেইলটি Firebase Auth-এ নিবন্ধিত নেই। আপনি চাইলে নিচের "নিরাপত্তা প্রশ্ন" দিয়ে পাসওয়ার্ড রিসেট করতে পারেন।',
      suggestFallback: true,
      needsConsoleEnable: false,
    };
  }

  if (normalized.includes('auth/operation-not-allowed') || normalized.includes('auth/admin-restricted-operation')) {
    return {
      message: 'Firebase Console-এ Email/Password সাইন-ইন প্রোভাইডার চালু নেই। বিকল্প হিসেবে "নিরাপত্তা প্রশ্ন" দিয়ে পাসওয়ার্ড রিসেট করুন।',
      suggestFallback: true,
      needsConsoleEnable: true,
    };
  }

  if (normalized.includes('auth/too-many-requests')) {
    return {
      message: 'অনেকবার অনুরোধ পাঠানো হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।',
      suggestFallback: false,
      needsConsoleEnable: false,
    };
  }

  if (normalized.includes('auth/expired-action-code') || normalized.includes('auth/invalid-action-code')) {
    return {
      message: 'পাসওয়ার্ড রিসেট লিংকটির মেয়াদ শেষ বা অবৈধ হয়ে গেছে। অনুগ্রহ করে নতুন রিসেট লিংক পাঠান।',
      suggestFallback: false,
      needsConsoleEnable: false,
    };
  }

  if (normalized.includes('auth/weak-password')) {
    return {
      message: 'নতুন পাসওয়ার্ডটি দুর্বল! কমপক্ষে ৬ অক্ষরের শক্তিশালী পাসওয়ার্ড দিন।',
      suggestFallback: false,
      needsConsoleEnable: false,
    };
  }

  if (normalized.includes('auth/network-request-failed')) {
    return {
      message: 'ইন্টারনেট সংযোগে সমস্যা হয়েছে। সংযোগ যাচাই করে আবার চেষ্টা করুন।',
      suggestFallback: false,
      needsConsoleEnable: false,
    };
  }

  return {
    message: 'ইমেইল রিসেট লিংক পাঠাতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন বা নিরাপত্তা প্রশ্ন ব্যবহার করুন।',
    suggestFallback: true,
    needsConsoleEnable: false,
  };
}
