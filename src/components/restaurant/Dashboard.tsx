import React, { useEffect, useState } from 'react';
import type { Bill, BillDraft, Restaurant } from '../../types';
import { getBillDraft, getBills } from '../../services/db';
import {
  calculateTrialStatus,
  formatBengaliNumber,
  formatTaka,
  getBangladeshDateString,
  formatBengaliDate,
} from '../../utils/date';
import {
  TrendingUp,
  Receipt,
  Users,
  FilePlus,
  BookOpen,
  CreditCard,
  AlertTriangle,
  ShieldCheck,
  Clock,
  ArrowRight,
  Eye,
  FileText,
  Sparkles,
  Printer,
} from 'lucide-react';
import { ReceiptModal } from '../common/ReceiptModal';
import { A4SalesReportModal } from './A4SalesReportModal';
import { DailySalesAnalyticsWidget } from './DailySalesAnalyticsWidget';
import { DashboardSummaryCard } from './DashboardSummaryCard';
import { computeDashboardSummary } from '../../utils/dashboardSummary';
import { TopAccentBar } from '../common/TopAccentBar';

interface DashboardProps {
  restaurant: Restaurant;
  onNavigate: (view: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ restaurant, onNavigate }) => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [draft, setDraft] = useState<BillDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<Bill | null>(null);
  const [receiptViewMode, setReceiptViewMode] = useState<'receipt' | 'print-preview'>('receipt');
  const [isA4ReportOpen, setIsA4ReportOpen] = useState(false);

  const trialInfo = calculateTrialStatus(restaurant.trialEndsAt, restaurant.isLifetime);
  const todayStr = getBangladeshDateString();

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [fetchedBills, fetchedDraft] = await Promise.all([
          getBills(restaurant.id),
          getBillDraft(restaurant.id),
        ]);
        if (isMounted) {
          setBills(fetchedBills);
          setDraft(fetchedDraft);
        }
      } catch (err) {
        console.error('Error loading bills for dashboard:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [restaurant.id]);

  // Compute high-level summary metrics from existing bills & draft data
  const summary = computeDashboardSummary({ bills, draft, todayStr });

  // Filter today's confirmed bills
  const todayBills = bills.filter(b => b.dateStr === todayStr && b.status === 'PAID');

  // Stat 1: Today's Total Sales
  const todayTotalSales = summary.todayTotalSales;

  // Stat 2: Today's Total Bills
  const todayTotalBillsCount = summary.todayPaidBillsCount;

  // Stat 3: Today's Customer Count (distinct customer names)
  const distinctCustomers = new Set(
    todayBills.map(b => b.customerName.trim().toLowerCase())
  ).size;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Trial / Lifetime Notification Banner */}
      {!restaurant.isLifetime && trialInfo.showWarning && (
        <div
          className={`relative overflow-hidden p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg ${
            trialInfo.isExpired
              ? 'bg-[#190F14] border-rose-800/70 text-rose-100'
              : trialInfo.warningSeverity === '1_DAY'
              ? 'bg-[#19140E] border-amber-800/70 text-amber-100'
              : 'bg-[#17120E] border-orange-800/70 text-orange-100'
          }`}
        >
          <TopAccentBar variant={trialInfo.isExpired ? 'rose' : 'amber'} />
          <div className="flex items-center gap-3 relative z-10">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
            <div>
              <h4 className="font-bold text-sm text-white">
                {trialInfo.isExpired
                  ? 'আপনার ৩০ দিনের ফ্রি ট্রায়ালের মেয়াদ শেষ হয়েছে!'
                  : `ফ্রি ট্রায়াল সতর্কবার্তা: আর মাত্র ${formatBengaliNumber(trialInfo.daysRemaining)} দিন বাকি!`}
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                {trialInfo.isExpired
                  ? 'বিকাশ বা নগদে এককালীন পেমেন্ট করে আজীবনের লাইফটাইম অ্যাক্সেস সক্রিয় করুন।'
                  : 'নির্বিঘ্নে সফটওয়্যার ব্যবহার অব্যাহত রাখতে মেয়াদ শেষের আগেই লাইফটাইম অ্যাক্টিভেশন সম্পন্ন করুন।'}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('payment')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs shadow-sm transition-all whitespace-nowrap relative z-10 cursor-pointer"
          >
            লাইফটাইম পেমেন্ট জমা দিন
          </button>
        </div>
      )}

      {/* Welcome & Top Bar */}
      <div className="relative overflow-hidden bg-[#0E1524] rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <TopAccentBar variant="amber" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">
              স্বাগতম, {restaurant.name}
            </h1>
            {restaurant.isLifetime ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 text-xs font-bold border border-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5" />
                লাইফটাইম অ্যাক্টিভ
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-950/80 text-orange-400 text-xs font-semibold border border-orange-800">
                <Clock className="w-3.5 h-3.5" />
                ট্রায়াল: {formatBengaliNumber(trialInfo.daysRemaining)} দিন বাকি
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            মালিক: {restaurant.ownerName} | মোবাইল: {formatBengaliNumber(restaurant.mobile)} | আজকের তারিখ: {formatBengaliDate(todayStr)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => setIsA4ReportOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-orange-800/80 bg-orange-950/40 text-orange-300 font-bold text-xs sm:text-sm hover:bg-orange-900/50 transition-colors shadow-xs cursor-pointer"
            title="আজকের অফিসিয়াল A4 সাইজ বিক্রি রিপোর্ট প্রিন্ট ও ডাউনলোড করুন"
          >
            <FileText className="w-4 h-4 text-orange-400" />
            A4 বিক্রি রিপোর্ট
          </button>
          <button
            onClick={() => onNavigate('new-bill')}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm shadow-lg shadow-orange-600/30 transition-all hover:scale-105 cursor-pointer"
          >
            <FilePlus className="w-4 h-4" />
            নতুন বিল তৈরি করুন
          </button>
        </div>
      </div>

      {/* HIGH-LEVEL INSTANT OVERVIEW SUMMARY CARD */}
      <DashboardSummaryCard
        summary={summary}
        todayStr={todayStr}
        isLoading={isLoading}
        onNavigate={onNavigate}
      />

      {/* 3 SECONDARY DASHBOARD BREAKDOWN CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Stat 1: Average Bill Value */}
        <div className="bg-[#0E1524] rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden group">
          <TopAccentBar variant="amber" />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              গড় অর্ডার মূল্য (Average Bill Value)
            </span>
            <div className="w-10 h-10 rounded-xl bg-[#151E2E] text-orange-400 flex items-center justify-center border border-slate-700">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 relative z-10">
            <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono tabular-nums">
              {formatTaka(
                todayTotalBillsCount > 0 ? Math.round(todayTotalSales / todayTotalBillsCount) : 0
              )}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2 font-medium relative z-10">
            আজকের প্রতিটি বিলের গড় বিক্রয় পরিমাণ
          </p>
        </div>

        {/* Stat 2: Today's Total Bills */}
        <div className="bg-[#0E1524] rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden group">
          <TopAccentBar variant="blue" />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              আজকের মোট বিল সংখ্যা (Today's Total Bills)
            </span>
            <div className="w-10 h-10 rounded-xl bg-[#151E2E] text-blue-400 flex items-center justify-center border border-slate-700">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 relative z-10">
            <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono tabular-nums">
              {formatBengaliNumber(todayTotalBillsCount)}{' '}
              <span className="text-base font-normal text-slate-400 font-sans">টি</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2 font-medium relative z-10">
            আজকে প্রস্তুতকৃত মোট ইনভয়েসের সংখ্যা
          </p>
        </div>

        {/* Stat 3: Today's Customer Count */}
        <div className="bg-[#0E1524] rounded-2xl p-6 border border-slate-800 shadow-xl relative overflow-hidden group">
          <TopAccentBar variant="emerald" />
          <div className="flex items-center justify-between relative z-10">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              আজকের মোট ক্রেতা সংখ্যা (Customer Count)
            </span>
            <div className="w-10 h-10 rounded-xl bg-[#151E2E] text-emerald-400 flex items-center justify-center border border-slate-700">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono tabular-nums">
              {formatBengaliNumber(distinctCustomers)}{' '}
              <span className="text-base font-normal text-slate-400 font-sans">জন</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2 font-medium">
            আজকে বিল গ্রহণকারী ভিন্ন ভিন্ন ক্রেতার সংখ্যা
          </p>
        </div>
      </div>

      {/* QUICK SHORTCUTS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigate('new-bill')}
          className="relative overflow-hidden p-4 rounded-xl bg-[#0E1524] hover:bg-[#151E2E] border border-slate-800 transition-all text-left flex items-center justify-between group shadow-lg cursor-pointer"
        >
          <TopAccentBar variant="amber" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-lg bg-[#151E2E] text-orange-400 border border-slate-700 flex items-center justify-center">
              <FilePlus className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">
                নতুন বিল করুন
              </h4>
              <p className="text-xs text-slate-400">১ ক্লিকে খাবার যোগ ও ক্যাশ মেমো</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-orange-400 group-hover:translate-x-1 transition-all relative z-10" />
        </button>

        <button
          onClick={() => onNavigate('menu')}
          className="relative overflow-hidden p-4 rounded-xl bg-[#0E1524] hover:bg-[#151E2E] border border-slate-800 transition-all text-left flex items-center justify-between group shadow-lg cursor-pointer"
        >
          <TopAccentBar variant="violet" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-lg bg-[#151E2E] text-purple-400 border border-slate-700 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">
                মেনু ও খাবার তালিকা
              </h4>
              <p className="text-xs text-slate-400">খাবারের নাম ও দর পরিবর্তন</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-400 group-hover:translate-x-1 transition-all relative z-10" />
        </button>

        <button
          onClick={() => onNavigate('bills')}
          className="relative overflow-hidden p-4 rounded-xl bg-[#0E1524] hover:bg-[#151E2E] border border-slate-800 transition-all text-left flex items-center justify-between group shadow-lg cursor-pointer"
        >
          <TopAccentBar variant="cyan" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-lg bg-[#151E2E] text-cyan-400 border border-slate-700 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">
                সকল বিল হিস্ট্রি
              </h4>
              <p className="text-xs text-slate-400">তারিখ অনুযায়ী অতীত বিল ও এডিট</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all relative z-10" />
        </button>
      </div>

      {/* DAILY SALES SUMMARY WIDGET (PEAK ORDERING HOURS & TOP-SELLING MENU ITEMS VIA RECHARTS) */}
      <DailySalesAnalyticsWidget
        bills={bills}
        todayStr={todayStr}
        onNavigateToNewBill={() => onNavigate('new-bill')}
      />

      {/* TODAY'S RECENT BILLS TABLE */}
      <div className="relative overflow-hidden bg-[#0E1524] rounded-2xl border border-slate-800 shadow-xl">
        <TopAccentBar variant="indigo" />
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-[#111927] relative z-10">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Receipt className="w-4 h-4 text-orange-400" />
            আজকের সাম্প্রতিক বিলসমূহ ({formatBengaliNumber(todayBills.length)})
          </h3>
          <button
            onClick={() => onNavigate('bills')}
            className="text-xs text-orange-400 font-bold hover:underline cursor-pointer"
          >
            সব বিল দেখুন →
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-400">তথ্য লোড হচ্ছে...</div>
        ) : todayBills.length === 0 ? (
          <div className="p-8 text-center space-y-2 bg-[#0E1524]">
            <p className="text-sm text-slate-400">
              আজকে এখনও কোনো বিল তৈরি করা হয়নি।
            </p>
            <button
              onClick={() => onNavigate('new-bill')}
              className="text-xs font-bold text-orange-400 hover:underline cursor-pointer"
            >
              প্রথম বিল তৈরি করুন
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#111927] border-b border-slate-800 text-slate-300">
                <tr>
                  <th className="px-6 py-3 font-semibold">ইনভয়েস নং</th>
                  <th className="px-6 py-3 font-semibold">ক্রেতার নাম</th>
                  <th className="px-6 py-3 font-semibold">পরিশোধ পদ্ধতি</th>
                  <th className="px-6 py-3 font-semibold">খাবার আইটেম</th>
                  <th className="px-6 py-3 font-semibold text-right">মোট বিল</th>
                  <th className="px-6 py-3 font-semibold text-center">রসিদ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {todayBills.slice(0, 5).map(b => (
                  <tr key={b.id} className="bg-[#0B0F17] hover:bg-[#151E2E] transition-colors">
                    <td className="px-6 py-3.5 font-mono font-bold text-white">
                      {b.invoiceNumber}
                    </td>
                    <td className="px-6 py-3.5 font-medium text-slate-200">
                      {b.customerName}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="px-2 py-0.5 rounded bg-[#151E2E] border border-slate-700 text-slate-200 font-medium">
                        {b.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-400 truncate max-w-xs">
                      {b.items.map(i => `${i.name} (${formatBengaliNumber(i.quantity)})`).join(', ')}
                    </td>
                    <td className="px-6 py-3.5 text-right font-bold text-orange-400 text-sm">
                      {formatTaka(b.grandTotal)}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <div className="inline-flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setReceiptViewMode('print-preview');
                            setSelectedReceipt(b);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-600/90 hover:bg-orange-500 text-white font-bold text-[11px] transition-colors cursor-pointer whitespace-nowrap"
                          title="ইনভয়েস প্রিন্ট প্রিভিউ ও কাস্টমাইজ করুন"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>প্রিন্ট প্রিভিউ</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReceiptViewMode('receipt');
                            setSelectedReceipt(b);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-orange-400 hover:bg-[#151E2E] transition-colors cursor-pointer"
                          title="রসিদ দেখুন ও পিডিএফ ডাউনলোড করুন"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Receipt / Print Preview Modal */}
      {selectedReceipt && (
        <ReceiptModal
          bill={selectedReceipt}
          restaurant={restaurant}
          initialViewMode={receiptViewMode}
          onClose={() => setSelectedReceipt(null)}
          onNewBill={() => {
            setSelectedReceipt(null);
            onNavigate('new-bill');
          }}
        />
      )}

      {/* A4 Sales Report Modal */}
      {isA4ReportOpen && (
        <A4SalesReportModal
          restaurant={restaurant}
          bills={bills}
          filterDate={todayStr}
          onClose={() => setIsA4ReportOpen(false)}
        />
      )}
    </div>
  );
};
