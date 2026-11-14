import React, { useEffect, useState } from 'react';
import {
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
} from 'firebase/auth';
import { auth } from '../../firebase/config';
import { getRestaurantByEmail, updateRestaurant } from '../../services/db';
import { hashString, verifyHash } from '../../utils/crypto';
import {
  isValidRecoveryEmail,
  mapFirebaseResetErrorToBengali,
  normalizeRecoveryEmail,
} from '../../utils/passwordRecovery';
import { formatBengaliNumber } from '../../utils/date';
import {
  KeyRound,
  X,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Mail,
  Send,
  RefreshCw,
  ArrowLeft,
  HelpCircle,
} from 'lucide-react';
import { TopAccentBar } from '../common/TopAccentBar';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessLogin: () => void;
  initialOobCode?: string | null;
  onClearOobCode?: () => void;
}

type RecoveryMethod = 'email' | 'security' | 'oob';

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccessLogin,
  initialOobCode,
  onClearOobCode,
}) => {
  const [method, setMethod] = useState<RecoveryMethod>('email');

  // Firebase Email Reset state
  const [email, setEmail] = useState('');
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [suggestFallback, setSuggestFallback] = useState(false);

  // Firebase Out-of-Band Reset Link (?mode=resetPassword&oobCode=...) state
  const [oobEmail, setOobEmail] = useState<string | null>(null);
  const [oobVerifying, setOobVerifying] = useState(false);

  // Security Question fallback state (Step 1 -> 2 -> 3)
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [targetRestaurantId, setTargetRestaurantId] = useState<string | null>(null);
  const [storedAnswerHash, setStoredAnswerHash] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  // Shared new password inputs
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Status feedback
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Verify incoming Firebase oobCode automatically if present
  useEffect(() => {
    if (!isOpen || !initialOobCode) return;

    let cancelled = false;
    setMethod('oob');
    setError(null);
    setSuccessMsg(null);
    setOobVerifying(true);

    verifyPasswordResetCode(auth, initialOobCode)
      .then(verifiedEmail => {
        if (!cancelled) {
          setOobEmail(verifiedEmail);
          setEmail(verifiedEmail);
        }
      })
      .catch(err => {
        if (!cancelled) {
          const code =
            typeof err === 'object' && err !== null && 'code' in err
              ? String((err as { code?: unknown }).code)
              : String(err);
          const mapped = mapFirebaseResetErrorToBengali(code);
          setError(mapped.message);
          setMethod('email');
          onClearOobCode?.();
        }
      })
      .finally(() => {
        if (!cancelled) setOobVerifying(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, initialOobCode]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const resetAllErrors = () => {
    setError(null);
    setSuccessMsg(null);
    setSuggestFallback(false);
  };

  // --- FIREBASE AUTH EMAIL RESET ---
  const sendResetLink = async () => {
    resetAllErrors();
    const normEmail = normalizeRecoveryEmail(email);

    if (!isValidRecoveryEmail(normEmail)) {
      setError('অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা লিখুন।');
      return;
    }

    setIsLoading(true);
    try {
      const rest = await getRestaurantByEmail(normEmail);
      if (!rest) {
        setError('এই ইমেইল দিয়ে কোনো রেস্তোরাঁ অ্যাকাউন্ট পাওয়া যায়নি।');
        setIsLoading(false);
        return;
      }

      auth.languageCode = 'bn';
      await sendPasswordResetEmail(auth, normEmail, {
        url: window.location.origin,
        handleCodeInApp: false,
      });

      setEmailSentTo(normEmail);
      setResendCooldown(30);
      setSuccessMsg(`পাসওয়ার্ড রিসেট লিংক ${normEmail} ঠিকানায় পাঠানো হয়েছে!`);
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : err instanceof Error
          ? err.message
          : '';
      const mapped = mapFirebaseResetErrorToBengali(code);
      setError(mapped.message);
      setSuggestFallback(mapped.suggestFallback);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendResetEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendResetLink();
  };

  // --- CONFIRM OOB RESET CODE ---
  const handleConfirmOobReset = async (e: React.FormEvent) => {
    e.preventDefault();
    resetAllErrors();

    if (!initialOobCode) return;

    if (newPassword.length < 6) {
      setError('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('উভয় পাসওয়ার্ডের মিল নেই!');
      return;
    }

    setIsLoading(true);
    try {
      await confirmPasswordReset(auth, initialOobCode, newPassword);

      // Sync new passwordHash in Firestore tenant record as well
      const targetEmail = oobEmail || normalizeRecoveryEmail(email);
      if (targetEmail) {
        const rest = await getRestaurantByEmail(targetEmail).catch(() => null);
        if (rest) {
          const newHash = await hashString(newPassword);
          await updateRestaurant(rest.id, { passwordHash: newHash });
        }
      }

      onClearOobCode?.();
      setSuccessMsg('Firebase Auth-এর মাধ্যমে পাসওয়ার্ড সফলভাবে রিসেট হয়েছে! এখন নতুন পাসওয়ার্ড দিয়ে লগইন করুন।');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        onSuccessLogin();
      }, 1800);
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : String(err);
      setError(mapFirebaseResetErrorToBengali(code).message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- SECURITY QUESTION FALLBACK ---
  const handleLookupEmailForSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    resetAllErrors();
    setIsLoading(true);

    try {
      const rest = await getRestaurantByEmail(normalizeRecoveryEmail(email));
      if (!rest) {
        setError('এই ইমেইল দিয়ে কোনো রেস্তোরাঁ অ্যাকাউন্ট পাওয়া যায়নি।');
        setIsLoading(false);
        return;
      }

      setTargetRestaurantId(rest.id);
      setSecurityQuestion(rest.securityQuestion || 'আপনার অ্যাকাউন্ট তৈরির নিরাপত্তা প্রশ্ন');
      setStoredAnswerHash(rest.securityAnswerHash);
      setStep(2);
    } catch {
      setError('তথ্য যাচাই করতে সমস্যা হয়েছে।');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    resetAllErrors();

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
    } catch {
      setError('যাচাইকরণে সমস্যা হয়েছে।');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetNewPasswordViaSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    resetAllErrors();

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
      }, 1800);
    } catch {
      setError('পাসওয়ার্ড আপডেটে সমস্যা হয়েছে।');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchMethod = (next: RecoveryMethod) => {
    resetAllErrors();
    setMethod(next);
    setEmailSentTo(null);
    setStep(1);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative overflow-hidden bg-[#0E1524] text-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-800 my-auto">
        <TopAccentBar variant="blue" />

        {/* Header */}
        <div className="px-5 py-4 bg-[#111927] border-b border-slate-800 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-950/80 border border-blue-500/40 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                পাসওয়ার্ড পুনরুদ্ধার
              </h3>
              <p className="text-[11px] text-slate-400">
                {method === 'email'
                  ? 'Firebase Auth ইমেইল রিসেট লিংক'
                  : method === 'oob'
                  ? 'নতুন পাসওয়ার্ড সেট করুন'
                  : 'নিরাপত্তা প্রশ্ন যাচাই'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="বন্ধ করুন"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#151E2E] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 relative z-10">
          {/* Method Switcher (Email Reset vs Security Question) */}
          {method !== 'oob' && (
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#0B0F17] border border-slate-800">
              <button
                type="button"
                data-testid="recovery-tab-email"
                onClick={() => handleSwitchMethod('email')}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  method === 'email'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-[#151E2E]'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>ইমেইল রিসেট</span>
              </button>
              <button
                type="button"
                data-testid="recovery-tab-security"
                onClick={() => handleSwitchMethod('security')}
                className={`py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  method === 'security'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-[#151E2E]'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>নিরাপত্তা প্রশ্ন</span>
              </button>
            </div>
          )}

          {error && (
            <div
              data-testid="forgot-error-banner"
              className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs space-y-2"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{error}</span>
              </div>
              {suggestFallback && method === 'email' && (
                <button
                  type="button"
                  onClick={() => handleSwitchMethod('security')}
                  className="w-full py-1.5 px-3 rounded-lg bg-[#151E2E] hover:bg-[#1E293B] border border-orange-500/40 text-orange-300 font-bold text-[11px] transition-colors cursor-pointer"
                >
                  নিরাপত্তা প্রশ্নের মাধ্যমে পাসওয়ার্ড রিসেট করুন →
                </button>
              )}
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* METHOD 1: FIREBASE AUTH EMAIL PASSWORD RESET */}
          {method === 'email' && !emailSentTo && (
            <form onSubmit={handleSendResetEmailSubmit} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#111927] border border-slate-800 text-xs text-slate-300 leading-relaxed">
                আপনার নিবন্ধিত ইমেইলে একটি সুরক্ষিত <strong className="text-white">Firebase Auth পাসওয়ার্ড রিসেট লিংক</strong> পাঠানো হবে। লিংকে ক্লিক করে সহজেই নতুন পাসওয়ার্ড সেট করতে পারবেন।
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  রেজিস্টার্ড ইমেইল *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    data-testid="forgot-email-input"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="restaurant@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-700 bg-[#0B0F17] text-white placeholder:text-slate-500 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                data-testid="forgot-send-email-btn"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{isLoading ? 'রিসেট লিংক পাঠানো হচ্ছে...' : 'ইমেইলে রিসেট লিংক পাঠান'}</span>
              </button>
            </form>
          )}

          {/* EMAIL SENT CONFIRMATION VIEW */}
          {method === 'email' && emailSentTo && (
            <div data-testid="forgot-email-sent-state" className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#111927] border border-emerald-500/30 text-center space-y-2.5">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                  <Mail className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-white text-sm">
                  রিসেট লিংক পাঠানো হয়েছে!
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  আমরা <span className="font-mono font-bold text-emerald-300">{emailSentTo}</span> ঠিকানায় একটি পাসওয়ার্ড রিসেট ইমেইল পাঠিয়েছি।
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-1.5 text-xs text-slate-300">
                <p className="font-bold text-white">পরবর্তী করণীয়:</p>
                <p>১. আপনার ইমেইলের ইনবক্স (Inbox) অথবা স্প্যাম (Spam) ফোল্ডার খুলুন।</p>
                <p>২. Firebase রিসেট লিংকে ক্লিক করে নতুন পাসওয়ার্ড সেট করুন।</p>
                <p>৩. নিচের বাটনে ক্লিক করে নতুন পাসওয়ার্ড দিয়ে লগইন করুন।</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  disabled={resendCooldown > 0 || isLoading}
                  onClick={sendResetLink}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-slate-700 bg-[#151E2E] hover:bg-[#1E293B] text-white font-semibold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>
                    {resendCooldown > 0
                      ? `পুনরায় পাঠান (${formatBengaliNumber(resendCooldown)} সে.)`
                      : 'পুনরায় পাঠান'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onSuccessLogin}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>লগইনে ফিরে যান</span>
                </button>
              </div>
            </div>
          )}

          {/* METHOD 2: IN-APP FIREBASE AUTH OOB CONFIRMATION */}
          {method === 'oob' && (
            <div className="space-y-4">
              {oobVerifying ? (
                <div className="py-8 text-center text-xs text-slate-300">
                  রিসেট লিংক যাচাই করা হচ্ছে...
                </div>
              ) : (
                <form onSubmit={handleConfirmOobReset} className="space-y-4">
                  {oobEmail && (
                    <div className="p-3 rounded-xl bg-[#111927] border border-blue-500/40 text-xs">
                      <span className="text-slate-400 block">অ্যাকাউন্ট ইমেইল:</span>
                      <span className="font-mono font-bold text-blue-300">{oobEmail}</span>
                    </div>
                  )}

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
                    {isLoading ? 'সংরক্ষণ হচ্ছে...' : 'নতুন পাসওয়ার্ড সংরক্ষণ করুন'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* METHOD 3: SECURITY QUESTION FALLBACK */}
          {method === 'security' && (
            <>
              {step === 1 && (
                <form onSubmit={handleLookupEmailForSecurity} className="space-y-4">
                  <p className="text-xs text-slate-300">
                    আপনার রেস্তোরাঁ অ্যাকাউন্টের নিবন্ধিত ইমেইল লিখুন এবং নিরাপত্তা প্রশ্নের উত্তর দিন:
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-[#0B0F17] text-white placeholder:text-slate-500 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm shadow-sm transition-all disabled:opacity-50 cursor-pointer"
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
                <form onSubmit={handleSetNewPasswordViaSecurity} className="space-y-4">
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};
