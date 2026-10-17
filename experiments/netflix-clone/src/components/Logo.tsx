import { useId } from 'react';
import { cx } from '../lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'kids' | 'mono';
  withMark?: boolean;
  className?: string;
  asLink?: boolean;
}

export function Logo({ size = 'md', variant = 'default', withMark = true, className, asLink = true }: LogoProps) {
  const id = useId().replace(/:/g, '');
  const content = (
    <>
      {withMark && (
        <svg className="logo-mark" viewBox="0 0 48 48" aria-hidden focusable="false">
          <defs>
            <linearGradient id={`reelix-mark-${id}`} x1="4" y1="6" x2="44" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor={variant === 'kids' ? '#ffd166' : '#ff2d55'} />
              <stop offset="0.55" stopColor={variant === 'kids' ? '#ff8fab' : '#ff5f3d'} />
              <stop offset="1" stopColor={variant === 'kids' ? '#6ee7ff' : '#a855f7'} />
            </linearGradient>
          </defs>
          <circle cx="24" cy="24" r="19" fill="none" stroke={`url(#reelix-mark-${id})`} strokeWidth="3" opacity="0.9" />
          <path d="M24 5a19 19 0 0 1 16.2 9.1" stroke={`url(#reelix-mark-${id})`} strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.55" />
          <path d="M19.2 14.9c0-1 1.1-1.7 2-1.2l11.6 7.5c.9.6.9 1.9 0 2.5l-11.6 7.5c-.9.6-2-.1-2-1.2V14.9Z" fill={`url(#reelix-mark-${id})`} />
        </svg>
      )}
      <span className="logo-word">
        REELIX<span className="logo-dot">.</span>
        {variant === 'kids' && <span className="logo-kids">KIDS</span>}
      </span>
    </>
  );

  const classes = cx('logo', `logo--${size}`, `logo--${variant}`, className);
  if (asLink) {
    return (
      <a className={classes} href="#/" aria-label="REELIX home">
        {content}
      </a>
    );
  }
  return <span className={classes}>{content}</span>;
}
