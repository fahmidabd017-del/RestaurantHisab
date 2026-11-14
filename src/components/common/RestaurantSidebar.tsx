import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import { calculateTrialStatus, formatBengaliNumber, formatTaka } from '../../utils/date';
import { BrandLogo } from './BrandLogo';
import { TopAccentBar } from './TopAccentBar';
import {
  LayoutDashboard,
  FilePlus,
  Receipt,
  BookOpen,
  CreditCard,
  User,
  LogOut,
  Sparkles,
  ShieldCheck,
  Clock,
  X,
} from 'lucide-react';

interface RestaurantSidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleAiChat?: () => void;
}

export const RestaurantSidebar: React.FC<RestaurantSidebarProps> = ({
  currentView,
  onNavigate,
  isMobileOpen,
  onCloseMobile,
  onToggleAiChat,
}) => {
  const { restaurant, logoutRestaurant } = useAuth();
  const { settings } = useSiteSettings();

  if (!restaurant) return null;

  const trialInfo = calculateTrialStatus(restaurant.trialEndsAt, restaurant.isLifetime);

  const navItems = [
    {
      id: 'dashboard',
      label: 'ড্যাশবোর্ড',
      subLabel: 'দৈনিক হিসাব ও সারাংশ',
      icon: LayoutDashboard,
    },
    {
      id: 'new-bill',
      label: 'নতুন বিল',
      subLabel: '১ ক্লিকে মেমো তৈরি',
      icon: FilePlus,
      highlight: true,
    },
    {
      id: 'bills',
      label: 'বিল হিস্ট্রি',
      subLabel: 'সকল ইনভয়েস ও প্রিন্ট',
      icon: Receipt,
    },
    {
      id: 'menu',
      label: 'খাবার মেনু',
      subLabel: 'আইটেম ও মূল্য তালিকা',
      icon: BookOpen,
    },
    {
      id: 'payment',
      label: 'লাইফটাইম পেমেন্ট',
      subLabel: restaurant.isLifetime ? 'সক্রিয় লাইফটাইম' : 'বিকাশ/নগদ অ্যাক্টিভেশন',
      icon: CreditCard,
      badge: restaurant.isLifetime ? 'সক্রিয়' : formatTaka(settings.lifetimeFee),
    },
    {
      id: 'profile',
      label: 'প্রোফাইল ও সেটিংস',
      subLabel: 'রেস্তোরাঁর তথ্য ও পাসওয়ার্ড',
      icon: User,
    },
  ];

  const handleItemClick = (viewId: string) => {
    onNavigate(viewId);
    onCloseMobile();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-68 sm:w-72 bg-[#0B0F17] border-r border-slate-800 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* BRAND HEADER */}
        <div className="relative overflow-hidden p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-[#0E1524]">
          <TopAccentBar variant="amber" />
          <div
            onClick={() => handleItemClick('dashboard')}
            className="flex items-center gap-3 cursor-pointer group relative z-10 min-w-0"
          >
            <BrandLogo
              logoUrl={settings.logoUrl}
              siteName={settings.siteName}
              size="md"
              className="group-hover:scale-105 transition-transform"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base text-white tracking-tight truncate">
                  {settings.siteName}
                </span>
                {settings.siteBadge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-black bg-orange-950/80 text-orange-300 uppercase border border-orange-800/60 shrink-0">
                    {settings.siteBadge}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 font-medium -mt-0.5 truncate">
                {settings.siteTagline}
              </p>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white lg:hidden cursor-pointer relative z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* RESTAURANT PROFILE CARD */}
        <div className="p-3.5 border-b border-slate-800 shrink-0 bg-[#0B0F17]">
          <div className="relative overflow-hidden p-3.5 rounded-xl bg-[#0E1524] border border-slate-800">
            <TopAccentBar variant={restaurant.isLifetime ? 'emerald' : 'blue'} />
            <div className="flex items-start justify-between gap-2 relative z-10">
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-white truncate">
                  {restaurant.name}
                </h3>
                <p className="text-xs text-slate-300 font-medium truncate">
                  মালিক: {restaurant.ownerName}
                </p>
                <p className="text-[11px] text-slate-400 font-mono">
                  {formatBengaliNumber(restaurant.mobile)}
                </p>
              </div>

              {restaurant.isLifetime ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/90 text-emerald-300 text-[10px] font-black shrink-0 border border-emerald-800">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  লাইফটাইম
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-950/90 text-orange-300 text-[10px] font-bold shrink-0 border border-orange-800">
                  <Clock className="w-3 h-3 text-orange-400" />
                  {formatBengaliNumber(trialInfo.daysRemaining)} দিন বাকি
                </span>
              )}
            </div>
          </div>
        </div>

        {/* MAIN NAVIGATION LIST (LEFT SIDE) */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1.5">
          <div className="px-3 py-1.5 text-[11px] font-black text-slate-400 uppercase tracking-wider">
            রেস্তোরাঁ মেনু
          </div>

          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer group ${
                  isActive
                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-300 hover:bg-[#151E2E] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-[#151E2E] text-slate-300 group-hover:bg-orange-950/60 group-hover:text-orange-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-left truncate">
                    <span className="block truncate font-extrabold text-white">{item.label}</span>
                    <span
                      className={`block text-[10px] font-medium truncate ${
                        isActive ? 'text-orange-100' : 'text-slate-400'
                      }`}
                    >
                      {item.subLabel}
                    </span>
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0 ${
                      isActive
                        ? 'bg-white/25 text-white'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* AI Assistant Studio Button */}
          {onToggleAiChat && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onToggleAiChat();
                  onCloseMobile();
                }}
                className="relative overflow-hidden w-full flex items-center justify-between px-3.5 py-3 rounded-2xl bg-[#0E1524] border border-orange-800/70 hover:border-orange-500 text-orange-300 font-extrabold text-xs sm:text-sm transition-all cursor-pointer shadow-xs group"
              >
                <TopAccentBar variant="amber" />
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <Sparkles className="w-4 h-4 text-amber-200" />
                  </div>
                  <div className="text-left">
                    <span className="block font-black text-white">এআই সহকারী স্টুডিও</span>
                    <span className="block text-[10px] text-orange-400 font-bold">ভয়েস ও বিলিং সহকারী</span>
                  </div>
                </div>
                <span className="px-1.5 py-0.5 rounded-md bg-orange-600 text-white text-[10px] font-black uppercase relative z-10">
                  AI
                </span>
              </button>
            </div>
          )}
        </nav>

        {/* SIDEBAR FOOTER */}
        <div className="p-3.5 border-t border-slate-800 bg-[#0E1524] shrink-0 space-y-2">
          <button
            type="button"
            onClick={logoutRestaurant}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-rose-900/60 bg-rose-950/40 hover:bg-rose-950/70 text-rose-300 font-extrabold text-xs transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>লগআউট করুন</span>
          </button>
          <div className="text-center text-[10px] text-slate-400 font-medium truncate">
            {settings.siteName} • বাংলা ক্লাউড বিলিং
          </div>
        </div>
      </aside>
    </>
  );
};
