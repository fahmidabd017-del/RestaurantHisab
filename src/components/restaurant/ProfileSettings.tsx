import React, { useState } from 'react';
import type { Restaurant } from '../../types';
import { updateRestaurant, deleteRestaurantPermanently } from '../../services/db';
import { hashString, verifyHash } from '../../utils/crypto';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  KeyRound,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { TopAccentBar } from '../common/TopAccentBar';

interface ProfileSettingsProps {
  restaurant: Restaurant;
  onRefresh: () => Promise<void>;
  onDeleted: () => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  restaurant,
  onRefresh,
  onDeleted,
}) => {
  const { logoutRestaurant } = useAuth();

  // Profile fields
  const [name, setName] = useState(restaurant.name);
  const [ownerName, setOwnerName] = useState(restaurant.ownerName);
  const [address, setAddress] = useState(restaurant.address);
  const [mobile, setMobile] = useState(restaurant.mobile);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Password fields
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Security Question fields
  const [securityQuestion, setSecurityQuestion] = useState(restaurant.securityQuestion);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [isUpdatingSec, setIsUpdatingSec] = useState(false);
  const [secMsg, setSecMsg] = useState<string | null>(null);

  // Delete modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    setProfileMsg(null);
    try {
      await updateRestaurant(restaurant.id, {
        name: name.trim(),
        ownerName: ownerName.trim(),
        address: address.trim(),
        mobile: mobile.trim(),
      });
      await onRefresh();
      setProfileMsg('প্রোফাইল তথ্য সফলভাবে আপডেট হয়েছে!');
      setTimeout(() => setProfileMsg(null), 3000);
    } catch (err) {
      setProfileMsg('তথ্য সংরক্ষণে সমস্যা হয়েছে।');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);

    if (newPassword.length < 6) {
      setPassMsg({ type: 'error', text: 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassMsg({ type: 'error', text: 'উভয় নতুন পাসওয়ার্ডের মিল নেই।' });
      return;
    }

    setIsChangingPass(true);
    try {
      const isOldValid = await verifyHash(oldPassword, restaurant.passwordHash);
      if (!isOldValid) {
        setPassMsg({ type: 'error', text: 'বর্তমান পাসওয়ার্ড ভুল দিয়েছেন!' });
        setIsChangingPass(false);
        return;
      }

      const newHash = await hashString(newPassword);
      await updateRestaurant(restaurant.id, {
        passwordHash: newHash,
      });

      setPassMsg({ type: 'success', text: 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await onRefresh();
    } catch (err) {
      setPassMsg({ type: 'error', text: 'পাসওয়ার্ড পরিবর্তনে সমস্যা হয়েছে।' });
    } finally {
      setIsChangingPass(false);
    }
  };

  // Update Security Question
  const handleUpdateSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!securityQuestion.trim() || !securityAnswer.trim()) {
      setSecMsg('প্রশ্ন এবং উত্তর উভয়ই পূরণ করুন।');
      return;
    }
    setIsUpdatingSec(true);
    setSecMsg(null);
    try {
      const answerHash = await hashString(securityAnswer.trim().toLowerCase());
      await updateRestaurant(restaurant.id, {
        securityQuestion: securityQuestion.trim(),
        securityAnswerHash: answerHash,
      });
      await onRefresh();
      setSecMsg('নিরাপত্তা প্রশ্ন ও উত্তর সফলভাবে আপডেট হয়েছে!');
      setSecurityAnswer('');
      setTimeout(() => setSecMsg(null), 3000);
    } catch (err) {
      setSecMsg('আপডেট করতে ব্যর্থ হয়েছে।');
    } finally {
      setIsUpdatingSec(false);
    }
  };

  // Delete Account
  const handlePermanentlyDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);

    setIsDeleting(true);
    try {
      const isPassValid = await verifyHash(deleteConfirmPassword, restaurant.passwordHash);
      if (!isPassValid) {
        setDeleteError('ভুল পাসওয়ার্ড! নিশ্চিতকরণ ব্যর্থ হয়েছে।');
        setIsDeleting(false);
        return;
      }

      await deleteRestaurantPermanently(restaurant.id);
      await logoutRestaurant();
      onDeleted();
    } catch (err) {
      setDeleteError('অ্যাকাউন্ট মুছতে ব্যর্থ হয়েছে।');
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <User className="w-6 h-6 text-orange-400" />
          রেস্তোরাঁ প্রোফাইল ও নিরাপত্তা সেটিংস
        </h1>
        <p className="text-xs text-slate-300 mt-0.5">
          আপনার রেস্তোরাঁর মৌলিক তথ্য, পাসওয়ার্ড ও অ্যাকাউন্ট নিয়ন্ত্রণ করুন
        </p>
      </div>

      {/* 1. Basic Information */}
      <div className="relative overflow-hidden bg-[#0E1524] p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
        <TopAccentBar variant="amber" />
        <h3 className="font-bold text-base text-white flex items-center gap-2 relative z-10">
          রেস্তোরাঁর প্রাথমিক তথ্য
        </h3>

        {profileMsg && (
          <div className="p-3 rounded-xl bg-emerald-950/60 text-emerald-200 border border-emerald-500/40 text-xs flex items-center gap-2 relative z-10">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{profileMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                রেস্তোরাঁর নাম *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
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
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                ঠিকানা *
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
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
                className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                নিবন্ধিত ইমেইল (পরিবর্তনযোগ্য নয়)
              </label>
              <input
                type="email"
                disabled
                value={restaurant.email}
                className="w-full px-3 py-2 rounded-xl border border-slate-800 bg-[#151E2E] text-slate-400 text-xs cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                * সিকিউরিটি ও লাইসেন্সিং সুরক্ষার কারণে নিবন্ধিত ইমেইল পরিবর্তন অনুমোদিত নয়।
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isUpdatingProfile}
            className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            {isUpdatingProfile ? 'সংরক্ষণ হচ্ছে...' : 'প্রোফাইল আপডেট করুন'}
          </button>
        </form>
      </div>

      {/* 2. Change Password */}
      <div className="relative overflow-hidden bg-[#0E1524] p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
        <TopAccentBar variant="blue" />
        <h3 className="font-bold text-base text-white flex items-center gap-2 relative z-10">
          <KeyRound className="w-5 h-5 text-blue-400" />
          পাসওয়ার্ড পরিবর্তন
        </h3>

        {passMsg && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 relative z-10 ${
              passMsg.type === 'success'
                ? 'bg-emerald-950/60 text-emerald-200 border-emerald-500/40'
                : 'bg-rose-950/60 text-rose-200 border-rose-500/40'
            }`}
          >
            {passMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{passMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-3 max-w-md relative z-10">
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              বর্তমান পাসওয়ার্ড *
            </label>
            <input
              type="password"
              required
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white placeholder:text-slate-500 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর) *
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white placeholder:text-slate-500 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              নতুন পাসওয়ার্ড পুনরায় দিন *
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white placeholder:text-slate-500 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isChangingPass}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            {isChangingPass ? 'আপডেট হচ্ছে...' : 'নতুন পাসওয়ার্ড সংরক্ষণ'}
          </button>
        </form>
      </div>

      {/* 3. Security Question Settings */}
      <div className="relative overflow-hidden bg-[#0E1524] p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
        <TopAccentBar variant="violet" />
        <h3 className="font-bold text-base text-white flex items-center gap-2 relative z-10">
          <Sparkles className="w-5 h-5 text-violet-400" />
          পাসওয়ার্ড পুনরুদ্ধারের নিরাপত্তা প্রশ্ন
        </h3>

        {secMsg && (
          <div className="p-3 rounded-xl bg-emerald-950/60 text-emerald-200 border border-emerald-500/40 text-xs flex items-center gap-2 relative z-10">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{secMsg}</span>
          </div>
        )}

        <form onSubmit={handleUpdateSecurity} className="space-y-3 max-w-md relative z-10">
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              নিরাপত্তা প্রশ্ন *
            </label>
            <input
              type="text"
              required
              value={securityQuestion}
              onChange={e => setSecurityQuestion(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white text-xs focus:ring-2 focus:ring-violet-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              নতুন গোপন উত্তর *
            </label>
            <input
              type="text"
              required
              value={securityAnswer}
              onChange={e => setSecurityAnswer(e.target.value)}
              placeholder="প্রশ্নের উত্তর লিখুন"
              className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white placeholder:text-slate-400 text-xs focus:ring-2 focus:ring-violet-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isUpdatingSec}
            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            {isUpdatingSec ? 'আপডেট হচ্ছে...' : 'নিরাপত্তা তথ্য আপডেট করুন'}
          </button>
        </form>
      </div>

      {/* 4. Permanently Delete Restaurant Account */}
      <div className="relative overflow-hidden bg-[#0E1524] p-6 rounded-2xl border border-rose-500/40 shadow-xl space-y-4">
        <TopAccentBar variant="rose" />
        <div className="flex items-start gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">
              রেস্তোরাঁ অ্যাকাউন্ট স্থায়ীভাবে মুছে ফেলুন
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              সতর্কতা: অ্যাকাউন্ট মুছে ফেললে আপনার রেস্তোরাঁর সকল খাবার মেনু, ক্যাটাগরি, পূর্ববর্তী সকল ইনভয়েস ও বিক্রির রেকর্ড চিরতরে মুছে যাবে। এটি আর কখনো পুনরুদ্ধার করা সম্ভব হবে না।
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsDeleteModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-all relative z-10 cursor-pointer"
        >
          অ্যাকাউন্ট ডিলিট প্রক্রিয়া শুরু করুন
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative overflow-hidden bg-[#0E1524] text-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-800 p-6 space-y-4">
            <TopAccentBar variant="rose" />
            <div className="text-center space-y-2 relative z-10">
              <div className="w-12 h-12 mx-auto rounded-full bg-rose-950/70 border border-rose-500/40 text-rose-400 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-white">
                স্থায়ী ডিলিট নিশ্চিতকরণ
              </h3>
              <p className="text-xs text-slate-300">
                মুছে ফেলতে আপনার অ্যাকাউন্ট পাসওয়ার্ড নিশ্চিত করুন।
              </p>
            </div>

            {deleteError && (
              <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs relative z-10">
                {deleteError}
              </div>
            )}

            <form onSubmit={handlePermanentlyDelete} className="space-y-4 relative z-10">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  আপনার পাসওয়ার্ড লিখুন *
                </label>
                <input
                  type="password"
                  required
                  value={deleteConfirmPassword}
                  onChange={e => setDeleteConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white placeholder:text-slate-500 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-700 bg-[#151E2E] text-white text-xs font-semibold hover:bg-[#1E293B] cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isDeleting}
                  className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm cursor-pointer"
                >
                  {isDeleting ? 'মুছে ফেলা হচ্ছে...' : 'স্থায়ীভাবে মুছুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

