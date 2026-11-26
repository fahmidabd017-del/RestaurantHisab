import React, { useEffect, useState } from 'react';
import type { Bill, Restaurant } from '../../types';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import { formatBengaliDate, formatBengaliNumber, formatTaka } from '../../utils/date';
import { downloadReceiptPDF } from '../../utils/pdf';
import {
  type InvoiceDensity,
  type InvoiceFontScale,
  type InvoiceHeaderAlign,
  type InvoicePaperSize,
  type InvoicePrintLayoutConfig,
  PAPER_PRESETS,
  applyPaperPreset,
  buildDynamicPrintPageCSS,
  getPaperDimensionsMeta,
  loadSavedPrintLayout,
  resetSavedPrintLayout,
  savePrintLayout,
} from '../../utils/invoicePrintLayout';
import { TopAccentBar } from './TopAccentBar';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  Printer,
  RotateCcw,
  SlidersHorizontal,
  UtensilsCrossed,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

interface InvoicePrintPreviewModalProps {
  bill: Bill;
  restaurant: Restaurant;
  onClose: () => void;
  onBackToReceipt?: () => void;
}

const ZOOM_LEVELS = [0.75, 1, 1.15] as const;

export const InvoicePrintPreviewModal: React.FC<InvoicePrintPreviewModalProps> = ({
  bill,
  restaurant,
  onClose,
  onBackToReceipt,
}) => {
  const { settings } = useSiteSettings();
  const [config, setConfig] = useState<InvoicePrintLayoutConfig>(() =>
    loadSavedPrintLayout(restaurant.id)
  );
  const [zoom, setZoom] = useState<number>(1);
  const [mobilePane, setMobilePane] = useState<'preview' | 'customize'>('preview');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [resetNotice, setResetNotice] = useState(false);

  // Persist layout changes per restaurant automatically
  useEffect(() => {
    savePrintLayout(restaurant.id, config);
  }, [restaurant.id, config]);

  const paperMeta = getPaperDimensionsMeta(config.paperSize);
  const totalItemsQuantity = bill.items.reduce((sum, item) => sum + item.quantity, 0);

  const updateConfig = <K extends keyof InvoicePrintLayoutConfig>(
    key: K,
    value: InvoicePrintLayoutConfig[K]
  ) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handlePaperPresetSelect = (paperSize: InvoicePaperSize) => {
    setConfig(prev => applyPaperPreset(paperSize, prev));
  };

  const handleResetLayout = () => {
    const fresh = resetSavedPrintLayout(restaurant.id);
    setConfig(fresh);
    setZoom(1);
    setResetNotice(true);
    setTimeout(() => setResetNotice(false), 2500);
  };

  const handleTriggerPrint = () => {
    const styleId = 'dynamic-invoice-print-style';
    const existing = document.getElementById(styleId);
    if (existing) existing.remove();

    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = buildDynamicPrintPageCSS(config);
    document.head.appendChild(styleEl);

    const cleanup = () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
      window.removeEventListener('afterprint', cleanup);
    };

    window.addEventListener('afterprint', cleanup);
    window.print();
    // Safety cleanup if browser blocks or finishes print dialog without firing afterprint
    setTimeout(cleanup, 1500);
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    setDownloadSuccess(false);
    const ok = await downloadReceiptPDF(
      'invoice-print-preview-printable',
      bill.invoiceNumber,
      paperMeta.isWideSheet
    );
    setIsDownloading(false);
    if (ok) {
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    }
  };

  // Typography & spacing classes derived from config
  const isThermal = config.paperSize === 'THERMAL_80MM' || config.paperSize === 'THERMAL_58MM';
  const isNarrow58 = config.paperSize === 'THERMAL_58MM';

  const sheetPaddingClass =
    config.density === 'compact'
      ? isThermal
        ? 'p-3'
        : 'p-4 sm:p-5'
      : isThermal
      ? 'p-4'
      : 'p-6 sm:p-8';

  const bodyTextClass =
    config.fontScale === 'compact'
      ? 'text-[11px]'
      : config.fontScale === 'large'
      ? 'text-sm sm:text-[15px]'
      : 'text-xs sm:text-[13px]';

  const titleTextClass =
    config.fontScale === 'compact'
      ? isThermal
        ? 'text-base'
        : 'text-xl'
      : config.fontScale === 'large'
      ? isThermal
        ? 'text-xl'
        : 'text-3xl'
      : isThermal
      ? 'text-lg'
      : 'text-2xl';

  const cellPadClass =
    config.density === 'compact' ? 'py-1 px-1.5' : isThermal ? 'py-1.5 px-2' : 'py-2 px-2.5';

  const copyList = config.copies === 2 ? ['কাস্টমার কপি', 'কাউন্টার কপি'] : ['কাস্টমার কপি'];

  return (
    <div
      data-testid="invoice-print-preview-modal"
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
    >
      <div className="relative overflow-hidden bg-[#0E1524] text-white rounded-2xl shadow-2xl w-full max-w-6xl border border-slate-800 flex flex-col max-h-[94vh]">
        <TopAccentBar variant="amber" />

        {/* Top Bar */}
        <div className="px-4 sm:px-5 py-3 bg-[#111927] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 relative z-10 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {onBackToReceipt && (
              <button
                type="button"
                onClick={onBackToReceipt}
                aria-label="ক্যাশ মেমো ভিউতে ফিরে যান"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-[#151E2E] hover:bg-[#1E293B] text-slate-200 hover:text-white text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>মেমোতে ফিরুন</span>
              </button>
            )}
            <div className="w-8 h-8 rounded-lg bg-orange-950/70 border border-orange-700/60 text-orange-400 flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-sm sm:text-base text-white truncate">
                <span className="sm:hidden">প্রিন্ট প্রিভিউ</span>
                <span className="hidden sm:inline">প্রিন্ট প্রিভিউ ও ইনভয়েস লেআউট কাস্টমাইজার</span>
              </h3>
              <p className="text-xs text-slate-400 truncate">
                ইনভয়েস নং:{' '}
                <span className="font-mono font-bold text-slate-200 tabular-nums">
                  {bill.invoiceNumber}
                </span>{' '}
                · ক্রেতা: {bill.customerName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {downloadSuccess && (
              <span className="hidden sm:inline-flex items-center gap-1 text-xs text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>PDF ডাউনলোড সম্পন্ন</span>
              </span>
            )}

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDownloading ? 'তৈরি হচ্ছে...' : 'PDF ডাউনলোড'}</span>
            </button>

            <button
              type="button"
              data-testid="print-preview-trigger-print"
              onClick={handleTriggerPrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-extrabold text-xs shadow-md shadow-orange-500/20 transition-all cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              <span>এখনই প্রিন্ট করুন</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="প্রিন্ট প্রিভিউ বন্ধ করুন"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#151E2E] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile-only Segmented Pane Switcher */}
        <div className="lg:hidden px-3 py-2 bg-[#0B0F17] border-b border-slate-800 grid grid-cols-2 gap-1.5 shrink-0 relative z-10">
          <button
            type="button"
            data-testid="mobile-pane-preview"
            onClick={() => setMobilePane('preview')}
            className={`inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              mobilePane === 'preview'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-[#111927] text-slate-300 border border-slate-800 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>লাইভ প্রিভিউ</span>
          </button>
          <button
            type="button"
            data-testid="mobile-pane-customize"
            onClick={() => setMobilePane('customize')}
            className={`inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              mobilePane === 'customize'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-[#111927] text-slate-300 border border-slate-800 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>লেআউট কাস্টমাইজ</span>
          </button>
        </div>

        {/* Main Split Workspace */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden relative z-10">
          {/* LEFT: Layout Customizer Controls */}
          <aside
            aria-label="ইনভয়েস লেআউট কাস্টমাইজেশন"
            className={`${
              mobilePane === 'customize' ? 'flex-1 lg:flex-none' : 'hidden lg:block'
            } w-full lg:w-[340px] shrink-0 bg-[#111927] border-b lg:border-b-0 lg:border-r border-slate-800 p-4 space-y-4 overflow-y-auto`}
          >
            {/* 1. Paper Preset Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-white">
                  ১. কাগজের সাইজ ও প্রিন্টার মোড
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {paperMeta.dimensionsLabel}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(PAPER_PRESETS) as InvoicePaperSize[]).map(presetKey => {
                  const preset = PAPER_PRESETS[presetKey];
                  const active = config.paperSize === presetKey;
                  return (
                    <button
                      key={presetKey}
                      type="button"
                      data-testid={`paper-preset-${presetKey}`}
                      onClick={() => handlePaperPresetSelect(presetKey)}
                      className={`px-3 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                        active
                          ? 'bg-orange-600/20 border-orange-500 text-white'
                          : 'bg-[#0B0F17] border-slate-800 text-slate-300 hover:border-slate-600 hover:text-white'
                      }`}
                    >
                      <span className="block text-xs font-bold whitespace-nowrap">{preset.label}</span>
                      <span className="block text-[10px] text-slate-400 font-mono">
                        {preset.dimensionsLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Font Scale, Density, Alignment, Copies */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <span className="text-xs font-extrabold text-white block">
                ২. লেখার আকার, বিন্যাস ও কপি
              </span>

              {/* Font Scale */}
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 block">লেখার আকার (Font Size)</span>
                <div className="grid grid-cols-3 gap-1.5 bg-[#0B0F17] p-1 rounded-xl border border-slate-800">
                  {(
                    [
                      { id: 'compact', label: 'ছোট' },
                      { id: 'normal', label: 'মাঝারি' },
                      { id: 'large', label: 'বড়' },
                    ] as { id: InvoiceFontScale; label: string }[]
                  ).map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      data-testid={`font-scale-${opt.id}`}
                      onClick={() => updateConfig('fontScale', opt.id)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        config.fontScale === opt.id
                          ? 'bg-orange-600 text-white'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Spacing & Alignment */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 block">প্যাডিং ঘনত্ব</span>
                  <div className="grid grid-cols-2 gap-1 bg-[#0B0F17] p-1 rounded-xl border border-slate-800">
                    {(
                      [
                        { id: 'cozy', label: 'স্বাভাবিক' },
                        { id: 'compact', label: 'কম্প্যাক্ট' },
                      ] as { id: InvoiceDensity; label: string }[]
                    ).map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateConfig('density', opt.id)}
                        className={`py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                          config.density === opt.id
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-slate-400 block">হেডার বিন্যাস</span>
                  <div className="grid grid-cols-2 gap-1 bg-[#0B0F17] p-1 rounded-xl border border-slate-800">
                    {(
                      [
                        { id: 'center', label: 'মাঝখানে' },
                        { id: 'left', label: 'বাম পাশে' },
                      ] as { id: InvoiceHeaderAlign; label: string }[]
                    ).map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateConfig('headerAlign', opt.id)}
                        className={`py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                          config.headerAlign === opt.id
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Copy Count */}
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 block">প্রিন্ট কপি সংখ্যা</span>
                <div className="grid grid-cols-2 gap-1.5 bg-[#0B0F17] p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    data-testid="print-copies-1"
                    onClick={() => updateConfig('copies', 1)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      config.copies === 1
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    ১ কপি (সাধারণ)
                  </button>
                  <button
                    type="button"
                    data-testid="print-copies-2"
                    onClick={() => updateConfig('copies', 2)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      config.copies === 2
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    ২ কপি (কাস্টমার + কাউন্টার)
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Visibility Toggles */}
            <div className="space-y-2 pt-3 border-t border-slate-800">
              <span className="text-xs font-extrabold text-white block">
                ৩. রসিদের দৃশ্যমান অংশ নির্ধারণ
              </span>

              <div className="grid grid-cols-1 gap-1.5">
                {(
                  [
                    { key: 'showLogo', label: 'রেস্তোরাঁর লোগো / মনোগ্রাম দেখান' },
                    { key: 'showAddressAndPhone', label: 'ঠিকানা ও মোবাইল নম্বর দেখান' },
                    { key: 'showCustomerInfo', label: 'ক্রেতার নাম ও তারিখ-সময় দেখান' },
                    { key: 'showPaymentBadge', label: 'পরিশোধ মাধ্যম ও স্ট্যাটাস দেখান' },
                    { key: 'showSerialNumbers', label: 'ক্রমিক নম্বর (ক্রম) কলাম দেখান' },
                    { key: 'showUnitPrice', label: 'একক দর (দর) কলাম দেখান' },
                    { key: 'showSummaryBox', label: 'মোট আইটেম ও পরিমাণ সারাংশ দেখান' },
                    { key: 'showSignatures', label: 'স্বাক্ষরের ঘর (ক্রেতা / ক্যাশিয়ার / কর্তৃপক্ষ)' },
                    { key: 'showCopyBadge', label: 'কপি ট্যাগ (কাস্টমার / কাউন্টার কপি) দেখান' },
                  ] as { key: keyof InvoicePrintLayoutConfig; label: string }[]
                ).map(item => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#0B0F17] border border-slate-800 hover:border-slate-700 text-xs text-slate-200 cursor-pointer select-none min-h-[38px]"
                  >
                    <span>{item.label}</span>
                    <input
                      type="checkbox"
                      data-testid={`toggle-${item.key}`}
                      checked={Boolean(config[item.key])}
                      onChange={e =>
                        updateConfig(
                          item.key,
                          e.target.checked as InvoicePrintLayoutConfig[typeof item.key]
                        )
                      }
                      className="w-4 h-4 accent-orange-500 rounded cursor-pointer shrink-0"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* 4. Custom Header & Footer Text */}
            <div className="space-y-2.5 pt-3 border-t border-slate-800">
              <span className="text-xs font-extrabold text-white block">
                ৪. কাস্টম শিরোনাম ও ফুটনোট
              </span>

              <div>
                <label
                  htmlFor="invoice-header-label-input"
                  className="block text-[11px] text-slate-400 mb-1"
                >
                  রসিদের উপরের শিরোনাম
                </label>
                <input
                  id="invoice-header-label-input"
                  type="text"
                  value={config.headerLabel}
                  onChange={e => updateConfig('headerLabel', e.target.value)}
                  maxLength={80}
                  placeholder="ক্যাশ মেমো / অফিসিয়াল বিক্রয় রসিদ"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="invoice-footer-note-input"
                  className="block text-[11px] text-slate-400 mb-1"
                >
                  নিচের ধন্যবাদ বার্তা / নোট
                </label>
                <input
                  id="invoice-footer-note-input"
                  type="text"
                  value={config.footerNote}
                  onChange={e => updateConfig('footerNote', e.target.value)}
                  maxLength={140}
                  placeholder="ধন্যবাদ! আবার আসবেন।"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Reset & Auto-Save Footer */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
              <span className="text-[11px] text-emerald-400 font-medium">
                {resetNotice ? 'ডিফল্ট লেআউট ফিরে এসেছে' : 'লেআউট স্বয়ংক্রিয়ভাবে সংরক্ষিত'}
              </span>
              <button
                type="button"
                onClick={handleResetLayout}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-700 bg-[#151E2E] hover:bg-[#1E293B] text-slate-300 hover:text-white text-[11px] font-bold cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>রিসেট</span>
              </button>
            </div>
          </aside>

          {/* RIGHT: Interactive Live White Paper Preview Stage */}
          <div
            className={`${
              mobilePane === 'preview' ? 'flex' : 'hidden lg:flex'
            } flex-1 bg-[#070A10] flex-col min-w-0 overflow-hidden`}
          >
            {/* Stage Info & Zoom Bar */}
            <div className="px-4 py-2.5 bg-[#0B0F17] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span className="font-bold text-white">লাইভ প্রিভিউ</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span>{paperMeta.label}</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="font-mono tabular-nums">{paperMeta.dimensionsLabel}</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span>{formatBengaliNumber(config.copies)} কপি</span>
              </div>

              <div className="flex items-center gap-1 bg-[#111927] border border-slate-800 rounded-lg p-0.5">
                <ZoomOut className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-0.5" />
                {ZOOM_LEVELS.map(z => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => setZoom(z)}
                    className={`px-2 py-1 rounded text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                      zoom === z ? 'bg-orange-600 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {Math.round(z * 100)}%
                  </button>
                ))}
                <ZoomIn className="w-3.5 h-3.5 text-slate-400 mr-1.5 ml-0.5" />
              </div>
            </div>

            {/* Scrollable Paper Sheet Area */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 flex justify-center items-start">
              <div
                id="invoice-print-preview-printable"
                className="flex flex-col items-center gap-6 w-full origin-top transition-transform"
                style={{
                  transform: zoom !== 1 ? `scale(${zoom})` : undefined,
                  marginBottom: zoom > 1 ? `${(zoom - 1) * 140}px` : undefined,
                }}
              >
                {copyList.map((copyLabel, copyIdx) => (
                  <div
                    key={copyLabel}
                    data-testid={`print-preview-paper-${copyIdx}`}
                    className={`invoice-print-copy-break bg-white text-black border-2 border-black rounded-sm shadow-2xl w-full transition-all ${sheetPaddingClass} ${bodyTextClass}`}
                    style={{
                      maxWidth: `${paperMeta.previewMaxWidthPx}px`,
                      fontFamily: "'Hind Siliguri', 'Inter', -apple-system, sans-serif",
                      color: '#000000',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    {/* Header Masthead */}
                    <div
                      className={`pb-3 border-b-2 border-black ${
                        config.headerAlign === 'left' ? 'text-left' : 'text-center'
                      }`}
                    >
                      <div
                        className={`flex flex-wrap items-center gap-1.5 mb-1.5 ${
                          config.headerAlign === 'left' ? 'justify-between' : 'justify-center'
                        }`}
                      >
                        <span className="inline-block px-2.5 py-0.5 border border-black bg-white text-black text-[10px] font-black uppercase tracking-wider">
                          {config.headerLabel.trim() || 'ক্যাশ মেমো'}
                        </span>
                        {(config.showCopyBadge || config.copies === 2) && (
                          <span
                            data-testid={`copy-badge-${copyIdx}`}
                            className="inline-block px-2 py-0.5 border border-black bg-black text-white text-[10px] font-black"
                          >
                            {copyLabel}
                          </span>
                        )}
                      </div>

                      <div
                        className={`flex items-center gap-2.5 ${
                          config.headerAlign === 'left' ? 'justify-start' : 'justify-center'
                        }`}
                      >
                        {config.showLogo && (
                          <div
                            data-testid={`preview-logo-${copyIdx}`}
                            className="w-9 h-9 rounded border border-black bg-white text-black flex items-center justify-center shrink-0 overflow-hidden"
                          >
                            {settings.logoUrl ? (
                              <img
                                src={settings.logoUrl}
                                alt={restaurant.name}
                                className="w-full h-full object-contain"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <UtensilsCrossed className="w-4 h-4 text-black" />
                            )}
                          </div>
                        )}
                        <div>
                          <h2 className={`${titleTextClass} font-black tracking-tight text-black leading-tight`}>
                            {restaurant.name}
                          </h2>
                        </div>
                      </div>

                      {config.showAddressAndPhone && (
                        <div data-testid={`preview-contact-${copyIdx}`} className="mt-1 space-y-0.5">
                          <p className="font-bold text-black">{restaurant.address}</p>
                          <p className="font-bold text-black">
                            মোবাইল:{' '}
                            <span className="font-mono font-black tabular-nums">
                              {formatBengaliNumber(restaurant.mobile)}
                            </span>
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Invoice Metadata Grid */}
                    <div className="mt-3 border border-black bg-white text-black">
                      <div
                        className={`grid ${
                          isNarrow58 ? 'grid-cols-1 divide-y divide-black' : 'grid-cols-2'
                        } ${config.showCustomerInfo || config.showPaymentBadge ? 'border-b border-black' : ''}`}
                      >
                        <div className={`${cellPadClass} ${isNarrow58 ? '' : 'border-r border-black'}`}>
                          <span className="text-[10px] font-bold uppercase block">ইনভয়েস নম্বর</span>
                          <span className="font-mono font-black tabular-nums text-black">
                            {bill.invoiceNumber}
                          </span>
                        </div>
                        <div className={`${cellPadClass} ${isNarrow58 ? 'text-left' : 'text-right'}`}>
                          <span className="text-[10px] font-bold uppercase block">তারিখ ও সময়</span>
                          <span className="font-bold text-black tabular-nums">
                            {formatBengaliDate(bill.createdAt || bill.dateStr)}
                          </span>
                        </div>
                      </div>

                      {(config.showCustomerInfo || config.showPaymentBadge) && (
                        <div
                          className={`grid ${
                            isNarrow58 ? 'grid-cols-1 divide-y divide-black' : 'grid-cols-2'
                          } items-center`}
                        >
                          {config.showCustomerInfo && (
                            <div
                              data-testid={`preview-customer-${copyIdx}`}
                              className={`${cellPadClass} ${
                                !isNarrow58 && config.showPaymentBadge ? 'border-r border-black' : ''
                              }`}
                            >
                              <span className="text-[10px] font-bold block">ক্রেতার নাম</span>
                              <span className="font-black text-black">{bill.customerName}</span>
                            </div>
                          )}

                          {config.showPaymentBadge && (
                            <div
                              data-testid={`preview-payment-${copyIdx}`}
                              className={`${cellPadClass} flex flex-col ${
                                isNarrow58 || !config.showCustomerInfo ? 'items-start' : 'items-end'
                              }`}
                            >
                              <span className="text-[10px] font-bold block">পরিশোধ মাধ্যম</span>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="px-1.5 py-0.5 border border-black font-black text-[10px]">
                                  {bill.paymentMethod}
                                </span>
                                <span className="px-1.5 py-0.5 border-2 border-black font-black text-[10px]">
                                  পরিশোধিত
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Items Table */}
                    <div className="mt-3">
                      <table className="w-full border-collapse border border-black bg-white text-black">
                        <thead>
                          <tr className="border-b-2 border-black font-black">
                            {config.showSerialNumbers && (
                              <th
                                data-testid={`preview-col-serial-${copyIdx}`}
                                className={`text-center border-r border-black w-9 ${cellPadClass}`}
                              >
                                ক্রম
                              </th>
                            )}
                            <th className={`text-left border-r border-black ${cellPadClass}`}>
                              খাবারের বিবরণ
                            </th>
                            <th className={`text-center border-r border-black ${cellPadClass}`}>
                              পরিমাণ
                            </th>
                            {config.showUnitPrice && (
                              <th
                                data-testid={`preview-col-price-${copyIdx}`}
                                className={`text-right border-r border-black ${cellPadClass}`}
                              >
                                দর
                              </th>
                            )}
                            <th className={`text-right ${cellPadClass}`}>মোট</th>
                          </tr>
                        </thead>
                        <tbody className="font-semibold">
                          {bill.items.map((item, idx) => (
                            <tr key={idx} className="border-b border-black">
                              {config.showSerialNumbers && (
                                <td
                                  className={`text-center font-mono font-bold border-r border-black tabular-nums ${cellPadClass}`}
                                >
                                  {formatBengaliNumber(idx + 1)}
                                </td>
                              )}
                              <td className={`text-left font-bold border-r border-black ${cellPadClass}`}>
                                {item.name}
                              </td>
                              <td
                                className={`text-center font-mono font-bold border-r border-black tabular-nums ${cellPadClass}`}
                              >
                                {formatBengaliNumber(item.quantity)}
                              </td>
                              {config.showUnitPrice && (
                                <td
                                  className={`text-right font-mono border-r border-black tabular-nums ${cellPadClass}`}
                                >
                                  {formatTaka(item.price)}
                                </td>
                              )}
                              <td className={`text-right font-mono font-black tabular-nums ${cellPadClass}`}>
                                {formatTaka(item.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Summary & Grand Total */}
                    <div
                      className={`mt-3 flex ${
                        isThermal ? 'flex-col' : 'flex-col sm:flex-row items-stretch sm:items-end'
                      } justify-between gap-2.5`}
                    >
                      {config.showSummaryBox && (
                        <div
                          data-testid={`preview-summary-${copyIdx}`}
                          className={`border border-black font-bold ${cellPadClass}`}
                        >
                          <p>
                            মোট আইটেম:{' '}
                            <span className="font-mono font-black tabular-nums">
                              {formatBengaliNumber(bill.items.length)} টি
                            </span>
                          </p>
                          <p>
                            মোট পরিমাণ:{' '}
                            <span className="font-mono font-black tabular-nums">
                              {formatBengaliNumber(totalItemsQuantity)} পিস/প্লেট
                            </span>
                          </p>
                        </div>
                      )}

                      <div
                        className={`border-2 border-black bg-white text-black ${cellPadClass} ${
                          isThermal ? 'w-full' : 'min-w-[220px] ml-auto'
                        }`}
                      >
                        <div className="flex justify-between items-center font-bold pb-1 border-b border-black">
                          <span>সাব-টোটাল:</span>
                          <span className="font-mono tabular-nums">{formatTaka(bill.grandTotal)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1.5">
                          <span className="font-black uppercase">সর্বমোট প্রদেয়:</span>
                          <span
                            className={`${
                              isThermal ? 'text-base' : 'text-xl'
                            } font-black font-mono tabular-nums`}
                          >
                            {formatTaka(bill.grandTotal)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Signatures (Optional) */}
                    {config.showSignatures && (
                      <div
                        data-testid={`preview-signatures-${copyIdx}`}
                        className="pt-6 mt-5 border-t border-black"
                      >
                        <div className="grid grid-cols-3 gap-3 text-center text-[11px] font-bold">
                          <div className="pt-4">
                            <div className="border-t border-black pt-1">ক্রেতার স্বাক্ষর</div>
                          </div>
                          <div className="pt-4">
                            <div className="border-t border-black pt-1">ক্যাশিয়ার</div>
                          </div>
                          <div className="pt-4">
                            <div className="border-t border-black pt-1">কর্তৃপক্ষ</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Custom Footer Note */}
                    <div className="mt-4 pt-2.5 border-t border-dashed border-black text-center text-[11px] font-bold space-y-0.5">
                      {config.footerNote.trim() && (
                        <p data-testid={`preview-footer-note-${copyIdx}`} className="font-black text-black">
                          {config.footerNote}
                        </p>
                      )}
                      <p className="text-[10px]">
                        সফটওয়্যার: {settings.siteName} · ডিজিটাল ইনভয়েস
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
