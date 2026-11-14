import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import type { Bill } from '../../types';
import {
  formatBengaliNumber,
  formatTaka,
  getBangladeshDateString,
} from '../../utils/date';
import {
  filterPaidBillsByPeriod,
  computeHourlyAnalytics,
  computePeakHour,
  computeTopSellingFoods,
} from '../../utils/analytics';
import {
  TrendingUp,
  Clock,
  Award,
  Utensils,
  BarChart3,
  Flame,
  Receipt,
} from 'lucide-react';
import { TopAccentBar } from '../common/TopAccentBar';

interface DailySalesAnalyticsWidgetProps {
  bills: Bill[];
  todayStr?: string;
  onNavigateToNewBill?: () => void;
}

const BAR_COLORS = [
  '#f97316', // orange-500
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#3b82f6', // blue-500
  '#8b5cf6', // purple-500
  '#ec4899', // pink-500
  '#6366f1', // indigo-500
];

export const DailySalesAnalyticsWidget: React.FC<DailySalesAnalyticsWidgetProps> = ({
  bills,
  todayStr = getBangladeshDateString(),
  onNavigateToNewBill,
}) => {
  const [timeFilter, setTimeFilter] = useState<'today' | '7days' | 'all'>('today');
  const [hourMetric, setHourMetric] = useState<'orders' | 'revenue'>('orders');
  const [foodMetric, setFoodMetric] = useState<'revenue' | 'quantity'>('revenue');

  const filteredBills = useMemo(
    () => filterPaidBillsByPeriod(bills, timeFilter, todayStr),
    [bills, timeFilter, todayStr]
  );

  const hourlyData = useMemo(
    () => computeHourlyAnalytics(filteredBills),
    [filteredBills]
  );

  const peakHour = useMemo(
    () => computePeakHour(hourlyData, hourMetric),
    [hourlyData, hourMetric]
  );

  const topSellingFoods = useMemo(
    () => computeTopSellingFoods(filteredBills, foodMetric, 6),
    [filteredBills, foodMetric]
  );

  const totalSales = filteredBills.reduce((sum, b) => sum + (b.grandTotal || 0), 0);
  const totalOrders = filteredBills.length;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;
  const topFoodItem = topSellingFoods[0] || null;

  return (
    <div
      data-testid="daily-sales-analytics"
      className="relative overflow-hidden bg-[#0E1524] text-white rounded-3xl border border-slate-800 p-5 sm:p-7 shadow-2xl space-y-6 transition-colors"
    >
      <TopAccentBar variant="amber" />
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5 relative z-10">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg sm:text-xl text-white flex flex-wrap items-center gap-2">
                <span>দৈনিক বিক্রি ও অর্ডার বিশ্লেষণ</span>
                <span className="px-2.5 py-0.5 rounded-full bg-orange-950/90 border border-orange-700/70 text-orange-300 text-xs font-black">
                  লাইভ অ্যানালিটিক্স
                </span>
              </h3>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                অর্ডারের পিক আওয়ার (Peak Hours) ও সর্বাধিক বিক্রিত খাবারের ভিজ্যুয়াল চার্ট
              </p>
            </div>
          </div>
        </div>

        {/* Time Period Filter Buttons */}
        <div className="flex bg-[#0B0F17] p-1 rounded-2xl border border-slate-800 text-xs font-bold self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setTimeFilter('today')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              timeFilter === 'today'
                ? 'bg-orange-600 text-white shadow-sm font-black'
                : 'text-slate-300 hover:text-white hover:bg-[#151E2E]'
            }`}
          >
            আজকের দিন
          </button>
          <button
            type="button"
            onClick={() => setTimeFilter('7days')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              timeFilter === '7days'
                ? 'bg-orange-600 text-white shadow-sm font-black'
                : 'text-slate-300 hover:text-white hover:bg-[#151E2E]'
            }`}
          >
            গত ৭ দিন
          </button>
          <button
            type="button"
            onClick={() => setTimeFilter('all')}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              timeFilter === 'all'
                ? 'bg-orange-600 text-white shadow-sm font-black'
                : 'text-slate-300 hover:text-white hover:bg-[#151E2E]'
            }`}
          >
            সর্বমোট
          </button>
        </div>
      </div>

      {/* 4 EXECUTIVE HIGHLIGHT BOXES (ZERO WHITE BACKGROUNDS, CRISP WHITE TEXT) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 relative z-10">
        {/* Metric 1: Peak Hour */}
        <div className="relative overflow-hidden p-4 rounded-2xl bg-[#111927] border border-slate-800 shadow-lg">
          <TopAccentBar variant="amber" />
          <div className="flex items-center justify-between text-orange-300 text-xs font-extrabold uppercase tracking-wider relative z-10">
            <span>পিক আওয়ার (Peak Hour)</span>
            <Clock className="w-4 h-4 text-orange-400" />
          </div>
          <div className="mt-2.5 relative z-10">
            <span className="text-xl sm:text-2xl font-black text-white block truncate">
              {peakHour ? peakHour.label : 'তথ্য সংগৃহীত হচ্ছে'}
            </span>
            <span className="text-xs text-amber-300 font-bold block mt-1">
              {peakHour
                ? `${formatBengaliNumber(peakHour.orders)} টি মেমো (${formatTaka(peakHour.revenue)})`
                : 'পর্যাপ্ত ডাটা নেই'}
            </span>
          </div>
        </div>

        {/* Metric 2: Top Selling Food */}
        <div className="relative overflow-hidden p-4 rounded-2xl bg-[#111927] border border-slate-800 shadow-lg">
          <TopAccentBar variant="violet" />
          <div className="flex items-center justify-between text-purple-300 text-xs font-extrabold uppercase tracking-wider relative z-10">
            <span>সেরা বিক্রিত খাবার</span>
            <Award className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2.5 relative z-10">
            <span className="text-xl sm:text-2xl font-black text-white block truncate">
              {topFoodItem ? topFoodItem.name : 'কোনো খাবার নেই'}
            </span>
            <span className="text-xs text-slate-300 font-bold block mt-1">
              {topFoodItem
                ? `${formatBengaliNumber(topFoodItem.quantity)} বার বিক্রি (${formatTaka(topFoodItem.revenue)})`
                : 'বিক্রি রেকর্ড নেই'}
            </span>
          </div>
        </div>

        {/* Metric 3: Total Orders */}
        <div className="relative overflow-hidden p-4 rounded-2xl bg-[#111927] border border-slate-800 shadow-lg">
          <TopAccentBar variant="blue" />
          <div className="flex items-center justify-between text-sky-300 text-xs font-extrabold uppercase tracking-wider relative z-10">
            <span>মোট সম্পন্নকৃত মেমো</span>
            <Receipt className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-2.5 relative z-10">
            <span className="text-xl sm:text-2xl font-black text-white font-mono block">
              {formatBengaliNumber(totalOrders)}{' '}
              <span className="text-sm font-bold text-slate-300">টি</span>
            </span>
            <span className="text-xs text-slate-300 font-bold block mt-1">
              গড় বিল: <span className="text-white">{formatTaka(avgOrderValue)}</span>
            </span>
          </div>
        </div>

        {/* Metric 4: Total Revenue */}
        <div className="relative overflow-hidden p-4 rounded-2xl bg-[#111927] border border-slate-800 shadow-lg">
          <TopAccentBar variant="emerald" />
          <div className="flex items-center justify-between text-emerald-300 text-xs font-extrabold uppercase tracking-wider relative z-10">
            <span>মোট সংগৃহীত আয়</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2.5 relative z-10">
            <span className="text-xl sm:text-2xl font-black text-white font-mono block">
              {formatTaka(totalSales)}
            </span>
            <span className="text-xs text-emerald-300 font-bold block mt-1">
              {timeFilter === 'today' ? 'আজকের মোট নিশ্চিত বিক্রি' : 'নির্বাচিত সময়ের বিক্রি'}
            </span>
          </div>
        </div>
      </div>

      {/* CHARTS CONTAINER (GRID 2 COLUMNS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 relative z-10">
        {/* CHART 1: PEAK ORDERING HOURS (AREACHART) */}
        <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-[#111927] border border-slate-800 space-y-4">
          <TopAccentBar variant="cyan" />
          <div className="flex flex-wrap items-center justify-between gap-2 relative z-10">
            <div>
              <h4 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-400" />
                পিক আওয়ার ও সময়ভিত্তিক অর্ডার
              </h4>
              <p className="text-[11px] text-slate-300 font-medium">
                দিনের কোন সময়ে সবচেয়ে বেশি ভিড় ও অর্ডার আসে
              </p>
            </div>

            {/* Metric Switcher (Orders vs Revenue) */}
            <div className="flex bg-[#0B0F17] p-0.5 rounded-xl border border-slate-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setHourMetric('orders')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  hourMetric === 'orders'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="অর্ডারের সংখ্যা দেখুন"
              >
                মেমো সংখ্যা
              </button>
              <button
                type="button"
                onClick={() => setHourMetric('revenue')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  hourMetric === 'revenue'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="আয়ের পরিমাণ (৳) দেখুন"
              >
                আয় (৳)
              </button>
            </div>
          </div>

          {/* Recharts AreaChart */}
          <div className="h-64 sm:h-72 w-full bg-[#0B0F17] rounded-xl p-2 border border-slate-800/80">
            {filteredBills.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 border-2 border-dashed border-slate-700 rounded-xl bg-[#0E1524]">
                <Clock className="w-8 h-8 text-slate-400" />
                <p className="text-xs text-white font-bold">
                  এই সময়ের জন্য কোনো সম্পন্নকৃত বিল পাওয়া যায়নি।
                </p>
                {onNavigateToNewBill && (
                  <button
                    type="button"
                    onClick={onNavigateToNewBill}
                    className="text-xs font-bold text-orange-400 hover:text-orange-300 hover:underline cursor-pointer"
                  >
                    + নতুন বিল তৈরি করুন
                  </button>
                )}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={hourlyData}
                  margin={{ top: 10, right: 12, left: -12, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="hourColorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.85} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0.08} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.45} vertical={false} />
                  <XAxis
                    dataKey="displayHour"
                    tick={{ fontSize: 11, fill: '#E2E8F0', fontWeight: 600 }}
                    tickLine={false}
                    axisLine={{ stroke: '#475569' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#E2E8F0', fontWeight: 600 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-[#0B0F17] text-white p-3 rounded-xl shadow-2xl border border-slate-700 text-xs space-y-1">
                            <p className="font-extrabold text-orange-400 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {data.label} ({data.displayHour})
                            </p>
                            <p className="font-bold text-white">
                              অর্ডার সংখ্যা: <span className="font-mono font-black text-white">{formatBengaliNumber(data.orders)} টি</span>
                            </p>
                            <p className="font-bold text-white">
                              মোট বিক্রি: <span className="font-mono font-black text-amber-300">{formatTaka(data.revenue)}</span>
                            </p>
                            <p className="text-[10px] text-slate-300">
                              মোট খাবার আইটেম: {formatBengaliNumber(data.itemsCount)} টি
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey={hourMetric === 'orders' ? 'orders' : 'revenue'}
                    stroke="#fb923c"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#hourColorGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* CHART 2: TOP-SELLING MENU ITEMS (BARCHART) */}
        <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-[#111927] border border-slate-800 space-y-4">
          <TopAccentBar variant="rose" />
          <div className="flex flex-wrap items-center justify-between gap-2 relative z-10">
            <div>
              <h4 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                শীর্ষ বিক্রিত খাবার আইটেম
              </h4>
              <p className="text-[11px] text-slate-300 font-medium">
                সর্বাধিক আয় ও জনপ্রিয় মেনু আইটেমসমূহ
              </p>
            </div>

            {/* Metric Switcher (Revenue vs Quantity) */}
            <div className="flex bg-[#0B0F17] p-0.5 rounded-xl border border-slate-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setFoodMetric('revenue')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  foodMetric === 'revenue'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="অর্জিত আয় (৳) অনুসারে সাজান"
              >
                মোট আয় (৳)
              </button>
              <button
                type="button"
                onClick={() => setFoodMetric('quantity')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  foodMetric === 'quantity'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="বিক্রির সংখ্যা অনুসারে সাজান"
              >
                পরিমাণ
              </button>
            </div>
          </div>

          {/* Recharts BarChart */}
          <div className="h-64 sm:h-72 w-full bg-[#0B0F17] rounded-xl p-2 border border-slate-800/80">
            {topSellingFoods.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 border-2 border-dashed border-slate-700 rounded-xl bg-[#0E1524]">
                <Utensils className="w-8 h-8 text-slate-400" />
                <p className="text-xs text-white font-bold">
                  এই সময়ে কোনো খাবারের বিক্রয় রেকর্ড পাওয়া যায়নি।
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topSellingFoods}
                  layout="vertical"
                  margin={{ top: 10, right: 25, left: 15, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.45} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#E2E8F0', fontWeight: 600 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#FFFFFF', fontWeight: 700 }}
                    tickLine={false}
                    axisLine={false}
                    width={110}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-[#0B0F17] text-white p-3 rounded-xl shadow-2xl border border-slate-700 text-xs space-y-1">
                            <p className="font-extrabold text-orange-400 flex items-center gap-1">
                              <Utensils className="w-3.5 h-3.5" />
                              {data.name}
                            </p>
                            <p className="font-bold text-white">
                              মোট আয়: <span className="font-mono font-black text-amber-300">{formatTaka(data.revenue)}</span>
                            </p>
                            <p className="font-bold text-white">
                              বিক্রির পরিমাণ: <span className="font-mono font-black text-white">{formatBengaliNumber(data.quantity)} বার</span>
                            </p>
                            <p className="text-[10px] text-slate-300">
                              অর্ডার সংখ্যা: {formatBengaliNumber(data.ordersCount)} টি বিলে অন্তর্ভুক্ত
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey={foodMetric === 'revenue' ? 'revenue' : 'quantity'}
                    radius={[0, 8, 8, 0]}
                  >
                    {topSellingFoods.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={BAR_COLORS[index % BAR_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
