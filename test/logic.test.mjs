import test from 'node:test';
import assert from 'node:assert/strict';

function formatBengaliNumber(num) {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/[0-9]/g, digit => bengaliDigits[Number(digit)]);
}

function formatTaka(amount) {
  return `৳${formatBengaliNumber(amount.toLocaleString('en-US'))}`;
}

function calculateTrialStatus(trialEndsAt, isLifetime) {
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

test('formatBengaliNumber converts digits correctly', () => {
  assert.equal(formatBengaliNumber(12345), '১২৩৪৫');
  assert.equal(formatBengaliNumber('20261109-001'), '২০২৬১১০৯-০০১');
  assert.equal(formatBengaliNumber(0), '০');
});

test('formatTaka formats currency in BDT', () => {
  assert.equal(formatTaka(250), '৳২৫০');
});

test('calculateTrialStatus identifies lifetime status', () => {
  const res = calculateTrialStatus('2026-12-01', true);
  assert.equal(res.isExpired, false);
  assert.equal(res.showWarning, false);
});

test('calculateTrialStatus detects expired trials', () => {
  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const res = calculateTrialStatus(pastDate, false);
  assert.equal(res.isExpired, true);
  assert.equal(res.warningSeverity, 'EXPIRED');
});

test('calculateTrialStatus flags 3 days warning', () => {
  const threeDaysFuture = new Date(Date.now() + 2.5 * 24 * 60 * 60 * 1000).toISOString();
  const res = calculateTrialStatus(threeDaysFuture, false);
  assert.equal(res.isExpired, false);
  assert.equal(res.showWarning, true);
  assert.equal(res.warningSeverity, '3_DAYS');
});
