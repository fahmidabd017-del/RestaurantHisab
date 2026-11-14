import React, { useEffect, useState } from 'react';
import type { PaymentRequest, Restaurant } from '../../types';
import {
  submitPaymentRequest,
  getPaymentRequestsForRestaurant,
} from '../../services/db';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import { calculateTrialStatus, formatBengaliDate, formatBengaliNumber, formatTaka } from '../../utils/date';
import {
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Send,
  AlertCircle,
} from 'lucide-react';
import { TopAccentBar } from '../common/TopAccentBar';

interface PaymentAccessProps {
  restaurant: Restaurant;
  onRefreshRestaurant: () => Promise<void>;
}

export const PaymentAccess: React.FC<PaymentAccessProps> = ({
  restaurant,
  onRefreshRestaurant,
}) => {
  const { settings } = useSiteSettings();
  const trialInfo = calculateTrialStatus(restaurant.trialEndsAt, restaurant.isLifetime);

  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [method, setMethod] = useState<'bKash' | 'Nagad'>('bKash');
  const [senderNumber, setSenderNumber] = useState(restaurant.mobile || '');
  const [transactionId, setTransactionId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedNumber, setCopiedNumber] = useState(false);

  const loadData = async () => {
    try {
      const reqs = await getPaymentRequestsForRestaurant(restaurant.id);
      setRequests(reqs);
    } catch (err) {
      console.error('Failed to load payment info:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [restaurant.id]);

  const activeNumber = method === 'bKash' ? settings.bkashNumber : settings.nagadNumber;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeNumber);
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const normTxId = transactionId.trim().toUpperCase();
    if (!normTxId) {
      setErrorMsg('ট্রানজেকশন আইডি (Transaction ID) প্রদান করা বাধ্যতামূলক!');
      return;
    }

    if (!senderNumber.trim()) {
      setErrorMsg('যে নম্বর থেকে টাকা পাঠানো হয়েছে সেই মোবাইল নম্বরটি লিখুন।');
      return;
    }

    setIsSubmitting(true);

    try {
      await submitPaymentRequest({
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        ownerName: restaurant.ownerName,
        mobile: senderNumber.trim(),
        method,
        number: activeNumber,
        amount: settings.lifetimeFee,
        transactionId: normTxId,
      });

      setSuccessMsg('আপনার পেমেন্ট রিকোয়েস্ট সফলভাবে জমা হয়েছে! অ্যাডমিন যাচাই করার পর লাইফটাইম অ্যাক্সেস সক্রিয় হবে।');
      setTransactionId('');
      await loadData();
      await onRefreshRestaurant();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'পেমেন্ট আবেদন জমা দিতে সমস্যা হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-orange-400" />
          লাইফটাইম অ্যাক্সেস ও পেমেন্ট
        </h1>
        <p className="text-xs text-slate-300 mt-0.5">
          বিকাশ বা নগদ সেন্ড মানির মাধ্যমে এককালীন ফি পরিশোধ করে স্থায়ী লাইসেন্স নিন
        </p>
      </div>

      {/* Subscription Status Card */}
      <div className="relative overflow-hidden bg-[#0E1524] p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <TopAccentBar
          variant={restaurant.isLifetime ? 'emerald' : trialInfo.isExpired ? 'rose' : 'amber'}
        />
        <div className="flex items-center gap-3 relative z-10">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              restaurant.isLifetime
                ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-400'
                : trialInfo.isExpired
                ? 'bg-rose-950/70 border-rose-500/40 text-rose-400'
                : 'bg-orange-950/70 border-orange-500/40 text-orange-400'
            }`}
          >
            {restaurant.isLifetime ? (
              <ShieldCheck className="w-6 h-6" />
            ) : trialInfo.isExpired ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <Clock className="w-6 h-6" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-base text-white">
              {restaurant.isLifetime
                ? 'লাইফটাইম অ্যাক্টিভেটেড (আজীবন স্থায়ী লাইসেন্স)'
                : trialInfo.isExpired
                ? 'ফ্রি ট্রায়ালের মেয়াদ শেষ হয়েছে'
                : `ফ্রি ট্রায়াল সক্রিয়: আর ${formatBengaliNumber(trialInfo.daysRemaining)} দিন বাকি`}
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              {restaurant.isLifetime
                ? 'আপনার রেস্তোরাঁর জন্য সকল আনলিমিটেড ফিচার সক্রিয় রয়েছে।'
                : trialInfo.isExpired
                ? 'বিলিং ও মেনু পরিবর্তন লক করা আছে। নিচে পেমেন্ট তথ্য জমা দিন।'
                : `ট্রায়াল চলাকালীন সময়েই মাত্র ${formatTaka(settings.lifetimeFee)} দিয়ে লাইফটাইম অ্যাক্সেস নিয়ে নিতে পারেন।`}
            </p>
          </div>
        </div>

        {restaurant.isLifetime && (
          <span className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold shrink-0 relative z-10">
            সম্পূর্ণ পরিশোধিত
          </span>
        )}
      </div>

      {/* Payment Instructions & Submission Form */}
      {!restaurant.isLifetime && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Step 1: Payment Instructions */}
          <div className="relative overflow-hidden bg-[#0E1524] p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <TopAccentBar variant="amber" />
            <span className="inline-block px-2.5 py-1 rounded-lg bg-orange-950/60 border border-orange-500/40 text-orange-300 text-xs font-bold uppercase tracking-wider relative z-10">
              ধাপ ১: টাকা পাঠানোর নিয়ম
            </span>

            <h3 className="font-bold text-base text-white relative z-10">
              বিকাশ বা নগদ দিয়ে Send Money করুন
            </h3>

            {/* Method switch */}
            <div className="flex gap-2 relative z-10">
              <button
                type="button"
                onClick={() => setMethod('bKash')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  method === 'bKash'
                    ? 'bg-pink-600 text-white border-pink-500 shadow-sm'
                    : 'bg-[#111927] border-slate-700 text-slate-300 hover:bg-[#151E2E]'
                }`}
              >
                bKash বিকাশ
              </button>
              <button
                type="button"
                onClick={() => setMethod('Nagad')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  method === 'Nagad'
                    ? 'bg-orange-600 text-white border-orange-500 shadow-sm'
                    : 'bg-[#111927] border-slate-700 text-slate-300 hover:bg-[#151E2E]'
                }`}
              >
                Nagad নগদ
              </button>
            </div>

            {/* Payment Number Card */}
            <div className="p-4 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-2 relative z-10">
              <div className="flex justify-between items-center text-xs text-slate-300">
                <span>{method} সেন্ড মানি নম্বর:</span>
                <span className="text-orange-400 font-semibold">ব্যক্তিগত / পার্সোনাল</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-mono font-extrabold text-white tracking-wider">
                  {activeNumber}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#151E2E] border border-slate-700 text-xs font-medium text-white hover:bg-slate-700 cursor-pointer"
                >
                  {copiedNumber ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>কপি হয়েছে</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>কপি করুন</span>
                    </>
                  )}
                </button>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between text-xs font-bold">
                <span className="text-slate-300">প্রদেয় ফি:</span>
                <span className="text-amber-300 text-sm">
                  {formatTaka(settings.lifetimeFee)} (এককালীন)
                </span>
              </div>
            </div>

            <ol className="text-xs text-slate-300 space-y-1.5 list-decimal pl-4 leading-relaxed relative z-10">
              <li>আপনার {method} অ্যাপে প্রবেশ করুন।</li>
              <li><strong className="text-white">Send Money (সেন্ড মানি)</strong> অপশনে যান।</li>
              <li>উপরে উল্লেখিত নম্বরে <strong className="text-amber-300">{formatTaka(settings.lifetimeFee)}</strong> সেন্ড করুন।</li>
              <li>লেনদেন সফল হলে <strong className="text-white">Transaction ID</strong> কপি করে পাশের ফর্মে সাবমিট করুন।</li>
            </ol>
          </div>

          {/* Step 2: Submission Form */}
          <div className="relative overflow-hidden bg-[#0E1524] p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
            <TopAccentBar variant="emerald" />
            <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-bold uppercase tracking-wider relative z-10">
              ধাপ ২: ট্রানজেকশন তথ্য সাবমিট
            </span>

            <h3 className="font-bold text-base text-white relative z-10">
              পেমেন্ট ভেরিফিকেশন ফর্ম
            </h3>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2 relative z-10">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 relative z-10">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 relative z-10">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  পেমেন্ট মাধ্যম *
                </label>
                <input
                  type="text"
                  disabled
                  value={`${method} (${activeNumber})`}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#151E2E] text-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  যে নম্বর থেকে টাকা পাঠিয়েছেন *
                </label>
                <input
                  type="tel"
                  required
                  value={senderNumber}
                  onChange={e => setSenderNumber(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white placeholder:text-slate-400 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  ট্রানজেকশন আইডি (Transaction ID) *
                </label>
                <input
                  type="text"
                  required
                  value={transactionId}
                  onChange={e => setTransactionId(e.target.value)}
                  placeholder="যেমন: BL98A2K5X / 7B21C90D"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white placeholder:text-slate-400 text-xs font-mono uppercase tracking-wider focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  * ট্রানজেকশন আইডি প্রদান করা বাধ্যতামূলক এবং প্রতিটি লেনদেনের জন্য অনন্য হতে হবে।
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>জমা হচ্ছে...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    পেমেন্ট রিকোয়েস্ট জমা দিন
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Payment History / Submissions List */}
      <div className="relative overflow-hidden bg-[#0E1524] rounded-2xl border border-slate-800 shadow-xl p-6 space-y-4">
        <TopAccentBar variant="blue" />
        <h3 className="font-bold text-base text-white flex items-center gap-2 relative z-10">
          <Clock className="w-4 h-4 text-blue-400" />
          আপনার পেমেন্ট আবেদনের ইতিহাস
        </h3>

        {requests.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 relative z-10">এখনও কোনো পেমেন্ট আবেদন জমা দেননি।</p>
        ) : (
          <div className="space-y-3 relative z-10">
            {requests.map(req => (
              <div
                key={req.id}
                className="relative overflow-hidden p-4 rounded-xl border border-slate-800 bg-[#111927] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <TopAccentBar
                  variant={req.status === 'APPROVED' ? 'emerald' : req.status === 'REJECTED' ? 'rose' : 'amber'}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-white">
                      {req.transactionId}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#151E2E] border border-slate-700 text-slate-200">
                      {req.method}
                    </span>
                  </div>
                  <div className="text-slate-300 mt-1">
                    টাকার পরিমাণ: <span className="text-amber-300 font-bold">{formatTaka(req.amount)}</span> | প্রেরক নম্বর: {req.mobile} | তারিখ: {formatBengaliDate(req.createdAt)}
                  </div>
                  {req.status === 'REJECTED' && req.rejectionReason && (
                    <div className="mt-2 p-2.5 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-200">
                      <strong>বাতিলের কারণ: </strong>
                      {req.rejectionReason}
                      <p className="text-[10px] mt-0.5 text-rose-300">
                        সঠিক ট্রানজেকশন আইডি দিয়ে উপরে পুনরায় আবেদন করুন।
                      </p>
                    </div>
                  )}
                </div>

                <div className="shrink-0">
                  {req.status === 'APPROVED' ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      অনুমোদিত (Approved)
                    </span>
                  ) : req.status === 'REJECTED' ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-rose-950/70 border border-rose-500/40 text-rose-300 font-bold">
                      <XCircle className="w-3.5 h-3.5" />
                      বাতিল (Rejected)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-950/70 border border-amber-500/40 text-amber-300 font-bold">
                      <Clock className="w-3.5 h-3.5" />
                      পর্যালোচনাধীন (Pending)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

