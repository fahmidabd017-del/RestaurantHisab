/**
 * Date and locale utilities for Bangladesh (Asia/Dhaka)
 */

export function getBangladeshDateString(date = new Date()): string {
  // Returns YYYY-MM-DD in Asia/Dhaka timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date); // Format is YYYY-MM-DD
}

export function getBangladeshDateCompact(date = new Date()): string {
  // Returns YYYYMMDD in Asia/Dhaka
  return getBangladeshDateString(date).replace(/-/g, '');
}

export function formatBengaliNumber(num: number | string): string {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, digit => bengaliDigits[Number(digit)]);
}

export function formatTaka(amount: number): string {
  return `৳${formatBengaliNumber(amount.toLocaleString('en-US'))}`;
}

export function formatBengaliDate(dateInput: string | Date): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const day = formatBengaliNumber(d.getDate());
  const months = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];
  const month = months[d.getMonth()];
  const year = formatBengaliNumber(d.getFullYear());
  return `${day} ${month}, ${year}`;
}

export interface TrialStatus {
  isExpired: boolean;
  daysRemaining: number;
  showWarning: boolean;
  warningSeverity?: '7_DAYS' | '3_DAYS' | '1_DAY' | 'EXPIRED';
}

export function calculateTrialStatus(trialEndsAt: string, isLifetime: boolean): TrialStatus {
  if (isLifetime) {
    return { isExpired: false, daysRemaining: 99999, showWarning: false };
  }

  const now = new Date().getTime();
  const end = new Date(trialEndsAt).getTime();
  const diffMs = end - now;
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 0) {
    return {
      isExpired: true,
      daysRemaining: 0,
      showWarning: true,
      warningSeverity: 'EXPIRED',
    };
  }

  if (daysRemaining === 1) {
    return {
      isExpired: false,
      daysRemaining: 1,
      showWarning: true,
      warningSeverity: '1_DAY',
    };
  }

  if (daysRemaining <= 3) {
    return {
      isExpired: false,
      daysRemaining,
      showWarning: true,
      warningSeverity: '3_DAYS',
    };
  }

  if (daysRemaining <= 7) {
    return {
      isExpired: false,
      daysRemaining,
      showWarning: true,
      warningSeverity: '7_DAYS',
    };
  }

  return {
    isExpired: false,
    daysRemaining,
    showWarning: false,
  };
}
