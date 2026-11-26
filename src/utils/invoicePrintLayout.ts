export type InvoicePaperSize = 'A4' | 'A5' | 'THERMAL_80MM' | 'THERMAL_58MM';
export type InvoiceFontScale = 'compact' | 'normal' | 'large';
export type InvoiceDensity = 'cozy' | 'compact';
export type InvoiceHeaderAlign = 'center' | 'left';

export interface InvoicePrintLayoutConfig {
  paperSize: InvoicePaperSize;
  fontScale: InvoiceFontScale;
  density: InvoiceDensity;
  headerAlign: InvoiceHeaderAlign;
  showLogo: boolean;
  showAddressAndPhone: boolean;
  showCustomerInfo: boolean;
  showPaymentBadge: boolean;
  showSerialNumbers: boolean;
  showUnitPrice: boolean;
  showSummaryBox: boolean;
  showSignatures: boolean;
  showCopyBadge: boolean;
  headerLabel: string;
  footerNote: string;
  copies: 1 | 2;
}

export interface PaperDimensionMeta {
  id: InvoicePaperSize;
  label: string;
  shortLabel: string;
  dimensionsLabel: string;
  previewMaxWidthPx: number;
  pageCssSize: string;
  pageCssMargin: string;
  isWideSheet: boolean;
}

export const PAPER_PRESETS: Record<InvoicePaperSize, PaperDimensionMeta> = {
  A4: {
    id: 'A4',
    label: 'A4 অফিসিয়াল',
    shortLabel: 'A4',
    dimensionsLabel: '210 × 297 mm',
    previewMaxWidthPx: 680,
    pageCssSize: 'A4 portrait',
    pageCssMargin: '10mm',
    isWideSheet: true,
  },
  A5: {
    id: 'A5',
    label: 'A5 অর্ধেক পেজ',
    shortLabel: 'A5',
    dimensionsLabel: '148 × 210 mm',
    previewMaxWidthPx: 480,
    pageCssSize: 'A5 portrait',
    pageCssMargin: '8mm',
    isWideSheet: true,
  },
  THERMAL_80MM: {
    id: 'THERMAL_80MM',
    label: '৮০মিমি থার্মাল',
    shortLabel: '80mm',
    dimensionsLabel: '80 mm রোল',
    previewMaxWidthPx: 336,
    pageCssSize: '80mm auto',
    pageCssMargin: '3mm',
    isWideSheet: false,
  },
  THERMAL_58MM: {
    id: 'THERMAL_58MM',
    label: '৫৮মিমি POS',
    shortLabel: '58mm',
    dimensionsLabel: '58 mm রোল',
    previewMaxWidthPx: 268,
    pageCssSize: '58mm auto',
    pageCssMargin: '2mm',
    isWideSheet: false,
  },
};

export const DEFAULT_INVOICE_PRINT_LAYOUT: InvoicePrintLayoutConfig = {
  paperSize: 'A4',
  fontScale: 'normal',
  density: 'cozy',
  headerAlign: 'center',
  showLogo: true,
  showAddressAndPhone: true,
  showCustomerInfo: true,
  showPaymentBadge: true,
  showSerialNumbers: true,
  showUnitPrice: true,
  showSummaryBox: true,
  showSignatures: true,
  showCopyBadge: false,
  headerLabel: 'ক্যাশ মেমো / অফিসিয়াল বিক্রয় রসিদ (CASH MEMO)',
  footerNote: 'ধন্যবাদ! আবার আসবেন।',
  copies: 1,
};

const VALID_PAPER_SIZES = new Set<InvoicePaperSize>(['A4', 'A5', 'THERMAL_80MM', 'THERMAL_58MM']);
const VALID_FONT_SCALES = new Set<InvoiceFontScale>(['compact', 'normal', 'large']);
const VALID_DENSITIES = new Set<InvoiceDensity>(['cozy', 'compact']);
const VALID_ALIGNS = new Set<InvoiceHeaderAlign>(['center', 'left']);

export function sanitizeInvoicePrintLayout(
  raw: Partial<InvoicePrintLayoutConfig> | null | undefined
): InvoicePrintLayoutConfig {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_INVOICE_PRINT_LAYOUT };
  }

  return {
    paperSize: VALID_PAPER_SIZES.has(raw.paperSize as InvoicePaperSize)
      ? (raw.paperSize as InvoicePaperSize)
      : DEFAULT_INVOICE_PRINT_LAYOUT.paperSize,
    fontScale: VALID_FONT_SCALES.has(raw.fontScale as InvoiceFontScale)
      ? (raw.fontScale as InvoiceFontScale)
      : DEFAULT_INVOICE_PRINT_LAYOUT.fontScale,
    density: VALID_DENSITIES.has(raw.density as InvoiceDensity)
      ? (raw.density as InvoiceDensity)
      : DEFAULT_INVOICE_PRINT_LAYOUT.density,
    headerAlign: VALID_ALIGNS.has(raw.headerAlign as InvoiceHeaderAlign)
      ? (raw.headerAlign as InvoiceHeaderAlign)
      : DEFAULT_INVOICE_PRINT_LAYOUT.headerAlign,
    showLogo: typeof raw.showLogo === 'boolean' ? raw.showLogo : DEFAULT_INVOICE_PRINT_LAYOUT.showLogo,
    showAddressAndPhone:
      typeof raw.showAddressAndPhone === 'boolean'
        ? raw.showAddressAndPhone
        : DEFAULT_INVOICE_PRINT_LAYOUT.showAddressAndPhone,
    showCustomerInfo:
      typeof raw.showCustomerInfo === 'boolean'
        ? raw.showCustomerInfo
        : DEFAULT_INVOICE_PRINT_LAYOUT.showCustomerInfo,
    showPaymentBadge:
      typeof raw.showPaymentBadge === 'boolean'
        ? raw.showPaymentBadge
        : DEFAULT_INVOICE_PRINT_LAYOUT.showPaymentBadge,
    showSerialNumbers:
      typeof raw.showSerialNumbers === 'boolean'
        ? raw.showSerialNumbers
        : DEFAULT_INVOICE_PRINT_LAYOUT.showSerialNumbers,
    showUnitPrice:
      typeof raw.showUnitPrice === 'boolean'
        ? raw.showUnitPrice
        : DEFAULT_INVOICE_PRINT_LAYOUT.showUnitPrice,
    showSummaryBox:
      typeof raw.showSummaryBox === 'boolean'
        ? raw.showSummaryBox
        : DEFAULT_INVOICE_PRINT_LAYOUT.showSummaryBox,
    showSignatures:
      typeof raw.showSignatures === 'boolean'
        ? raw.showSignatures
        : DEFAULT_INVOICE_PRINT_LAYOUT.showSignatures,
    showCopyBadge:
      typeof raw.showCopyBadge === 'boolean'
        ? raw.showCopyBadge
        : DEFAULT_INVOICE_PRINT_LAYOUT.showCopyBadge,
    headerLabel:
      typeof raw.headerLabel === 'string' && raw.headerLabel.trim().length > 0
        ? raw.headerLabel.trim().slice(0, 80)
        : DEFAULT_INVOICE_PRINT_LAYOUT.headerLabel,
    footerNote:
      typeof raw.footerNote === 'string'
        ? raw.footerNote.slice(0, 140)
        : DEFAULT_INVOICE_PRINT_LAYOUT.footerNote,
    copies: raw.copies === 2 ? 2 : 1,
  };
}

/**
 * Applies sensible layout ergonomics when switching between full-page and thermal roll presets
 * while preserving user's custom header/footer text and copy count.
 */
export function applyPaperPreset(
  paperSize: InvoicePaperSize,
  current: InvoicePrintLayoutConfig
): InvoicePrintLayoutConfig {
  const isThermal = paperSize === 'THERMAL_80MM' || paperSize === 'THERMAL_58MM';
  return {
    ...current,
    paperSize,
    density: isThermal ? 'compact' : 'cozy',
    fontScale: paperSize === 'THERMAL_58MM' ? 'compact' : current.fontScale === 'compact' && !isThermal ? 'normal' : current.fontScale,
    showSerialNumbers: paperSize === 'THERMAL_58MM' ? false : true,
    showUnitPrice: paperSize === 'THERMAL_58MM' ? false : true,
    showSignatures: !isThermal,
  };
}

export function getPaperDimensionsMeta(paperSize: InvoicePaperSize): PaperDimensionMeta {
  return PAPER_PRESETS[paperSize] || PAPER_PRESETS.A4;
}

/**
 * Generates clean scoped @media print CSS targeting `#invoice-print-preview-printable`
 * with the exact user-chosen @page size and margin.
 */
export function buildDynamicPrintPageCSS(config: InvoicePrintLayoutConfig): string {
  const meta = getPaperDimensionsMeta(config.paperSize);
  return `
@media print {
  @page {
    size: ${meta.pageCssSize};
    margin: ${meta.pageCssMargin};
  }
  body * {
    visibility: hidden !important;
  }
  #invoice-print-preview-printable,
  #invoice-print-preview-printable * {
    visibility: visible !important;
  }
  #invoice-print-preview-printable {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
    color: #000000 !important;
  }
  .invoice-print-copy-break {
    page-break-after: always !important;
    break-after: page !important;
  }
  .invoice-print-copy-break:last-child {
    page-break-after: auto !important;
    break-after: auto !important;
  }
}
`.trim();
}

const STORAGE_KEY_PREFIX = 'restauranthisab_invoice_print_layout_v1_';

export function loadSavedPrintLayout(restaurantId: string): InvoicePrintLayoutConfig {
  if (typeof window === 'undefined' || !restaurantId) {
    return { ...DEFAULT_INVOICE_PRINT_LAYOUT };
  }
  try {
    const raw = window.localStorage.getItem(`${STORAGE_KEY_PREFIX}${restaurantId}`);
    if (!raw) return { ...DEFAULT_INVOICE_PRINT_LAYOUT };
    return sanitizeInvoicePrintLayout(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_INVOICE_PRINT_LAYOUT };
  }
}

export function savePrintLayout(restaurantId: string, config: InvoicePrintLayoutConfig): void {
  if (typeof window === 'undefined' || !restaurantId) return;
  try {
    window.localStorage.setItem(`${STORAGE_KEY_PREFIX}${restaurantId}`, JSON.stringify(config));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function resetSavedPrintLayout(restaurantId: string): InvoicePrintLayoutConfig {
  const fresh = { ...DEFAULT_INVOICE_PRINT_LAYOUT };
  if (typeof window !== 'undefined' && restaurantId) {
    try {
      window.localStorage.removeItem(`${STORAGE_KEY_PREFIX}${restaurantId}`);
    } catch {
      // Ignore
    }
  }
  return fresh;
}
