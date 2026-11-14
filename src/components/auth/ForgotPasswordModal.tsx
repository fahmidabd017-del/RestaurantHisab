import React, { useState } from 'react';
import { getRestaurantByEmail, updateRestaurant } from '../../services/db';
import { hashString, verifyHash } from '../../utils/crypto';
import { KeyRound, X, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { TopAccentBar } from '../common/TopAccentBar';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessLogin: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccessLogin,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [targetRestaurantId, setTargetRestaurantId] = useState<string | null>(null);
  const [storedAnswerHash, setStoredAnswerHash] = useState<string | null>(null);

  const [attempts, setAttempts] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Step 1: Lookup email
  const handleLookupEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const rest = await getRestaurantByEmail(email.trim());
      if (!rest) {
        setError('এই ইমেইল দিয়ে কোনো রেস্তোরাঁ অ্যাকাউন্ট পাওয়া যায়নি।');
        setIsLoading(false);
        return;
      }

      setTargetRestaurantId(rest.id);
      setSecurityQuestion(rest.securityQuestion || 'আপনার অ্যাকাউন্ট তৈরির নিরাপত্তা প্রশ্ন');
      setStoredAnswerHash(rest.securityAnswerHash);
      setStep(2);
    } catch (err) {
      setError('তথ্য যাচাই করতে সমস্যা হয়েছে।');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify security answer
  const handleVerifyAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (attempts >= 5) {
      setError('সর্বোচ্চ ভুল উত্তরের সীমা পার হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর চেষ্টা করুন।');
      return;
    }

    if (!storedAnswerHash) {
      setError('নিরাপত্তা তথ্যে অসঙ্গতি রয়েছে।');
      return;
    }

    setIsLoading(true);
    try {
      const isValid = await verifyHash(securityAnswer.trim().toLowerCase(), storedAnswerHash);
      if (!isValid) {
        setAttempts(prev => prev + 1);
        setError(`ভুল উত্তর! সঠিক উত্তর প্রদান করুন। (অবশিষ্ট চেষ্টা: ${5 - attempts - 1})`);
        setIsLoading(false);
        return;
      }

      setStep(3);
    } catch (err) {
      setError('যাচাইকরণে সমস্যা হয়েছে।');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Set new password
  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('উভয় পাসওয়ার্ডের মিল নেই!');
      return;
    }

    if (!targetRestaurantId) return;

    setIsLoading(true);
    try {
      const newHash = await hashString(newPassword);
      await updateRestaurant(targetRestaurantId, {
        passwordHash: newHash,
      });

      setSuccessMsg('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে! এখন লগইন করুন।');
      setTimeout(() => {
        onSuccessLogin();
      }, 2000);
    } catch (err) {
      setError('পাসওয়ার্ড আপডেটে সমস্যা হয়েছে।');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative overflow-hidden bg-[#0E1524] text-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-800 my-auto">
        <TopAccentBar variant="blue" />
        <div className="px-5 py-4 bg-[#111927] border-b border-slate-800 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-white text-base">
              পাসওয়ার্ড পুনরুদ্ধার
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="বন্ধ করুন"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#151E2E] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 relative z-10">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleLookupEmail} className="space-y-4">
              <p className="text-xs text-slate-300">
                আপনার রেস্তোরাঁ অ্যাকাউন্টের নিবন্ধিত ইমেইল ঠিকানাটি লিখুন:
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  রেজিস্টার্ড ইমেইল *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="restaurant@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-[#0B0F17] text-white placeholder:text-slate-500 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? 'যাচাই করা হচ্ছে...' : 'পরবর্তী ধাপ'}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyAnswer} className="space-y-4">
              <div className="p-3 rounded-xl bg-[#111927] border border-orange-500/40">
                <span className="text-[11px] font-semibold text-orange-400 block mb-0.5">
                  আপনার নিরাপত্তা প্রশ্ন:
                </span>
                <p className="text-sm font-bold text-white">
                  {securityQuestion}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  আপনার উত্তর *
                </label>
                <input
                  type="text"
                  required
                  value={securityAnswer}
                  onChange={e => setSecurityAnswer(e.target.value)}
                  placeholder="প্রশ্নের সঠিক উত্তর লিখুন"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-[#0B0F17] text-white placeholder:text-slate-500 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 py-2.5 rounded-xl border border-slate-700 bg-[#151E2E] text-white text-sm font-medium hover:bg-[#1E293B] cursor-pointer"
                >
                  পেছনে
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-2/3 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? 'যাচাই হচ্ছে...' : 'উত্তর নিশ্চিত করুন'}
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleSetNewPassword} className="space-y-4">
              <div className="flex items-center gap-2 text-xs text-emerald-300 font-semibold mb-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                নিরাপত্তা প্রশ্ন সফলভাবে যাচাই হয়েছে। নতুন পাসওয়ার্ড সেট করুন:
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর) *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-[#0B0F17] text-white placeholder:text-slate-500 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  নতুন পাসওয়ার্ড পুনরায় লিখুন *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-[#0B0F17] text-white placeholder:text-slate-500 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? 'আপডেট হচ্ছে...' : 'নতুন পাসওয়ার্ড সংরক্ষণ করুন'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

