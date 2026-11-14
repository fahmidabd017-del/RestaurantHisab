import type { Bill } from '../types';
import { formatBengaliNumber, getBangladeshDateString } from './date';

export interface HourlyAnalyticsSlot {
  hour: number;
  displayHour: string;
  label: string;
  orders: number;
  revenue: number;
  itemsCount: number;
}

export interface TopFoodItemMetric {
  name: string;
  quantity: number;
  revenue: number;
  ordersCount: number;
}

export function getBengaliHourLabel(hour: number): string {
  const period =
    hour >= 5 && hour < 12
      ? 'সকাল'
      : hour >= 12 && hour < 15
      ? 'দুপুর'
      : hour >= 15 && hour < 18
      ? 'বিকাল'
      : hour >= 18 && hour < 20
      ? 'সন্ধ্যা'
      : 'রাত';

  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${formatBengaliNumber(hour12)}টা (${period})`;
}

export function getBangladeshHour(isoString: string): number {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 12;
    const bdTimeStr = d.toLocaleTimeString('en-US', {
      timeZone: 'Asia/Dhaka',
      hour12: false,
      hour: 'numeric',
    });
    const parsed = parseInt(bdTimeStr, 10);
    return Number.isNaN(parsed) ? 0 : parsed % 24;
  } catch {
    return new Date(isoString).getHours();
  }
}

export function filterPaidBillsByPeriod(
  bills: Bill[],
  timeFilter: 'today' | '7days' | 'all',
  todayStr: string = getBangladeshDateString()
): Bill[] {
  const paidBills = bills.filter(b => b.status === 'PAID');
  if (timeFilter === 'today') {
    return paidBills.filter(b => b.dateStr === todayStr);
  }
  if (timeFilter === '7days') {
    const today = new Date(todayStr);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const minDateStr = sevenDaysAgo.toISOString().split('T')[0];
    return paidBills.filter(b => b.dateStr >= minDateStr);
  }
  return paidBills;
}

export function computeHourlyAnalytics(filteredBills: Bill[]): HourlyAnalyticsSlot[] {
  const hoursMap: Record<number, { orders: number; revenue: number; itemsCount: number }> = {};
  for (let h = 8; h <= 23; h++) {
    hoursMap[h] = { orders: 0, revenue: 0, itemsCount: 0 };
  }

  filteredBills.forEach(b => {
    const h = getBangladeshHour(b.createdAt || b.dateStr);
    const targetHour = Math.min(23, Math.max(8, h));
    if (!hoursMap[targetHour]) {
      hoursMap[targetHour] = { orders: 0, revenue: 0, itemsCount: 0 };
    }
    hoursMap[targetHour].orders += 1;
    hoursMap[targetHour].revenue += b.grandTotal || 0;
    hoursMap[targetHour].itemsCount += b.items.reduce((s, it) => s + it.quantity, 0);
  });

  return Object.entries(hoursMap).map(([hStr, data]) => {
    const h = parseInt(hStr, 10);
    return {
      hour: h,
      displayHour: `${formatBengaliNumber(h % 12 === 0 ? 12 : h % 12)}:00`,
      label: getBengaliHourLabel(h),
      orders: data.orders,
      revenue: data.revenue,
      itemsCount: data.itemsCount,
    };
  });
}

export function computePeakHour(
  hourlyData: HourlyAnalyticsSlot[],
  metric: 'orders' | 'revenue'
): HourlyAnalyticsSlot | null {
  if (hourlyData.length === 0) return null;
  let max = hourlyData[0];
  for (const slot of hourlyData) {
    if (metric === 'orders') {
      if (slot.orders > max.orders) max = slot;
    } else {
      if (slot.revenue > max.revenue) max = slot;
    }
  }
  return max && (max.orders > 0 || max.revenue > 0) ? max : null;
}

export function computeTopSellingFoods(
  filteredBills: Bill[],
  metric: 'revenue' | 'quantity',
  limit: number = 6
): TopFoodItemMetric[] {
  const foodMap: Record<string, TopFoodItemMetric> = {};

  filteredBills.forEach(b => {
    b.items.forEach(it => {
      const cleanName = it.name.trim();
      if (!foodMap[cleanName]) {
        foodMap[cleanName] = {
          name: cleanName,
          quantity: 0,
          revenue: 0,
          ordersCount: 0,
        };
      }
      foodMap[cleanName].quantity += it.quantity;
      foodMap[cleanName].revenue += it.total;
      foodMap[cleanName].ordersCount += 1;
    });
  });

  const list = Object.values(foodMap);
  list.sort((a, b) => (metric === 'revenue' ? b.revenue - a.revenue : b.quantity - a.quantity));
  return list.slice(0, limit);
}
