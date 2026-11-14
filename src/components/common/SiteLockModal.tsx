import React, { useState } from 'react';
import { Lock, X, Eye, EyeOff, AlertCircle, ShieldCheck, Delete, Unlock } from 'lucide-react';
import { TopAccentBar } from './TopAccentBar';
import {
  MAX_LOCK_PIN_LENGTH,
  hashLockPin,
  sanitizeLockPinInput,
  validateLockPin,
} from '../../utils/screenLock';
import { formatBengaliNumber } from '../../utils/date';

interface SiteLockModalProps {
  isOpen: boolean;
  hasExistingLocalLock?: boolean;
  hasGlobalLock?: boolean;
  onClose: () => void;
  onLockConfirmed: (pinHash: string) => void;
  onLockNowExisting?: () => void;
  onDisableLocalLock?: () => void;
}

export const SiteLockModal: React.FC<SiteLockModalProps> = ({
  isOpen,
  hasExistingLocalLock = false,
  hasGlobalLock = false,
  onClose,
  onLockConfirmed,
  onLockNowExisting,
  onDisableLocalLock,
}) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [activeField, setActiveField] = useState<'pin' | 'confirm'>('pin');
  const [showDigits, setShowDigits] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLocking, setIsLocking] = useState(false);

  if (!isOpen) return null;

  const hasAnyActiveLock = hasExistingLocalLock || hasGlobalLock;

  const handlePinChange = (raw: string) => {
    setError(null);
    setPin(sanitizeLockPinInput(raw));
  };

  const handleConfirmChange = (raw: string) => {
    setError(null);
    setConfirmPin(sanitizeLockPinInput(raw));
  };

  const handleKeypadDigit = (digit: string) => {
    setError(null);
    if (activeField === 'pin') {
      if (pin.length < MAX_LOCK_PIN_LENGTH) {
        setPin(prev => sanitizeLockPinInput(prev + digit));
      }
    } else {
      if (confirmPin.length < MAX_LOCK_PIN_LENGTH) {
        setConfirmPin(prev => sanitizeLockPinInput(prev + digit));
      }
    }
  };

  const handleKeypadBackspace = () => {
    setError(null);
    if (activeField === 'pin') {
      setPin(prev => prev.slice(0, -1));
    } else {
      setConfirmPin(prev => prev.slice(0, -1));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = validateLockPin(pin);
    if (!validation.valid) {
      setError(validation.error || 'সঠিক ১ থেকে ৪ ডিজিটের পিন দিন।');
      return;
    }

    if (pin !== confirmPin) {
      setError('উভয় পিনের মিল নেই! অনুগ্রহ করে একই পিন দিন।');
      return;
    }

    setIsLocking(true);
    try {
      const pinHash = await hashLockPin(pin);
      setPin('');
      setConfirmPin('');
      onLockConfirmed(pinHash);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ওয়েবসাইট লক করতে সমস্যা হয়েছে।');
    } finally {
      setIsLocking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative overflow-hidden bg-[#0E1524] text-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-800 my-auto">
        <TopAccentBar variant="amber" />

        {/* Header */}
        <div className="px-6 py-4 bg-[#111927] border-b border-slate-800 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950/70 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-sm">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-white">
                ওয়েবসাইট প্রবেশ লক
              </h2>
              <p className="text-xs text-slate-400">
                সর্বোচ্চ ৪ ডিজিটের (সংখ্যার) পাসওয়ার্ড সেট করুন
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="লক মডাল বন্ধ করুন"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#151E2E] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 relative z-10">
          {/* Quick Lock / Disable panel when a lock PIN is already configured */}
          {hasAnyActiveLock && (
            <div className="p-4 rounded-2xl bg-[#111927] border border-emerald-700/50 space-y-3">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-extrabold text-emerald-300">
                    প্রবেশ লক সক্রিয় রয়েছে
                  </h3>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                    ওয়েবসাইটে ঢোকার সময় এবং বেরিয়ে পুনরায় প্রবেশ করলে স্বয়ংক্রিয়ভাবে পিন চাইবে।
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                {onLockNowExisting && (
                  <button
                    type="button"
                    data-testid="site-lock-now-existing-btn"
                    onClick={() => {
                      setPin('');
                      setConfirmPin('');
                      onLockNowExisting();
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>এখনই লক করুন</span>
                  </button>
                )}

                {hasExistingLocalLock && onDisableLocalLock && (
                  <button
                    type="button"
                    data-testid="site-lock-disable-btn"
                    onClick={() => {
                      setPin('');
                      setConfirmPin('');
                      onDisableLocalLock();
                    }}
                    className="py-2.5 px-3 rounded-xl border border-rose-800/70 bg-rose-950/40 hover:bg-rose-950/70 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>লক বন্ধ করুন</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {hasAnyActiveLock && (
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pt-1">
                অথবা নতুন পিন সেট / পরিবর্তন করুন
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* PIN Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-200">
                  লক পাসওয়ার্ড / পিন (১–৪ ডিজিট) *
                </label>
                <span className="text-[11px] font-bold text-amber-400">
                  {formatBengaliNumber(pin.length)}/{formatBengaliNumber(MAX_LOCK_PIN_LENGTH)} ডিজিট
                </span>
              </div>

              <div className="relative">
                <input
                  type={showDigits ? 'text' : 'password'}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={MAX_LOCK_PIN_LENGTH}
                  required
                  data-testid="site-lock-pin-input"
                  value={pin}
                  onFocus={() => setActiveField('pin')}
                  onChange={e => handlePinChange(e.target.value)}
                  placeholder="যেমন: ১২৩৪"
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-700 bg-[#0B0F17] text-white font-mono text-lg tracking-[0.45em] text-center focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:tracking-normal placeholder:text-sm placeholder:text-slate-500"
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
            </div>

            {/* Confirm PIN Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-200">
                  পাসওয়ার্ড পুনরায় নিশ্চিত করুন *
                </label>
                <span className="text-[11px] font-bold text-slate-400">
                  {formatBengaliNumber(confirmPin.length)}/{formatBengaliNumber(MAX_LOCK_PIN_LENGTH)} ডিজিট
                </span>
              </div>

              <input
                type={showDigits ? 'text' : 'password'}
                inputMode="numeric"
                autoComplete="off"
                maxLength={MAX_LOCK_PIN_LENGTH}
                required
                data-testid="site-lock-confirm-input"
                value={confirmPin}
                onFocus={() => setActiveField('confirm')}
                onChange={e => handleConfirmChange(e.target.value)}
                placeholder="আবার একই পিন দিন"
                className="w-full px-4 py-3 rounded-xl border border-slate-700 bg-[#0B0F17] text-white font-mono text-lg tracking-[0.45em] text-center focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:tracking-normal placeholder:text-sm placeholder:text-slate-500"
              />
            </div>

            {/* Compact Touch Keypad */}
            <div className="p-3 rounded-2xl bg-[#0B0F17] border border-slate-800">
              <div className="grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleKeypadDigit(digit)}
                    className="py-2 rounded-xl bg-[#111927] hover:bg-[#1E293B] border border-slate-800 text-white font-mono font-bold text-sm transition-colors active:scale-95 cursor-pointer"
                  >
                    {formatBengaliNumber(digit)}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    if (activeField === 'pin') setPin('');
                    else setConfirmPin('');
                  }}
                  className="py-2 rounded-xl bg-[#151E2E] hover:bg-[#1E293B] border border-slate-800 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  মুছুন
                </button>
                <button
                  type="button"
                  onClick={() => handleKeypadDigit('0')}
                  className="py-2 rounded-xl bg-[#111927] hover:bg-[#1E293B] border border-slate-800 text-white font-mono font-bold text-sm transition-colors active:scale-95 cursor-pointer"
                >
                  ০
                </button>
                <button
                  type="button"
                  onClick={handleKeypadBackspace}
                  aria-label="একটি সংখ্যা মুছুন"
                  className="py-2 rounded-xl bg-[#151E2E] hover:bg-[#1E293B] border border-slate-800 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <Delete className="w-4 h-4" />
                </button>
              </div>
            </div>

            {!hasAnyActiveLock && (
              <div className="p-3 rounded-xl bg-[#111927] border border-slate-800 text-[11px] text-slate-300 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  একবার পিন সেট করলে ওয়েবসাইটে ঢোকার সময় এবং বেরিয়ে পুনরায় প্রবেশ করলেও এই পিন দিয়ে আনলক করতে হবে।
                </span>
              </div>
            )}

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 py-3 rounded-xl border border-slate-700 bg-[#151E2E] hover:bg-[#1E293B] text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="submit"
                disabled={isLocking || pin.length === 0 || confirmPin.length === 0}
                data-testid="site-lock-submit-btn"
                className="w-1/2 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>
                  {isLocking
                    ? 'লক হচ্ছে...'
                    : hasAnyActiveLock
                    ? 'পিন আপডেট ও লক'
                    : 'সেট করে লক করুন'}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
