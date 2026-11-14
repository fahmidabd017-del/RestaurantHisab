import React, { useEffect, useState } from 'react';
import type { Bill, BillItem, Restaurant } from '../../types';
import { getBills, updateBill, deleteBillPermanently } from '../../services/db';
import {
  formatBengaliDate,
  formatBengaliNumber,
  formatTaka,
  getBangladeshDateString,
} from '../../utils/date';
import {
  Receipt,
  Search,
  Calendar,
  Eye,
  Edit3,
  Trash2,
  Download,
  AlertTriangle,
  X,
  Plus,
  Minus,
  CheckCircle2,
  FileText,
  Sparkles,
  Printer,
  FileSpreadsheet,
} from 'lucide-react';
import { ReceiptModal } from '../common/ReceiptModal';
import { A4SalesReportModal } from './A4SalesReportModal';
import { exportBillsToCSV } from '../../utils/csv';
import { TopAccentBar } from '../common/TopAccentBar';

interface BillHistoryProps {
  restaurant: Restaurant;
  onNavigate: (view: string) => void;
}

export const BillHistory: React.FC<BillHistoryProps> = ({ restaurant, onNavigate }) => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState<string>(''); // YYYY-MM-DD
  const [isA4ReportOpen, setIsA4ReportOpen] = useState(false);
  const [csvSuccessMessage, setCsvSuccessMessage] = useState<string | null>(null);

  // Modals state
  const [viewReceipt, setViewReceipt] = useState<Bill | null>(null);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [deletingBillId, setDeletingBillId] = useState<string | null>(null);

  // Edit form state
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<Bill['paymentMethod']>('ক্যাশ');
  const [editItems, setEditItems] = useState<BillItem[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const loadAllBills = async () => {
    setIsLoading(true);
    try {
      const fetched = await getBills(restaurant.id);
      setBills(fetched);
    } catch (err) {
      console.error('Failed to load bills:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllBills();
  }, [restaurant.id]);

  // Open Edit Modal
  const handleOpenEdit = (bill: Bill) => {
    setEditingBill(bill);
    setEditCustomerName(bill.customerName);
    setEditPaymentMethod(bill.paymentMethod);
    setEditItems(JSON.parse(JSON.stringify(bill.items)));
    setEditError(null);
  };

  const handleUpdateEditQuantity = (foodId: string, newQty: number) => {
    if (newQty < 1) return;
    setEditItems(prev =>
      prev.map(it =>
        it.foodId === foodId
          ? {
              ...it,
              quantity: newQty,
              total: newQty * it.price,
            }
          : it
      )
    );
  };

  const handleRemoveEditItem = (foodId: string) => {
    if (editItems.length <= 1) {
      setEditError('কমপক্ষে একটি খাবার আইটেম বিলে থাকতে হবে।');
      return;
    }
    setEditItems(prev => prev.filter(it => it.foodId !== foodId));
  };

  const handleSaveEdit = async () => {
    if (!editingBill) return;
    if (!editCustomerName.trim()) {
      setEditError('গ্রাহকের নাম আবশ্যক।');
      return;
    }
    if (editItems.length === 0) {
      setEditError('বিলে কোনো খাবার আইটেম নেই।');
      return;
    }

    setIsUpdating(true);
    const newGrandTotal = editItems.reduce((sum, it) => sum + it.total, 0);

    try {
      // Updates bill while preserving original invoiceNumber
      await updateBill(restaurant.id, editingBill.id, {
        customerName: editCustomerName.trim(),
        paymentMethod: editPaymentMethod,
        items: editItems,
        grandTotal: newGrandTotal,
      });

      // Update in local state
      setBills(prev =>
        prev.map(b =>
          b.id === editingBill.id
            ? {
                ...b,
                customerName: editCustomerName.trim(),
                paymentMethod: editPaymentMethod,
                items: editItems,
                grandTotal: newGrandTotal,
              }
            : b
        )
      );

      setEditingBill(null);
    } catch (err) {
      setEditError('বিল আপডেট করতে ব্যর্থ হয়েছে।');
    } finally {
      setIsUpdating(false);
    }
  };

  // Permanently delete / cancel bill
  const handleConfirmDelete = async () => {
    if (!deletingBillId) return;

    try {
      await deleteBillPermanently(restaurant.id, deletingBillId);
      setBills(prev => prev.filter(b => b.id !== deletingBillId));
      setDeletingBillId(null);
    } catch (err) {
      console.error('Failed to delete bill:', err);
      setDeletingBillId(null);
    }
  };

  // Filter bills
  const filteredBills = bills.filter(bill => {
    const matchesSearch =
      bill.customerName.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      bill.invoiceNumber.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      bill.items.some(i => i.name.toLowerCase().includes(searchQuery.trim().toLowerCase()));

    const matchesDate = !filterDate || bill.dateStr === filterDate;
    return matchesSearch && matchesDate;
  });

  const handleExportCSV = () => {
    if (filteredBills.length === 0) {
      return;
    }
    const ok = exportBillsToCSV(filteredBills, restaurant.name, filterDate);
    if (ok) {
      setCsvSuccessMessage(
        `${formatBengaliNumber(filteredBills.length)}টি প্রদর্শিত বিলের হিসাব খাতা (CSV) সফলভাবে ডাউনলোড হয়েছে!`
      );
      setTimeout(() => {
        setCsvSuccessMessage(null);
      }, 5000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Receipt className="w-6 h-6 text-orange-400" />
            বিল ও ইনভয়েস হিস্ট্রি
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            পূর্বে প্রস্তুতকৃত সকল বিল খুঁজুন, হিসাবের জন্য CSV এক্সপোর্ট করুন বা A4 রিপোর্ট প্রিন্ট করুন
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* CSV Export Button for Accounting */}
          <button
            onClick={handleExportCSV}
            disabled={filteredBills.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-700/70 bg-emerald-950/60 text-emerald-300 font-extrabold text-xs hover:bg-emerald-900/60 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            title="বর্তমান ফিল্টারের প্রদর্শিত বিলসমূহ এক্সেল বা একাউন্টিং সফটওয়্যারের জন্য CSV ফরম্যাটে ডাউনলোড করুন"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>CSV এক্সপোর্ট {filteredBills.length > 0 && `(${formatBengaliNumber(filteredBills.length)})`}</span>
          </button>

          <button
            onClick={() => setIsA4ReportOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-orange-700/70 bg-orange-950/60 text-orange-300 font-bold text-xs hover:bg-orange-900/60 transition-colors shadow-xs cursor-pointer"
            title="নির্বাচিত তারিখ বা সকল বিলের অফিসিয়াল A4 সাইজ বিক্রি রিপোর্ট"
          >
            <FileText className="w-4 h-4 text-orange-400" />
            A4 বিক্রি রিপোর্ট
          </button>

          <button
            onClick={() => onNavigate('new-bill')}
            className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-all"
          >
            + নতুন বিল করুন
          </button>
        </div>
      </div>

      {/* CSV Export Success Banner */}
      {csvSuccessMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-700 text-emerald-200 text-xs font-bold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{csvSuccessMessage}</span>
          </div>
          <button
            onClick={() => setCsvSuccessMessage(null)}
            className="p-1 text-emerald-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar (Dark Luxury Theme - No White Boxes) */}
      <div className="relative overflow-hidden bg-[#0E1524] p-4 rounded-2xl border border-slate-800 shadow-lg flex flex-col md:flex-row items-center gap-3">
        <TopAccentBar variant="blue" />
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ক্রেতার নাম বা ইনভয়েস নম্বর (যেমন: 20261109-001) দিয়ে খুঁজুন..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-700 bg-[#151E2E] text-white placeholder:text-slate-400 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
            <input
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="pl-10 pr-3 py-2 rounded-xl border border-slate-700 bg-[#151E2E] text-white text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {filterDate && (
            <button
              onClick={() => setFilterDate('')}
              className="px-2.5 py-2 text-xs text-slate-300 hover:text-white border border-slate-700 bg-[#151E2E] rounded-xl cursor-pointer"
              title="ফিল্টার মুছুন"
            >
              রিসেট
            </button>
          )}

          <button
            onClick={() => setFilterDate(getBangladeshDateString())}
            className="px-3.5 py-2 rounded-xl bg-[#151E2E] border border-slate-700 text-slate-200 text-xs font-semibold whitespace-nowrap hover:bg-slate-700 cursor-pointer transition-colors"
          >
            আজকের বিল
          </button>
        </div>
      </div>

      {/* Bills Table (Dark Luxury Theme - No White Boxes) */}
      <div className="relative overflow-hidden bg-[#0E1524] rounded-2xl border border-slate-800 shadow-xl">
        <TopAccentBar variant="amber" />
        {isLoading ? (
          <div className="p-12 text-center text-sm text-slate-400">বিল লোড হচ্ছে...</div>
        ) : filteredBills.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <p className="text-sm text-slate-400">
              কোনো বিলের তথ্য পাওয়া যায়নি।
            </p>
            {filterDate && (
              <button
                onClick={() => setFilterDate('')}
                className="text-xs text-blue-400 font-bold hover:underline"
              >
                সকল তারিখের বিল দেখুন
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#111927] border-b border-slate-800 text-slate-300">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">ইনভয়েস নং</th>
                  <th className="px-6 py-3.5 font-semibold">তারিখ</th>
                  <th className="px-6 py-3.5 font-semibold">গ্রাহকের নাম</th>
                  <th className="px-6 py-3.5 font-semibold">পরিশোধ</th>
                  <th className="px-6 py-3.5 font-semibold">খাবার আইটেম</th>
                  <th className="px-6 py-3.5 font-semibold text-right">মোট বিল</th>
                  <th className="px-6 py-3.5 font-semibold text-center">ইনভয়েস প্রিন্ট ও অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredBills.map(bill => (
                  <tr key={bill.id} className="bg-[#0B0F17] hover:bg-[#151E2E]/70 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-white">
                      {bill.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {formatBengaliDate(bill.createdAt || bill.dateStr)}
                    </td>
                    <td className="px-6 py-4 font-bold text-white">
                      {bill.customerName}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded bg-[#151E2E] border border-slate-700 text-slate-200 font-medium">
                        {bill.paymentMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300 truncate max-w-xs">
                      {bill.items.map(i => `${i.name} (${formatBengaliNumber(i.quantity)})`).join(', ')}
                    </td>
                    <td className="px-6 py-4 text-right font-extrabold text-amber-300 text-sm">
                      {formatTaka(bill.grandTotal)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* Dedicated Bengali Print Button */}
                        <button
                          onClick={() => setViewReceipt(bill)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold text-xs shadow-xs transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0"
                          title="বাংলা ইনভয়েস প্রিন্ট ও PDF ডাউনলোড করুন"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>প্রিন্ট</span>
                        </button>
                        <button
                          onClick={() => setViewReceipt(bill)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-orange-400 hover:bg-orange-950/50 cursor-pointer"
                          title="ইনভয়েস প্রিভিউ ও বিস্তারিত দেখুন"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(bill)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-blue-400 hover:bg-blue-950/50 cursor-pointer"
                          title="বিল সংশোধন / এডিট করুন"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingBillId(bill.id)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-rose-400 hover:bg-rose-950/50 cursor-pointer"
                          title="বিল বাতিল / মুছে ফেলুন"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* EDIT BILL MODAL (Dark Luxury Theme - No White Boxes) */}
      {editingBill && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative overflow-hidden bg-[#0E1524] text-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-800 p-6 space-y-4">
            <TopAccentBar variant="blue" />
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 relative z-10">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-blue-400" />
                  বিল সংশোধন (ইনভয়েস নং: {editingBill.invoiceNumber})
                </h3>
                <p className="text-[11px] text-slate-400">
                  ইনভয়েস নম্বর অপরিবর্তিত থাকবে। তথ্য ও পরিমাণ সংশোধন করুন।
                </p>
              </div>
              <button
                onClick={() => setEditingBill(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
                {editError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  গ্রাহকের নাম *
                </label>
                <input
                  type="text"
                  required
                  value={editCustomerName}
                  onChange={e => setEditCustomerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#151E2E] text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  পরিশোধ পদ্ধতি *
                </label>
                <select
                  value={editPaymentMethod}
                  onChange={e => setEditPaymentMethod(e.target.value as Bill['paymentMethod'])}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#151E2E] text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {['ক্যাশ', 'বিকাশ', 'নগদ', 'রকেট', 'ব্যাংক', 'কার্ড'].map(m => (
                    <option key={m} value={m} className="bg-[#151E2E] text-white">
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-t border-slate-800 pt-3">
                <span className="text-xs font-bold text-slate-200 block mb-2">
                  খাবার পরিমাণ সংশোধন:
                </span>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {editItems.map(item => (
                    <div
                      key={item.foodId}
                      className="p-2.5 rounded-xl bg-[#111927] border border-slate-800 flex items-center justify-between text-xs text-white"
                    >
                      <div className="flex-1">
                        <span className="font-semibold text-white block">
                          {item.name}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          {formatTaka(item.price)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateEditQuantity(item.foodId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="w-6 h-6 rounded border border-slate-700 bg-[#151E2E] text-white flex items-center justify-center disabled:opacity-40"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center font-bold font-mono text-white">
                          {formatBengaliNumber(item.quantity)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateEditQuantity(item.foodId, item.quantity + 1)}
                          className="w-6 h-6 rounded border border-slate-700 bg-[#151E2E] text-white flex items-center justify-center"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-right ml-3 min-w-[60px]">
                        <span className="font-bold text-white">{formatTaka(item.total)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveEditItem(item.foodId)}
                          className="text-[10px] text-rose-400 hover:underline block"
                        >
                          মুছুন
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-bold text-white">
                <span>সংশোধিত সর্বমোট বিল:</span>
                <span className="text-amber-400 font-extrabold text-base">
                  {formatTaka(editItems.reduce((s, it) => s + it.total, 0))}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingBill(null)}
                className="w-1/2 py-2 rounded-xl border border-slate-700 bg-[#151E2E] text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isUpdating}
                className="w-1/2 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isUpdating ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL (Permanent Deletion) */}
      {deletingBillId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative overflow-hidden bg-[#0E1524] text-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-800 p-6 space-y-4 text-center">
            <TopAccentBar variant="rose" />
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-950/80 border border-rose-800 text-rose-400 flex items-center justify-center relative z-10">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                আপনি কি নিশ্চিত যে বিলটি বাতিল করবেন?
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                বাতিল করলে এই বিলটি স্থায়ীভাবে মুছে যাবে এবং দৈনিক বিক্রির হিসাব থেকে বাদ দেওয়া হবে।
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeletingBillId(null)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-700 bg-[#151E2E] text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
              >
                না, রাখুন
              </button>
              <button
                onClick={handleConfirmDelete}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                হ্যাঁ, বাতিল করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Receipt Modal */}
      {viewReceipt && (
        <ReceiptModal
          bill={viewReceipt}
          restaurant={restaurant}
          onClose={() => setViewReceipt(null)}
        />
      )}

      {/* A4 Sales Report Modal */}
      {isA4ReportOpen && (
        <A4SalesReportModal
          restaurant={restaurant}
          bills={bills}
          filterDate={filterDate}
          onClose={() => setIsA4ReportOpen(false)}
        />
      )}
    </div>
  );
};
