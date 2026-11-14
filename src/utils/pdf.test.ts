import test from 'node:test';
import assert from 'node:assert/strict';
import { extractFontAssetUrls, inlineFontAssetsInCSS } from './pdf';

test('extractFontAssetUrls resolves remote & relative font URLs while skipping data URLs', () => {
  const sampleCss = `
    @font-face {
      font-family: 'Hind Siliguri';
      src: url(https://fonts.gstatic.com/s/hindsiliguri/v12/abc.woff2) format('woff2'),
           url('./local-font.woff2') format('woff2'),
           url(data:font/woff2;base64,AAAA) format('woff2');
    }
  `;

  const extracted = extractFontAssetUrls(
    sampleCss,
    'https://fonts.googleapis.com/css2?family=Hind+Siliguri'
  );

  assert.equal(extracted.length, 2);
  assert.equal(extracted[0].resolvedUrl, 'https://fonts.gstatic.com/s/hindsiliguri/v12/abc.woff2');
  assert.equal(extracted[1].resolvedUrl, 'https://fonts.googleapis.com/local-font.woff2');
});

test('inlineFontAssetsInCSS replaces fetched URLs and gracefully preserves CSS on null resolution', async () => {
  const sampleCss = `
    @font-face {
      font-family: 'Inter';
      src: url(https://fonts.gstatic.com/s/inter/v18/ok.woff2) format('woff2');
    }
    @font-face {
      font-family: 'Fallback';
      src: url(https://fonts.gstatic.com/s/inter/v18/fail.woff2) format('woff2');
    }
  `;

  const result = await inlineFontAssetsInCSS(
    sampleCss,
    'https://fonts.googleapis.com/css2',
    async url => {
      if (url.includes('ok.woff2')) return 'data:font/woff2;base64,MOCKDATA';
      return null;
    }
  );

  assert.match(result, /url\("data:font\/woff2;base64,MOCKDATA"\)/);
  assert.match(result, /fail\.woff2/);
});
