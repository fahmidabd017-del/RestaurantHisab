import React, { useEffect, useState } from 'react';
import type { Announcement } from '../../types';
import { getActiveAnnouncements } from '../../services/db';
import { Megaphone, X } from 'lucide-react';
import { TopAccentBar } from './TopAccentBar';

export const AnnouncementBanner: React.FC = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem('restauranthisab_dismissed_ads');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    let isMounted = true;
    getActiveAnnouncements().then(list => {
      if (isMounted) setAnnouncements(list);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const visibleAds = announcements.filter(a => !dismissedIds.includes(a.id));

  if (visibleAds.length === 0) return null;

  const handleDismiss = (id: string) => {
    const next = [...dismissedIds, id];
    setDismissedIds(next);
    sessionStorage.setItem('restauranthisab_dismissed_ads', JSON.stringify(next));
  };

  return (
    <div className="space-y-2 mb-4">
      {visibleAds.map(ad => (
        <div
          key={ad.id}
          className="relative overflow-hidden p-4 rounded-2xl bg-[#0E1524] text-white shadow-lg border border-orange-500/30"
        >
          <TopAccentBar variant="amber" />
          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-950/70 border border-orange-500/40 flex items-center justify-center shrink-0 mt-0.5">
                <Megaphone className="w-5 h-5 text-orange-400" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded-lg bg-orange-600/20 border border-orange-500/40 text-amber-300 text-[10px] font-extrabold uppercase tracking-wide">
                    {ad.tag || 'বিজ্ঞাপন'}
                  </span>
                  <h4 className="font-bold text-sm sm:text-base text-white tracking-tight">
                    {ad.title}
                  </h4>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                  {ad.content}
                </p>
              </div>
            </div>

            <button
              onClick={() => handleDismiss(ad.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#151E2E] transition-colors shrink-0 cursor-pointer"
              title="বিজ্ঞাপন বন্ধ করুন"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

