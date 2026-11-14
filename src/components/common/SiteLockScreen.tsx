import React, { useState, useEffect } from 'react';
import { Lock, Unlock, AlertCircle, Delete, Eye, EyeOff } from 'lucide-react';
import { TopAccentBar } from './TopAccentBar';
import { BrandLogo } from './BrandLogo';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import {
  MAX_LOCK_PIN_LENGTH,
  sanitizeLockPinInput,
  validateLockPin,
  verifyLockPin,
} from '../../utils/screenLock';
import { formatBengaliNumber } from '../../utils/date';

interface SiteLockScreenProps {
  storedHash: string;
  onUnlock: () => void;
}

export const SiteLockScreen: React.FC<SiteLockScreenProps> = ({
  storedHash,
  onUnlock,
}) => {
  const { settings } = useSiteSettings();
  const [pin, setPin] = useState('');
  const [showDigits, setShowDigits] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedCount, setFailedCount] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const [remainingCooldown, setRemainingCooldown] = useState<number>(0);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (!cooldownUntil) return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setRemainingCooldown(left);
      if (left === 0) {
        setCooldownUntil(0);
        setFailedCount(0);
      }
    };
    tick();
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [cooldownUntil]);

  const handlePinChange = (raw: string) => {
    setError(null);
    setPin(sanitizeLockPinInput(raw));
  };

  const handleDigitClick = (digit: string) => {
    if (remainingCooldown > 0) return;
    setError(null);
    if (pin.length < MAX_LOCK_PIN_LENGTH) {
      setPin(prev => sanitizeLockPinInput(prev + digit));
    }
  };

  const handleBackspace = () => {
    setError(null);
    setPin(prev => prev.slice(0, -1));
  };

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (remainingCooldown > 0) return;
    setError(null);

    const validation = validateLockPin(pin);
    if (!validation.valid) {
      setError(validation.error || 'সঠিক পিন দিন।');
      return;
    }

    setIsVerifying(true);
    try {
      const ok = await verifyLockPin(validation.normalizedPin, storedHash);
      if (ok) {
        setPin('');
        onUnlock();
      } else {
        const nextFailed = failedCount + 1;
        setFailedCount(nextFailed);
        setPin('');
        if (nextFailed >= 5) {
          setCooldownUntil(Date.now() + 15000);
          setError('অনেকবার ভুল পিন দেওয়া হয়েছে! ১৫ সেকেন্ড পর আবার চেষ্টা করুন।');
        } else {
          setError(`ভুল পাসওয়ার্ড/পিন! অনুগ্রহ করে সঠিক পিন দিন।`);
        }
      }
    } catch {
      setError('পিন যাচাই করতে সমস্যা হয়েছে।');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div
      data-testid="site-lock-screen"
      className="fixed inset-0 z-[100] bg-[#070B12] text-white flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="relative overflow-hidden bg-[#0E1524] rounded-3xl shadow-2xl max-w-md w-full border border-slate-800 p-6 sm:p-8 space-y-6 my-auto">
        <TopAccentBar variant="rose" />

        {/* Brand & Lock Emblem */}
        <div className="text-center space-y-3 relative z-10">
          <div className="flex items-center justify-center gap-2.5">
            <BrandLogo logoUrl={settings.logoUrl} siteName={settings.siteName} size="md" />
            <span className="font-extrabold text-lg text-white tracking-tight">
              {settings.siteName}
            </span>
          </div>

          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-950/70 border border-rose-500/40 text-rose-400 flex items-center justify-center shadow-lg shadow-rose-950/40">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white">
              ওয়েবসাইট লক করা আছে
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              প্রবেশ ও আনলক করতে আপনার সর্বোচ্চ ৪ ডিজিটের পাসওয়ার্ড/পিন দিন
            </p>
          </div>
        </div>

        {/* Visual 4-Digit Slot Indicators */}
        <div className="flex items-center justify-center gap-3 relative z-10">
          {[0, 1, 2, 3].map(idx => {
            const filled = idx < pin.length;
            return (
              <div
                key={idx}
                className={`w-12 h-12 rounded-2xl border flex items-center justify-center font-mono text-xl font-black transition-all ${
                  filled
                    ? 'bg-[#151E2E] border-amber-500 text-amber-300 shadow-sm shadow-amber-500/20'
                    : 'bg-[#0B0F17] border-slate-800 text-slate-600'
                }`}
              >
                {filled ? (showDigits ? pin[idx] : '•') : ''}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2 relative z-10">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUnlockSubmit} className="space-y-4 relative z-10">
          <div className="relative">
            <input
              type={showDigits ? 'text' : 'password'}
              inputMode="numeric"
              autoComplete="off"
              autoFocus
              maxLength={MAX_LOCK_PIN_LENGTH}
              disabled={remainingCooldown > 0}
              data-testid="site-unlock-pin-input"
              value={pin}
              onChange={e => handlePinChange(e.target.value)}
              placeholder="পিন লিখুন (১–৪ ডিজিট)"
              className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-700 bg-[#0B0F17] text-white font-mono text-base tracking-[0.35em] text-center focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:tracking-normal placeholder:text-sm placeholder:text-slate-500 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowDigits(prev => !prev)}
              aria-label={showDigits ? 'পিন লুকান' : 'পিন দেখুন'}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer"
            >
              {showDigits ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Touch Keypad */}
          <div className="p-3 rounded-2xl bg-[#0B0F17] border border-slate-800">
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
                <button
                  key={digit}
                  type="button"
                  disabled={remainingCooldown > 0}
                  onClick={() => handleDigitClick(digit)}
                  className="py-2.5 rounded-xl bg-[#111927] hover:bg-[#1E293B] border border-slate-800 text-white font-mono font-bold text-base transition-colors active:scale-95 cursor-pointer disabled:opacity-40"
                >
                  {formatBengaliNumber(digit)}
                </button>
              ))}
              <button
                type="button"
                disabled={remainingCooldown > 0}
                onClick={() => {
                  setError(null);
                  setPin('');
                }}
                className="py-2.5 rounded-xl bg-[#151E2E] hover:bg-[#1E293B] border border-slate-800 text-slate-300 font-bold text-xs transition-colors cursor-pointer disabled:opacity-40"
              >
                মুছুন
              </button>
              <button
                type="button"
                disabled={remainingCooldown > 0}
                onClick={() => handleDigitClick('0')}
                className="py-2.5 rounded-xl bg-[#111927] hover:bg-[#1E293B] border border-slate-800 text-white font-mono font-bold text-base transition-colors active:scale-95 cursor-pointer disabled:opacity-40"
              >
                ০
              </button>
              <button
                type="button"
                disabled={remainingCooldown > 0}
                onClick={handleBackspace}
                aria-label="একটি সংখ্যা মুছুন"
                className="py-2.5 rounded-xl bg-[#151E2E] hover:bg-[#1E293B] border border-slate-800 text-slate-300 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isVerifying || pin.length === 0 || remainingCooldown > 0}
            data-testid="site-unlock-submit-btn"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
          >
            <Unlock className="w-4 h-4" />
            <span>
              {remainingCooldown > 0
                ? `অপেক্ষা করুন (${formatBengaliNumber(remainingCooldown)} সে.)`
                : isVerifying
                ? 'যাচাই হচ্ছে...'
                : 'আনলক করুন'}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
};
