import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import { calculateTrialStatus, formatBengaliNumber } from '../../utils/date';
import { BrandLogo } from './BrandLogo';
import {
  Menu,
  X,
  FilePlus,
  Receipt,
  BookOpen,
  CreditCard,
  User,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  LayoutDashboard,
  Bell,
  Sparkles,
  Lock,
} from 'lucide-react';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  adminNotificationCount?: number;
  onToggleAiChat?: () => void;
  onToggleMobileSidebar?: () => void;
  onOpenSiteLock?: () => void;
  isEntryLockActive?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenLogin,
  onOpenRegister,
  adminNotificationCount = 0,
  onToggleAiChat,
  onToggleMobileSidebar,
  onOpenSiteLock,
  isEntryLockActive = false,
}) => {
  const { restaurant, isAdmin, logoutRestaurant, logoutAdmin } = useAuth();
  const { settings } = useSiteSettings();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const trialInfo = restaurant
    ? calculateTrialStatus(restaurant.trialEndsAt, restaurant.isLifetime)
    : null;

  const handleNav = (view: string) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0B0F17]/95 backdrop-blur-md border-b border-slate-800/90 text-white relative">
      {/* Subtle executive top accent hairline */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-orange-500 via-amber-400 to-blue-500"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 min-w-0">
            {restaurant && !isAdmin && onToggleMobileSidebar && (
              <button
                onClick={onToggleMobileSidebar}
                className="lg:hidden p-2 -ml-2 rounded-xl text-slate-200 hover:bg-[#151E2E] transition-colors cursor-pointer"
                title="মেনু খুলুন"
                aria-label="ন্যাভিগেশন মেনু"
              >
                <Menu className="w-5 h-5 text-orange-400" />
              </button>
            )}
            <div
              className="flex items-center gap-2.5 cursor-pointer select-none group min-w-0"
              onClick={() => handleNav(isAdmin ? 'admin-dashboard' : restaurant ? 'dashboard' : 'home')}
            >
              <BrandLogo
                logoUrl={settings.logoUrl}
                siteName={settings.siteName}
                size="md"
                className="group-hover:scale-105 transition-transform"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    data-testid="navbar-site-name"
                    className="font-extrabold text-base sm:text-lg text-white tracking-tight truncate max-w-[170px] sm:max-w-[230px]"
                  >
                    {settings.siteName}
                  </span>
                  {settings.siteBadge && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded font-bold bg-orange-950/70 text-orange-300 border border-orange-800/60 shrink-0 whitespace-nowrap">
                      {settings.siteBadge}
                    </span>
                  )}
                </div>
                <p
                  data-testid="navbar-site-tagline"
                  className="text-[11px] text-slate-400 font-medium -mt-0.5 truncate max-w-[210px]"
                >
                  {settings.siteTagline}
                </p>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            {!restaurant && !isAdmin && (
              <>
                {[
                  { id: 'home', label: 'হোম' },
                  { id: 'features', label: 'সুবিধাসমূহ' },
                  { id: 'pricing', label: 'মূল্য ও লাইফটাইম' },
                  { id: 'about', label: 'আমাদের সম্পর্কে' },
                  { id: 'contact', label: 'যোগাযোগ' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      currentView === item.id
                        ? 'text-orange-400 font-bold bg-[#151E2E]/80'
                        : 'text-slate-300 hover:text-white hover:bg-[#151E2E]/50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </>
            )}

            {restaurant && !isAdmin && (
              <div className="hidden xl:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#111927] border border-slate-800 text-xs whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="font-bold text-white truncate max-w-[180px]">{restaurant.name}</span>
                <span className="text-slate-500">/</span>
                <span className="text-orange-400 font-extrabold">
                  {currentView === 'dashboard' && 'ড্যাশবোর্ড'}
                  {currentView === 'new-bill' && 'নতুন বিল'}
                  {currentView === 'bills' && 'বিল হিস্ট্রি'}
                  {currentView === 'menu' && 'খাবার মেনু'}
                  {currentView === 'payment' && 'লাইফটাইম পেমেন্ট'}
                  {currentView === 'profile' && 'প্রোফাইল ও সেটিংস'}
                </span>
              </div>
            )}

            {isAdmin && (
              <>
                {[
                  { id: 'admin-dashboard', label: 'অ্যাডমিন ড্যাশবোর্ড' },
                  { id: 'admin-restaurants', label: 'রেস্তোরাঁ ডিরেক্টরি' },
                  { id: 'admin-payments', label: 'পেমেন্ট যাচাই' },
                  { id: 'admin-settings', label: 'সেটিংস ও ব্র্যান্ডিং' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => handleNav(tab.id)}
                    className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      currentView === tab.id
                        ? 'bg-purple-950/70 text-purple-300 border border-purple-700/60 font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-[#151E2E]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </>
            )}
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* AI Chatbot button */}
            {onToggleAiChat && (
              <button
                onClick={onToggleAiChat}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#111927] border border-orange-500/40 text-orange-300 font-bold text-xs hover:bg-[#151E2E] hover:border-orange-400 transition-all shadow-xs cursor-pointer whitespace-nowrap"
                title={`${settings.siteName} এআই সহকারী`}
              >
                <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                <span className="hidden sm:inline">এআই সহকারী</span>
              </button>
            )}

            {/* Website Screen Lock button (4-digit PIN) */}
            {onOpenSiteLock && (
              <button
                type="button"
                data-testid="navbar-lock-btn"
                onClick={onOpenSiteLock}
                className={`relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#111927] border font-bold text-xs hover:bg-[#151E2E] transition-all shadow-xs cursor-pointer whitespace-nowrap ${
                  isEntryLockActive
                    ? 'border-emerald-500/60 text-emerald-300 hover:border-emerald-400'
                    : 'border-amber-500/40 text-amber-300 hover:border-amber-400'
                }`}
                title={
                  isEntryLockActive
                    ? 'প্রবেশ লক চালু আছে — ক্লিক করে এখনই লক বা পিন পরিবর্তন করুন'
                    : 'সর্বোচ্চ ৪ ডিজিটের পিন দিয়ে ওয়েবসাইট লক করুন'
                }
              >
                <Lock className={`w-3.5 h-3.5 ${isEntryLockActive ? 'text-emerald-400' : 'text-amber-400'}`} />
                <span className="hidden sm:inline">{isEntryLockActive ? 'লক চালু' : 'লক'}</span>
                {isEntryLockActive && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                )}
              </button>
            )}

            {/* Restaurant status summary if logged in */}
            {restaurant && trialInfo && (
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border bg-[#111927] border-slate-800 whitespace-nowrap">
                {restaurant.isLifetime ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    লাইফটাইম
                  </span>
                ) : trialInfo.isExpired ? (
                  <span className="flex items-center gap-1 text-rose-400 font-bold">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    ট্রায়াল শেষ
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-orange-400 font-bold">
                    <Sparkles className="w-3.5 h-3.5" />
                    ট্রায়াল: {formatBengaliNumber(trialInfo.daysRemaining)} দিন
                  </span>
                )}
                <span className="text-slate-600">|</span>
                <span className="text-slate-200 font-semibold truncate max-w-[120px]">
                  {restaurant.name}
                </span>
              </div>
            )}

            {/* Admin notifications button */}
            {isAdmin && (
              <button
                onClick={() => handleNav('admin-notifications')}
                className="relative p-2 rounded-lg text-slate-300 hover:bg-[#151E2E] hover:text-white cursor-pointer"
                title="বিজ্ঞপ্তি"
              >
                <Bell className="w-5 h-5" />
                {adminNotificationCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {adminNotificationCount > 9 ? '9+' : adminNotificationCount}
                  </span>
                )}
              </button>
            )}

            {/* Auth Buttons */}
            {!restaurant && !isAdmin ? (
              <div className="hidden sm:flex items-center gap-2 whitespace-nowrap">
                <button
                  onClick={onOpenLogin}
                  className="px-3.5 py-1.5 text-sm font-semibold text-slate-200 hover:text-white rounded-lg hover:bg-[#151E2E] transition-colors cursor-pointer"
                >
                  লগইন
                </button>
                <button
                  onClick={onOpenRegister}
                  className="px-4 py-1.5 text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 rounded-lg shadow-sm shadow-orange-500/30 transition-all cursor-pointer"
                >
                  ফ্রি ট্রায়াল শুরু করুন
                </button>
                <button
                  onClick={() => handleNav('admin-login')}
                  className="px-2.5 py-1.5 text-slate-400 hover:text-white hover:bg-[#151E2E] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  title="সুপার অ্যাডমিন"
                >
                  অ্যাডমিন
                </button>
              </div>
            ) : restaurant ? (
              <button
                onClick={logoutRestaurant}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-800/50 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">লগআউট</span>
              </button>
            ) : (
              <button
                onClick={logoutAdmin}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-800/50 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>অ্যাডমিন প্রস্থান</span>
              </button>
            )}

            {/* Mobile menu trigger */}
            {(!restaurant || isAdmin) && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-300 hover:bg-[#151E2E] hover:text-white cursor-pointer"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-[#0E1524] px-4 py-4 space-y-2 text-white shadow-2xl">
          {!restaurant && !isAdmin ? (
            <>
              <button
                onClick={() => handleNav('home')}
                className="block w-full text-left px-3 py-2 rounded-lg text-slate-200 hover:bg-[#151E2E] hover:text-white font-medium"
              >
                হোম
              </button>
              <button
                onClick={() => handleNav('features')}
                className="block w-full text-left px-3 py-2 rounded-lg text-slate-200 hover:bg-[#151E2E] hover:text-white font-medium"
              >
                সুবিধাসমূহ
              </button>
              <button
                onClick={() => handleNav('pricing')}
                className="block w-full text-left px-3 py-2 rounded-lg text-slate-200 hover:bg-[#151E2E] hover:text-white font-medium"
              >
                মূল্য ও লাইফটাইম
              </button>
              <button
                onClick={() => handleNav('about')}
                className="block w-full text-left px-3 py-2 rounded-lg text-slate-200 hover:bg-[#151E2E] hover:text-white font-medium"
              >
                আমাদের সম্পর্কে
              </button>
              <button
                onClick={() => handleNav('contact')}
                className="block w-full text-left px-3 py-2 rounded-lg text-slate-200 hover:bg-[#151E2E] hover:text-white font-medium"
              >
                যোগাযোগ
              </button>
              <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenLogin();
                  }}
                  className="w-full py-2.5 rounded-lg border border-slate-700 bg-[#151E2E] text-white font-medium"
                >
                  লগইন
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenRegister();
                  }}
                  className="w-full py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold shadow"
                >
                  ফ্রি ট্রায়াল শুরু করুন
                </button>
                {onToggleAiChat && (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onToggleAiChat();
                    }}
                    className="w-full py-2.5 rounded-lg border border-orange-800 bg-orange-950/50 text-orange-300 font-bold flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-orange-400" />
                    রেস্তোরাঁ এআই সহকারী
                  </button>
                )}
                <button
                  onClick={() => handleNav('admin-login')}
                  className="w-full py-2 text-center text-xs text-slate-400 hover:text-white"
                >
                  সুপার অ্যাডমিন লগইন
                </button>
              </div>
            </>
          ) : restaurant ? (
            <>
              <div className="p-3 mb-2 rounded-xl bg-[#111927] border border-slate-800 text-xs">
                <div className="font-bold text-white">{restaurant.name}</div>
                <div className="text-slate-400">{restaurant.ownerName} ({restaurant.mobile})</div>
                <div className="mt-1">
                  {restaurant.isLifetime ? (
                    <span className="text-emerald-400 font-semibold">লাইফটাইম অ্যাক্টিভেটেড</span>
                  ) : (
                    <span className="text-orange-400 font-semibold">
                      ট্রায়াল: {formatBengaliNumber(trialInfo?.daysRemaining || 0)} দিন বাকি
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleNav('dashboard')}
                className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-slate-200 hover:bg-[#151E2E]"
              >
                <LayoutDashboard className="w-4 h-4 text-orange-400" />
                ড্যাশবোর্ড
              </button>
              <button
                onClick={() => handleNav('new-bill')}
                className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-slate-200 hover:bg-[#151E2E]"
              >
                <FilePlus className="w-4 h-4 text-orange-400" />
                নতুন বিল তৈরি
              </button>
              <button
                onClick={() => handleNav('bills')}
                className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-slate-200 hover:bg-[#151E2E]"
              >
                <Receipt className="w-4 h-4 text-orange-400" />
                বিল হিস্ট্রি
              </button>
              <button
                onClick={() => handleNav('menu')}
                className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-slate-200 hover:bg-[#151E2E]"
              >
                <BookOpen className="w-4 h-4 text-orange-400" />
                খাবার মেনু ও ক্যাটাগরি
              </button>
              <button
                onClick={() => handleNav('payment')}
                className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-slate-200 hover:bg-[#151E2E]"
              >
                <CreditCard className="w-4 h-4 text-orange-400" />
                লাইফটাইম পেমেন্ট
              </button>
              <button
                onClick={() => handleNav('profile')}
                className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-slate-200 hover:bg-[#151E2E]"
              >
                <User className="w-4 h-4 text-orange-400" />
                রেস্তোরাঁ প্রোফাইল ও সেটিংস
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logoutRestaurant();
                }}
                className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-950/40"
              >
                <LogOut className="w-4 h-4" />
                লগআউট
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleNav('admin-dashboard')}
                className="block w-full text-left px-3 py-2 rounded-lg text-slate-200 hover:bg-[#151E2E]"
              >
                অ্যাডমিন ড্যাশবোর্ড
              </button>
              <button
                onClick={() => handleNav('admin-restaurants')}
                className="block w-full text-left px-3 py-2 rounded-lg text-slate-200 hover:bg-[#151E2E]"
              >
                রেস্তোরাঁ ডিরেক্টরি
              </button>
              <button
                onClick={() => handleNav('admin-payments')}
                className="block w-full text-left px-3 py-2 rounded-lg text-slate-200 hover:bg-[#151E2E]"
              >
                পেমেন্ট আবেদন ও যাচাই
              </button>
              <button
                onClick={() => handleNav('admin-settings')}
                className="block w-full text-left px-3 py-2 rounded-lg text-slate-200 hover:bg-[#151E2E]"
              >
                সিস্টেম সেটিংস ও ব্র্যান্ডিং
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logoutAdmin();
                }}
                className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-950/40"
              >
                <LogOut className="w-4 h-4" />
                <span>অ্যাডমিন প্রস্থান</span>
              </button>
            </>
          )}

          {onOpenSiteLock && (
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenSiteLock();
              }}
              className="flex items-center justify-center gap-2 w-full py-2.5 mt-2 rounded-lg border border-amber-500/40 bg-[#111927] text-amber-300 font-bold text-xs cursor-pointer"
            >
              <Lock className="w-4 h-4 text-amber-400" />
              <span>ওয়েবসাইট লক করুন (৪ ডিজিট পিন)</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};
