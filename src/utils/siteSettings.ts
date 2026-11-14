import type { SystemSettings } from '../types';

export interface ResolvedSiteSettings {
  lifetimeFee: number;
  bkashNumber: string;
  nagadNumber: string;
  trialDays: number;
  siteName: string;
  siteTagline: string;
  siteBadge: string;
  logoUrl: string;
  contactAddress: string;
  supportPhone: string;
  supportEmail: string;
  heroTitle: string;
  heroSubtitle: string;
  footerDescription: string;
  copyrightText: string;
  starterMenu?: SystemSettings['starterMenu'];
}

export const DEFAULT_SITE_SETTINGS: ResolvedSiteSettings = {
  lifetimeFee: 250,
  bkashNumber: '01734211584',
  nagadNumber: '01734211584',
  trialDays: 30,
  siteName: 'RestaurantHisab',
  siteTagline: 'রেস্তোরাঁহিসাব বিলিং সফটওয়্যার',
  siteBadge: 'বাংলা',
  logoUrl: '',
  contactAddress: 'ঢাকা, বাংলাদেশ',
  supportPhone: '01734211584',
  supportEmail: 'support@restauranthisab.com',
  heroTitle: 'খাবার দোকানের ক্যাশ মেমো ও হিসাব রাখুন সহজে ও নির্ভুলভাবে',
  heroSubtitle:
    'হোটেল, রেস্তোরাঁ, বিরিয়ানি হাউজ, ক্যাফে, মিষ্টি ও ফাস্টফুড শপের জন্য নিবেদিত বাংলা বিলিং প্ল্যাটফর্ম। মাত্র কয়েক ক্লিকে ডিজিটাল ইনভয়েস তৈরি করুন ও কাস্টমারকে দিন আকর্ষণীয় বাংলা PDF রসিদ।',
  footerDescription:
    'বাংলাদেশের সকল রেস্তোরাঁ, হোটেল, বিরিয়ানি হাউজ, ক্যাফে, মিষ্টি ও ফাস্টফুড শপের জন্য আধুনিক ও দ্রুত ডিজিটাল বিলিং সফটওয়্যার।',
  copyrightText: '© ২০২৬ RestaurantHisab (রেস্তোরাঁহিসাব) - সর্বস্বত্ব সংরক্ষিত।',
};

export function sanitizeLogoUrl(rawUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('https://') ||
    lower.startsWith('http://') ||
    lower.startsWith('data:image/') ||
    trimmed.startsWith('/')
  ) {
    return trimmed;
  }
  return '';
}

function pickNonEmptyString(val: unknown, fallback: string): string {
  if (typeof val !== 'string') return fallback;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export function mergeSystemSettings(raw?: Partial<SystemSettings> | null): ResolvedSiteSettings {
  const source = raw || {};
  const lifetimeFee =
    typeof source.lifetimeFee === 'number' && !Number.isNaN(source.lifetimeFee) && source.lifetimeFee >= 0
      ? source.lifetimeFee
      : DEFAULT_SITE_SETTINGS.lifetimeFee;
  const trialDays =
    typeof source.trialDays === 'number' && !Number.isNaN(source.trialDays) && source.trialDays >= 1
      ? Math.floor(source.trialDays)
      : DEFAULT_SITE_SETTINGS.trialDays;

  return {
    lifetimeFee,
    trialDays,
    bkashNumber: pickNonEmptyString(source.bkashNumber, DEFAULT_SITE_SETTINGS.bkashNumber),
    nagadNumber: pickNonEmptyString(source.nagadNumber, DEFAULT_SITE_SETTINGS.nagadNumber),
    siteName: pickNonEmptyString(source.siteName, DEFAULT_SITE_SETTINGS.siteName),
    siteTagline: pickNonEmptyString(source.siteTagline, DEFAULT_SITE_SETTINGS.siteTagline),
    siteBadge: pickNonEmptyString(source.siteBadge, DEFAULT_SITE_SETTINGS.siteBadge),
    logoUrl: typeof source.logoUrl === 'string' ? sanitizeLogoUrl(source.logoUrl) : DEFAULT_SITE_SETTINGS.logoUrl,
    contactAddress: pickNonEmptyString(source.contactAddress, DEFAULT_SITE_SETTINGS.contactAddress),
    supportPhone: pickNonEmptyString(source.supportPhone, DEFAULT_SITE_SETTINGS.supportPhone),
    supportEmail: pickNonEmptyString(source.supportEmail, DEFAULT_SITE_SETTINGS.supportEmail),
    heroTitle: pickNonEmptyString(source.heroTitle, DEFAULT_SITE_SETTINGS.heroTitle),
    heroSubtitle: pickNonEmptyString(source.heroSubtitle, DEFAULT_SITE_SETTINGS.heroSubtitle),
    footerDescription: pickNonEmptyString(source.footerDescription, DEFAULT_SITE_SETTINGS.footerDescription),
    copyrightText: pickNonEmptyString(source.copyrightText, DEFAULT_SITE_SETTINGS.copyrightText),
    starterMenu: source.starterMenu,
  };
}

export function formatDocumentTitle(settings: Pick<ResolvedSiteSettings, 'siteName' | 'siteTagline'>): string {
  return `${settings.siteName} - ${settings.siteTagline}`;
}
