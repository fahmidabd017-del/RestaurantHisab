import React from 'react';
import { ArrowRight, Clock, Receipt, TrendingUp, UtensilsCrossed } from 'lucide-react';
import type { DashboardSummaryMetrics } from '../../utils/dashboardSummary';
import { formatBengaliDate, formatBengaliNumber, formatTaka } from '../../utils/date';
import { TopAccentBar } from '../common/TopAccentBar';

interface DashboardSummaryCardProps {
  summary: DashboardSummaryMetrics;
  todayStr: string;
  isLoading: boolean;
  onNavigate: (view: string) => void;
}

export const DashboardSummaryCard: React.FC<DashboardSummaryCardProps> = ({
  summary,
  todayStr,
  isLoading,
  onNavigate,
}) => {
  const avgBill =
    summary.todayPaidBillsCount > 0
      ? Math.round(summary.todayTotalSales / summary.todayPaidBillsCount)
      : 0;

  const visibleTables = summary.activeTableLabels.slice(0, 3);
  const extraTablesCount = Math.max(0, summary.activeTableLabels.length - visibleTables.length);

  return (
    <section
      aria-labelledby="dashboard-summary-heading"
      data-testid="dashboard-summary-card"
      className="relative overflow-hidden bg-[#0E1524] rounded-2xl border border-slate-800 shadow-xl"
    >
      <TopAccentBar variant="emerald" />

      {/* Card Header */}
      <div className="px-5 sm:px-6 py-4 border-b border-slate-800 bg-[#111927] flex flex-wrap items-center justify-between gap-3 relative z-10">
        <div className="min-w-0">
          <h2
            id="dashboard-summary-heading"
            className="text-sm sm:text-base font-bold text-white tracking-tight"
          >
            তাৎক্ষণিক সারাংশ · Instant Overview
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            আজকের তারিখ: {formatBengaliDate(todayStr)} · বিদ্যমান বিলিং ও অর্ডার ডাটা থেকে লাইভ হিসাব
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {summary.pendingOrdersCount > 0 && (
            <button
              type="button"
              onClick={() => onNavigate('new-bill')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/90 hover:bg-amber-500 text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>পেন্ডিং অর্ডার দেখুন</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigate('bills')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-[#151E2E] hover:bg-[#1E293B] text-slate-200 hover:text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5 text-slate-400" />
            <span>বিল হিস্ট্রি</span>
          </button>
        </div>
      </div>

      {/* 3-Column High-Level Summary Strip */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800 relative z-10">
          {[0, 1, 2].map(idx => (
            <div key={idx} className="p-5 sm:p-6 space-y-3">
              <div className="h-3.5 w-36 bg-slate-800 rounded animate-pulse" />
              <div className="h-8 w-28 bg-slate-800 rounded animate-pulse" />
              <div className="h-3 w-44 bg-slate-800/80 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-800 relative z-10">
          {/* Metric 1: Today's Total Sales */}
          <div className="p-5 sm:p-6 flex flex-col justify-between gap-3" data-testid="summary-today-sales">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="block text-xs font-bold text-slate-300">
                  আজকের মোট বিক্রি
                </span>
                <span className="block text-[11px] text-slate-400 mt-0.5">
                  Today&apos;s Total Sales
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-950/60 border border-emerald-800/70 text-emerald-400 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>

            <div className="text-3xl font-extrabold text-white font-mono tabular-nums tracking-tight">
              {formatTaka(summary.todayTotalSales)}
            </div>

            <div className="text-xs text-slate-400 flex flex-wrap items-center gap-1.5">
              <span className="font-medium text-emerald-300 tabular-nums">
                {formatBengaliNumber(summary.todayPaidBillsCount)} টি পরিশোধিত বিল
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                {avgBill > 0 ? `গড় বিল ${formatTaka(avgBill)}` : 'আজ এখনও বিক্রি শুরু হয়নি'}
              </span>
            </div>
          </div>

          {/* Metric 2: Active Tables */}
          <div className="p-5 sm:p-6 flex flex-col justify-between gap-3" data-testid="summary-active-tables">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="block text-xs font-bold text-slate-300">
                  চলমান টেবিল
                </span>
                <span className="block text-[11px] text-slate-400 mt-0.5">
                  Active Tables
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-blue-950/60 border border-blue-800/70 text-blue-400 flex items-center justify-center shrink-0">
                <UtensilsCrossed className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-white font-mono tabular-nums tracking-tight">
                {formatBengaliNumber(summary.activeTablesCount)}
              </span>
              <span className="text-sm font-medium text-slate-400">টি</span>
            </div>

            <div className="text-xs text-slate-400 truncate">
              {visibleTables.length > 0 ? (
                <span>
                  সক্রিয়: <span className="text-blue-300 font-medium">{visibleTables.join(', ')}</span>
                  {extraTablesCount > 0 && (
                    <span className="text-slate-400"> +{formatBengaliNumber(extraTablesCount)} আরও</span>
                  )}
                </span>
              ) : (
                <span>বর্তমানে কোনো টেবিল বা ড্রাফট চালু নেই</span>
              )}
            </div>
          </div>

          {/* Metric 3: Pending Orders */}
          <div className="p-5 sm:p-6 flex flex-col justify-between gap-3" data-testid="summary-pending-orders">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="block text-xs font-bold text-slate-300">
                  পেন্ডিং অর্ডার
                </span>
                <span className="block text-[11px] text-slate-400 mt-0.5">
                  Pending Orders
                </span>
              </div>
              <div
                className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                  summary.pendingOrdersCount > 0
                    ? 'bg-amber-950/70 border-amber-700/70 text-amber-400'
                    : 'bg-[#151E2E] border-slate-700 text-slate-400'
                }`}
              >
                <Clock className="w-4 h-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-white font-mono tabular-nums tracking-tight">
                {formatBengaliNumber(summary.pendingOrdersCount)}
              </span>
              <span className="text-sm font-medium text-slate-400">টি</span>
            </div>

            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-400 truncate tabular-nums">
                {summary.pendingOrdersCount > 0 ? (
                  <>
                    <span className="text-amber-300 font-semibold">
                      {formatBengaliNumber(summary.pendingItemsCount)} আইটেম
                    </span>{' '}
                    · {formatTaka(summary.pendingOrdersAmount)}
                  </>
                ) : (
                  'কোনো অমীমাংসিত অর্ডার নেই'
                )}
              </span>

              <button
                type="button"
                onClick={() => onNavigate('new-bill')}
                className="inline-flex items-center gap-1 text-orange-400 hover:text-orange-300 font-bold whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>{summary.pendingOrdersCount > 0 ? 'সম্পন্ন করুন' : 'নতুন বিল'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
