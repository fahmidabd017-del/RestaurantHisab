import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import { hashString } from '../../utils/crypto';
import { registerRestaurant, importStarterMenu } from '../../services/db';
import { formatBengaliNumber } from '../../utils/date';
import { UtensilsCrossed, X, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { TopAccentBar } from '../common/TopAccentBar';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

const COMMON_QUESTIONS = [
  'আপনার প্রিয় খাবারের নাম কী?',
  'আপনার প্রথম স্কুলের নাম কী?',
  'আপনার জন্মস্থানের নাম কী?',
  'আপনার শৈশবের সেরা বন্ধুর নাম কী?',
  'আপনার প্রিয় শিক্ষকের নাম কী?',
];

export const RegisterModal: React.FC<RegisterModalProps> = ({
  isOpen,
  onClose,
  onSwitchToLogin,
}) => {
  const { setRestaurantDirect } = useAuth();
  const { settings } = useSiteSettings();

  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [address, setAddress] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState(COMMON_QUESTIONS[0]);
  const [customQuestion, setCustomQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [includeStarterMenu, setIncludeStarterMenu] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }

    const finalQuestion = securityQuestion === 'CUSTOM' ? customQuestion.trim() : securityQuestion;
    if (!finalQuestion) {
      setError('একটি নিরাপত্তা প্রশ্ন নির্বাচন বা লিখুন।');
      return;
    }

    if (!securityAnswer.trim()) {
      setError('পাসওয়ার্ড পুনরুদ্ধারের জন্য নিরাপত্তা প্রশ্নের উত্তর দিন।');
      return;
    }

    setIsLoading(true);

    try {
      const passwordHash = await hashString(password);
      const securityAnswerHash = await hashString(securityAnswer.trim().toLowerCase());

      const newRest = await registerRestaurant({
        name: name.trim(),
        ownerName: ownerName.trim(),
        address: address.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        passwordHash,
        securityQuestion: finalQuestion,
        securityAnswerHash,
      });

      if (includeStarterMenu) {
        try {
          await importStarterMenu(newRest.id);
        } catch (menuErr) {
          console.warn('Starter menu auto-import failed:', menuErr);
        }
      }

      setRestaurantDirect(newRest);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'রেজিস্ট্রেশনে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative overflow-hidden bg-[#0E1524] text-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-800 my-6">
        <TopAccentBar variant="emerald" />
        {/* Header */}
        <div className="px-6 py-4 bg-[#111927] border-b border-slate-800 text-white flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-600/20 border border-orange-500/40 flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">রেস্তোরাঁ রেজিস্ট্রেশন</h3>
              <p className="text-xs text-emerald-300">
                {formatBengaliNumber(settings.trialDays)} দিনের সম্পূর্ণ ফ্রি ট্রায়াল শুরু করুন
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="রেজিস্ট্রেশন মডাল বন্ধ করুন"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#151E2E] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto relative z-10">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Form fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                রেস্তোরাঁর নাম *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="যেমন: ঢাকা বিরিয়ানি হাউজ"
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white placeholder:text-slate-500 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                মালিকের নাম *
              </label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={e => setOwnerName(e.target.value)}
                placeholder="যেমন: মোহাম্মদ করিম"
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white placeholder:text-slate-500 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                রেস্তোরাঁর ঠিকানা *
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="যেমন: মিরপুর ১০, ঢাকা ১২১৬"
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white placeholder:text-slate-500 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                মোবাইল নম্বর *
              </label>
              <input
                type="tel"
                required
                value={mobile}
                onChange={e => setMobile(e.target.value)}
                placeholder="017XXXXXXXX"
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white placeholder:text-slate-500 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                ইমেইল ঠিকানা *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="restaurant@example.com"
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white placeholder:text-slate-500 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর) *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white placeholder:text-slate-500 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            {/* Security Question Section */}
            <div className="sm:col-span-2 pt-3 border-t border-slate-800">
              <div className="text-xs font-semibold text-white mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                নিরাপত্তা প্রশ্ন (পাসওয়ার্ড রিকভারির জন্য) *
              </div>
              <select
                value={securityQuestion}
                onChange={e => setSecurityQuestion(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                {COMMON_QUESTIONS.map((q, i) => (
                  <option key={i} value={q} className="bg-[#0B0F17] text-white">
                    {q}
                  </option>
                ))}
                <option value="CUSTOM" className="bg-[#0B0F17] text-white">অন্য প্রশ্ন লিখুন...</option>
              </select>

              {securityQuestion === 'CUSTOM' && (
                <input
                  type="text"
                  required
                  value={customQuestion}
                  onChange={e => setCustomQuestion(e.target.value)}
                  placeholder="আপনার নিজস্ব নিরাপত্তা প্রশ্নটি লিখুন"
                  className="mt-2 w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white placeholder:text-slate-500 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              )}

              <input
                type="text"
                required
                value={securityAnswer}
                onChange={e => setSecurityAnswer(e.target.value)}
                placeholder="প্রশ্নের উত্তর দিন (পাসওয়ার্ড ভুলে গেলে প্রয়োজন হবে)"
                className="mt-2 w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white placeholder:text-slate-500 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                * উত্তরটি এনক্রিপ্ট করে সুরক্ষিত রাখা হবে।
              </p>
            </div>

            {/* Starter Menu Checkbox */}
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-200">
                <input
                  type="checkbox"
                  checked={includeStarterMenu}
                  onChange={e => setIncludeStarterMenu(e.target.checked)}
                  className="rounded text-orange-500 focus:ring-orange-500 w-4 h-4 bg-[#0B0F17] border-slate-700"
                />
                <span className="font-medium">
                  বাংলাদেশী সাধারণ খাবার ও মেনু ক্যাটাগরি স্বয়ংক্রিয়ভাবে যোগ করুন (পরে পরিবর্তনযোগ্য)
                </span>
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm shadow-md shadow-orange-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <span>অ্যাকাউন্ট তৈরি হচ্ছে...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  রেজিস্ট্রেশন ও {formatBengaliNumber(settings.trialDays)} দিনের ফ্রি ট্রায়াল শুরু করুন
                </>
              )}
            </button>
          </div>

          <div className="text-center pt-2 border-t border-slate-800">
            <span className="text-xs text-slate-300">
              ইতোমধ্যে অ্যাকাউন্ট আছে?{' '}
            </span>
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-xs text-orange-400 font-bold hover:underline cursor-pointer"
            >
              লগইন করুন
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

