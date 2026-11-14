import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SITE_SETTINGS,
  mergeSystemSettings,
  sanitizeLogoUrl,
  formatDocumentTitle,
} from './siteSettings.ts';

describe('siteSettings helpers', () => {
  it('returns complete defaults when raw input is null or empty', () => {
    const merged = mergeSystemSettings(null);
    assert.equal(merged.siteName, DEFAULT_SITE_SETTINGS.siteName);
    assert.equal(merged.supportPhone, DEFAULT_SITE_SETTINGS.supportPhone);
    assert.equal(merged.contactAddress, DEFAULT_SITE_SETTINGS.contactAddress);
    assert.equal(merged.logoUrl, '');
  });

  it('merges custom branding, contact info, and keeps fallback for blank strings', () => {
    const merged = mergeSystemSettings({
      siteName: 'বিসমিল্লাহ POS',
      siteTagline: 'স্মার্ট হোটেল হিসাব',
      contactAddress: 'গুলশান ২, ঢাকা',
      supportPhone: '01811223344',
      supportEmail: 'hello@bismillahpos.com',
      logoUrl: 'https://example.com/logo.png',
      heroSubtitle: '   ',
      lifetimeFee: 500,
    });

    assert.equal(merged.siteName, 'বিসমিল্লাহ POS');
    assert.equal(merged.siteTagline, 'স্মার্ট হোটেল হিসাব');
    assert.equal(merged.contactAddress, 'গুলশান ২, ঢাকা');
    assert.equal(merged.supportPhone, '01811223344');
    assert.equal(merged.supportEmail, 'hello@bismillahpos.com');
    assert.equal(merged.logoUrl, 'https://example.com/logo.png');
    assert.equal(merged.heroSubtitle, DEFAULT_SITE_SETTINGS.heroSubtitle);
    assert.equal(merged.lifetimeFee, 500);
  });

  it('sanitizes logo URLs to allow safe image URLs/data URIs and reject unsafe schemes', () => {
    assert.equal(sanitizeLogoUrl('https://cdn.site.com/a.webp'), 'https://cdn.site.com/a.webp');
    assert.equal(sanitizeLogoUrl('data:image/webp;base64,AAA='), 'data:image/webp;base64,AAA=');
    assert.equal(sanitizeLogoUrl('/assets/logo.png'), '/assets/logo.png');
    assert.equal(sanitizeLogoUrl('javascript:alert(1)'), '');
    assert.equal(sanitizeLogoUrl('   '), '');
  });

  it('formats browser document title cleanly', () => {
    const title = formatDocumentTitle({
      siteName: 'DhakaDine',
      siteTagline: 'ক্যাশ মেমো সফটওয়্যার',
    });
    assert.equal(title, 'DhakaDine - ক্যাশ মেমো সফটওয়্যার');
  });
});
