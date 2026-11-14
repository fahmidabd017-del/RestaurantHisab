import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { TopAccentBar } from '../common/TopAccentBar';

interface AdminLoginProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess, onCancel }) => {
  const { loginAdmin } = useAuth();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (attempts >= 5) {
      setError('অনেকবার ভুল চেষ্টা করা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর চেষ্টা করুন।');
      return;
    }

    setIsLoading(true);
    try {
      const ok = await loginAdmin(password);
      if (ok) {
        onSuccess();
      } else {
        setAttempts(prev => prev + 1);
        setError(`ভুল অ্যাডমিন পাসওয়ার্ড! (অবশিষ্ট চেষ্টা: ${5 - attempts - 1})`);
      }
    } catch (err) {
      setError('লগইনে সমস্যা হয়েছে।');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 bg-[#0B0F17]">
      <div className="relative overflow-hidden bg-[#0E1524] rounded-3xl shadow-2xl max-w-md w-full border border-slate-800 p-8 space-y-6 text-white">
        <TopAccentBar variant="violet" />

        <div className="text-center space-y-2 relative z-10">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white">
            সুপার অ্যাডমিন লগইন
          </h2>
          <p className="text-xs text-slate-400">
            নিরাপদ অ্যাডমিন প্যানেলে প্রবেশের জন্য পাসওয়ার্ড দিন
          </p>
        </div>

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
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="পাসওয়ার্ড লিখুন"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 bg-[#0B0F17] text-white text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none placeholder:text-slate-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
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

        <div className="text-center pt-2 relative z-10">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-slate-400 hover:text-white cursor-pointer"
          >
            ← ফিরে যান
          </button>
        </div>
      </div>
    </div>
  );
};
