import React from 'react';

export type TopAccentVariant =
  | 'amber'
  | 'blue'
  | 'emerald'
  | 'violet'
  | 'rose'
  | 'cyan'
  | 'indigo';

interface OrbitPalette {
  c1: string;
  c2: string;
  c3: string;
  c4: string;
  c5: string;
  delay: string;
}

const ORBIT_PALETTES: Record<TopAccentVariant, OrbitPalette> = {
  amber: {
    c1: 'rgba(245, 158, 11, 0.95)',
    c2: 'rgba(249, 115, 22, 0.9)',
    c3: 'rgba(16, 185, 129, 0.85)',
    c4: 'rgba(59, 130, 246, 0.9)',
    c5: 'rgba(244, 63, 94, 0.82)',
    delay: '0s',
  },
  blue: {
    c1: 'rgba(59, 130, 246, 0.95)',
    c2: 'rgba(6, 182, 212, 0.9)',
    c3: 'rgba(16, 185, 129, 0.88)',
    c4: 'rgba(245, 158, 11, 0.9)',
    c5: 'rgba(139, 92, 246, 0.82)',
    delay: '-1.5s',
  },
  emerald: {
    c1: 'rgba(16, 185, 129, 0.95)',
    c2: 'rgba(6, 182, 212, 0.88)',
    c3: 'rgba(59, 130, 246, 0.88)',
    c4: 'rgba(245, 158, 11, 0.9)',
    c5: 'rgba(236, 72, 153, 0.78)',
    delay: '-3s',
  },
  violet: {
    c1: 'rgba(168, 85, 247, 0.95)',
    c2: 'rgba(59, 130, 246, 0.9)',
    c3: 'rgba(16, 185, 129, 0.86)',
    c4: 'rgba(245, 158, 11, 0.88)',
    c5: 'rgba(244, 63, 94, 0.85)',
    delay: '-4.2s',
  },
  rose: {
    c1: 'rgba(244, 63, 94, 0.95)',
    c2: 'rgba(249, 115, 22, 0.9)',
    c3: 'rgba(245, 158, 11, 0.88)',
    c4: 'rgba(59, 130, 246, 0.86)',
    c5: 'rgba(168, 85, 247, 0.8)',
    delay: '-2.1s',
  },
  cyan: {
    c1: 'rgba(6, 182, 212, 0.95)',
    c2: 'rgba(59, 130, 246, 0.9)',
    c3: 'rgba(16, 185, 129, 0.9)',
    c4: 'rgba(245, 158, 11, 0.86)',
    c5: 'rgba(244, 63, 94, 0.78)',
    delay: '-5.1s',
  },
  indigo: {
    c1: 'rgba(99, 102, 241, 0.95)',
    c2: 'rgba(59, 130, 246, 0.9)',
    c3: 'rgba(6, 182, 212, 0.88)',
    c4: 'rgba(16, 185, 129, 0.86)',
    c5: 'rgba(245, 158, 11, 0.88)',
    delay: '-0.8s',
  },
};

interface TopAccentBarProps {
  variant?: TopAccentVariant;
}

/**
 * Executive 4-sided orbiting multi-color outer perimeter ring & edge glow.
 * Renders cleanly along the outer 1.5px border of any `relative overflow-hidden` card/modal
 * without washing out interior content.
 */
export const TopAccentBar: React.FC<TopAccentBarProps> = ({ variant = 'amber' }) => {
  const palette = ORBIT_PALETTES[variant];
  const styleVars = {
    '--orbit-c1': palette.c1,
    '--orbit-c2': palette.c2,
    '--orbit-c3': palette.c3,
    '--orbit-c4': palette.c4,
    '--orbit-c5': palette.c5,
    '--orbit-delay': palette.delay,
  } as React.CSSProperties;

  return <div aria-hidden="true" className="orbit-border-ring" style={styleVars} />;
};
