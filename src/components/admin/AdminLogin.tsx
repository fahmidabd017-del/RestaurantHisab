import React, { useState } from 'react';
import { signInWithPopup, sendPasswordResetEmail } from 'firebase/auth';
import { auth, googleProvider } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import { hashString, verifyHash } from '../../utils/crypto';
import { formatBengaliNumber } from '../../utils/date';
import {
  ShieldCheck,
  Lock,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  ArrowLeft,
  CheckCircle2,
  Mail,
  HelpCircle,
} from 'lucide-react';
import { TopAccentBar } from '../common/TopAccentBar';

interface AdminLoginProps {
  onSuccess: () => void;
  onCancel: () => void;
}

type AdminRecoveryTab = 'security' | 'google' | 'email';

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess, onCancel }) => {
  const { loginAdmin } = useAuth();
  const { settings, updateSiteSettings } = useSiteSettings();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  // Recovery panel state
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [recoveryTab, setRecoveryTab] = useState<AdminRecoveryTab>(() =>
    settings.adminSecurityQuestion && settings.adminSecurityAnswerHash ? 'security' : 'google'
  );
  const [recoveryVerified, setRecoveryVerified] = useState(false);
  const [securityAnswerInput, setSecurityAnswerInput] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [confirmAdminPass, setConfirmAdminPass] = useState('');
  const [recoveryMsg, setRecoveryMsg] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);

  const recoveryEmail = (settings.adminRecoveryEmail || settings.supportEmail || '').trim().toLowerCase();
  const hasSecurityQuestion = Boolean(
    settings.adminSecurityQuestion && settings.adminSecurityAnswerHash
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (attempts >= 5) {
      setError('অনেকবার ভুল চেষ্টা করা হয়েছে। অনুগ্রহ করে নিচের পাসওয়ার্ড রিকভারি ব্যবহার করুন।');
      return;
    }

    setIsLoading(true);
    try {
      const ok = await loginAdmin(password);
      if (ok) {
        onSuccess();
      } else {
        setAttempts(prev => prev + 1);
        setError(
          `ভুল অ্যাডমিন পাসওয়ার্ড! (অবশিষ্ট চেষ্টা: ${formatBengaliNumber(Math.max(0, 5 - attempts - 1))})`
        );
      }
    } catch {
      setError('লগইনে সমস্যা হয়েছে।');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifySecurityQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    setRecoveryMsg(null);

    if (recoveryAttempts >= 5) {
      setRecoveryError('সর্বোচ্চ ভুল উত্তরের সীমা পার হয়েছে। Google যাচাই ব্যবহার করুন।');
      return;
    }

    if (!settings.adminSecurityAnswerHash) {
      setRecoveryError('এখনও কোনো অ্যাডমিন নিরাপত্তা প্রশ্ন সেট করা হয়নি।');
      return;
    }

    setIsLoading(true);
    try {
      const ok = await verifyHash(
        securityAnswerInput.trim().toLowerCase(),
        settings.adminSecurityAnswerHash
      );
      if (!ok) {
        setRecoveryAttempts(prev => prev + 1);
        setRecoveryError('ভুল উত্তর! অনুগ্রহ করে সঠিক উত্তর দিন।');
      } else {
        setRecoveryVerified(true);
        setRecoveryMsg('নিরাপত্তা প্রশ্ন যাচাই সফল হয়েছে! এখন নতুন অ্যাডমিন পাসওয়ার্ড সেট করুন।');
      }
    } catch {
      setRecoveryError('যাচাইকরণে সমস্যা হয়েছে।');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyWithGoogle = async () => {
    setRecoveryError(null);
    setRecoveryMsg(null);
    setIsLoading(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const signedEmail = (res.user?.email || '').trim().toLowerCase();
      if (!signedEmail) {
        setRecoveryError('Google অ্যাকাউন্ট থেকে ইমেইল পাওয়া যায়নি।');
        return;
      }

      if (recoveryEmail && signedEmail === recoveryEmail) {
        setRecoveryVerified(true);
        setRecoveryMsg(
          `যাচাই সফল (${signedEmail})! এখন নতুন অ্যাডমিন পাসওয়ার্ড সেট করুন।`
        );
      } else {
        setRecoveryError(
          `এই Google ইমেইল (${signedEmail}) অ্যাডমিন রিকভারি ইমেইল (${recoveryEmail || 'অনির্ধারিত'})-এর সাথে মিলেনি।`
        );
      }
    } catch {
      setRecoveryError('Google যাচাই সম্পন্ন করা যায়নি বা বাতিল করা হয়েছে।');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendFirebaseAdminReset = async () => {
    setRecoveryError(null);
    setRecoveryMsg(null);
    if (!recoveryEmail) {
      setRecoveryError('কোনো রিকভারি ইমেইল সেট করা নেই।');
      return;
    }

    setIsLoading(true);
    try {
      auth.languageCode = 'bn';
      await sendPasswordResetEmail(auth, recoveryEmail, {
        url: window.location.origin,
        handleCodeInApp: false,
      });
      setRecoveryMsg(
        `${recoveryEmail} ঠিকানায় পাসওয়ার্ড রিসেট ইমেইল পাঠানো হয়েছে (ইনবক্স ও স্প্যাম ফোল্ডার দেখুন)।`
      );
    } catch {
      setRecoveryError(
        'এই ইমেইলে রিসেট লিংক পাঠানো যায়নি। অনুগ্রহ করে Google অ্যাকাউন্ট যাচাই বা নিরাপত্তা প্রশ্ন ব্যবহার করুন।'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNewAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);

    if (newAdminPass.length < 8) {
      setRecoveryError('নতুন অ্যাডমিন পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।');
      return;
    }

    if (newAdminPass !== confirmAdminPass) {
      setRecoveryError('উভয় পাসওয়ার্ডের মিল নেই!');
      return;
    }

    setIsLoading(true);
    try {
      const newHash = await hashString(newAdminPass);
      await updateSiteSettings({ adminPasswordHash: newHash });
      localStorage.setItem('restauranthisab_admin_hash_v2', newHash);
      localStorage.removeItem('restauranthisab_admin_hash');
      const loggedIn = await loginAdmin(newAdminPass);
      if (loggedIn) {
        onSuccess();
      } else {
        setIsRecoveryMode(false);
        setPassword('');
        setError(null);
      }
    } catch {
      setRecoveryError('নতুন পাসওয়ার্ড সংরক্ষণে সমস্যা হয়েছে।');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 bg-[#0B0F17]">
      <div className="relative overflow-hidden bg-[#0E1524] rounded-3xl shadow-2xl max-w-md w-full border border-slate-800 p-7 sm:p-8 space-y-6 text-white">
        <TopAccentBar variant="violet" />

        <div className="text-center space-y-2 relative z-10">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
            {isRecoveryMode ? <KeyRound className="w-7 h-7" /> : <ShieldCheck className="w-8 h-8" />}
          </div>
          <h2 className="text-2xl font-bold text-white">
            {isRecoveryMode ? 'অ্যাডমিন পাসওয়ার্ড পুনরুদ্ধার' : 'সুপার অ্যাডমিন লগইন'}
          </h2>
          <p className="text-xs text-slate-400">
            {isRecoveryMode
              ? 'পরিচয় যাচাই করে নতুন অ্যাডমিন পাসওয়ার্ড সেট করুন'
              : 'ওয়েবসাইটের নাম, লোগো, ঠিকানা ও সিস্টেম নিয়ন্ত্রণের জন্য পাসওয়ার্ড দিন'}
          </p>
        </div>

        {!isRecoveryMode ? (
          <>
            {error && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-200 text-xs flex items-center gap-2 relative z-10">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  অ্যাডমিন পাসওয়ার্ড *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    data-testid="admin-login-password-input"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="পাসওয়ার্ড লিখুন"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-700 bg-[#0B0F17] text-white text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    aria-label={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                    className="absolute right-3 top-2.5 p-0.5 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                data-testid="admin-login-submit-btn"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-md shadow-purple-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <span>যাচাই হচ্ছে...</span>
                ) : (
                  <>
                    <span>অ্যাডমিন প্যানেলে প্রবেশ করুন</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 relative z-10 text-xs">
              <button
                type="button"
                onClick={onCancel}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ← ফিরে যান
              </button>
              <button
                type="button"
                data-testid="admin-forgot-password-btn"
                onClick={() => {
                  setIsRecoveryMode(true);
                  setRecoveryError(null);
                  setRecoveryMsg(null);
                  setRecoveryVerified(false);
                }}
                className="text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
              >
                পাসওয়ার্ড ভুলে গেছেন?
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-4 relative z-10">
            {recoveryError && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{recoveryError}</span>
              </div>
            )}

            {recoveryMsg && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-700 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{recoveryMsg}</span>
              </div>
            )}

            {recoveryVerified ? (
              <form onSubmit={handleSaveNewAdminPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    নতুন অ্যাডমিন পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    data-testid="admin-recovery-new-pass-input"
                    value={newAdminPass}
                    onChange={e => setNewAdminPass(e.target.value)}
                    placeholder="কমপক্ষে ৮ অক্ষরের নতুন পাসওয়ার্ড"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-[#0B0F17] text-white text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    নতুন পাসওয়ার্ড পুনরায় দিন *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    data-testid="admin-recovery-confirm-pass-input"
                    value={confirmAdminPass}
                    onChange={e => setConfirmAdminPass(e.target.value)}
                    placeholder="আবার লিখুন"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-[#0B0F17] text-white text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  data-testid="admin-recovery-save-pass-btn"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? 'সংরক্ষণ হচ্ছে...' : 'পাসওয়ার্ড রিসেট করে প্রবেশ করুন'}
                </button>
              </form>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#0B0F17] border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryTab('security');
                      setRecoveryError(null);
                      setRecoveryMsg(null);
                    }}
                    className={`py-2 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                      recoveryTab === 'security'
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>নিরাপত্তা প্রশ্ন</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryTab('google');
                      setRecoveryError(null);
                      setRecoveryMsg(null);
                    }}
                    className={`py-2 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                      recoveryTab === 'google'
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Google যাচাই</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryTab('email');
                      setRecoveryError(null);
                      setRecoveryMsg(null);
                    }}
                    className={`py-2 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                      recoveryTab === 'email'
                        ? 'bg-purple-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>ইমেইল লিংক</span>
                  </button>
                </div>

                {recoveryTab === 'security' && (
                  hasSecurityQuestion ? (
                    <form onSubmit={handleVerifySecurityQuestion} className="space-y-3">
                      <div className="p-3.5 rounded-xl bg-[#111927] border border-slate-800 space-y-1">
                        <span className="text-[11px] font-bold text-purple-400">
                          অ্যাডমিন নিরাপত্তা প্রশ্ন:
                        </span>
                        <p className="text-xs font-bold text-white">
                          {settings.adminSecurityQuestion}
                        </p>
                      </div>
                      <input
                        type="text"
                        required
                        data-testid="admin-recovery-sec-answer-input"
                        value={securityAnswerInput}
                        onChange={e => setSecurityAnswerInput(e.target.value)}
                        placeholder="আপনার উত্তর লিখুন"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-[#0B0F17] text-white text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={isLoading}
                        data-testid="admin-recovery-sec-submit-btn"
                        className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                      >
                        উত্তর যাচাই করুন
                      </button>
                    </form>
                  ) : (
                    <div className="p-4 rounded-xl bg-[#111927] border border-slate-800 text-xs text-slate-300 space-y-2">
                      <p className="font-semibold text-amber-300">
                        এখনও কোনো অ্যাডমিন নিরাপত্তা প্রশ্ন সেট করা হয়নি।
                      </p>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        লগইন করার পর অ্যাডমিন প্যানেলের "সেটিংস ও ব্র্যান্ডিং" থেকে নিরাপত্তা প্রশ্ন ও রিকভারি ইমেইল সেট করে রাখতে পারবেন।
                      </p>
                    </div>
                  )
                )}

                {recoveryTab === 'google' && (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-[#111927] border border-slate-800 text-xs text-slate-300 space-y-1">
                      <p className="font-semibold text-white">Google অ্যাকাউন্টের মাধ্যমে যাচাই</p>
                      <p className="text-[11px] text-slate-400">
                        রিকভারি ইমেইল:{' '}
                        <span className="text-purple-300 font-mono">
                          {recoveryEmail || 'সেট করা নেই'}
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={handleVerifyWithGoogle}
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                    >
                      Google অ্যাকাউন্ট দিয়ে যাচাই করুন
                    </button>
                  </div>
                )}

                {recoveryTab === 'email' && (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-[#111927] border border-slate-800 text-xs text-slate-300 space-y-1">
                      <p className="font-semibold text-white">Firebase Auth রিসেট লিংক</p>
                      <p className="text-[11px] text-slate-400">
                        নির্ধারিত রিকভারি ইমেইল ({recoveryEmail || 'অনির্ধারিত'})-এ পাসওয়ার্ড রিসেট লিংক পাঠানো হবে।
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isLoading || !recoveryEmail}
                      onClick={handleSendFirebaseAdminReset}
                      className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                    >
                      ইমেইলে রিসেট লিংক পাঠান
                    </button>
                  </div>
                )}
              </>
            )}

            <div className="pt-2 border-t border-slate-800 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRecoveryMode(false);
                  setRecoveryError(null);
                  setRecoveryMsg(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white font-semibold cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>অ্যাডমিন লগইনে ফিরে যান</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
