import type { Bill, BillDraft } from '../types';
import { formatBengaliNumber, getBangladeshDateString } from './date';
import { normalizeBengaliDigits } from './voiceOrderParser';

export interface DashboardSummaryMetrics {
  todayTotalSales: number;
  todayPaidBillsCount: number;
  activeTablesCount: number;
  activeTableLabels: string[];
  pendingOrdersCount: number;
  pendingOrdersAmount: number;
  pendingItemsCount: number;
  hasActiveDraft: boolean;
}

interface ExtractedTable {
  key: string;
  label: string;
}

/**
 * Extracts and normalizes table identifiers (e.g. "টেবিল ৩", "Table 3", "T-3")
 * from customer/order labels used in billing records.
 */
export function extractNormalizedTable(rawName?: string | null): ExtractedTable | null {
  if (!rawName || !rawName.trim()) return null;
  const trimmed = rawName.trim();
  const ascii = normalizeBengaliDigits(trimmed);

  const numberedTableMatch = ascii.match(
    /(?:টেবিল|table)\s*(?:নং|নম্বর|no\.?|#|:|-)?\s*(\d+)/i
  );
  if (numberedTableMatch && numberedTableMatch[1]) {
    const num = String(parseInt(numberedTableMatch[1], 10));
    return {
      key: `table:${num}`,
      label: `টেবিল ${formatBengaliNumber(num)}`,
    };
  }

  const shortTableMatch = ascii.match(/^t\s*[-#:]?\s*(\d+)$/i);
  if (shortTableMatch && shortTableMatch[1]) {
    const num = String(parseInt(shortTableMatch[1], 10));
    return {
      key: `table:${num}`,
      label: `টেবিল ${formatBengaliNumber(num)}`,
    };
  }

  const namedSpaceMatch = trimmed.match(/^(?:টেবিল|table|কেবিন|cabin)\s+([^\d\s,]{1,20})/i);
  if (namedSpaceMatch && namedSpaceMatch[1]) {
    const suffix = namedSpaceMatch[1].trim();
    return {
      key: `named:${suffix.toLowerCase()}`,
      label: `টেবিল ${suffix}`,
    };
  }

  return null;
}

/**
 * Computes high-level summary metrics from existing billing data (bills + active draft).
 */
export function computeDashboardSummary(params: {
  bills: Bill[];
  draft?: BillDraft | null;
  todayStr?: string;
}): DashboardSummaryMetrics {
  const { bills, draft = null, todayStr = getBangladeshDateString() } = params;

  const todayPaidBills = bills.filter(
    b => b.dateStr === todayStr && b.status === 'PAID'
  );
  const todayTotalSales = todayPaidBills.reduce(
    (sum, b) => sum + (Number(b.grandTotal) || 0),
    0
  );

  // Any non-PAID bill in the list counts as a pending order
  const pendingBills = bills.filter(b => b.status !== 'PAID');
  const draftItems = Array.isArray(draft?.items) ? draft.items : [];
  const hasActiveDraft = draftItems.length > 0;

  const pendingOrdersCount = pendingBills.length + (hasActiveDraft ? 1 : 0);

  const pendingBillsAmount = pendingBills.reduce(
    (sum, b) => sum + (Number(b.grandTotal) || 0),
    0
  );
  const draftAmount = draftItems.reduce(
    (sum, it) => sum + (Number(it.total) || Number(it.price) * Number(it.quantity) || 0),
    0
  );
  const pendingOrdersAmount = pendingBillsAmount + (hasActiveDraft ? draftAmount : 0);

  const pendingBillsItems = pendingBills.reduce(
    (sum, b) =>
      sum + (Array.isArray(b.items) ? b.items.reduce((s, it) => s + (it.quantity || 0), 0) : 0),
    0
  );
  const draftItemsQty = draftItems.reduce((sum, it) => sum + (it.quantity || 0), 0);
  const pendingItemsCount = pendingBillsItems + (hasActiveDraft ? draftItemsQty : 0);

  // Active tables aggregated from:
  // 1) Active draft / pending orders (explicit table label or active counter session)
  // 2) Explicit table labels from today's settled dine-in bills
  const activeTablesMap = new Map<string, string>();

  const registerActiveOrderSession = (customerName?: string | null, fallbackKey?: string) => {
    const extracted = extractNormalizedTable(customerName);
    if (extracted) {
      if (!activeTablesMap.has(extracted.key)) {
        activeTablesMap.set(extracted.key, extracted.label);
      }
      return;
    }
    const cleanName = customerName?.trim();
    if (cleanName) {
      const key = `session:${cleanName.toLowerCase()}`;
      if (!activeTablesMap.has(key)) {
        activeTablesMap.set(key, cleanName);
      }
    } else if (fallbackKey && !activeTablesMap.has(fallbackKey)) {
      activeTablesMap.set(fallbackKey, 'চলমান অর্ডার');
    }
  };

  if (hasActiveDraft || (draft?.customerName && draft.customerName.trim().length > 0)) {
    registerActiveOrderSession(draft?.customerName, 'session:draft');
  }

  for (const pb of pendingBills) {
    registerActiveOrderSession(pb.customerName, `session:bill:${pb.id}`);
  }

  for (const tb of todayPaidBills) {
    const extracted = extractNormalizedTable(tb.customerName);
    if (extracted && !activeTablesMap.has(extracted.key)) {
      activeTablesMap.set(extracted.key, extracted.label);
    }
  }

  const activeTableLabels = Array.from(activeTablesMap.values());

  return {
    todayTotalSales,
    todayPaidBillsCount: todayPaidBills.length,
    activeTablesCount: activeTableLabels.length,
    activeTableLabels,
    pendingOrdersCount,
    pendingOrdersAmount,
    pendingItemsCount,
    hasActiveDraft,
  };
}
