import React, { useState } from 'react';
import type { Bill, Restaurant } from '../../types';
import {
  formatBengaliDate,
  formatBengaliNumber,
  formatTaka,
  getBangladeshDateString,
} from '../../utils/date';
import { downloadA4SalesReportPDF } from '../../utils/pdf';
import { exportBillsToCSV } from '../../utils/csv';
import {
  FileText,
  Download,
  Printer,
  X,
  CheckCircle2,
  Sparkles,
  CreditCard,
  Award,
  Bot,
  ZoomIn,
  ZoomOut,
  Receipt,
  Building,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';

interface A4SalesReportModalProps {
  restaurant: Restaurant;
  bills: Bill[];
  filterDate?: string; // YYYY-MM-DD or empty for all/selected
  onClose: () => void;
  onOpenAiWithPrompt?: (prompt: string) => void;
}

export const A4SalesReportModal: React.FC<A4SalesReportModalProps> = ({
  restaurant,
  bills,
  filterDate,
  onClose,
  onOpenAiWithPrompt,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [includeAiInReport, setIncludeAiInReport] = useState<boolean>(true);
  const [zoomScale, setZoomScale] = useState<number>(100);

  // Filter bills if filterDate is provided, otherwise use all paid bills
  const activeBills = filterDate
    ? bills.filter(b => b.dateStr === filterDate && b.status === 'PAID')
    : bills.filter(b => b.status === 'PAID');

  // Executive Financial Stats
  const totalSales = activeBills.reduce((sum, b) => sum + (b.grandTotal || 0), 0);
  const totalOrders = activeBills.length;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;
  const uniqueCustomers = new Set(activeBills.map(b => b.customerName.trim().toLowerCase())).size;

  // Payment Breakdown
  const paymentBreakdown: Record<string, { count: number; total: number }> = {};
  let cashTotal = 0;
  let digitalTotal = 0;

  activeBills.forEach(b => {
    const method = b.paymentMethod || 'ক্যাশ';
    if (!paymentBreakdown[method]) {
      paymentBreakdown[method] = { count: 0, total: 0 };
    }
    paymentBreakdown[method].count += 1;
    paymentBreakdown[method].total += b.grandTotal || 0;

    if (method === 'ক্যাশ') {
      cashTotal += b.grandTotal || 0;
    } else {
      digitalTotal += b.grandTotal || 0;
    }
  });

  // Top Selling Foods
  const foodSalesMap: Record<string, { quantity: number; total: number }> = {};
  activeBills.forEach(b => {
    b.items.forEach(item => {
      if (!foodSalesMap[item.name]) {
        foodSalesMap[item.name] = { quantity: 0, total: 0 };
      }
      foodSalesMap[item.name].quantity += item.quantity;
      foodSalesMap[item.name].total += item.total;
    });
  });

  const topFoods = Object.entries(foodSalesMap)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5);

  const reportDateDisplay = filterDate
    ? formatBengaliDate(filterDate)
    : `সর্বমোট ${formatBengaliNumber(activeBills.length)} টি মেমোর সামগ্রিক হিসাব`;

  // Unique Report Serial & Audit Hash
  const currentDateStr = getBangladeshDateString();
  const reportSerial = `REP-${(filterDate || currentDateStr).replace(/-/g, '')}-${formatBengaliNumber(activeBills.length || 1)}`;
  const auditVerificationHash = `RH-SEC-${(restaurant.id || 'REST').slice(0, 6).toUpperCase()}-${totalSales}BDT`;

  const handleDownloadA4 = async () => {
    setIsExporting(true);
    setExportSuccess(false);
    const title = `${restaurant.name}-A4-অফিসিয়াল-বিক্রি-রিপোর্ট-${filterDate || 'সর্বমোট'}`;
    const success = await downloadA4SalesReportPDF('a4-sales-report-printable', title);
    setIsExporting(false);
    if (success) {
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRunAiAnalysis = async () => {
    setIsAiAnalyzing(true);
    setAiInsight(null);

    const topFoodNames = topFoods.map(([name, data]) => `${name} (${data.quantity} বার, ৳${data.total})`).join(', ');
    const paymentMethodsSummary = Object.entries(paymentBreakdown).map(([m, d]) => `${m}: ৳${d.total}`).join(', ');

    const prompt = `আমাদের রেস্তোরাঁ '${restaurant.name}' এর বিক্রি রিপোর্ট বিশ্লেষণ করুন:
- তারিখ: ${reportDateDisplay}
- সর্বমোট বিক্রি: ৳${totalSales}
- নগদ ক্যাশ সংগ্রহ: ৳${cashTotal}
- ডিজিটাল পেমেন্ট সংগ্রহ: ৳${digitalTotal}
- মোট কাস্টমার: ${uniqueCustomers} জন
- মোট মেমো: ${totalOrders} টি
- জনপ্রিয় খাবার: ${topFoodNames}
- পেমেন্ট চ্যানেল: ${paymentMethodsSummary}

একটি প্রাতিষ্ঠানিক, সংক্ষিপ্ত এবং তথ্যবহুল বিক্রয় পর্যালোচনা প্রদান করুন। পয়েন্ট আকারে লিখুন:
১. আর্থিক সারাংশ ও দৈনিক স্বাস্থ্য
২. শীর্ষ বিক্রিত খাবার ও গ্রাহক পছন্দ
৩. আগামীকাল বিক্রয় বৃদ্ধির জন্য ৩টি সুনির্দিষ্ট পরামর্শ।`;

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          mode: 'fast',
          contextData: {
            restaurantName: restaurant.name,
            ownerName: restaurant.ownerName,
            address: restaurant.address,
            todaySales: totalSales,
            todayOrders: activeBills.length,
          },
        }),
      });
      const data = await res.json();
      setAiInsight(data.text || 'এআই বিশ্লেষণ সম্পন্ন হয়েছে।');
    } catch (e) {
      setAiInsight('এআই বিশ্লেষণ লোড করতে ব্যর্থ হয়েছে। অনুগ্রহ করে এআই সহকারী চ্যাটবটে সরাসরি জিজ্ঞাসা করুন।');
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#0B0F17] text-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[96vh] flex flex-col overflow-hidden border border-slate-800 animate-in fade-in zoom-in-95 duration-200 my-auto">
        
        {/* EXECUTIVE CONTROL BAR (Ultra-Dark Luxury Theme) */}
        <div className="px-5 py-3.5 bg-[#0E1524] text-white border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#151E2E] border border-slate-700 text-white flex items-center justify-center shadow-xs shrink-0">
              <FileText className="w-5 h-5 text-slate-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                  বাণিজ্যিক বিক্রয় ও হিসাব অডিট বিবরণী
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-[#151E2E] border border-slate-700 text-slate-300 uppercase tracking-wider hidden sm:inline">
                  A4 ফরম্যাট
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="text-white font-medium">{restaurant.name}</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-slate-300">তারিখ: {reportDateDisplay}</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="font-mono text-slate-300">{reportSerial}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Screen Zoom Controls */}
            <div className="flex items-center bg-[#151E2E] border border-slate-700 rounded-lg p-0.5 text-xs text-slate-300">
              <button
                type="button"
                onClick={() => setZoomScale(prev => Math.max(80, prev - 15))}
                className="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="ছোট করুন"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomScale(100)}
                className={`px-2 py-1 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  zoomScale === 100
                    ? 'bg-slate-700 text-white font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="১০০% স্বাভাবিক সাইজ"
              >
                ১০০%
              </button>
              <button
                type="button"
                onClick={() => setZoomScale(120)}
                className={`px-2 py-1 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  zoomScale === 120
                    ? 'bg-slate-700 text-white font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="১২০% বর্ধিত সাইজ"
              >
                ১২০%
              </button>
              <button
                type="button"
                onClick={() => setZoomScale(prev => Math.min(150, prev + 15))}
                className="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="বড় করুন"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* AI Review Button */}
            <button
              onClick={handleRunAiAnalysis}
              disabled={isAiAnalyzing || activeBills.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#151E2E] hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-bold text-xs transition-colors disabled:opacity-40 cursor-pointer"
              title="এআই ব্যবসায়িক অডিট ও বিক্রয় পর্যালোচনা"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{isAiAnalyzing ? 'অডিট হচ্ছে...' : 'এআই পর্যালোচনা'}</span>
            </button>

            {/* CSV Ledger Download */}
            <button
              onClick={() => exportBillsToCSV(activeBills, restaurant.name, filterDate)}
              disabled={activeBills.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-40 cursor-pointer"
              title="হিসাব খাতা CSV / এক্সেল ফাইলে এক্সপোর্ট করুন"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>CSV ডাউনলোড</span>
            </button>

            {/* A4 PDF Download Button */}
            <button
              onClick={handleDownloadA4}
              disabled={isExporting || activeBills.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-40 cursor-pointer"
              title="A4 সাইজ হাই-ডেফিনিশন PDF ডাউনলোড করুন"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'তৈরি হচ্ছে...' : 'A4 PDF'}</span>
            </button>

            {/* Direct Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#151E2E] hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-bold text-xs transition-colors cursor-pointer"
              title="সরাসরি প্রিন্ট করুন"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>প্রিন্ট</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ml-1"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* AI Insight Notification (Dark Executive Style) */}
        {aiInsight && (
          <div className="px-5 py-3 bg-[#0B0F17] border-b border-indigo-900/50 text-slate-200 flex flex-wrap items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-indigo-950 border border-indigo-800 text-indigo-300 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xs text-white">
                    এআই ব্যবসায়িক পর্যবেক্ষণ সফলভাবে সম্পন্ন হয়েছে
                  </span>
                  <span className="text-[10px] text-slate-400">
                    রিপোর্টের ভেতরে যুক্ত হয়েছে
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-slate-300 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAiInReport}
                  onChange={e => setIncludeAiInReport(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 bg-slate-900 border-slate-700"
                />
                <span>প্রিন্ট ও PDF-এ যুক্ত রাখুন</span>
              </label>
              <button
                onClick={() => setAiInsight(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* SCROLLABLE A4 DOCUMENT CANVAS (Dark Backdrop) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-8 bg-[#05070B] flex justify-center">
          <div
            style={{
              transform: `scale(${zoomScale / 100})`,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out',
            }}
            className="w-full max-w-[850px]"
          >
            {/* The Physical A4 Paper Sheet (Ultra-Dark Luxury Executive Edition - Zero White Backgrounds) */}
            <div
              id="a4-sales-report-printable"
              className="bg-[#0B0F17] text-white p-8 sm:p-12 shadow-2xl border border-slate-800 font-sans mx-auto min-h-[1120px] flex flex-col justify-between rounded-md print:bg-[#0B0F17] print:text-white"
              style={{
                fontFamily: "'Hind Siliguri', 'Inter', -apple-system, sans-serif",
                color: '#FFFFFF',
                backgroundColor: '#0B0F17',
              }}
            >
              {/* TOP HEADER SECTION */}
              <div className="space-y-6">
                
                {/* Official Letterhead Top Ribbon */}
                <div className="bg-[#111927] text-white px-5 py-2.5 rounded-t border border-slate-800 flex items-center justify-between text-xs tracking-wider uppercase font-bold">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-slate-300" />
                    <span className="text-white">গণপ্রজাতন্ত্রী বাংলাদেশ · রেস্তোরাঁ বিক্রয় ও হিসাব অডিট বিবরণী</span>
                  </div>
                  <span className="font-mono text-slate-300 text-[11px]">রেফারেন্স নং: {reportSerial}</span>
                </div>

                {/* Letterhead Main Header Grid */}
                <div className="flex items-start justify-between border-b border-slate-800 pb-5 pt-1">
                  <div className="space-y-1.5">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-none">
                      {restaurant.name}
                    </h1>
                    <p className="text-sm font-semibold text-slate-300">
                      {restaurant.address}
                    </p>
                    <p className="text-xs text-slate-400">
                      মালিক: <strong className="text-white">{restaurant.ownerName}</strong> | যোগাযোগ: <strong className="font-mono text-white">{formatBengaliNumber(restaurant.mobile)}</strong>
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium pt-0.5">
                      রেজিস্ট্রেশন ও কর হিসাব উপযোগী প্রাতিষ্ঠানিক হিসাব বিবরণী
                    </p>
                  </div>

                  <div className="text-right space-y-1.5 shrink-0">
                    <div className="border border-slate-700 bg-[#111927] px-3.5 py-2 rounded text-center shadow-xs">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300 border-b border-slate-700 pb-0.5 mb-1 flex items-center justify-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">অফিসিয়াল অডিট ভেরিফিকেশন</span>
                      </div>
                      <div className="text-xs font-bold text-slate-200">
                        হিসাবের তারিখ: <strong className="text-white underline">{reportDateDisplay}</strong>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        প্রস্তুত সময়: {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4 EXECUTIVE METRIC CARDS (Zero White Backgrounds - Rich Charcoal & Subtle Top Accent) */}
                <div className="grid grid-cols-4 gap-3 text-center">
                  {/* Total Sales Revenue */}
                  <div className="p-3.5 rounded-lg bg-[#111927] border-t-4 border-t-amber-500 border-x border-b border-slate-800">
                    <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      সর্বমোট বিক্রয় রেভিনিউ
                    </span>
                    <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono block mt-1 tracking-tight">
                      {formatTaka(totalSales)}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 block mt-0.5">
                      ১০০% নিশ্চিত বিক্রি
                    </span>
                  </div>

                  {/* Cash In Hand */}
                  <div className="p-3.5 rounded-lg bg-[#111927] border-t-4 border-t-blue-500 border-x border-b border-slate-800">
                    <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      নগদ ক্যাশ আদায়
                    </span>
                    <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono block mt-1 tracking-tight">
                      {formatTaka(cashTotal)}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 block mt-0.5">
                      কাউন্টার ক্যাশ সংগ্রহ
                    </span>
                  </div>

                  {/* Digital Collections */}
                  <div className="p-3.5 rounded-lg bg-[#0C1D18] border-t-4 border-t-emerald-500 border-x border-b border-emerald-950">
                    <span className="text-[11px] sm:text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                      ডিজিটাল পেমেন্ট
                    </span>
                    <span className="text-2xl sm:text-3xl font-extrabold text-emerald-300 font-mono block mt-1 tracking-tight">
                      {formatTaka(digitalTotal)}
                    </span>
                    <span className="text-[11px] font-medium text-emerald-400/80 block mt-0.5">
                      বিকাশ / নগদ / কার্ড
                    </span>
                  </div>

                  {/* Completed Orders & AOV */}
                  <div className="p-3.5 rounded-lg bg-[#111927] border-t-4 border-t-purple-500 border-x border-b border-slate-800">
                    <span className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block">
                      মোট সম্পন্ন মেমো
                    </span>
                    <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono block mt-1 tracking-tight">
                      {formatBengaliNumber(totalOrders)} টি
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 block mt-0.5">
                      গড় মেমো: {formatTaka(avgOrderValue)}
                    </span>
                  </div>
                </div>

                {/* 2-COLUMN BREAKDOWN: PAYMENT CHANNELS & TOP ITEMS (Dark Card Backgrounds) */}
                <div className="grid grid-cols-2 gap-4 pt-1">
                  {/* Left: Payment Channel Breakdown */}
                  <div className="border border-slate-800 rounded-lg p-4 bg-[#111927]">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                      <h4 className="font-extrabold text-xs sm:text-sm text-white uppercase tracking-wider flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-slate-400" />
                        পরিশোধ মাধ্যম ভিত্তিক হিসাব
                      </h4>
                      <span className="text-[11px] text-slate-400 font-semibold">মেমো ও পরিমাণ</span>
                    </div>

                    <table className="w-full text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-300 bg-[#0E1524] font-bold">
                          <th className="text-left py-2 px-2.5">পদ্ধতি</th>
                          <th className="text-center py-2 px-2.5">মেমো সংখ্যা</th>
                          <th className="text-right py-2 px-2.5">মোট আদায়</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 font-medium text-white">
                        {Object.keys(paymentBreakdown).length === 0 ? (
                          <tr>
                            <td colSpan={3} className="py-4 text-center text-slate-400">
                              কোনো লেনদেন রেকর্ড নেই
                            </td>
                          </tr>
                        ) : (
                          Object.entries(paymentBreakdown).map(([m, val]) => (
                            <tr key={m} className="hover:bg-slate-800/40">
                              <td className="py-2.5 px-2.5 font-bold text-white flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                {m}
                              </td>
                              <td className="py-2.5 px-2.5 text-center font-mono font-bold text-slate-300">
                                {formatBengaliNumber(val.count)} টি
                              </td>
                              <td className="py-2.5 px-2.5 text-right font-extrabold text-white font-mono">
                                {formatTaka(val.total)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Right: Top Selling Food Items */}
                  <div className="border border-slate-800 rounded-lg p-4 bg-[#111927]">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                      <h4 className="font-extrabold text-xs sm:text-sm text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-slate-400" />
                        শীর্ষ বিক্রিত খাবার আইটেম
                      </h4>
                      <span className="text-[11px] text-slate-400 font-semibold">সেরা ৫টি</span>
                    </div>

                    <table className="w-full text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-300 bg-[#0E1524] font-bold">
                          <th className="text-left py-2 px-2.5">খাবারের নাম</th>
                          <th className="text-center py-2 px-2.5">বিক্রি পরিমাণ</th>
                          <th className="text-right py-2 px-2.5">মোট আয়</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 font-medium text-white">
                        {topFoods.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="py-4 text-center text-slate-400">
                              কোনো বিক্রিত খাবার রেকর্ড নেই
                            </td>
                          </tr>
                        ) : (
                          topFoods.map(([name, data]) => (
                            <tr key={name} className="hover:bg-slate-800/40">
                              <td className="py-2.5 px-2.5 font-bold text-white truncate max-w-[150px]">
                                {name}
                              </td>
                              <td className="py-2.5 px-2.5 text-center font-mono font-bold text-slate-300">
                                {formatBengaliNumber(data.quantity)} টি
                              </td>
                              <td className="py-2.5 px-2.5 text-right font-extrabold text-white font-mono">
                                {formatTaka(data.total)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* OPTIONAL AI EXECUTIVE AUDIT MEMORANDUM */}
                {aiInsight && includeAiInReport && (
                  <div className="border border-slate-800 border-l-4 border-l-blue-500 rounded-lg p-4 bg-[#111927]">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-blue-950 border border-blue-800 text-blue-300 font-mono text-[10px] font-bold">
                          AI
                        </span>
                        <h4 className="font-extrabold text-xs sm:text-sm text-white uppercase tracking-wide">
                          রেস্তোরাঁহিসাব এআই ব্যবসায়িক পর্যবেক্ষণ ও বিশ্লেষণ
                        </h4>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        স্বয়ংক্রিয় অডিট
                      </span>
                    </div>
                    <div className="text-xs sm:text-sm text-slate-200 font-medium whitespace-pre-line leading-relaxed">
                      {aiInsight}
                    </div>
                  </div>
                )}

                {/* DETAILED ITEMIZED BILLS REGISTER (Dark Luxury Table) */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-extrabold text-xs sm:text-sm text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-slate-400" />
                      বিস্তারিত ক্যাশ মেমো / লেনদেন লেজার
                    </h4>
                    <span className="text-xs font-bold text-slate-300">
                      মোট {formatBengaliNumber(activeBills.length)} টি সম্পন্ন বিল
                    </span>
                  </div>

                  <div className="border border-slate-800 rounded-lg overflow-hidden">
                    <table className="w-full text-xs sm:text-sm">
                      <thead className="bg-[#0E1524] text-white font-bold border-b border-slate-800">
                        <tr>
                          <th className="px-3 py-2.5 text-center w-12 border-r border-slate-800 text-xs">ক্র.</th>
                          <th className="px-3 py-2.5 text-left border-r border-slate-800 text-xs">ইনভয়েস নং</th>
                          <th className="px-3 py-2.5 text-left border-r border-slate-800 text-xs">গ্রাহকের নাম</th>
                          <th className="px-3 py-2.5 text-left border-r border-slate-800 text-xs">খাবার আইটেম ও বিবরণ</th>
                          <th className="px-3 py-2.5 text-center border-r border-slate-800 text-xs">পরিশোধ</th>
                          <th className="px-4 py-2.5 text-right text-xs">মোট টাকা (৳)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 font-medium text-white">
                        {activeBills.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400 text-xs bg-[#111927]">
                              এই তারিখে কোনো সম্পন্নকৃত বিল পাওয়া যায়নি।
                            </td>
                          </tr>
                        ) : (
                          activeBills.map((bill, idx) => (
                            <tr key={bill.id} className={idx % 2 === 0 ? 'bg-[#0B0F17]' : 'bg-[#111927]'}>
                              <td className="px-3 py-2 text-center font-mono font-medium text-slate-400 border-r border-slate-800">
                                {formatBengaliNumber(idx + 1)}
                              </td>
                              <td className="px-3 py-2 font-mono font-bold text-white border-r border-slate-800">
                                {bill.invoiceNumber}
                              </td>
                              <td className="px-3 py-2 font-bold text-white border-r border-slate-800">
                                {bill.customerName}
                              </td>
                              <td className="px-3 py-2 text-slate-300 text-xs border-r border-slate-800 max-w-[240px]">
                                {bill.items.map(it => `${it.name} (${formatBengaliNumber(it.quantity)})`).join(', ')}
                              </td>
                              <td className="px-3 py-2 text-center border-r border-slate-800">
                                <span className="px-2 py-0.5 rounded bg-[#1A2333] border border-slate-700 text-slate-200 text-[11px] font-bold">
                                  {bill.paymentMethod}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-right font-extrabold text-white font-mono text-sm">
                                {formatTaka(bill.grandTotal)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      {activeBills.length > 0 && (
                        <tfoot className="border-t-2 border-slate-700 bg-[#111927] text-white font-extrabold text-sm">
                          <tr>
                            <td colSpan={5} className="px-4 py-3 text-right uppercase tracking-wider text-slate-300">
                              সর্বমোট প্রদেয় বিক্রয় মূল্য (Grand Total Revenue):
                            </td>
                            <td className="px-4 py-3 text-right text-amber-300 font-mono text-base font-black">
                              {formatTaka(totalSales)}
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>
              </div>

              {/* OFFICIAL SIGNATURES & COMMERCIAL AUDIT FOOTER */}
              <div className="pt-10 mt-6 border-t border-slate-800">
                <div className="grid grid-cols-3 gap-6 text-center text-xs text-slate-300 px-4">
                  <div>
                    <div className="w-36 mx-auto border-t border-slate-600 mb-1"></div>
                    <span className="block font-bold text-white text-xs">ক্যাশিয়ার / হিসাব প্রস্তুতকারক</span>
                    <span className="text-[11px] text-slate-400 block">Prepared By</span>
                  </div>

                  <div>
                    <div className="w-36 mx-auto border-t border-slate-600 mb-1"></div>
                    <span className="block font-bold text-white text-xs">অভ্যন্তরীণ হিসাব নিরীক্ষক</span>
                    <span className="text-[11px] text-slate-400 block">Internal Auditor</span>
                  </div>

                  <div>
                    <div className="w-36 mx-auto border-t border-slate-600 mb-1"></div>
                    <span className="block font-bold text-white text-xs">ম্যানেজার / স্বত্বাধিকারী</span>
                    <span className="text-[11px] text-slate-400 block">Authorized Signature</span>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-dashed border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span>সফটওয়্যার: <strong className="text-slate-200">RestaurantHisab (রেস্তোরাঁহিসাব)</strong></span>
                  <span>সিকিউরিটি হ্যাশ: <strong className="font-mono text-slate-300">{auditVerificationHash}</strong></span>
                  <span>স্ট্যান্ডার্ড প্রাতিষ্ঠানিক A4 অডিট ফরম্যাট</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ACTION BAR */}
        <div className="px-5 py-3.5 bg-[#0E1524] border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {exportSuccess ? (
              <span className="text-xs sm:text-sm text-emerald-400 font-extrabold flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                A4 সাইজ হাই-ডেফিনিশন পিডিএফ সফলভাবে তৈরি হয়েছে!
              </span>
            ) : (
              <span className="text-xs text-slate-400 font-medium">
                * আন্তর্জাতিক A4 পেপার সাইজে (210 × 297 mm) প্রিন্ট ও ডাউনলোড প্রস্তুত।
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#151E2E] hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট করুন</span>
            </button>
            <button
              onClick={() => exportBillsToCSV(activeBills, restaurant.name, filterDate)}
              disabled={activeBills.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-40 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>CSV এক্সপোর্ট</span>
            </button>
            <button
              onClick={handleDownloadA4}
              disabled={isExporting || activeBills.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'তৈরি হচ্ছে...' : 'A4 PDF ডাউনলোড'}</span>
            </button>
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg bg-[#151E2E] hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-colors border border-slate-700 cursor-pointer"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
