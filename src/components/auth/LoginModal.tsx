import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import { LogIn, X, AlertCircle } from 'lucide-react';
import { TopAccentBar } from '../common/TopAccentBar';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
  onOpenForgotPassword: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSwitchToRegister,
  onOpenForgotPassword,
}) => {
  const { loginRestaurant } = useAuth();
  const { settings } = useSiteSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await loginRestaurant(email, password);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'লগইন ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative overflow-hidden bg-[#0E1524] text-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-800 my-auto">
        <TopAccentBar variant="amber" />
        {/* Header */}
        <div className="px-6 py-4 bg-[#111927] border-b border-slate-800 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <LogIn className="w-5 h-5 text-orange-400" />
            <h3 className="font-bold text-white text-base">
              {settings.siteName} লগইন
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="লগইন মডাল বন্ধ করুন"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#151E2E] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 relative z-10">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
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

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-200">
                  পাসওয়ার্ড *
                </label>
                <button
                  type="button"
                  onClick={onOpenForgotPassword}
                  className="text-xs text-orange-400 hover:underline font-medium cursor-pointer"
                >
                  পাসওয়ার্ড ভুলে গেছেন?
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-[#0B0F17] text-white placeholder:text-slate-500 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm shadow-md shadow-orange-500/20 transition-all disabled:opacity-50 mt-2 cursor-pointer"
            >
              {isLoading ? 'লগইন হচ্ছে...' : 'লগইন করুন'}
            </button>
          </form>

          <div className="pt-3 text-center border-t border-slate-800">
            <span className="text-xs text-slate-300">
              রেস্তোরাঁর নতুন অ্যাকাউন্ট প্রয়োজন?{' '}
            </span>
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-xs text-orange-400 font-bold hover:underline cursor-pointer"
            >
              ফ্রি ট্রায়াল রেজিস্ট্রেশন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

