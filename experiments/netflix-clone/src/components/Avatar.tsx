import { useId } from 'react';
import { cx } from '../lib/utils';

interface AvatarProps {
  avatar: string;
  name?: string;
  size?: number;
  className?: string;
}

const PALETTES: Record<string, [string, string, string]> = {
  a1: ['#0f7d7a', '#0b4f57', '#ffd7a8'],
  a2: ['#b5401f', '#6c2418', '#f6c48d'],
  a3: ['#5b3cc4', '#2e2069', '#e8b48c'],
  a4: ['#22704b', '#123a2b', '#9a5d3a'],
  a5: ['#1f5f9e', '#14395f', '#c78a63'],
  a6: ['#d98c1f', '#8a4d08', '#ffcf8e'],
  a7: ['#a83a5d', '#5f1f35', '#efc5a2'],
  a8: ['#7c3ba8', '#42205b', '#d7a27d'],
};

export function Avatar({ avatar, name, size = 40, className }: AvatarProps) {
  const id = useId().replace(/:/g, '');
  const [bg, bg2, skin] = PALETTES[avatar] ?? PALETTES.a1;
  const clip = `avatar-clip-${id}`;

  return (
    <span
      className={cx('avatar', className)}
      style={{ width: size, height: size }}
      role={name ? 'img' : undefined}
      aria-label={name ? `${name}'s profile` : undefined}
      aria-hidden={name ? undefined : true}
    >
      <svg viewBox="0 0 96 96" width={size} height={size} focusable="false">
        <defs>
          <clipPath id={clip}>
            <rect width="96" height="96" rx="18" />
          </clipPath>
          <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse">
            <stop stopColor={bg} />
            <stop offset="1" stopColor={bg2} />
          </linearGradient>
        </defs>
        <g clipPath={`url(#${clip})`}>
          <rect width="96" height="96" fill={`url(#${id}-bg)`} />
          <circle cx="76" cy="14" r="26" fill="#ffffff" opacity="0.07" />
          <circle cx="12" cy="88" r="30" fill="#000000" opacity="0.16" />
          {avatar === 'a1' && (
            <>
              <path d="M12 96c0-21 16-33 36-33s36 12 36 33" fill="#f4efe6" opacity="0.92" />
              <ellipse cx="48" cy="42" rx="18" ry="20" fill={skin} />
              <path d="M30 40c0-15 8-23 18-23s18 8 18 23c-3-8-9-10-18-10s-15 2-18 10Z" fill="#221a18" />
              <g stroke="#e9e4db" strokeWidth="2" fill="none">
                <circle cx="41" cy="43" r="5.4" />
                <circle cx="56" cy="43" r="5.4" />
                <path d="M46.4 43h4.2" />
              </g>
              <path d="M43 53c3 3 7 3 10 0" stroke="#7a3b2a" strokeWidth="2" fill="none" strokeLinecap="round" />
            </>
          )}
          {avatar === 'a2' && (
            <>
              <path d="M10 96c2-20 17-31 38-31s36 11 38 31" fill="#1c2f3a" opacity="0.9" />
              <ellipse cx="48" cy="44" rx="18" ry="20" fill={skin} />
              <path d="M28 43c0-18 9-27 20-27s20 9 20 27c-1-4-3-8-6-11-6 4-22 5-28 0-3 3-5 7-6 11Z" fill="#3c2318" />
              <circle cx="28" cy="42" r="6" fill="#3c2318" />
              <circle cx="68" cy="42" r="6" fill="#3c2318" />
              <circle cx="41" cy="45" r="3" fill="#2b211f" />
              <circle cx="56" cy="45" r="3" fill="#2b211f" />
              <path d="M42 54c4 3 8 3 12 0" stroke="#8b4a33" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            </>
          )}
          {avatar === 'a3' && (
            <>
              <path d="M10 96c1-20 17-32 38-32s37 12 38 32" fill="#f1e7d7" opacity="0.9" />
              <ellipse cx="48" cy="43" rx="17.5" ry="20" fill={skin} />
              <path d="M27 42c0-16 9-26 21-26s21 10 21 26v14c-4 2-6-2-6-8V35c-8 4-22 4-30 0v13c0 6-2 10-6 8V42Z" fill="#211512" />
              <circle cx="41" cy="44" r="2.8" fill="#2b211f" />
              <circle cx="56" cy="44" r="2.8" fill="#2b211f" />
              <path d="M43 53c3 2.5 7 2.5 10 0" stroke="#8b4a33" strokeWidth="2" fill="none" strokeLinecap="round" />
              <circle cx="30" cy="51" r="2.2" fill="#f0c14b" />
              <circle cx="66" cy="51" r="2.2" fill="#f0c14b" />
            </>
          )}
          {avatar === 'a4' && (
            <>
              <path d="M10 96c2-20 17-31 38-31s36 11 38 31" fill="#25384a" opacity="0.92" />
              <ellipse cx="48" cy="44" rx="18" ry="20" fill={skin} />
              <path d="M28 40c1-14 9-22 20-22s19 8 20 22c-7-4-13-5-20-5s-13 1-20 5Z" fill="#e8e2d2" />
              <path d="M27 39h42" stroke="#bfb6a3" strokeWidth="3" strokeLinecap="round" />
              <path d="M38 52c6 4 14 4 20 0" stroke="#6d3d2b" strokeWidth="2" fill="none" strokeLinecap="round" />
              <circle cx="41" cy="45" r="2.6" fill="#2b211f" />
              <circle cx="56" cy="45" r="2.6" fill="#2b211f" />
              <path d="M27 43c-4 1-7 5-7 10M69 43c4 1 7 5 7 10" stroke="#222" strokeWidth="4" fill="none" strokeLinecap="round" />
            </>
          )}
          {avatar === 'a5' && (
            <>
              <path d="M12 96c0-21 16-33 36-33s36 12 36 33" fill="#efe6d8" opacity="0.92" />
              <ellipse cx="48" cy="43" rx="17.5" ry="20" fill={skin} />
              <path d="M29 38c1-14 9-22 19-22s18 8 19 22c-6-4-12-6-19-6s-13 2-19 6Z" fill="#17120f" />
              <circle cx="48" cy="15" r="9" fill="#17120f" />
              <path d="M38 44.5c2-1.5 4.5-1.5 6 0M53 44.5c1.5-1.5 4-1.5 6 0" stroke="#3a2a22" strokeWidth="2" strokeLinecap="round" />
              <path d="M43 54c3 2.6 7 2.6 10 0" stroke="#8b4a33" strokeWidth="2" fill="none" strokeLinecap="round" />
              <circle cx="37" cy="50" r="1.2" fill="#a06a4d" />
              <circle cx="44" cy="52" r="1.2" fill="#a06a4d" />
              <circle cx="58" cy="50" r="1.2" fill="#a06a4d" />
            </>
          )}
          {avatar === 'a6' && (
            <>
              <path d="M12 96c0-20 16-31 36-31s36 11 36 31" fill="#f9f0dc" opacity="0.95" />
              <ellipse cx="48" cy="44" rx="19" ry="20" fill={skin} />
              <path d="M30 32 26 15c6 1 11 5 14 11M66 32l4-17c-6 1-11 5-14 11" fill="#8a4d08" />
              <path d="M29 40c1-13 9-20 19-20s18 7 19 20c-6-4-12-6-19-6s-13 2-19 6Z" fill="#d98c1f" />
              <circle cx="41" cy="45" r="3" fill="#2b211f" />
              <circle cx="56" cy="45" r="3" fill="#2b211f" />
              <path d="M42 54c4 4 8 4 12 0" stroke="#8b4a33" strokeWidth="2.2" fill="none" strokeLinecap="round" />
              <circle cx="31" cy="50" r="3" fill="#e7866d" opacity="0.55" />
              <circle cx="65" cy="50" r="3" fill="#e7866d" opacity="0.55" />
              <path d="m46 64 2-3 2 3" fill="none" stroke="#b45309" strokeWidth="1.5" strokeLinecap="round" />
            </>
          )}
          {avatar === 'a7' && (
            <>
              <circle cx="48" cy="47" r="28" fill="#e7edf3" opacity="0.15" />
              <path d="M20 96c0-18 12-29 28-29s28 11 28 29" fill="#e7edf3" opacity="0.85" />
              <ellipse cx="48" cy="45" rx="17" ry="19" fill={skin} />
              <path d="M25 45c0-18 10-28 23-28s23 10 23 28c0 13-5 22-10 24V45c0-4-2-7-5-7H40c-3 0-5 3-5 7v24c-5-2-10-11-10-24Z" fill="#e7edf3" opacity="0.9" />
              <path d="M28 45h40" stroke="#c3ccd8" strokeWidth="2" />
              <circle cx="41" cy="46" r="2.6" fill="#2b211f" />
              <circle cx="56" cy="46" r="2.6" fill="#2b211f" />
              <path d="M43 55c3 2.4 7 2.4 10 0" stroke="#8b4a33" strokeWidth="2" fill="none" strokeLinecap="round" />
              <circle cx="70" cy="32" r="3" fill="#7ce0d3" />
            </>
          )}
          {avatar === 'a8' && (
            <>
              <path d="M12 96c0-20 16-32 36-32s36 12 36 32" fill="#25313c" opacity="0.9" />
              <ellipse cx="48" cy="44" rx="18" ry="20" fill={skin} />
              <path d="M28 43c0-16 9-25 20-25s20 9 20 25c0 5-2 9-4 11V38c-9 4-23 4-32 0v16c-2-2-4-6-4-11Z" fill="#d98c1f" opacity="0" />
              <path d="M29 37c2-12 9-19 19-19s17 7 19 19c-7-3-12-4-19-4s-12 1-19 4Z" fill="#d9a04c" />
              <path d="M34 36h28M34 36c0 3 3 5 6 5M62 36c0 3-3 5-6 5" stroke="#b47a2c" strokeWidth="2" fill="none" />
              <circle cx="41" cy="46" r="5.3" fill="none" stroke="#efe8db" strokeWidth="1.6" />
              <circle cx="56" cy="46" r="5.3" fill="none" stroke="#efe8db" strokeWidth="1.6" />
              <path d="M46.3 46h4.2" stroke="#efe8db" strokeWidth="1.6" />
              <circle cx="41" cy="46" r="2.2" fill="#2b211f" />
              <circle cx="56" cy="46" r="2.2" fill="#2b211f" />
              <path d="M43 56c3 2.4 7 2.4 10 0" stroke="#8b4a33" strokeWidth="2" fill="none" strokeLinecap="round" />
            </>
          )}
        </g>
      </svg>
    </span>
  );
}

export const AVATAR_IDS = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8'];

export function avatarLabel(id: string) {
  return (
    {
      a1: 'Teal detective',
      a2: 'Amber curls',
      a3: 'Violet bob',
      a4: 'Green cap',
      a5: 'Blue bun',
      a6: 'Sunny cat',
      a7: 'Astronaut',
      a8: 'Beanie',
    }[id] ?? 'Viewer'
  );
}
