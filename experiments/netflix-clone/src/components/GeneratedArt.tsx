import { useId } from 'react';
import type { Art } from '../types';
import { cx } from '../lib/utils';

type Variant = 'poster' | 'wide' | 'billboard' | 'square';

interface GeneratedArtProps {
  titleId: string;
  title: string;
  art: Pick<Art, 'colors' | 'titleStyle'>;
  variant: Variant;
  showTitle?: boolean;
  kicker?: string;
  className?: string;
  /** Film-grain layer. Disabled when rasterising to a file for the dev art pipeline. */
  grain?: boolean;
}

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rand(seed: number, index: number) {
  const value = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

/** A jagged horizon line, used to suggest a landscape or skyline silhouette. */
function ridgePath(seed: number, width: number, height: number, baseY: number, amplitude: number, points: number) {
  const step = width / points;
  let path = `M0 ${height} L0 ${baseY}`;
  for (let i = 0; i <= points; i += 1) {
    const x = i * step;
    const noise = rand(seed, 700 + i) * 0.62 + rand(seed, 900 + i) * 0.38;
    const y = baseY - amplitude * noise - amplitude * 0.18 * Math.sin(i * 1.7 + seed % 7);
    path += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  path += ` L${width} ${height} Z`;
  return path;
}

const FONT_STYLES: Record<Art['titleStyle'], { family: string; weight: number; tracking: number }> = {
  serif: { family: 'Georgia, "Iowan Old Style", "Times New Roman", serif', weight: 700, tracking: 0 },
  display: { family: '"Arial Black", "Helvetica Neue", system-ui, sans-serif', weight: 900, tracking: 1 },
  wide: { family: '"Helvetica Neue", Arial, system-ui, sans-serif', weight: 700, tracking: 8 },
  sans: { family: '"Helvetica Neue", Arial, system-ui, sans-serif', weight: 800, tracking: 2 },
};

export function GeneratedArt({
  titleId,
  title,
  art,
  variant,
  showTitle = true,
  kicker,
  className,
  grain = true,
}: GeneratedArtProps) {
  const rawId = useId().replace(/:/g, '');
  const [c1, c2, c3] = art.colors.length >= 3 ? art.colors : ['#16222b', '#c08a52', '#3c6f6a'];
  const seed = hash(titleId);
  const width = variant === 'poster' ? 800 : variant === 'square' ? 800 : 1600;
  const height = variant === 'poster' ? 1200 : variant === 'square' ? 800 : 900;
  const font = FONT_STYLES[art.titleStyle] ?? FONT_STYLES.sans;
  const titleText = title.toUpperCase();
  const maxTitleWidth = width * (variant === 'poster' ? 0.87 : 0.86);
  const weightFactor = art.titleStyle === 'display' ? 0.88 : art.titleStyle === 'wide' ? 0.76 : art.titleStyle === 'serif' ? 0.84 : 0.78;
  const trackingPerChar = art.titleStyle === 'wide' ? 8 : 0;
  const idealSize = variant === 'poster' ? 96 : 108;
  const fitSize = maxTitleWidth / Math.max(titleText.length * weightFactor, 1) - trackingPerChar;
  const bigSize = Math.max(
    variant === 'poster' ? 34 : 30,
    Math.min(idealSize, fitSize),
  );

  const glowX = 20 + rand(seed, 1) * 60;
  const glowY = 12 + rand(seed, 2) * 46;
  const orbR = 160 + rand(seed, 3) * 240;
  const angle = -30 + rand(seed, 4) * 70;
  const bars = Array.from({ length: 5 }, (_, i) => ({
    x: 6 + i * 19 + rand(seed, 10 + i) * 8,
    opacity: 0.05 + rand(seed, 20 + i) * 0.14,
    width: 2 + rand(seed, 30 + i) * 26,
    height: 20 + rand(seed, 40 + i) * 60,
  }));
  const stars = Array.from({ length: 24 }, (_, i) => ({
    x: rand(seed, 100 + i) * width,
    y: rand(seed, 200 + i) * height,
    r: 0.6 + rand(seed, 300 + i) * 1.8,
    o: 0.2 + rand(seed, 400 + i) * 0.5,
  }));
  const ringX = width * (0.62 + rand(seed, 5) * 0.26);
  const ringY = height * (0.3 + rand(seed, 6) * 0.2);
  const ringR = Math.min(width, height) * (0.24 + rand(seed, 7) * 0.22);
  const lineY = height * (0.6 + rand(seed, 8) * 0.16);
  const horizon = height * (0.62 + rand(seed, 9) * 0.14);
  const ridges = [
    { y: horizon, amp: height * 0.17, points: 9, opacity: 0.5, fill: c3 },
    { y: horizon + height * 0.09, amp: height * 0.13, points: 13, opacity: 0.62, fill: c1 },
    { y: horizon + height * 0.2, amp: height * 0.1, points: 17, opacity: 0.86, fill: '#050509' },
  ];
  const figureX = width * (0.16 + rand(seed, 12) * 0.2);
  const figureH = height * (0.055 + rand(seed, 13) * 0.035);
  const figureY = horizon + height * 0.16;

  const ridgePaths = ridges.map((ridge, index) =>
    ridgePath(seed + index * 31, width, height, ridge.y, ridge.amp, ridge.points),
  );

  return (
    <svg
      className={cx('generated-art', className)}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={`Key art for ${title}`}
    >
      <defs>
        <linearGradient id={`${rawId}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c1} />
          <stop offset="0.55" stopColor={c2} stopOpacity="0.55" />
          <stop offset="1" stopColor={c3} />
        </linearGradient>
        <radialGradient id={`${rawId}-glow`} cx={glowX / 100} cy={glowY / 100} r="0.8">
          <stop offset="0" stopColor={c2} stopOpacity="0.9" />
          <stop offset="0.45" stopColor={c2} stopOpacity="0.25" />
          <stop offset="1" stopColor={c1} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${rawId}-scrim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.35" stopColor="#000000" stopOpacity="0" />
          <stop offset="0.78" stopColor="#000000" stopOpacity="0.55" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.88" />
        </linearGradient>
        <radialGradient id={`${rawId}-vignette`} cx="0.5" cy="0.5" r="0.75">
          <stop offset="0.55" stopColor="#000000" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.55" />
        </radialGradient>
        <filter id={`${rawId}-blur`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={variant === 'poster' ? 32 : 46} />
        </filter>
        <filter id={`${rawId}-soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <filter id={`${rawId}-grain`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={seed % 1000} result="noise" />
          <feColorMatrix in="noise" type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.16" />
          </feComponentTransfer>
        </filter>
      </defs>

      <rect width={width} height={height} fill={`url(#${rawId}-bg)`} />
      <rect width={width} height={height} fill={`url(#${rawId}-glow)`} />
      <ellipse
        cx={width * 0.7}
        cy={height * 0.35}
        rx={orbR}
        ry={orbR * 0.82}
        fill={c3}
        opacity="0.35"
        filter={`url(#${rawId}-blur)`}
      />
      <ellipse
        cx={width * 0.22}
        cy={height * 0.62}
        rx={orbR * 0.8}
        ry={orbR * 0.6}
        fill={c2}
        opacity="0.22"
        filter={`url(#${rawId}-blur)`}
      />

      <g transform={`rotate(${angle} ${width / 2} ${height / 2})`} opacity="0.85">
        <circle
          cx={ringX}
          cy={ringY}
          r={ringR}
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.24"
          strokeWidth="1.4"
        />
        <circle
          cx={ringX}
          cy={ringY}
          r={ringR * 0.72}
          fill="none"
          stroke={c2}
          strokeOpacity="0.5"
          strokeWidth="1"
        />
        <path
          d={`M${ringX - ringR * 1.45} ${ringY + ringR * 0.4} A ${ringR * 1.6} ${ringR * 1.6} 0 0 1 ${ringX + ringR * 1.3} ${ringY - ringR * 1.1}`}
          fill="none"
          stroke="#ffffff"
          strokeOpacity="0.16"
          strokeWidth="1.2"
        />
      </g>

      <line x1="0" x2={width} y1={lineY} y2={lineY} stroke="#ffffff" strokeOpacity="0.12" strokeWidth="1" />
      <circle cx={width * 0.24} cy={lineY - Math.min(width, height) * 0.12} r={Math.min(width, height) * 0.1} fill={c2} opacity="0.5" filter={`url(#${rawId}-soft)`} />

      <g opacity="0.7">
        {bars.map((bar, index) => (
          <rect
            key={index}
            x={(width * bar.x) / 100}
            y={(height * (100 - bar.height)) / 100}
            width={(width * bar.width) / 1000}
            height={(height * bar.height) / 100}
            fill="#ffffff"
            opacity={bar.opacity}
          />
        ))}
      </g>

      <g>
        {stars.map((star, index) => (
          <circle key={index} cx={star.x} cy={star.y} r={star.r} fill="#ffffff" opacity={star.o} />
        ))}
      </g>

      {ridges.map((ridge, index) => (
        <path key={index} d={ridgePaths[index]} fill={ridge.fill} opacity={ridge.opacity} />
      ))}

      <g opacity="0.5" fill="#020205">
        <ellipse cx={figureX} cy={figureY} rx={figureH * 0.2} ry={figureH * 0.2} />
        <path
          d={`M${figureX - figureH * 0.24} ${figureY + figureH * 0.3} Q${figureX - figureH * 0.2} ${figureY - figureH * 0.1} ${figureX - figureH * 0.1} ${figureY - figureH * 0.16} L${figureX + figureH * 0.1} ${figureY - figureH * 0.16} Q${figureX + figureH * 0.2} ${figureY - figureH * 0.1} ${figureX + figureH * 0.24} ${figureY + figureH * 0.3} Z`}
        />
      </g>

      <rect width={width} height={height} fill={`url(#${rawId}-vignette)`} />
      <rect width={width} height={height} fill={`url(#${rawId}-scrim)`} />
      {grain && <rect width={width} height={height} filter={`url(#${rawId}-grain)`} opacity="0.5" />}

      {showTitle && (
        <g>
          <text
            x={width * 0.065}
            y={height * (variant === 'poster' ? 0.855 : 0.79)}
            fill="#ffffff"
            opacity="0.62"
            fontFamily="'Helvetica Neue', Arial, sans-serif"
            fontSize={variant === 'poster' ? 16 : 19}
            letterSpacing="4"
          >
            {(kicker ?? 'A REELIX ORIGINAL').toUpperCase()}
          </text>
          <text
            x={width * 0.06}
            y={height * (variant === 'poster' ? 0.925 : 0.875)}
            fill="#ffffff"
            fontFamily={font.family}
            fontWeight={font.weight}
            fontSize={bigSize}
            letterSpacing={font.tracking}
            style={{ textTransform: 'uppercase' }}
          >
            {titleText}
          </text>
          <line
            x1={width * 0.062}
            x2={width * 0.062 + Math.min(width * 0.18, 260)}
            y1={height * (variant === 'poster' ? 0.95 : 0.91)}
            y2={height * (variant === 'poster' ? 0.95 : 0.91)}
            stroke="#ffffff"
            strokeOpacity="0.45"
            strokeWidth="2"
          />
        </g>
      )}
    </svg>
  );
}
