import React, { useEffect, useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { sanitizeLogoUrl } from '../../utils/siteSettings';

interface BrandLogoProps {
  logoUrl?: string;
  siteName?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-9 h-9 rounded-xl',
  md: 'w-10 h-10 rounded-xl',
  lg: 'w-14 h-14 rounded-2xl',
};

const ICON_CLASSES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-7 h-7',
};

export const BrandLogo: React.FC<BrandLogoProps> = ({
  logoUrl,
  siteName = 'RestaurantHisab',
  size = 'md',
  className = '',
}) => {
  const safeUrl = sanitizeLogoUrl(logoUrl);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [safeUrl]);

  if (safeUrl && !imgFailed) {
    return (
      <div
        className={`${SIZE_CLASSES[size]} bg-[#151E2E] border border-slate-700/80 p-1 flex items-center justify-center overflow-hidden shadow-md shadow-orange-500/15 shrink-0 ${className}`}
      >
        <img
          src={safeUrl}
          alt={siteName}
          onError={() => setImgFailed(true)}
          className="w-full h-full object-contain rounded-lg"
        />
      </div>
    );
  }

  return (
    <div
      className={`${SIZE_CLASSES[size]} bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-400 flex items-center justify-center text-white shadow-md shadow-orange-500/25 shrink-0 ${className}`}
    >
      <UtensilsCrossed className={ICON_CLASSES[size]} />
    </div>
  );
};
