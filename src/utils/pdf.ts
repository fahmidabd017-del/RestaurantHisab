import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

/**
 * High-definition Bengali PDF exporter using html-to-image & jsPDF.
 * Uses a CORS-safe webfont embedder passed via `fontEmbedCSS` so html-to-image
 * never throws SecurityError when inspecting cross-origin CSSStyleSheet.cssRules.
 */

const FONT_URL_REGEX = /url\(["']?([^"')]+)["']?\)/g;

/**
 * Extract all non-data font asset URLs referenced inside a CSS string and
 * resolve relative URLs against the stylesheet base URL.
 */
export function extractFontAssetUrls(cssText: string, baseUrl: string): Array<{ rawMatch: string; resolvedUrl: string }> {
  const results: Array<{ rawMatch: string; resolvedUrl: string }> = [];
  const matches = cssText.match(/url\([^)]+\)/g) || [];

  for (const rawMatch of matches) {
    const inner = rawMatch.replace(FONT_URL_REGEX, '$1').trim();
    if (!inner || inner.startsWith('data:') || inner.startsWith('blob:')) {
      continue;
    }
    try {
      const resolvedUrl = new URL(inner, baseUrl).href;
      results.push({ rawMatch, resolvedUrl });
    } catch {
      // Ignore malformed URLs cleanly
    }
  }

  return results;
}

/**
 * Replace external font asset URLs inside CSS text using an async resolver
 * (which returns a base64 data URL or null if unavailable).
 */
export async function inlineFontAssetsInCSS(
  cssText: string,
  baseUrl: string,
  resolveToDataUrl: (url: string) => Promise<string | null>
): Promise<string> {
  const assets = extractFontAssetUrls(cssText, baseUrl);
  if (assets.length === 0) return cssText;

  let updatedCss = cssText;
  const resolvedEntries = await Promise.all(
    assets.map(async asset => {
      const dataUrl = await resolveToDataUrl(asset.resolvedUrl).catch(() => null);
      return { rawMatch: asset.rawMatch, dataUrl };
    })
  );

  for (const { rawMatch, dataUrl } of resolvedEntries) {
    if (dataUrl) {
      updatedCss = updatedCss.split(rawMatch).join(`url("${dataUrl}")`);
    }
  }

  return updatedCss;
}

async function fetchUrlAsDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string | null>(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

let cachedFontEmbedCSSPromise: Promise<string> | null = null;

/**
 * Safely collects @font-face rules without triggering CSSStyleSheet.cssRules
 * SecurityError on cross-origin stylesheets, then caches the result.
 * Passing the returned string (even '') as `fontEmbedCSS` instructs html-to-image
 * to skip `getWebFontCSS` / `document.styleSheets` iteration completely.
 */
export function getSafeFontEmbedCSS(): Promise<string> {
  if (cachedFontEmbedCSSPromise) {
    return cachedFontEmbedCSSPromise;
  }

  cachedFontEmbedCSSPromise = (async () => {
    if (typeof document === 'undefined') return '';

    const cssChunks: string[] = [];

    // 1. Fetch remote font stylesheets via CORS-safe fetch() instead of reading cssRules
    const stylesheetLinks = Array.from(
      document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]')
    );

    for (const link of stylesheetLinks) {
      const href = link.href;
      if (!href || (!href.includes('fonts.googleapis.com') && !href.includes('fonts.'))) {
        continue;
      }
      try {
        const res = await fetch(href, { mode: 'cors' });
        if (!res.ok) continue;
        const rawCss = await res.text();
        const inlinedCss = await inlineFontAssetsInCSS(rawCss, href, fetchUrlAsDataUrl);
        if (inlinedCss.trim()) {
          cssChunks.push(inlinedCss);
        }
      } catch {
        // Gracefully skip if offline or blocked without logging errors
      }
    }

    // 2. Safely check any readable local stylesheets for inline @font-face rules
    try {
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          if (sheet.href && (sheet.href.includes('fonts.googleapis.com') || sheet.href.includes('fonts.'))) {
            continue;
          }
          const rules = sheet.cssRules;
          if (!rules) continue;
          for (const rule of Array.from(rules)) {
            if (rule.type === CSSRule.FONT_FACE_RULE) {
              cssChunks.push(rule.cssText);
            }
          }
        } catch {
          // Cross-origin stylesheet without CORS headers: ignore silently
        }
      }
    } catch {
      // Ignore stylesheet enumeration issues
    }

    return cssChunks.join('\n');
  })();

  return cachedFontEmbedCSSPromise;
}

/** Reset cached font CSS (intended for testing). */
export function resetFontEmbedCache(): void {
  cachedFontEmbedCSSPromise = null;
}

/**
 * Download Cash Memo / Invoice as Standard A4 or Compact PDF
 */
export async function downloadReceiptPDF(
  elementId: string,
  invoiceNumber: string,
  isA4Format: boolean = true
): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Element not found for PDF generation:', elementId);
    return false;
  }

  try {
    const fontEmbedCSS = await getSafeFontEmbedCSS();
    const dataUrl = await toPng(element, {
      quality: 1,
      pixelRatio: 2.5,
      backgroundColor: '#ffffff',
      cacheBust: true,
      fontEmbedCSS,
    });

    const img = new Image();
    img.src = dataUrl;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const a4Width = 210; // mm
    const a4Height = 297; // mm

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Pure white paper background for printer-friendly Cash Memo with black text
    doc.setFillColor(255, 255, 255); // #FFFFFF
    doc.rect(0, 0, a4Width, a4Height, 'F');

    // Calculate scaling to fit neatly inside A4 margins
    const margin = 10; // 10mm margins
    const printableWidth = isA4Format ? a4Width - margin * 2 : Math.min(120, a4Width - margin * 2);
    const xOffset = isA4Format ? margin : (a4Width - printableWidth) / 2;
    const computedHeight = (img.height * printableWidth) / img.width;

    // Center image neatly within A4 printable area
    const yOffset = computedHeight < a4Height - margin * 2 ? margin : margin;

    doc.addImage(dataUrl, 'PNG', xOffset, yOffset, printableWidth, Math.min(computedHeight, a4Height - margin * 2));
    doc.save(`ইনভয়েস-${invoiceNumber}-${isA4Format ? 'A4' : 'স্লিপ'}.pdf`);
    return true;
  } catch (err) {
    console.error('Failed to generate Receipt PDF:', err);
    return false;
  }
}

/**
 * Download Professional A4 Restaurant Sales & Financial Report PDF
 */
export async function downloadA4SalesReportPDF(
  elementId: string,
  reportTitle: string = 'বিক্রি-রিপোর্ট'
): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Report element not found for PDF export:', elementId);
    return false;
  }

  try {
    const fontEmbedCSS = await getSafeFontEmbedCSS();
    const dataUrl = await toPng(element, {
      quality: 1,
      pixelRatio: 2.8,
      backgroundColor: '#0B0F17',
      cacheBust: true,
      fontEmbedCSS,
    });

    const img = new Image();
    img.src = dataUrl;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const a4Width = 210; // mm
    const a4Height = 297; // mm
    const margin = 10; // 10mm margin
    const contentWidth = a4Width - margin * 2;
    const contentHeight = (img.height * contentWidth) / img.width;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Fill dark executive page background
    doc.setFillColor(11, 15, 23); // #0B0F17
    doc.rect(0, 0, a4Width, a4Height, 'F');

    // Check if multi-page is required or single A4 page
    if (contentHeight <= a4Height - margin * 2) {
      // Fits on a single A4 page perfectly
      doc.addImage(dataUrl, 'PNG', margin, margin, contentWidth, contentHeight);
    } else {
      // Multi-page A4 handling
      let heightLeft = contentHeight;
      let position = margin;
      const pageUsableHeight = a4Height - margin * 2;

      doc.addImage(dataUrl, 'PNG', margin, position, contentWidth, contentHeight);
      heightLeft -= pageUsableHeight;

      while (heightLeft > 0) {
        position = heightLeft - contentHeight + margin;
        doc.addPage('a4', 'portrait');
        doc.setFillColor(11, 15, 23); // #0B0F17
        doc.rect(0, 0, a4Width, a4Height, 'F');
        doc.addImage(dataUrl, 'PNG', margin, position, contentWidth, contentHeight);
        heightLeft -= pageUsableHeight;
      }
    }

    const cleanTitle = reportTitle.replace(/[/\\?%*:|"<>]/g, '-');
    doc.save(`${cleanTitle}-A4.pdf`);
    return true;
  } catch (err) {
    console.error('Failed to export A4 Sales Report PDF:', err);
    return false;
  }
}
