import React, { useState } from 'react';
import type { Bill, Restaurant } from '../../types';
import { formatBengaliDate, formatBengaliNumber, formatTaka } from '../../utils/date';
import { downloadReceiptPDF } from '../../utils/pdf';
import { Download, X, CheckCircle2, Printer, PlusCircle, SlidersHorizontal } from 'lucide-react';
import { InvoicePrintPreviewModal } from './InvoicePrintPreviewModal';
import { TopAccentBar } from './TopAccentBar';

interface ReceiptModalProps {
  bill: Bill;
  restaurant: Restaurant;
  onClose: () => void;
  onNewBill?: () => void;
  initialViewMode?: 'receipt' | 'print-preview';
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  bill,
  restaurant,
  onClose,
  onNewBill,
  initialViewMode = 'receipt',
}) => {
  const [invoiceViewMode, setInvoiceViewMode] = useState<'receipt' | 'print-preview'>(
    initialViewMode
  );
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'A4' | 'COMPACT'>('A4');

  if (invoiceViewMode === 'print-preview') {
    return (
      <InvoicePrintPreviewModal
        bill={bill}
        restaurant={restaurant}
        onClose={onClose}
        onBackToReceipt={() => setInvoiceViewMode('receipt')}
      />
    );
  }

  const totalItemsQuantity = bill.items.reduce((sum, item) => sum + item.quantity, 0);

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    setDownloadSuccess(false);
    const success = await downloadReceiptPDF('digital-receipt-printable', bill.invoiceNumber, layoutMode === 'A4');
    setIsDownloading(false);
    if (success) {
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    }
  };

  return (
    <div
      data-testid="receipt-modal"
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
    >
      <div
        className={`relative overflow-hidden bg-[#0E1524] rounded-2xl shadow-2xl w-full border border-slate-800 my-auto ${
          layoutMode === 'A4' ? 'max-w-3xl' : 'max-w-md'
        }`}
      >
        <TopAccentBar variant="emerald" />
        {/* Top Modal Header Bar (Dark App Chrome) */}
        <div className="px-5 py-3.5 bg-[#111927] text-white border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#151E2E] border border-slate-700 text-white flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-sm sm:text-base">
                অফিসিয়াল ক্যাশ মেমো / ইনভয়েস
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                ইনভয়েস নং: <span className="font-mono font-bold text-white">{bill.invoiceNumber}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Format toggle: A4 vs Compact */}
            <div className="flex bg-[#0B0F17] border border-slate-700 p-0.5 rounded-lg text-xs font-bold">
              <button
                type="button"
                onClick={() => setLayoutMode('A4')}
                className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
                  layoutMode === 'A4'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                A4 সাইজ মেমো
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('COMPACT')}
                className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
                  layoutMode === 'COMPACT'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                রসিদ স্লিপ
              </button>
            </div>

            <button
              onClick={onClose}
              aria-label="মেমো বন্ধ করুন"
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#151E2E] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cash Memo Stage: Pure White Paper with Pure Black Typography */}
        <div className="p-3 sm:p-5 max-h-[78vh] overflow-y-auto bg-[#070A10] flex justify-center">
          <div
            id="digital-receipt-printable"
            data-testid="cash-memo-sheet"
            className={`bg-white text-black rounded-sm border-2 border-black shadow-2xl font-sans mx-auto transition-all w-full print:bg-white print:text-black ${
              layoutMode === 'A4'
                ? 'p-6 sm:p-8 max-w-2xl min-h-[460px] flex flex-col justify-between'
                : 'p-5 sm:p-7 max-w-sm'
            }`}
            style={{
              fontFamily: "'Hind Siliguri', 'Inter', -apple-system, sans-serif",
              color: '#000000',
              backgroundColor: '#FFFFFF',
            }}
          >
            <div>
              {/* Top Double-Ruled Restaurant Header */}
              <div className="text-center pb-3.5 border-b-2 border-black">
                <div className="inline-block px-3.5 py-1 border border-black bg-white text-black text-[11px] font-black uppercase tracking-widest mb-1.5">
                  ক্যাশ মেমো / অফিসিয়াল বিক্রয় রসিদ (CASH MEMO)
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-black">
                  {restaurant.name}
                </h2>
                <p className="text-xs sm:text-sm font-bold text-black mt-0.5">
                  {restaurant.address}
                </p>
                <p className="text-xs sm:text-sm font-bold text-black mt-0.5">
                  মোবাইল: <span className="font-mono font-black text-black">{formatBengaliNumber(restaurant.mobile)}</span>
                </p>
              </div>

              {/* Structured Invoice Meta Grid */}
              <div className="mt-3.5 border border-black bg-white text-black text-xs sm:text-sm">
                <div className="grid grid-cols-2 border-b border-black">
                  <div className="p-2.5 border-r border-black">
                    <span className="text-[11px] font-bold text-black uppercase block">ইনভয়েস নম্বর</span>
                    <span className="font-mono font-black text-sm sm:text-base text-black">
                      {bill.invoiceNumber}
                    </span>
                  </div>
                  <div className="p-2.5 text-right">
                    <span className="text-[11px] font-bold text-black uppercase block">তারিখ ও সময়</span>
                    <span className="font-bold text-xs sm:text-sm text-black">
                      {formatBengaliDate(bill.createdAt || bill.dateStr)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 items-center">
                  <div className="p-2.5 border-r border-black">
                    <span className="text-[11px] font-bold text-black block">ক্রেতার নাম</span>
                    <span className="font-black text-sm sm:text-base text-black">
                      {bill.customerName}
                    </span>
                  </div>
                  <div className="p-2.5 flex flex-col items-end justify-center">
                    <span className="text-[11px] font-bold text-black block">পরিশোধের মাধ্যম ও অবস্থা</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="px-2 py-0.5 border border-black bg-white text-black font-black text-xs">
                        {bill.paymentMethod}
                      </span>
                      <span className="px-2 py-0.5 border-2 border-black bg-white text-black font-black text-[11px] uppercase">
                        পরিশোধিত
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table (Pure White Background, Crisp Black Borders & Text) */}
              <div className="mt-3.5">
                <table className="w-full text-xs sm:text-sm border-collapse border border-black bg-white text-black">
                  <thead>
                    <tr className="border-b-2 border-black bg-white text-black font-black">
                      <th className="text-center py-2 px-2 border-r border-black w-10">ক্রম</th>
                      <th className="text-left py-2 px-3 border-r border-black">খাবারের বিবরণ</th>
                      <th className="text-center py-2 px-2.5 border-r border-black">পরিমাণ</th>
                      <th className="text-right py-2 px-2.5 border-r border-black">দর</th>
                      <th className="text-right py-2 px-3">মোট টাকা</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white text-black font-semibold">
                    {bill.items.map((item, idx) => (
                      <tr key={idx} className="border-b border-black bg-white text-black">
                        <td className="py-2 px-2 text-center font-mono font-bold text-black border-r border-black">
                          {formatBengaliNumber(idx + 1)}
                        </td>
                        <td className="py-2 px-3 text-left font-bold text-black border-r border-black">
                          {item.name}
                        </td>
                        <td className="py-2 px-2.5 text-center font-mono font-bold text-black border-r border-black">
                          {formatBengaliNumber(item.quantity)}
                        </td>
                        <td className="py-2 px-2.5 text-right font-mono font-semibold text-black border-r border-black">
                          {formatTaka(item.price)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-black text-black">
                          {formatTaka(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary & Grand Total Box */}
              <div className="mt-3.5 flex flex-col sm:flex-row justify-between items-stretch sm:items-end gap-3">
                <div className="text-xs font-bold text-black border border-black p-2.5 bg-white">
                  <p>মোট আইটেম: <span className="font-mono font-black">{formatBengaliNumber(bill.items.length)} টি</span></p>
                  <p>মোট পরিমাণ: <span className="font-mono font-black">{formatBengaliNumber(totalItemsQuantity)} পিস/প্লেট</span></p>
                </div>

                <div className="border-2 border-black bg-white text-black p-2.5 sm:p-3 min-w-[240px] flex-1 sm:flex-initial">
                  <div className="flex justify-between items-center text-xs font-bold text-black pb-1 border-b border-black">
                    <span>সাব-টোটাল (Subtotal):</span>
                    <span className="font-mono font-bold">{formatTaka(bill.grandTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1.5 text-black">
                    <span className="text-xs sm:text-sm font-black uppercase">সর্বমোট প্রদেয় বিল:</span>
                    <span className="text-xl sm:text-2xl font-black font-mono text-black">
                      {formatTaka(bill.grandTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Official Signature & Footer Section */}
            {layoutMode === 'A4' ? (
              <div className="pt-8 mt-6 border-t border-black">
                <div className="grid grid-cols-3 gap-4 text-center text-xs text-black font-bold">
                  <div className="pt-5">
                    <div className="border-t border-black pt-1.5">ক্রেতার স্বাক্ষর</div>
                  </div>
                  <div className="pt-5">
                    <div className="border-t border-black pt-1.5">ক্যাশিয়ারের স্বাক্ষর</div>
                  </div>
                  <div className="pt-5">
                    <div className="border-t border-black pt-1.5">কর্তৃপক্ষের স্বাক্ষর</div>
                  </div>
                </div>

                <div className="mt-4 pt-2.5 border-t border-dashed border-black text-center text-[11px] text-black flex flex-wrap items-center justify-between gap-2 font-bold">
                  <span>সফটওয়্যার: RestaurantHisab (রেস্তোরাঁহিসাব)</span>
                  <span className="font-black">ধন্যবাদ! আবার আসবেন।</span>
                  <span>ডিজিটাল ক্যাশ মেমো</span>
                </div>
              </div>
            ) : (
              <div className="mt-6 pt-3 border-t border-dashed border-black text-center text-xs text-black space-y-1">
                <p className="font-black text-black">ধন্যবাদ! আবার আসবেন।</p>
                <p className="text-[11px] text-black font-bold">
                  সফটওয়্যার: RestaurantHisab (রেস্তোরাঁহিসাব)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons Bar (Dark Executive Chrome) */}
        <div className="p-3.5 bg-[#111927] border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5 relative z-10">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="open-print-preview-btn"
              onClick={() => setInvoiceViewMode('print-preview')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-orange-500/20 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <SlidersHorizontal className="w-3.5 h-3.5 opacity-90" />
              <span>প্রিন্ট প্রিভিউ ও কাস্টমাইজ</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloading ? 'পিডিএফ তৈরি হচ্ছে...' : 'PDF ডাউনলোড'}</span>
            </button>

            {downloadSuccess && (
              <span className="text-xs sm:text-sm text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>ডাউনলোড সম্পন্ন!</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onNewBill && (
              <button
                onClick={onNewBill}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm transition-colors shadow-xs cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>নতুন বিল</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg bg-[#151E2E] hover:bg-[#1E293B] text-white font-bold text-xs sm:text-sm transition-colors border border-slate-700 cursor-pointer"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
