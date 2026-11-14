import React from 'react';
import {
  Receipt,
  Sparkles,
  Zap,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  ArrowRight,
  CreditCard,
  Headphones,
  Award,
  Phone,
  Mail,
  MapPin,
  Mic,
  TrendingUp,
} from 'lucide-react';
import { formatBengaliNumber, formatTaka } from '../../utils/date';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import { TopAccentBar, type TopAccentVariant } from '../common/TopAccentBar';
import heroPosImg from '../../assets/images/hero_restaurant_pos_1794620649509.jpg';

interface HomeProps {
  onOpenRegister: () => void;
  onOpenLogin: () => void;
  onNavigate: (view: string) => void;
  lifetimeFee?: number;
  bkashNumber?: string;
  nagadNumber?: string;
}

export const Home: React.FC<HomeProps> = ({
  onOpenRegister,
  onOpenLogin,
  lifetimeFee,
  bkashNumber,
  nagadNumber,
}) => {
  const { settings } = useSiteSettings();

  const resolvedFee = lifetimeFee ?? settings.lifetimeFee;
  const resolvedBkash = bkashNumber ?? settings.bkashNumber;
  const resolvedNagad = nagadNumber ?? settings.nagadNumber;

  const featureItems: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    desc: string;
    accent: TopAccentVariant;
    iconStyle: string;
  }[] = [
    {
      icon: Zap,
      title: 'বিদ্যুৎগতির সহজ বিলিং',
      desc: 'খাবারের ক্যাটাগরি ও নামের বড় বাটনে ক্লিক করলেই বিল তৈরি হয়ে যায়। বারবার ক্লিকে স্বয়ংক্রিয়ভাবে সংখ্যা বৃদ্ধি পায়।',
      accent: 'amber',
      iconStyle: 'text-amber-400 bg-amber-950/60 border-amber-700/60',
    },
    {
      icon: Mic,
      title: 'ভয়েস অর্ডার ডিক্টেশন (AI)',
      desc: 'মাইক্রোফোনে বাংলায় খাবারের নাম ও পরিমাণ বলুন—এআই স্বয়ংক্রিয়ভাবে মিলিয়ে বিলের তালিকায় যোগ করে দেবে।',
      accent: 'cyan',
      iconStyle: 'text-cyan-400 bg-cyan-950/60 border-cyan-700/60',
    },
    {
      icon: Receipt,
      title: 'খাঁটি বাংলায় ডিজিটাল PDF রসিদ',
      desc: 'প্রতিটি বিলের জন্য দৃষ্টিনন্দন বাংলা ইনভয়েস তৈরি হয় যা মোবাইল বা কম্পিউটারে এক ক্লিকে প্রিন্ট বা PDF ডাউনলোড করা যায়।',
      accent: 'blue',
      iconStyle: 'text-blue-400 bg-blue-950/60 border-blue-700/60',
    },
    {
      icon: Smartphone,
      title: 'মোবাইল ও পিসিতে সমান পারফরম্যান্স',
      desc: 'কোনো ভারী সফটওয়্যার ইন্সটল করার দরকার নেই। অ্যান্ড্রয়েড মোবাইল বা কম্পিউটার ব্রাউজার দিয়ে আনলিমিটেড ডিভাইস থেকে চালান।',
      accent: 'emerald',
      iconStyle: 'text-emerald-400 bg-emerald-950/60 border-emerald-700/60',
    },
    {
      icon: CreditCard,
      title: 'বিকাশ ও নগদে লাইফটাইম অ্যাক্সেস',
      desc: `কোনো মাসিক বা বাৎসরিক ফি নেই! মাত্র ${formatTaka(resolvedFee)} টাকায় একবার পেমেন্ট করে আজীবনের জন্য ব্যবহার করুন।`,
      accent: 'violet',
      iconStyle: 'text-purple-400 bg-purple-950/60 border-purple-700/60',
    },
    {
      icon: Award,
      title: 'রেস্তোরাঁর তথ্য সম্পূর্ণ গোপনীয়',
      desc: 'মাল্টি-টেন্যান্ট সুরক্ষিত ক্লাউড সিস্টেম। প্রতিটি রেস্তোরাঁর ডাটাবেজ আলাদা ও এনক্রিপ্টেড, আপনার বিক্রির হিসাব সুরক্ষিত থাকে।',
      accent: 'rose',
      iconStyle: 'text-rose-400 bg-rose-950/60 border-rose-700/60',
    },
  ];

  const businessTypes: { title: string; tag: string; accent: TopAccentVariant }[] = [
    { title: 'হোটেল ও রেস্তোরাঁ', tag: 'Dine-in ও টেকঅ্যাওয়ে', accent: 'amber' },
    { title: 'বিরিয়ানি হাউজ', tag: 'কাচ্চি ও তেহারি', accent: 'blue' },
    { title: 'ফাস্টফুড ও ক্যাফে', tag: 'বার্গার ও কফি', accent: 'emerald' },
    { title: 'মিষ্টান্ন ভাণ্ডার', tag: 'মিষ্টি ও দই', accent: 'violet' },
    { title: 'চায়ের দোকান ও স্ন্যাক্স', tag: 'চা ও পরোটা', accent: 'cyan' },
    { title: 'বেকারি শপ', tag: 'কেক ও বিস্কুট', accent: 'rose' },
  ];

  return (
    <div className="bg-[#0B0F17] text-white space-y-20 pb-20">
      {/* HERO SECTION (2-Column Executive Split) */}
      <section className="relative overflow-hidden pt-10 pb-14 md:pt-16 md:pb-20 border-b border-slate-800/80 bg-[radial-gradient(ellipse_at_top,_rgba(249,115,22,0.12),transparent_60%)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Copy & Primary CTA */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#0E1524] border border-orange-500/40 text-orange-300 text-xs sm:text-sm font-bold shadow-md relative overflow-hidden">
                <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
                <span>{settings.siteName} — বাংলাদেশের ১ নম্বর রেস্তোরাঁ বিলিং সফটওয়্যার</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-[1.2]">
                {settings.heroTitle}
              </h1>

              <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                {settings.heroSubtitle}
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <button
                  onClick={onOpenRegister}
                  className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-extrabold text-base shadow-xl shadow-orange-600/25 transition-all hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{formatBengaliNumber(settings.trialDays)} দিনের সম্পূর্ণ ফ্রি ট্রায়াল শুরু করুন</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={onOpenLogin}
                  className="w-full sm:w-auto px-6 py-4 rounded-xl border border-slate-700 bg-[#0E1524] hover:bg-[#151E2E] hover:border-slate-500 text-white font-bold text-base transition-colors cursor-pointer"
                >
                  অ্যাকাউন্টে লগইন করুন
                </button>
              </div>

              {/* Clean Text Metadata Row */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 text-xs text-slate-300 pt-1 font-semibold">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  কোনো ক্রেডিট কার্ডের প্রয়োজন নেই
                </span>
                <span className="text-slate-600">·</span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  তাৎক্ষণিক সক্রিয়করণ
                </span>
                <span className="text-slate-600">·</span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  অনলাইন ক্লাউড ডাটাবেজ
                </span>
              </div>
            </div>

            {/* Right Executive Product Visual */}
            <div className="lg:col-span-5">
              <div className="relative overflow-hidden rounded-3xl bg-[#0E1524] border border-slate-800 shadow-2xl p-3 sm:p-4">
                <TopAccentBar variant="amber" />
                <div className="relative rounded-2xl overflow-hidden bg-[#111927] border border-slate-800/80 aspect-video">
                  <img
                    src={heroPosImg}
                    alt={`${settings.siteName} ডিজিটাল রেস্তোরাঁ বিলিং কাউন্টার`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F17]/90 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="block font-extrabold text-white">{settings.siteName} POS</span>
                      <span className="text-[11px] text-orange-300 font-semibold">
                        ভয়েস বিলিং · ইনভয়েস প্রিন্ট · ডেইলি রিপোর্ট
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-950/90 border border-emerald-700/70 text-emerald-300 font-bold shrink-0">
                      লাইভ ক্লাউড
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4-COLUMN EXECUTIVE METRIC STRIP */}
          <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: 'ফ্রি ট্রায়াল মেয়াদ',
                value: `${formatBengaliNumber(settings.trialDays)} দিন`,
                sub: 'সম্পূর্ণ আনলিমিটেড ফিচার',
                accent: 'amber' as TopAccentVariant,
              },
              {
                label: 'লাইফটাইম লাইসেন্স ফি',
                value: formatTaka(resolvedFee),
                sub: 'এককালীন পরিশোধ, কোনো মাসিক ফি নেই',
                accent: 'emerald' as TopAccentVariant,
              },
              {
                label: 'এআই ও ভয়েস অর্ডার',
                value: 'স্মার্ট POS',
                sub: 'কথা বলেই সরাসরি বিল তৈরি',
                accent: 'blue' as TopAccentVariant,
              },
              {
                label: 'ক্লাউড ও রিপোর্ট',
                value: 'A4 + CSV',
                sub: '১ ক্লিকে বাংলা প্রিন্ট ও ডাউনলোড',
                accent: 'violet' as TopAccentVariant,
              },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-[#0E1524] border border-slate-800 shadow-lg"
              >
                <TopAccentBar variant={stat.accent} />
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider relative z-10 block">
                  {stat.label}
                </span>
                <div className="mt-2 text-xl sm:text-2xl font-black text-white relative z-10">
                  {stat.value}
                </div>
                <p className="text-[11px] text-slate-300 mt-1 relative z-10">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CORE FEATURES SECTION */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
            {settings.siteName} সফটওয়্যারের প্রধান সুবিধাসমূহ
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-300">
            কোনো জটিলতা ছাড়াই যেকোনো ব্যক্তি প্রথম দিন থেকেই স্বাচ্ছন্দ্যে বিলিং ও বিক্রির হিসাব পরিচালনা করতে পারবেন।
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featureItems.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="relative overflow-hidden p-6 rounded-2xl bg-[#0E1524] border border-slate-800 shadow-xl hover:border-slate-700 transition-all space-y-3"
              >
                <TopAccentBar variant={feat.accent} />
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border relative z-10 ${feat.iconStyle}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white relative z-10">
                  {feat.title}
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed relative z-10">
                  {feat.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* PRICING & LIFETIME ACCESS SECTION */}
      <section id="pricing" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden bg-[#0E1524] text-white rounded-3xl p-7 sm:p-12 shadow-2xl border border-slate-800">
          <TopAccentBar variant="amber" />

          <div className="max-w-3xl mx-auto text-center space-y-4 relative z-10">
            <span className="inline-block px-3.5 py-1 rounded-full bg-orange-950/70 text-orange-300 border border-orange-700/60 text-xs font-bold uppercase tracking-wider">
              স্বচ্ছ ও সাশ্রয়ী প্রাইসিং
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              {formatBengaliNumber(settings.trialDays)} দিনের ফ্রি ট্রায়াল, এরপর মাত্র {formatTaka(resolvedFee)} এ লাইফটাইম অ্যাক্সেস!
            </h2>
            <p className="text-slate-300 text-sm sm:text-base max-w-xl mx-auto">
              কোনো মাসিক চার্জ নেই, কোনো বাৎসরিক রিনিউয়াল ফি নেই। একবার এককালীন পেমেন্ট করলেই আপনার রেস্তোরাঁর জন্য স্থায়ী লাইসেন্স।
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto relative z-10">
            {/* Free Trial Card */}
            <div className="relative overflow-hidden p-6 rounded-2xl bg-[#111927] border border-slate-800 flex flex-col justify-between space-y-4 shadow-lg">
              <TopAccentBar variant="emerald" />
              <div className="relative z-10">
                <span className="text-xs font-semibold uppercase text-emerald-400 tracking-wider">
                  প্রথম ধাপ
                </span>
                <h3 className="text-2xl font-bold text-white mt-1">
                  {formatBengaliNumber(settings.trialDays)} দিনের ফ্রি ট্রায়াল
                </h3>
                <div className="mt-3 text-3xl font-extrabold text-emerald-400">
                  ৳০ <span className="text-xs font-normal text-slate-300">/ প্রথম {formatBengaliNumber(settings.trialDays)} দিন সম্পূর্ণ ফ্রি</span>
                </div>
                <ul className="mt-6 space-y-2.5 text-xs sm:text-sm text-slate-200">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    আনলিমিটেড ডিজিটাল বিল ও ভয়েস অর্ডার
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    বাংলা PDF ক্যাশ মেমো ও A4 রিপোর্ট
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    খাবার আইটেম ও ক্যাটাগরি ম্যানেজমেন্ট
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    দৈনিক বিক্রি ও অর্ডার অ্যানালিটিক্স
                  </li>
                </ul>
              </div>
              <button
                onClick={onOpenRegister}
                className="w-full py-3 rounded-xl bg-[#151E2E] hover:bg-slate-700 border border-slate-700 text-white font-bold text-sm transition-colors text-center cursor-pointer relative z-10"
              >
                এখনই ফ্রি ট্রায়াল শুরু করুন
              </button>
            </div>

            {/* Lifetime Access Card */}
            <div className="relative overflow-hidden p-6 rounded-2xl bg-[#151E2E] border border-orange-500/60 flex flex-col justify-between space-y-4 shadow-xl">
              <TopAccentBar variant="amber" />
              <span className="absolute top-3 right-5 px-3 py-0.5 rounded-full bg-orange-600 text-white text-[11px] font-bold uppercase tracking-wide z-10">
                জনপ্রিয় পছন্দ
              </span>
              <div className="relative z-10">
                <span className="text-xs font-semibold uppercase text-orange-400 tracking-wider">
                  স্থায়ী লাইসেন্স
                </span>
                <h3 className="text-2xl font-bold text-white mt-1">লাইফটাইম অ্যাক্সেস (আজীবন)</h3>
                <div className="mt-3 text-3xl font-extrabold text-amber-300">
                  {formatTaka(resolvedFee)}{' '}
                  <span className="text-xs font-normal text-slate-300">
                    / এককালীন একবারে পরিশোধ
                  </span>
                </div>
                <ul className="mt-6 space-y-2.5 text-xs sm:text-sm text-slate-200">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                    আজীবন আনলিমিটেড ব্যবহার ও আপডেট
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                    কোনো মাসিক বা বাৎসরিক সাবস্ক্রিপশন নেই
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                    বিকাশ বা নগদ সেন্ড মানি দিয়ে পরিশোধ
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-orange-400 shrink-0" />
                    একাধিক ডিভাইসে একসাথে পরিচালনা
                  </li>
                </ul>
              </div>

              <div className="pt-2 relative z-10">
                <div className="p-3 rounded-xl bg-[#0B0F17] border border-slate-700 text-xs text-slate-200 mb-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">bKash (বিকাশ):</span>
                    <span className="font-mono font-bold text-pink-400">{resolvedBkash}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Nagad (নগদ):</span>
                    <span className="font-mono font-bold text-orange-400">{resolvedNagad}</span>
                  </div>
                </div>
                <button
                  onClick={onOpenRegister}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-extrabold text-sm shadow-md transition-all text-center cursor-pointer"
                >
                  রেজিস্ট্রেশন করে চালু করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHO IS THIS FOR? */}
      <section id="about" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            যাদের ব্যবসার জন্য {settings.siteName} নিখুঁত সমাধান
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            ছোট বা বড়—যেকোনো খাদ্য বিক্রেতার ক্যাশ কাউন্টারের কাজ করে দেবে নিমিষেই
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-center">
          {businessTypes.map((item, idx) => (
            <div
              key={idx}
              className="relative overflow-hidden p-4 pt-5 rounded-2xl bg-[#0E1524] border border-slate-800 shadow-lg space-y-2"
            >
              <TopAccentBar variant={item.accent} />
              <div className="w-10 h-10 mx-auto rounded-xl bg-[#151E2E] border border-slate-700 text-orange-400 flex items-center justify-center font-extrabold text-base relative z-10">
                {formatBengaliNumber(idx + 1)}
              </div>
              <h4 className="text-sm font-bold text-white relative z-10">
                {item.title}
              </h4>
              <p className="text-[11px] text-slate-400 relative z-10">
                {item.tag}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CONTACT & SUPPORT */}
      <section id="contact" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden p-8 sm:p-10 rounded-3xl bg-[#0E1524] border border-slate-800 text-center max-w-4xl mx-auto space-y-5 shadow-2xl">
          <TopAccentBar variant="blue" />
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white flex items-center justify-center shadow-lg relative z-10">
            <Headphones className="w-6 h-6" />
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-white relative z-10">
            যেকোনো সহায়তা বা প্রশ্নের জন্য আমরা আছি আপনার পাশে
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed max-w-xl mx-auto relative z-10">
            সফটওয়্যার ব্যবহার, রেজিস্ট্রেশন বা পেমেন্ট সংক্রান্ত যেকোনো তথ্যের জন্য সরাসরি যোগাযোগ করুন:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto pt-1 relative z-10 text-left">
            <a
              href={`tel:${settings.supportPhone}`}
              className="relative overflow-hidden p-3.5 rounded-xl bg-[#111927] border border-slate-800 hover:border-orange-500/60 transition-colors flex items-center gap-3"
            >
              <Phone className="w-4 h-4 text-orange-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">হেল্পলাইন নম্বর</span>
                <span data-testid="home-support-phone" className="font-mono text-sm font-bold text-white truncate block">
                  {settings.supportPhone}
                </span>
              </div>
            </a>

            <div className="p-3.5 rounded-xl bg-[#111927] border border-slate-800 flex items-center gap-3">
              <Mail className="w-4 h-4 text-blue-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">ইমেইল</span>
                <span data-testid="home-support-email" className="text-xs font-bold text-white truncate block">
                  {settings.supportEmail}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#111927] border border-slate-800 flex items-center gap-3">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">ঠিকানা</span>
                <span data-testid="home-contact-address" className="text-xs font-bold text-white truncate block">
                  {settings.contactAddress}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 relative z-10">
            <button
              onClick={onOpenRegister}
              className="px-7 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-extrabold text-sm shadow-lg transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              বিনামূল্যে অ্যাকাউন্ট খুলুন
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
