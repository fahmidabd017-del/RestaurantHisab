import React from 'react';

export type TopAccentVariant =
  | 'amber'
  | 'blue'
  | 'emerald'
  | 'violet'
  | 'rose'
  | 'cyan'
  | 'indigo';

const BAR_GRADIENTS: Record<TopAccentVariant, string> = {
  amber: 'from-orange-500 via-amber-400 to-yellow-500',
  blue: 'from-blue-500 via-cyan-400 to-sky-500',
  emerald: 'from-emerald-500 via-teal-400 to-green-500',
  violet: 'from-purple-500 via-violet-400 to-fuchsia-500',
  rose: 'from-rose-500 via-pink-500 to-orange-500',
  cyan: 'from-cyan-500 via-teal-400 to-blue-500',
  indigo: 'from-indigo-500 via-blue-500 to-purple-500',
};

const TOP_SHEEN: Record<TopAccentVariant, string> = {
  amber: 'from-orange-500/15',
  blue: 'from-blue-500/15',
  emerald: 'from-emerald-500/15',
  violet: 'from-purple-500/15',
  rose: 'from-rose-500/15',
  cyan: 'from-cyan-500/15',
  indigo: 'from-indigo-500/15',
};

interface TopAccentBarProps {
  variant?: TopAccentVariant;
}

/**
 * Executive top-edge gradient stripe + subtle top ambient glow for every dark obsidian box/card.
 * Must be placed inside a `relative overflow-hidden` container.
 */
export const TopAccentBar: React.FC<TopAccentBarProps> = ({ variant = 'amber' }) => {
  return (
    <>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r ${BAR_GRADIENTS[variant]}`}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute top-0 left-0 right-0 h-14 bg-gradient-to-b ${TOP_SHEEN[variant]} via-transparent to-transparent`}
      />
    </>
  );
};
