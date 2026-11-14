import React, { useEffect, useState, useRef } from 'react';
import type { AdminNotification, PaymentRequest, Restaurant, Announcement } from '../../types';
import {
  getAllRestaurantsForAdmin,
  getAllPaymentRequests,
  getAdminNotifications,
  markAdminNotificationRead,
  approvePaymentRequest,
  rejectPaymentRequest,
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '../../services/db';
import {
  formatBengaliDate,
  formatBengaliNumber,
  formatTaka,
  getBangladeshDateString,
} from '../../utils/date';
import { hashString } from '../../utils/crypto';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import { DEFAULT_SITE_SETTINGS } from '../../utils/siteSettings';
import { resizeLogoFileToDataUrl } from '../../utils/imageResize';
import { BrandLogo } from '../common/BrandLogo';
import { TopAccentBar } from '../common/TopAccentBar';
import {
  ShieldCheck,
  Building2,
  CreditCard,
  CheckCircle2,
  XCircle,
  Bell,
  Settings,
  Search,
  AlertTriangle,
  Megaphone,
  Plus,
  Trash2,
  Upload,
  Globe,
  RotateCcw,
  Phone,
  Mail,
  MapPin,
  Image as ImageIcon,
  X,
} from 'lucide-react';

interface AdminDashboardProps {
  initialSubTab?: 'dashboard' | 'restaurants' | 'payments' | 'ads' | 'settings' | 'notifications';
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  initialSubTab = 'dashboard',
}) => {
  const { settings, updateSiteSettings } = useSiteSettings();
  const [subTab, setSubTab] = useState(initialSubTab);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // In-app Approval & Rejection modals
  const [approvingReq, setApprovingReq] = useState<PaymentRequest | null>(null);
  const [rejectingReq, setRejectingReq] = useState<PaymentRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Announcement form
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [adTitle, setAdTitle] = useState('');
  const [adContent, setAdContent] = useState('');
  const [adTag, setAdTag] = useState<Announcement['tag']>('অফার');
  const [adIsActive, setAdIsActive] = useState(true);

  // Branding & Website Identity Form State
  const [siteNameInput, setSiteNameInput] = useState(settings.siteName);
  const [siteTaglineInput, setSiteTaglineInput] = useState(settings.siteTagline);
  const [siteBadgeInput, setSiteBadgeInput] = useState(settings.siteBadge);
  const [logoUrlInput, setLogoUrlInput] = useState(settings.logoUrl);
  const [contactAddressInput, setContactAddressInput] = useState(settings.contactAddress);
  const [supportPhoneInput, setSupportPhoneInput] = useState(settings.supportPhone);
  const [supportEmailInput, setSupportEmailInput] = useState(settings.supportEmail);
  const [heroTitleInput, setHeroTitleInput] = useState(settings.heroTitle);
  const [heroSubtitleInput, setHeroSubtitleInput] = useState(settings.heroSubtitle);
  const [footerDescInput, setFooterDescInput] = useState(settings.footerDescription);
  const [copyrightInput, setCopyrightInput] = useState(settings.copyrightText);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [brandingSuccess, setBrandingSuccess] = useState(false);
  const logoFileRef = useRef<HTMLInputElement | null>(null);

  // Payment & Trial Settings Form State
  const [feeInput, setFeeInput] = useState(String(settings.lifetimeFee));
  const [bkashInput, setBkashInput] = useState(settings.bkashNumber);
  const [nagadInput, setNagadInput] = useState(settings.nagadNumber);
  const [trialDaysInput, setTrialDaysInput] = useState(String(settings.trialDays));
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Admin password change state
  const [newAdminPass, setNewAdminPass] = useState('');
  const [confirmAdminPass, setConfirmAdminPass] = useState('');
  const [adminPassMsg, setAdminPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const todayStr = getBangladeshDateString();

  // Keep inputs synced when settings load initially from Firestore
  useEffect(() => {
    setSiteNameInput(settings.siteName);
    setSiteTaglineInput(settings.siteTagline);
    setSiteBadgeInput(settings.siteBadge);
    setLogoUrlInput(settings.logoUrl);
    setContactAddressInput(settings.contactAddress);
    setSupportPhoneInput(settings.supportPhone);
    setSupportEmailInput(settings.supportEmail);
    setHeroTitleInput(settings.heroTitle);
    setHeroSubtitleInput(settings.heroSubtitle);
    setFooterDescInput(settings.footerDescription);
    setCopyrightInput(settings.copyrightText);
    setFeeInput(String(settings.lifetimeFee || 250));
    setBkashInput(settings.bkashNumber || '01734211584');
    setNagadInput(settings.nagadNumber || '01734211584');
    setTrialDaysInput(String(settings.trialDays || 30));
  }, [settings]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const loadAllAdminData = async () => {
    setIsLoading(true);
    try {
      const [rests, pays, notifs, ads] = await Promise.all([
        getAllRestaurantsForAdmin(),
        getAllPaymentRequests(),
        getAdminNotifications(),
        getAnnouncements(),
      ]);

      setRestaurants(rests);
      setPayments(pays);
      setNotifications(notifs);
      setAnnouncements(ads);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllAdminData();
  }, []);

  // Stats calculation
  const totalRestaurants = restaurants.length;
  const todayRegistrations = restaurants.filter(r => r.createdAt && r.createdAt.startsWith(todayStr)).length;
  const pendingPayments = payments.filter(p => p.status === 'PENDING').length;

  // Logo upload handler (resized client-side to WebP/PNG data URI)
  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedDataUrl = await resizeLogoFileToDataUrl(file, 220);
      setLogoUrlInput(compressedDataUrl);
      showToast('লোগো প্রিভিউ প্রস্তুত হয়েছে! সংরক্ষণ করতে "ব্র্যান্ডিং ও তথ্য সংরক্ষণ করুন" বাটনে ক্লিক করুন।', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'লোগো আপলোড করতে সমস্যা হয়েছে।', 'error');
    } finally {
      if (logoFileRef.current) {
        logoFileRef.current.value = '';
      }
    }
  };

  // Save Website Branding & Contact Settings
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteNameInput.trim()) {
      showToast('ওয়েবসাইটের নাম দেওয়া আবশ্যক।', 'error');
      return;
    }

    setIsSavingBranding(true);
    try {
      await updateSiteSettings({
        siteName: siteNameInput.trim(),
        siteTagline: siteTaglineInput.trim() || DEFAULT_SITE_SETTINGS.siteTagline,
        siteBadge: siteBadgeInput.trim() || DEFAULT_SITE_SETTINGS.siteBadge,
        logoUrl: logoUrlInput.trim(),
        contactAddress: contactAddressInput.trim() || DEFAULT_SITE_SETTINGS.contactAddress,
        supportPhone: supportPhoneInput.trim() || DEFAULT_SITE_SETTINGS.supportPhone,
        supportEmail: supportEmailInput.trim() || DEFAULT_SITE_SETTINGS.supportEmail,
        heroTitle: heroTitleInput.trim() || DEFAULT_SITE_SETTINGS.heroTitle,
        heroSubtitle: heroSubtitleInput.trim() || DEFAULT_SITE_SETTINGS.heroSubtitle,
        footerDescription: footerDescInput.trim() || DEFAULT_SITE_SETTINGS.footerDescription,
        copyrightText: copyrightInput.trim() || DEFAULT_SITE_SETTINGS.copyrightText,
      });

      setBrandingSuccess(true);
      showToast('ওয়েবসাইটের লোগো, নাম, ঠিকানা ও সমস্ত তথ্য সফলভাবে আপডেট হয়েছে!', 'success');
      setTimeout(() => setBrandingSuccess(false), 3500);
    } catch (err) {
      showToast('ব্র্যান্ডিং তথ্য সংরক্ষণে সমস্যা হয়েছে।', 'error');
    } finally {
      setIsSavingBranding(false);
    }
  };

  const handleResetBrandingDefaults = () => {
    setSiteNameInput(DEFAULT_SITE_SETTINGS.siteName);
    setSiteTaglineInput(DEFAULT_SITE_SETTINGS.siteTagline);
    setSiteBadgeInput(DEFAULT_SITE_SETTINGS.siteBadge);
    setLogoUrlInput(DEFAULT_SITE_SETTINGS.logoUrl);
    setContactAddressInput(DEFAULT_SITE_SETTINGS.contactAddress);
    setSupportPhoneInput(DEFAULT_SITE_SETTINGS.supportPhone);
    setSupportEmailInput(DEFAULT_SITE_SETTINGS.supportEmail);
    setHeroTitleInput(DEFAULT_SITE_SETTINGS.heroTitle);
    setHeroSubtitleInput(DEFAULT_SITE_SETTINGS.heroSubtitle);
    setFooterDescInput(DEFAULT_SITE_SETTINGS.footerDescription);
    setCopyrightInput(DEFAULT_SITE_SETTINGS.copyrightText);
    showToast('ডিফল্ট মান ফর্মে বসানো হয়েছে। সংরক্ষণ করতে সেভ বাটনে ক্লিক করুন।', 'success');
  };

  // Approve Payment
  const handleConfirmApproval = async () => {
    if (!approvingReq) return;

    setIsProcessing(true);
    try {
      await approvePaymentRequest(approvingReq.id, approvingReq.restaurantId);

      setPayments(prev =>
        prev.map(p => (p.id === approvingReq.id ? { ...p, status: 'APPROVED' } : p))
      );
      setRestaurants(prev =>
        prev.map(r => (r.id === approvingReq.restaurantId ? { ...r, isLifetime: true, paymentStatus: 'approved' } : r))
      );

      showToast(
        `অভিনন্দন! ${approvingReq.restaurantName} এর পেমেন্ট অনুমোদিত হয়েছে এবং লাইফটাইম অ্যাক্সেস সক্রিয় করা হয়েছে।`,
        'success'
      );
      setApprovingReq(null);
    } catch (err) {
      showToast('পেমেন্ট অনুমোদন করতে ব্যর্থ হয়েছে।', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reject Payment
  const handleConfirmReject = async () => {
    if (!rejectingReq || !rejectionReason.trim()) return;

    setIsProcessing(true);
    try {
      await rejectPaymentRequest(rejectingReq.id, rejectingReq.restaurantId, rejectionReason.trim());
      setPayments(prev =>
        prev.map(p =>
          p.id === rejectingReq.id
            ? { ...p, status: 'REJECTED', rejectionReason: rejectionReason.trim() }
            : p
        )
      );
      showToast('পেমেন্ট আবেদন সফলভাবে বাতিল করা হয়েছে।', 'success');
      setRejectingReq(null);
      setRejectionReason('');
    } catch (err) {
      showToast('বাতিল করতে সমস্যা হয়েছে।', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Announcement Handlers
  const handleSaveAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adTitle.trim() || !adContent.trim()) return;

    setIsProcessing(true);
    try {
      const created = await createAnnouncement({
        title: adTitle.trim(),
        content: adContent.trim(),
        tag: adTag,
        isActive: adIsActive,
      });
      setAnnouncements(prev => [created, ...prev]);
      showToast('নতুন বিজ্ঞাপন/নোটিশ সফলভাবে প্রচার করা হয়েছে! এটি সকল রেস্তোরাঁ দেখতে পাবে।', 'success');
      setIsAdModalOpen(false);
      setAdTitle('');
      setAdContent('');
    } catch (err) {
      showToast('বিজ্ঞাপন তৈরি করতে ব্যর্থ হয়েছে।', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleAd = async (ad: Announcement) => {
    try {
      const nextState = !ad.isActive;
      await updateAnnouncement(ad.id, { isActive: nextState });
      setAnnouncements(prev =>
        prev.map(a => (a.id === ad.id ? { ...a, isActive: nextState } : a))
      );
      showToast(nextState ? 'বিজ্ঞাপন সক্রিয় করা হয়েছে।' : 'বিজ্ঞাপন বন্ধ করা হয়েছে।', 'success');
    } catch (err) {
      showToast('আপডেট করতে ব্যর্থ হয়েছে।', 'error');
    }
  };

  const handleDeleteAd = async (adId: string) => {
    try {
      await deleteAnnouncement(adId);
      setAnnouncements(prev => prev.filter(a => a.id !== adId));
      showToast('বিজ্ঞাপন মুছে ফেলা হয়েছে।', 'success');
    } catch (err) {
      showToast('মুছতে ব্যর্থ হয়েছে।', 'error');
    }
  };

  // Save Payment & Trial Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const fee = parseFloat(feeInput);
    const trialDays = parseInt(trialDaysInput, 10);

    if (isNaN(fee) || fee < 0 || isNaN(trialDays) || trialDays < 1) {
      showToast('সঠিক সংখ্যা প্রদান করুন।', 'error');
      return;
    }

    try {
      await updateSiteSettings({
        lifetimeFee: fee,
        bkashNumber: bkashInput.trim(),
        nagadNumber: nagadInput.trim(),
        trialDays: trialDays,
      });

      setSettingsSuccess(true);
      showToast('পেমেন্ট ও ট্রায়াল সেটিংস সফলভাবে আপডেট হয়েছে!', 'success');
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err) {
      showToast('সেটিংস সংরক্ষণে সমস্যা হয়েছে।', 'error');
    }
  };

  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminPassMsg(null);

    if (newAdminPass.length < 8) {
      setAdminPassMsg({ type: 'error', text: 'অ্যাডমিন পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।' });
      return;
    }

    if (newAdminPass !== confirmAdminPass) {
      setAdminPassMsg({ type: 'error', text: 'উভয় পাসওয়ার্ডের মিল নেই।' });
      return;
    }

    try {
      const newHash = await hashString(newAdminPass);
      await updateSiteSettings({ adminPasswordHash: newHash });
      localStorage.setItem('restauranthisab_admin_hash_v2', newHash);
      localStorage.removeItem('restauranthisab_admin_hash');
      setAdminPassMsg({ type: 'success', text: 'অ্যাডমিন পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!' });
      setNewAdminPass('');
      setConfirmAdminPass('');
      setTimeout(() => setAdminPassMsg(null), 4000);
    } catch (err) {
      setAdminPassMsg({ type: 'error', text: 'পাসওয়ার্ড পরিবর্তনে সমস্যা হয়েছে।' });
    }
  };

  const handleMarkNotifRead = async (id: string) => {
    try {
      await markAdminNotificationRead(id);
      setNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)));
    } catch (e) {
      // non-fatal
    }
  };

  const filteredRestaurants = restaurants.filter(
    r =>
      r.name.toLowerCase().includes(restaurantSearch.trim().toLowerCase()) ||
      r.ownerName.toLowerCase().includes(restaurantSearch.trim().toLowerCase()) ||
      r.mobile.includes(restaurantSearch.trim()) ||
      r.email.toLowerCase().includes(restaurantSearch.trim().toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 text-white">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-2xl shadow-2xl border text-sm font-bold flex items-center gap-2.5 ${
            toastMsg.type === 'success'
              ? 'bg-emerald-700 text-white border-emerald-500'
              : 'bg-rose-700 text-white border-rose-500'
          }`}
        >
          {toastMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Top Executive Banner */}
      <div className="relative overflow-hidden bg-[#0E1524] border border-slate-800 text-white rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <TopAccentBar variant="violet" />
        <div className="relative z-10">
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-purple-950/80 border border-purple-700/60 text-purple-300 text-xs font-bold uppercase tracking-wider">
            সুপার অ্যাডমিন নিয়ন্ত্রণ কেন্দ্র
          </span>
          <h1 className="text-2xl font-extrabold mt-1 text-white">
            {settings.siteName} অ্যাডমিন প্যানেল
          </h1>
          <p className="text-xs text-slate-300 mt-0.5">
            ওয়েবসাইটের লোগো, নাম ও ঠিকানা পরিবর্তন, রেস্তোরাঁ ডিরেক্টরি, বিজ্ঞাপন এবং পেমেন্ট অনুমোদন
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 relative z-10">
          <button
            onClick={() => setSubTab('settings')}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Globe className="w-4 h-4" />
            লোগো ও ব্র্যান্ডিং সেটিংস
          </button>
          <button
            onClick={() => setSubTab('ads')}
            className="px-3.5 py-2 rounded-xl bg-[#151E2E] hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Megaphone className="w-4 h-4 text-orange-400" />
            নতুন বিজ্ঞাপন
          </button>
          <button
            onClick={() => setSubTab('notifications')}
            className="relative px-3.5 py-2 rounded-xl bg-purple-950/70 hover:bg-purple-900/70 border border-purple-700/60 text-purple-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            বিজ্ঞপ্তি ({formatBengaliNumber(notifications.filter(n => !n.isRead).length)})
          </button>
        </div>
      </div>

      {/* Admin Navigation SubTabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
        {[
          { id: 'dashboard', label: 'ড্যাশবোর্ড ওভারভিউ', icon: ShieldCheck },
          { id: 'restaurants', label: `রেস্তোরাঁ ডিরেক্টরি (${formatBengaliNumber(totalRestaurants)})`, icon: Building2 },
          { id: 'payments', label: `পেমেন্ট অনুমোদন (${formatBengaliNumber(payments.length)})`, icon: CreditCard },
          { id: 'ads', label: `বিজ্ঞাপন ও নোটিশ (${formatBengaliNumber(announcements.length)})`, icon: Megaphone },
          { id: 'settings', label: 'লোগো, নাম ও সিস্টেম সেটিংস', icon: Settings },
          { id: 'notifications', label: 'অ্যাডমিন বিজ্ঞপ্তি', icon: Bell },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              data-testid={`admin-tab-${tab.id}`}
              onClick={() => setSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                subTab === tab.id
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'bg-[#0E1524] border border-slate-800 text-slate-300 hover:bg-[#151E2E] hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {subTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative overflow-hidden bg-[#0E1524] p-5 rounded-2xl border border-slate-800 shadow-xl">
              <TopAccentBar variant="blue" />
              <span className="text-xs font-bold text-slate-400 uppercase relative z-10">মোট নিবন্ধিত রেস্তোরাঁ</span>
              <div className="mt-3 text-3xl font-extrabold text-white relative z-10">
                {formatBengaliNumber(totalRestaurants)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 relative z-10">সর্বমোট রেস্তোরাঁ অ্যাকাউন্ট</p>
            </div>

            <div className="relative overflow-hidden bg-[#0E1524] p-5 rounded-2xl border border-slate-800 shadow-xl">
              <TopAccentBar variant="violet" />
              <span className="text-xs font-bold text-slate-400 uppercase relative z-10">আজকের নতুন রেজিস্ট্রেশন</span>
              <div className="mt-3 text-3xl font-extrabold text-purple-400 relative z-10">
                {formatBengaliNumber(todayRegistrations)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 relative z-10">আজকে নতুন যুক্ত হওয়া রেস্তোরাঁ</p>
            </div>

            <div className="relative overflow-hidden bg-[#0E1524] p-5 rounded-2xl border border-slate-800 shadow-xl">
              <TopAccentBar variant="amber" />
              <span className="text-xs font-bold text-slate-400 uppercase relative z-10">অপেক্ষমান পেমেন্ট আবেদন</span>
              <div className="mt-3 text-3xl font-extrabold text-amber-400 relative z-10">
                {formatBengaliNumber(pendingPayments)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 relative z-10">যাচাইয়ের অপেক্ষায় থাকা ট্রানজেকশন</p>
            </div>

            <div className="relative overflow-hidden bg-[#0E1524] p-5 rounded-2xl border border-slate-800 shadow-xl">
              <TopAccentBar variant="emerald" />
              <span className="text-xs font-bold text-slate-400 uppercase relative z-10">সক্রিয় বিজ্ঞাপন ও নোটিশ</span>
              <div className="mt-3 text-3xl font-extrabold text-emerald-400 relative z-10">
                {formatBengaliNumber(announcements.filter(a => a.isActive).length)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 relative z-10">রেস্তোরাঁর ড্যাশবোর্ডে চলমান প্রচার</p>
            </div>
          </div>

          {/* Quick Pending Payments Section */}
          <div className="relative overflow-hidden bg-[#0E1524] rounded-2xl border border-slate-800 shadow-xl p-6 space-y-4">
            <TopAccentBar variant="amber" />
            <div className="flex items-center justify-between relative z-10">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-400" />
                অপেক্ষমান লাইফটাইম পেমেন্ট আবেদন ({formatBengaliNumber(pendingPayments)})
              </h3>
              <button
                onClick={() => setSubTab('payments')}
                className="text-xs text-purple-400 font-bold hover:underline cursor-pointer"
              >
                সব আবেদন দেখুন →
              </button>
            </div>

            {isLoading ? (
              <p className="text-xs text-slate-400 py-3 relative z-10">তথ্য লোড হচ্ছে...</p>
            ) : pendingPayments === 0 ? (
              <p className="text-xs text-slate-400 py-3 relative z-10">এই মুহূর্তে কোনো অপেক্ষমান পেমেন্ট নেই।</p>
            ) : (
              <div className="space-y-3 relative z-10">
                {payments
                  .filter(p => p.status === 'PENDING')
                  .slice(0, 5)
                  .map(p => (
                    <div
                      key={p.id}
                      className="p-4 rounded-xl border border-amber-700/50 bg-[#111927] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-white text-sm">
                            {p.restaurantName}
                          </span>
                          <span className="font-mono font-bold bg-[#0B0F17] text-amber-300 px-2 py-0.5 rounded border border-amber-700/60">
                            Tx: {p.transactionId}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-pink-950/70 border border-pink-700/60 text-pink-300 font-bold text-[10px]">
                            {p.method}
                          </span>
                        </div>
                        <div className="text-slate-300 mt-1">
                          মালিক: {p.ownerName} | মোবাইল: {p.mobile} | পরিমাণ: {formatTaka(p.amount)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setApprovingReq(p)}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm cursor-pointer"
                        >
                          অনুমোদন করুন
                        </button>
                        <button
                          onClick={() => setRejectingReq(p)}
                          className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-sm cursor-pointer"
                        >
                          বাতিল
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: RESTAURANT DIRECTORY */}
      {subTab === 'restaurants' && (
        <div className="relative overflow-hidden bg-[#0E1524] rounded-2xl border border-slate-800 shadow-xl p-6 space-y-4">
          <TopAccentBar variant="blue" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
            <div>
              <h3 className="font-bold text-base text-white">
                নিবন্ধিত রেস্তোরাঁ ডিরেক্টরি
              </h3>
              <p className="text-xs text-slate-400">
                * গোপনীয়তা নীতি: সুপার অ্যাডমিন কোনো রেস্তোরাঁর ব্যক্তিগত ইনভয়েস বা বিক্রি দেখতে পারবেন না।
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={restaurantSearch}
                onChange={e => setRestaurantSearch(e.target.value)}
                placeholder="নাম বা মোবাইল দিয়ে খুঁজুন..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-700 bg-[#0B0F17] text-white placeholder:text-slate-400 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto relative z-10">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#111927] border-b border-slate-800 text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-semibold">রেস্তোরাঁর নাম</th>
                  <th className="px-4 py-3 font-semibold">মালিকের নাম</th>
                  <th className="px-4 py-3 font-semibold">মোবাইল</th>
                  <th className="px-4 py-3 font-semibold">ইমেইল</th>
                  <th className="px-4 py-3 font-semibold">ঠিকানা</th>
                  <th className="px-4 py-3 font-semibold">স্ট্যাটাস</th>
                  <th className="px-4 py-3 font-semibold">তারিখ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredRestaurants.map(r => (
                  <tr key={r.id} className="bg-[#0B0F17] hover:bg-[#151E2E]/70 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-white">{r.name}</td>
                    <td className="px-4 py-3.5 text-slate-200">{r.ownerName}</td>
                    <td className="px-4 py-3.5 font-mono text-slate-200">{r.mobile}</td>
                    <td className="px-4 py-3.5 text-slate-300">{r.email}</td>
                    <td className="px-4 py-3.5 text-slate-300 truncate max-w-xs">{r.address}</td>
                    <td className="px-4 py-3.5">
                      {r.isLifetime ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-[10px] font-bold">
                          লাইফটাইম
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-orange-950/80 border border-orange-700 text-orange-300 text-[10px] font-bold">
                          ট্রায়াল
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-slate-400">
                      {formatBengaliDate(r.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PAYMENT APPLICATIONS */}
      {subTab === 'payments' && (
        <div className="relative overflow-hidden bg-[#0E1524] rounded-2xl border border-slate-800 shadow-xl p-6 space-y-4">
          <TopAccentBar variant="emerald" />
          <div className="flex items-center justify-between relative z-10">
            <div>
              <h3 className="font-bold text-base text-white">
                বিকাশ ও নগদ লাইফটাইম পেমেন্ট অনুমোদন
              </h3>
              <p className="text-xs text-slate-400">
                ট্রানজেকশন আইডি যাচাই করে অনুমোদন বা বাতিল করুন। অনুমোদনের সাথে সাথে অ্যাকাউন্ট সক্রিয় হবে।
              </p>
            </div>
            <button
              onClick={loadAllAdminData}
              className="text-xs text-purple-400 font-bold hover:underline cursor-pointer"
            >
              রিফ্রেশ করুন
            </button>
          </div>

          <div className="space-y-3 relative z-10">
            {payments.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">কোনো পেমেন্ট আবেদন পাওয়া যায়নি।</p>
            ) : (
              payments.map(p => (
                <div
                  key={p.id}
                  className="p-4 rounded-xl border border-slate-800 bg-[#111927] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-white">
                        {p.restaurantName}
                      </span>
                      <span className="font-mono font-bold bg-[#0B0F17] text-amber-300 px-2.5 py-0.5 rounded border border-slate-700">
                        Tx: {p.transactionId}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-pink-950/70 border border-pink-700/60 text-pink-300 font-bold text-[10px]">
                        {p.method}
                      </span>
                    </div>
                    <div className="text-slate-300 mt-1">
                      মালিক: {p.ownerName} | টাকা: {formatTaka(p.amount)} | প্রেরক নম্বর: {p.mobile} | তারিখ: {formatBengaliDate(p.createdAt)}
                    </div>
                    {p.rejectionReason && (
                      <div className="mt-1 text-rose-400 font-medium">
                        বাতিলের কারণ: {p.rejectionReason}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {p.status === 'PENDING' ? (
                      <>
                        <button
                          onClick={() => setApprovingReq(p)}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-sm cursor-pointer"
                        >
                          অনুমোদন করুন
                        </button>
                        <button
                          onClick={() => setRejectingReq(p)}
                          className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold shadow-sm cursor-pointer"
                        >
                          বাতিল
                        </button>
                      </>
                    ) : p.status === 'APPROVED' ? (
                      <span className="px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-700 text-emerald-300 font-bold">
                        অনুমোদিত (Approved)
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-rose-950/80 border border-rose-700 text-rose-300 font-bold">
                        বাতিলকৃত (Rejected)
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: ANNOUNCEMENTS & ADVERTISEMENTS */}
      {subTab === 'ads' && (
        <div className="relative overflow-hidden bg-[#0E1524] rounded-2xl border border-slate-800 shadow-xl p-6 space-y-5">
          <TopAccentBar variant="amber" />
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-orange-400" />
                বিজ্ঞাপন ও নোটিশ ব্যবস্থাপনা
              </h3>
              <p className="text-xs text-slate-400">
                এখানে তৈরি করা বিজ্ঞাপন বা নোটিশ তাৎক্ষণিকভাবে সকল রেস্তোরাঁর ড্যাশবোর্ডে প্রদর্শিত হবে
              </p>
            </div>
            <button
              onClick={() => setIsAdModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              নতুন বিজ্ঞাপন তৈরি করুন
            </button>
          </div>

          <div className="space-y-3 relative z-10">
            {announcements.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-700 bg-[#111927] rounded-xl">
                এখনও কোনো বিজ্ঞাপন বা নোটিশ তৈরি করা হয়নি। উপরের বাটনে ক্লিক করে প্রথম বিজ্ঞাপন তৈরি করুন।
              </div>
            ) : (
              announcements.map(ad => (
                <div
                  key={ad.id}
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
                    ad.isActive
                      ? 'border-orange-700/60 bg-[#161522]'
                      : 'border-slate-800 bg-[#111927] opacity-75'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-600 text-white">
                        {ad.tag}
                      </span>
                      <h4 className="font-bold text-sm text-white">{ad.title}</h4>
                      {ad.isActive ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700 text-emerald-300 font-bold">
                          সক্রিয় (Active)
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-bold">
                          বন্ধ (Inactive)
                        </span>
                      )}
                    </div>
                    <p className="text-slate-300 leading-relaxed">{ad.content}</p>
                    <span className="text-[10px] text-slate-400 block">
                      তারিখ: {formatBengaliDate(ad.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleAd(ad)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        ad.isActive
                          ? 'bg-[#151E2E] border border-slate-700 text-slate-200 hover:bg-slate-700'
                          : 'bg-emerald-600 text-white hover:bg-emerald-500'
                      }`}
                    >
                      {ad.isActive ? 'বন্ধ করুন' : 'চালু করুন'}
                    </button>
                    <button
                      onClick={() => handleDeleteAd(ad.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 cursor-pointer"
                      title="বিজ্ঞাপন মুছুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: WEBSITE BRANDING, LOGO, CONTACT & SYSTEM SETTINGS */}
      {subTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT 7 COLS: WEBSITE LOGO, NAME, ADDRESS & CONTACT EDITOR */}
          <div className="lg:col-span-7 relative overflow-hidden bg-[#0E1524] rounded-2xl border border-slate-800 shadow-xl p-6 space-y-5">
            <TopAccentBar variant="amber" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10 border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-extrabold text-base sm:text-lg text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-orange-400" />
                  ওয়েবসাইটের লোগো, নাম, ঠিকানা ও ব্র্যান্ডিং সেটিংস
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  এখান থেকে ওয়েবসাইটের লোগো, ব্র্যান্ডের নাম, ঠিকানা, মোবাইল নাম্বার এবং সমস্ত টেক্সট পরিবর্তন করুন
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetBrandingDefaults}
                className="px-3 py-1.5 rounded-xl bg-[#111927] border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                ডিফল্ট মান
              </button>
            </div>

            {brandingSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/60 text-emerald-200 text-xs flex items-center gap-2 border border-emerald-700 relative z-10">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>ওয়েবসাইটের লোগো ও ব্র্যান্ডিং তথ্য সফলভাবে সংরক্ষিত ও প্রকাশিত হয়েছে!</span>
              </div>
            )}

            {/* Live Brand Header Preview Box */}
            <div className="relative overflow-hidden p-4 rounded-xl bg-[#111927] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10">
              <div className="flex items-center gap-3 min-w-0">
                <BrandLogo logoUrl={logoUrlInput} siteName={siteNameInput} size="lg" />
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 block">
                    লাইভ হেডার ও ব্র্যান্ড প্রিভিউ
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-extrabold text-base text-white truncate">
                      {siteNameInput || DEFAULT_SITE_SETTINGS.siteName}
                    </span>
                    {siteBadgeInput && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-950/80 border border-orange-800/70 text-orange-300 font-bold">
                        {siteBadgeInput}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">
                    {siteTaglineInput || DEFAULT_SITE_SETTINGS.siteTagline}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <input
                  ref={logoFileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFileUpload}
                  className="hidden"
                  id="admin-logo-upload"
                />
                <label
                  htmlFor="admin-logo-upload"
                  className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  লোগো আপলোড
                </label>
                {logoUrlInput && (
                  <button
                    type="button"
                    onClick={() => setLogoUrlInput('')}
                    className="px-2.5 py-2 rounded-xl bg-[#0B0F17] border border-slate-700 hover:border-rose-600 text-slate-300 hover:text-rose-300 text-xs font-semibold cursor-pointer"
                  >
                    মুছুন
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleSaveBranding} className="space-y-4 relative z-10">
              {/* Logo Image URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-orange-400" />
                  লোগো ইমেজ লিংক (URL) অথবা উপরের "লোগো আপলোড" বাটন ব্যবহার করুন
                </label>
                <input
                  type="text"
                  data-testid="admin-input-logo-url"
                  value={logoUrlInput}
                  onChange={e => setLogoUrlInput(e.target.value)}
                  placeholder="https://example.com/logo.png (খালি রাখলে ডিফল্ট আইকন দেখাবে)"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white placeholder:text-slate-500 text-xs font-mono focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              {/* Site Name, Tagline, Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ওয়েবসাইটের নাম *
                  </label>
                  <input
                    type="text"
                    required
                    data-testid="admin-input-site-name"
                    value={siteNameInput}
                    onChange={e => setSiteNameInput(e.target.value)}
                    placeholder="যেমন: DhakaDine POS"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white text-xs font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ব্যাজ টেক্সট
                  </label>
                  <input
                    type="text"
                    data-testid="admin-input-site-badge"
                    value={siteBadgeInput}
                    onChange={e => setSiteBadgeInput(e.target.value)}
                    placeholder="বাংলা"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  ওয়েবসাইট সাবটাইটেল / ট্যাগলাইন *
                </label>
                <input
                  type="text"
                  required
                  data-testid="admin-input-site-tagline"
                  value={siteTaglineInput}
                  onChange={e => setSiteTaglineInput(e.target.value)}
                  placeholder="রেস্তোরাঁহিসাব বিলিং সফটওয়্যার"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              {/* Address, Phone, Email */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-orange-400" />
                    সাপোর্ট / যোগাযোগ নম্বর *
                  </label>
                  <input
                    type="tel"
                    required
                    data-testid="admin-input-support-phone"
                    value={supportPhoneInput}
                    onChange={e => setSupportPhoneInput(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white text-xs font-mono focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-blue-400" />
                    সাপোর্ট ইমেইল *
                  </label>
                  <input
                    type="email"
                    required
                    data-testid="admin-input-support-email"
                    value={supportEmailInput}
                    onChange={e => setSupportEmailInput(e.target.value)}
                    placeholder="support@domain.com"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    অফিসের ঠিকানা *
                  </label>
                  <input
                    type="text"
                    required
                    data-testid="admin-input-contact-address"
                    value={contactAddressInput}
                    onChange={e => setContactAddressInput(e.target.value)}
                    placeholder="ঢাকা, বাংলাদেশ"
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Hero Title & Subtitle */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  হোমপেজ প্রধান শিরোনাম (Hero Title)
                </label>
                <input
                  type="text"
                  data-testid="admin-input-hero-title"
                  value={heroTitleInput}
                  onChange={e => setHeroTitleInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  হোমপেজ বিবরণ (Hero Subtitle)
                </label>
                <textarea
                  rows={2}
                  value={heroSubtitleInput}
                  onChange={e => setHeroSubtitleInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              {/* Footer Description & Copyright */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ফুটার বিবরণ (Footer About)
                  </label>
                  <textarea
                    rows={2}
                    value={footerDescInput}
                    onChange={e => setFooterDescInput(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    কপিরাইট টেক্সট (Copyright)
                  </label>
                  <textarea
                    rows={2}
                    data-testid="admin-input-copyright"
                    value={copyrightInput}
                    onChange={e => setCopyrightInput(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingBranding}
                data-testid="admin-save-branding-btn"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-orange-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingBranding ? 'সংরক্ষণ হচ্ছে...' : 'ওয়েবসাইট ব্র্যান্ডিং ও সমস্ত তথ্য সংরক্ষণ করুন'}
              </button>
            </form>
          </div>

          {/* RIGHT 5 COLS: PAYMENT CONFIG & ADMIN PASSWORD */}
          <div className="lg:col-span-5 space-y-6">
            {/* Payment & Trial Settings Card */}
            <div className="relative overflow-hidden bg-[#0E1524] rounded-2xl border border-slate-800 shadow-xl p-6 space-y-4">
              <TopAccentBar variant="violet" />
              <div className="relative z-10">
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-purple-400" />
                  পেমেন্ট ও ট্রায়াল কনফিগারেশন
                </h3>
                <p className="text-xs text-slate-400">
                  লাইফটাইম ফি, বিকাশ/নগদ নম্বর এবং ফ্রি ট্রায়ালের মেয়াদ পরিবর্তন করুন
                </p>
              </div>

              {settingsSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/60 text-emerald-200 text-xs flex items-center gap-2 border border-emerald-700 relative z-10">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>পেমেন্ট সেটিংস সফলভাবে সংরক্ষিত হয়েছে!</span>
                </div>
              )}

              <form onSubmit={handleSaveSettings} className="space-y-3.5 relative z-10">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    লাইফটাইম অ্যাক্সেস ফি (টাকা ৳) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={feeInput}
                    onChange={e => setFeeInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white text-xs font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    বিকাশ (bKash) সেন্ড মানি নম্বর *
                  </label>
                  <input
                    type="tel"
                    required
                    value={bkashInput}
                    onChange={e => setBkashInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white text-xs font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    নগদ (Nagad) সেন্ড মানি নম্বর *
                  </label>
                  <input
                    type="tel"
                    required
                    value={nagadInput}
                    onChange={e => setNagadInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white text-xs font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ফ্রি ট্রায়ালের মেয়াদ (দিন) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={trialDaysInput}
                    onChange={e => setTrialDaysInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white text-xs font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                >
                  পেমেন্ট ও ট্রায়াল আপডেট করুন
                </button>
              </form>
            </div>

            {/* Admin Password Change Box */}
            <div className="relative overflow-hidden bg-[#0E1524] rounded-2xl border border-slate-800 shadow-xl p-6 space-y-3">
              <TopAccentBar variant="rose" />
              <div className="relative z-10">
                <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-rose-400" />
                  সুপার অ্যাডমিন পাসওয়ার্ড পরিবর্তন
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  অ্যাডমিন প্যানেলে প্রবেশের পাসওয়ার্ড পরিবর্তন করতে এখানে নতুন পাসওয়ার্ড প্রদান করুন।
                </p>
              </div>

              {adminPassMsg && (
                <div
                  className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 relative z-10 ${
                    adminPassMsg.type === 'success'
                      ? 'bg-emerald-950/60 text-emerald-200 border-emerald-700'
                      : 'bg-rose-950/60 text-rose-200 border-rose-700'
                  }`}
                >
                  {adminPassMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  )}
                  <span>{adminPassMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleChangeAdminPassword} className="space-y-3 relative z-10">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    নতুন অ্যাডমিন পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newAdminPass}
                    onChange={e => setNewAdminPass(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
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
                    value={confirmAdminPass}
                    onChange={e => setConfirmAdminPass(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#151E2E] hover:bg-rose-600 border border-slate-700 hover:border-rose-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
                >
                  অ্যাডমিন পাসওয়ার্ড পরিবর্তন করুন
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: NOTIFICATIONS */}
      {subTab === 'notifications' && (
        <div className="relative overflow-hidden bg-[#0E1524] rounded-2xl border border-slate-800 shadow-xl p-6 space-y-4">
          <TopAccentBar variant="cyan" />
          <h3 className="font-bold text-base text-white flex items-center gap-2 relative z-10">
            <Bell className="w-5 h-5 text-cyan-400" />
            অ্যাডমিন নোটিফিকেশন হিস্ট্রি
          </h3>

          {notifications.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 relative z-10">এখনও কোনো বিজ্ঞপ্তি নেই।</p>
          ) : (
            <div className="space-y-2.5 relative z-10">
              {notifications.map(n => (
                <div
                  key={n.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
                    n.isRead
                      ? 'bg-[#111927] border-slate-800 text-slate-400'
                      : 'bg-purple-950/40 border-purple-700/60 text-white font-semibold'
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className="block text-white">{n.title}</span>
                    <p className="text-slate-300 font-normal">{n.message}</p>
                    <span className="text-[10px] text-slate-400">{formatBengaliDate(n.createdAt)}</span>
                  </div>

                  {!n.isRead && (
                    <button
                      onClick={() => handleMarkNotifRead(n.id)}
                      className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold shrink-0 cursor-pointer"
                    >
                      পড়া হয়েছে
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* IN-APP PAYMENT APPROVAL MODAL */}
      {approvingReq && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative overflow-hidden bg-[#0E1524] text-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-800 p-6 space-y-4">
            <TopAccentBar variant="emerald" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/70 border border-emerald-700 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">
                  পেমেন্ট অনুমোদন নিশ্চিতকরণ
                </h3>
                <p className="text-xs text-slate-400">
                  অনুমোদন করলে রেস্তোরাঁটি আজীবনের জন্য লাইফটাইম অ্যাক্সেস পাবে
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#111927] border border-slate-800 text-xs space-y-1.5 relative z-10">
              <div className="flex justify-between">
                <span className="text-slate-400">রেস্তোরাঁর নাম:</span>
                <span className="font-bold text-white">{approvingReq.restaurantName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ট্রানজেকশন আইডি:</span>
                <span className="font-mono font-bold text-amber-300">{approvingReq.transactionId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">টাকার পরিমাণ:</span>
                <span className="font-bold text-white">{formatTaka(approvingReq.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">মাধ্যম ও নম্বর:</span>
                <span className="font-medium text-slate-200">{approvingReq.method} ({approvingReq.mobile})</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2 relative z-10">
              <button
                type="button"
                onClick={() => setApprovingReq(null)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-700 bg-[#151E2E] text-xs font-semibold text-slate-300 hover:text-white cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmApproval}
                disabled={isProcessing}
                className="w-1/2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? 'অনুমোদন হচ্ছে...' : 'হ্যাঁ, অনুমোদন করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {rejectingReq && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative overflow-hidden bg-[#0E1524] text-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-800 p-6 space-y-4">
            <TopAccentBar variant="rose" />
            <h3 className="font-bold text-base text-white relative z-10">
              পেমেন্ট আবেদন বাতিল ও কারণ লিখুন
            </h3>
            <p className="text-xs text-slate-400 relative z-10">
              রেস্তোরাঁ মালিক তার ড্যাশবোর্ডে এই কারণটি দেখতে পারবেন এবং সঠিক ট্রানজেকশন আইডি দিয়ে পুনরায় আবেদন করতে পারবেন।
            </p>
            <textarea
              required
              rows={3}
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="যেমন: প্রদত্ত ট্রানজেকশন আইডি ভুল বা এই পরিমাণ পাওয়া যায়নি।"
              className="w-full p-2.5 rounded-xl border border-slate-700 bg-[#0B0F17] text-white text-xs relative z-10 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
            <div className="flex gap-2 relative z-10">
              <button
                type="button"
                onClick={() => setRejectingReq(null)}
                className="w-1/2 py-2 rounded-xl border border-slate-700 bg-[#151E2E] text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isProcessing || !rejectionReason.trim()}
                className="w-1/2 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                বাতিল নিশ্চিত করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE AD / ANNOUNCEMENT MODAL */}
      {isAdModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative overflow-hidden bg-[#0E1524] text-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-800 p-6 space-y-4">
            <TopAccentBar variant="amber" />
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 relative z-10">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-orange-400" />
                নতুন বিজ্ঞাপন / নোটিশ তৈরি করুন
              </h3>
              <button
                onClick={() => setIsAdModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAd} className="space-y-4 relative z-10">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  বিজ্ঞাপনের শিরোনাম *
                </label>
                <input
                  type="text"
                  required
                  value={adTitle}
                  onChange={e => setAdTitle(e.target.value)}
                  placeholder="যেমন: পবিত্র মাহে রমজানের বিশেষ আপডেট / ছাড় অফার"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  বিজ্ঞাপনের ব্যাজ / ট্যাগ *
                </label>
                <select
                  value={adTag}
                  onChange={e => setAdTag(e.target.value as Announcement['tag'])}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="অফার">অফার (Offer)</option>
                  <option value="রমজান স্পেশাল">রমজান স্পেশাল (Ramadan)</option>
                  <option value="জরুরি নোটিশ">জরুরি নোটিশ (Notice)</option>
                  <option value="আপডেট">নতুন আপডেট (Update)</option>
                  <option value="সাধারণ">সাধারণ বার্তা (General)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  বিজ্ঞাপনের বিস্তারিত বিষয়বস্তু / বার্তা *
                </label>
                <textarea
                  required
                  rows={3}
                  value={adContent}
                  onChange={e => setAdContent(e.target.value)}
                  placeholder="যেমন: রমজান উপলক্ষে ইফতারি ও সেহরির জন্য বিশেষ আইটেম যোগ করা হয়েছে। আপনার রেস্তোরাঁর মেনু আপডেট করে নিন।"
                  className="w-full p-2.5 rounded-xl border border-slate-700 bg-[#0B0F17] text-white text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="adActiveCheck"
                  checked={adIsActive}
                  onChange={e => setAdIsActive(e.target.checked)}
                  className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4"
                />
                <label htmlFor="adActiveCheck" className="text-xs font-medium text-slate-300">
                  তৈরির সাথে সাথে সকল রেস্তোরাঁর ড্যাশবোর্ডে প্রচার চালু রাখুন
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-700 bg-[#151E2E] text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-1/2 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md cursor-pointer"
                >
                  {isProcessing ? 'প্রচার হচ্ছে...' : 'বিজ্ঞাপন প্রচার করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
