import React from 'react';
import { Phone, Mail, MapPin, Heart } from 'lucide-react';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import { BrandLogo } from './BrandLogo';
import { TopAccentBar } from './TopAccentBar';

interface FooterProps {
  onNavigate: (view: string) => void;
  onOpenRegister: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenRegister }) => {
  const { settings } = useSiteSettings();

  return (
    <footer className="relative overflow-hidden bg-[#080C14] text-slate-300 border-t border-slate-800/90">
      <TopAccentBar variant="amber" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <BrandLogo
                logoUrl={settings.logoUrl}
                siteName={settings.siteName}
                size="md"
              />
              <div className="min-w-0">
                <span
                  data-testid="footer-site-name"
                  className="font-bold text-lg text-white tracking-tight block truncate"
                >
                  {settings.siteName}
                </span>
                <p className="text-xs text-orange-400 font-medium truncate">
                  {settings.siteTagline}
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              {settings.footerDescription}
            </p>
            <div className="text-xs text-slate-500">
              ডিজাইন ও ডেভেলপমেন্ট: {settings.contactAddress}
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              দ্রুত লিঙ্ক
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <button
                  onClick={() => onNavigate('home')}
                  className="hover:text-orange-400 transition-colors cursor-pointer"
                >
                  হোম পেজ
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('features')}
                  className="hover:text-orange-400 transition-colors cursor-pointer"
                >
                  সফটওয়্যারের সুবিধাসমূহ
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('pricing')}
                  className="hover:text-orange-400 transition-colors cursor-pointer"
                >
                  মূল্য ও লাইফটাইম অ্যাক্সেস
                </button>
              </li>
              <li>
                <button
                  onClick={onOpenRegister}
                  className="text-orange-400 hover:text-orange-300 font-semibold transition-colors cursor-pointer"
                >
                  ৩০ দিনের ফ্রি ট্রায়াল শুরু করুন
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Business Types */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              যাদের জন্য উপযুক্ত
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>• হোটেল ও রেস্তোরাঁ (Dine-in)</li>
              <li>• বিরিয়ানি ও তেহারি হাউজ</li>
              <li>• ফাস্টফুড ও ক্যাফে শপ</li>
              <li>• মিষ্টান্ন ভাণ্ডার ও বেকারি</li>
              <li>• চায়ের দোকান ও স্ন্যাক্স কর্নার</li>
            </ul>
          </div>

          {/* Col 4: Contact & Payment Methods */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              হেল্পলাইন ও যোগাযোগ
            </h4>
            <div className="space-y-2.5 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-orange-400 shrink-0" />
                <span data-testid="footer-support-phone" className="font-mono">
                  {settings.supportPhone}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                <span data-testid="footer-support-email" className="break-all">
                  {settings.supportEmail}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                <span data-testid="footer-contact-address">
                  {settings.contactAddress}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <p className="text-xs text-slate-400 mb-1.5 font-medium">লাইফটাইম পেমেন্ট মেথড:</p>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded bg-pink-950/60 text-pink-300 border border-pink-800/60 text-xs font-semibold">
                  bKash ({settings.bkashNumber})
                </span>
                <span className="px-2 py-0.5 rounded bg-orange-950/60 text-orange-300 border border-orange-800/60 text-xs font-semibold">
                  Nagad ({settings.nagadNumber})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="mt-10 pt-6 border-t border-slate-800/90 text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p data-testid="footer-copyright">{settings.copyrightText}</p>
          <p className="flex items-center gap-1">
            বাংলাদেশের খাদ্য ব্যবসার জন্য ভালোবাসায় নির্মিত <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          </p>
        </div>
      </div>
    </footer>
  );
};
