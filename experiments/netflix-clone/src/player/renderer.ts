import type { Art, TitleFull } from '../types';

export const INTRO_END = 22;
export const CREDITS_LENGTH = 58;

interface FrameOptions {
  title: TitleFull;
  episode: { season: number; episode: number; title: string } | null;
  time: number;
  duration: number;
  mode?: 'play' | 'preview';
}

const imageCache = new Map<string, HTMLImageElement | null>();
const failedImages = new Set<string>();

function getImage(src: string | null | undefined): HTMLImageElement | null {
  if (!src) return null;
  if (imageCache.has(src)) {
    const cached = imageCache.get(src) ?? null;
    return cached && cached.complete && cached.naturalWidth > 0 ? cached : null;
  }
  if (failedImages.has(src)) return null;
  const image = new Image();
  image.decoding = 'async';
  image.src = src;
  image.onload = () => imageCache.set(src, image);
  image.onerror = () => {
    failedImages.add(src);
    imageCache.set(src, null);
  };
  imageCache.set(src, image);
  return null;
}

export function preloadArt(art: Art) {
  getImage(art.backdrop);
  getImage(art.poster);
}

function hash(value: string) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seeded(seed: number, i: number) {
  const value = Math.sin(seed * 0.0129898 + i * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

let grainCanvas: HTMLCanvasElement | null = null;

function getGrain() {
  if (grainCanvas) return grainCanvas;
  const canvas = document.createElement('canvas');
  canvas.width = 180;
  canvas.height = 110;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const image = ctx.createImageData(canvas.width, canvas.height);
  for (let i = 0; i < image.data.length; i += 4) {
    const value = Math.random() * 255;
    image.data[i] = value;
    image.data[i + 1] = value;
    image.data[i + 2] = value;
    image.data[i + 3] = Math.random() * 70;
  }
  ctx.putImageData(image, 0, 0);
  grainCanvas = canvas;
  return canvas;
}

function coverRect(
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  scale = 1,
  offsetX = 0,
  offsetY = 0,
) {
  const imageAspect = image.naturalWidth / Math.max(1, image.naturalHeight);
  const targetAspect = width / height;
  let drawW = width * scale;
  let drawH = height * scale;
  if (imageAspect > targetAspect) {
    drawH = height * scale;
    drawW = drawH * imageAspect;
  } else {
    drawW = width * scale;
    drawH = drawW / imageAspect;
  }
  const drawX = x + (width - drawW) / 2 + offsetX * (drawW - width) * 0.5;
  const drawY = y + (height - drawH) / 2 + offsetY * (drawH - height) * 0.5;
  return { x: drawX, y: drawY, w: drawW, h: drawH };
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number,
  offsetX: number,
  offsetY: number,
) {
  const rect = coverRect(image, x, y, width, height, scale, offsetX, offsetY);
  ctx.drawImage(image, rect.x, rect.y, rect.w, rect.h);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(' ');
  let line = '';
  let cursorY = y;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      ctx.fillText(line, x, cursorY);
      line = word;
      cursorY += lineHeight;
    } else {
      line = candidate;
    }
  }
  if (line) ctx.fillText(line, x, cursorY);
}

function drawProceduralScene(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  colors: string[],
  seed: number,
  time: number,
) {
  const [c1, c2, c3] = colors.length >= 3 ? colors : ['#141b26', '#cf9b62', '#3f6f71'];
  const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, c1);
  gradient.addColorStop(0.55, c2);
  gradient.addColorStop(1, c3);
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 3; i += 1) {
    const ox = x + width * (0.2 + seeded(seed, i + 1) * 0.7) + Math.sin(time * 0.045 + i) * width * 0.03;
    const oy = y + height * (0.2 + seeded(seed, i + 11) * 0.6) + Math.cos(time * 0.032 + i * 1.7) * height * 0.02;
    const radius = Math.max(width, height) * (0.22 + seeded(seed, i + 21) * 0.3);
    const glow = ctx.createRadialGradient(ox, oy, 0, ox, oy, radius);
    glow.addColorStop(0, i % 2 === 0 ? c2 : c3);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(ox, oy, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 1;
  const horizon = y + height * (0.58 + seeded(seed, 31) * 0.08);
  ctx.beginPath();
  ctx.moveTo(x, horizon);
  ctx.lineTo(x + width, horizon);
  ctx.stroke();

  const ringX = x + width * (0.64 + seeded(seed, 41) * 0.16);
  const ringY = y + height * (0.3 + seeded(seed, 42) * 0.1);
  const ringR = Math.min(width, height) * (0.18 + seeded(seed, 43) * 0.1);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  ctx.arc(ringX, ringY, ringR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.09)';
  ctx.beginPath();
  ctx.arc(ringX, ringY, ringR * 1.3, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < 46; i += 1) {
    const px = x + seeded(seed, 100 + i) * width;
    const py = y + seeded(seed, 200 + i) * height * 0.8;
    const drift = Math.sin(time * 0.12 + i) * 5;
    const radius = 0.5 + seeded(seed, 300 + i) * 1.6;
    ctx.fillStyle = `rgba(255,255,255,${0.12 + seeded(seed, 400 + i) * 0.35})`;
    ctx.beginPath();
    ctx.arc(px + drift, py, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const beam = ctx.createLinearGradient(x, y, x + width * 0.7, y + height);
  beam.addColorStop(0, 'rgba(255,255,255,0.09)');
  beam.addColorStop(0.5, 'rgba(255,255,255,0)');
  ctx.fillStyle = beam;
  ctx.save();
  ctx.translate(x + width * 0.55, y);
  ctx.rotate(0.42);
  ctx.fillRect(-width * 0.2, -height, width * 0.24, height * 3);
  ctx.restore();
  ctx.restore();
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  frameX: number,
  frameY: number,
  frameW: number,
  frameH: number,
  opts: FrameOptions,
) {
  const { title, time } = opts;
  const colors = title.art.colors;
  const seed = hash(title.id);
  const sceneIndex = Math.floor(time / 46);
  const panorama = Math.sin(time * 0.021) * 0.35 + Math.sin(time * 0.007) * 0.3;
  const backdrop = getImage(title.art.backdrop);
  const poster = getImage(title.art.poster);

  if (backdrop) {
    const scale = 1.07 + (sceneIndex % 3) * 0.035 + Math.sin(time * 0.05) * 0.01;
    ctx.save();
    ctx.beginPath();
    ctx.rect(frameX, frameY, frameW, frameH);
    ctx.clip();
    drawImageCover(ctx, backdrop, frameX, frameY, frameW, frameH, scale, panorama, Math.sin(time * 0.03) * 0.3);
    ctx.restore();
  } else if (poster) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(frameX, frameY, frameW, frameH);
    ctx.clip();
    ctx.filter = 'blur(42px) brightness(0.55) saturate(1.1)';
    drawImageCover(ctx, poster, frameX, frameY, frameW, frameH, 1.35, panorama * 0.4, 0);
    ctx.filter = 'none';

    const posterH = frameH * 0.94;
    const posterW = posterH * (poster.naturalWidth / Math.max(1, poster.naturalHeight));
    const drift = Math.sin(time * 0.02) * frameW * 0.012;
    const posterX = frameX + frameW * 0.56 + drift;
    const posterY = frameY + (frameH - posterH) / 2;
    const gradient = ctx.createLinearGradient(frameX, 0, frameX + frameW * 0.75, 0);
    gradient.addColorStop(0, 'rgba(0,0,0,0.92)');
    gradient.addColorStop(0.55, 'rgba(0,0,0,0.5)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(frameX, frameY, frameW, frameH);
    ctx.globalAlpha = 0.92;
    ctx.drawImage(poster, posterX, posterY, posterW, posterH);
    ctx.globalAlpha = 1;
    ctx.restore();
  } else {
    ctx.save();
    ctx.beginPath();
    ctx.rect(frameX, frameY, frameW, frameH);
    ctx.clip();
    drawProceduralScene(ctx, frameX, frameY, frameW, frameH, colors, seed, time);
    ctx.restore();
  }

  // Cinematic colour grade, light bloom and vignette.
  ctx.save();
  ctx.beginPath();
  ctx.rect(frameX, frameY, frameW, frameH);
  ctx.clip();
  const grade = ctx.createLinearGradient(frameX, frameY, frameX, frameY + frameH);
  grade.addColorStop(0, `${colors[0]}`);
  grade.addColorStop(0.55, 'rgba(0,0,0,0)');
  grade.addColorStop(1, `${colors[1]}`);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = grade;
  ctx.fillRect(frameX, frameY, frameW, frameH);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;

  const bloomX = frameX + frameW * (0.3 + 0.18 * Math.sin(time * 0.032));
  const bloomY = frameY + frameH * (0.34 + 0.1 * Math.cos(time * 0.024));
  const bloom = ctx.createRadialGradient(bloomX, bloomY, 0, bloomX, bloomY, frameW * 0.55);
  bloom.addColorStop(0, 'rgba(255,255,255,0.1)');
  bloom.addColorStop(0.42, 'rgba(255,255,255,0.03)');
  bloom.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = bloom;
  ctx.fillRect(frameX, frameY, frameW, frameH);
  ctx.globalCompositeOperation = 'source-over';

  const vignette = ctx.createRadialGradient(
    frameX + frameW / 2,
    frameY + frameH / 2,
    Math.min(frameW, frameH) * 0.25,
    frameX + frameW / 2,
    frameY + frameH / 2,
    Math.max(frameW, frameH) * 0.72,
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(0.75, 'rgba(0,0,0,0.28)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.78)');
  ctx.fillStyle = vignette;
  ctx.fillRect(frameX, frameY, frameW, frameH);

  // Film grain, drawn smaller and tiled.
  const grain = getGrain();
  ctx.globalAlpha = 0.5;
  ctx.globalCompositeOperation = 'overlay';
  const grainSize = Math.max(frameW, frameH) * 0.7;
  const grainOffset = (Math.floor(time * 24) % 7) * 12;
  ctx.drawImage(grain, frameX - grainOffset, frameY - grainOffset, grainSize, grainSize);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
}

function fadeAlpha(time: number, start: number, inDuration: number, outStart: number, outDuration: number) {
  if (time < start || time > outStart + outDuration) return 0;
  if (time < start + inDuration) return (time - start) / inDuration;
  if (time > outStart) return Math.max(0, 1 - (time - outStart) / outDuration);
  return 1;
}

function drawIntro(
  ctx: CanvasRenderingContext2D,
  frameX: number,
  frameY: number,
  frameW: number,
  frameH: number,
  opts: FrameOptions,
) {
  const { title, time, episode } = opts;
  if (opts.mode === 'preview' || time > INTRO_END) return;

  const blackout = Math.max(0, 1 - time / 9);
  ctx.fillStyle = `rgba(0,0,0,${0.55 + blackout * 0.45})`;
  ctx.fillRect(frameX, frameY, frameW, frameH);

  const centerX = frameX + frameW / 2;
  const centerY = frameY + frameH / 2;

  const brandAlpha = fadeAlpha(time, 1.4, 1.2, 5.6, 1.6);
  if (brandAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = brandAlpha;
    ctx.fillStyle = 'rgba(255,255,255,0.62)';
    ctx.font = `500 ${Math.max(11, Math.round(frameW * 0.0086))}px "Helvetica Neue", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.letterSpacing = `${Math.round(frameW * 0.004)}px`;
    ctx.fillText('A  R E E L I X  O R I G I N A L', centerX, centerY);
    ctx.restore();
  }

  const logoAlpha = fadeAlpha(time, 3.2, 1.6, 8.2, 1.8);
  if (logoAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = logoAlpha;
    const logoSize = Math.max(38, frameW * 0.075);
    ctx.font = `900 ${logoSize}px "Helvetica Neue", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const gradient = ctx.createLinearGradient(centerX - frameW * 0.15, 0, centerX + frameW * 0.15, 0);
    gradient.addColorStop(0, '#ff2d55');
    gradient.addColorStop(0.55, '#ff6b3d');
    gradient.addColorStop(1, '#a855f7');
    ctx.fillStyle = gradient;
    ctx.letterSpacing = `${Math.round(logoSize * 0.12)}px`;
    ctx.fillText('REELIX', centerX, centerY - logoSize * 0.1);
    ctx.globalAlpha = logoAlpha * 0.55;
    ctx.fillStyle = '#ffffff';
    ctx.font = `500 ${Math.max(10, Math.round(frameW * 0.008))}px "Helvetica Neue", Arial, sans-serif`;
    ctx.letterSpacing = `${Math.round(frameW * 0.0035)}px`;
    ctx.fillText('STORIES THAT STAY WITH YOU', centerX, centerY + logoSize * 0.75);
    ctx.restore();
  }

  const titleAlpha = fadeAlpha(time, 9.4, 1.8, 18.6, 2.4);
  if (titleAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = titleAlpha;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const fontSize = Math.min(frameW * 0.078, frameH * 0.16);
    const family =
      title.art.titleStyle === 'serif'
        ? 'Georgia, "Times New Roman", serif'
        : title.art.titleStyle === 'wide'
          ? '"Helvetica Neue", Arial, sans-serif'
          : '"Arial Black", "Helvetica Neue", sans-serif';
    const weight = title.art.titleStyle === 'serif' ? 700 : 900;
    ctx.font = `${weight} ${fontSize}px ${family}`;
    const display = title.title.toUpperCase();
    ctx.letterSpacing = `${Math.max(1, fontSize * (title.art.titleStyle === 'wide' ? 0.08 : 0.02))}px`;
    wrapText(ctx, display, centerX, centerY - fontSize * 0.2, frameW * 0.78, fontSize * 1.02);

    ctx.globalAlpha = titleAlpha * 0.72;
    ctx.fillStyle = '#ffffff';
    ctx.font = `500 ${Math.max(12, Math.round(frameW * 0.0095))}px "Helvetica Neue", Arial, sans-serif`;
    ctx.letterSpacing = `${Math.round(frameW * 0.004)}px`;
    const subtitle =
      title.type === 'series' && episode
        ? `SEASON ${episode.season}  ·  EPISODE ${episode.episode}  ·  ${episode.title.toUpperCase()}`
        : `${title.year}  ·  A FILM BY ${(title.director ?? 'THE REELIX STUDIO').toUpperCase()}`;
    ctx.fillText(subtitle, centerX, centerY + fontSize * 0.92);
    ctx.restore();
  }
}

function creditLines(title: TitleFull) {
  const lines = [
    { text: 'A REELIX ORIGINAL', emphasis: true },
    { text: title.title, emphasis: true },
    { text: '', emphasis: false },
    ...(title.type === 'series'
      ? [{ text: `Created by ${title.creator ?? 'the REELIX Studio'}`, emphasis: false }]
      : [{ text: `Directed by ${title.director ?? 'the REELIX Studio'}`, emphasis: false }]),
    { text: '', emphasis: false },
    { text: 'CAST', emphasis: true },
    ...title.cast.map((person) => ({ text: `${person.name}  —  ${person.role}`, emphasis: false })),
    { text: '', emphasis: false },
    { text: 'Music by Ansel Grey', emphasis: false },
    { text: 'Director of Photography Maia Chen', emphasis: false },
    { text: 'Edited by Ruben Okafor', emphasis: false },
    { text: 'Production Design by Ilse Baum', emphasis: false },
    { text: '', emphasis: false },
    { text: 'Visual sequence generated from original key art', emphasis: false },
    { text: 'Synthetic footage — created for the REELIX demo', emphasis: false },
    { text: '', emphasis: false },
    { text: '© 2026 REELIX DEMO STUDIOS', emphasis: false },
  ];
  return lines;
}

function drawCredits(
  ctx: CanvasRenderingContext2D,
  frameX: number,
  frameY: number,
  frameW: number,
  frameH: number,
  opts: FrameOptions,
) {
  if (opts.mode === 'preview') return;
  const creditsStart = opts.duration - CREDITS_LENGTH;
  if (opts.time < creditsStart) return;
  const elapsed = opts.time - creditsStart;
  const overlayAlpha = Math.min(0.9, elapsed / 4);
  ctx.fillStyle = `rgba(0,0,0,${overlayAlpha})`;
  ctx.fillRect(frameX, frameY, frameW, frameH);
  if (elapsed < 3) return;

  const lines = creditLines(opts.title);
  const lineHeight = Math.max(22, frameH * 0.038);
  const totalHeight = lines.length * lineHeight;
  const scroll = ((elapsed - 3) / (CREDITS_LENGTH - 3)) * (totalHeight + frameH * 0.85);
  const startY = frameY + frameH * 0.92 - scroll;

  ctx.save();
  ctx.beginPath();
  ctx.rect(frameX, frameY, frameW, frameH);
  ctx.clip();
  ctx.textAlign = 'center';
  lines.forEach((line, index) => {
    const y = startY + index * lineHeight;
    if (y < frameY - lineHeight || y > frameY + frameH + lineHeight) return;
    ctx.globalAlpha = Math.min(1, elapsed / 6);
    ctx.fillStyle = line.emphasis ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.58)';
    ctx.font = line.emphasis
      ? `700 ${Math.max(12, frameW * 0.011)}px "Helvetica Neue", Arial, sans-serif`
      : `400 ${Math.max(10, frameW * 0.0085)}px "Helvetica Neue", Arial, sans-serif`;
    ctx.letterSpacing = line.emphasis ? '2px' : '0px';
    ctx.fillText(line.text, frameX + frameW / 2, y);
  });
  ctx.restore();

  if (opts.time > opts.duration - 4) {
    const logoAlpha = Math.min(1, (opts.time - (opts.duration - 4)) / 2);
    ctx.fillStyle = `rgba(0,0,0,${logoAlpha})`;
    ctx.fillRect(frameX, frameY, frameW, frameH);
    ctx.save();
    ctx.globalAlpha = logoAlpha;
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.max(28, frameW * 0.055)}px "Helvetica Neue", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = `${frameW * 0.008}px`;
    ctx.fillText('REELIX', frameX + frameW / 2, frameY + frameH / 2);
    ctx.restore();
  }
}

export function drawFrame(canvas: HTMLCanvasElement, opts: FrameOptions) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (width < 2 || height < 2) return;
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  const targetAspect = 2.39;
  let frameW = width;
  let frameH = width / targetAspect;
  if (frameH > height) {
    frameH = height;
    frameW = height * targetAspect;
  }
  const frameX = (width - frameW) / 2;
  const frameY = (height - frameH) / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(frameX, frameY, frameW, frameH);
  ctx.clip();
  drawScene(ctx, frameX, frameY, frameW, frameH, opts);
  drawIntro(ctx, frameX, frameY, frameW, frameH, opts);
  drawCredits(ctx, frameX, frameY, frameW, frameH, opts);
  ctx.restore();

  // Subtle edge between frame and letterbox.
  ctx.strokeStyle = 'rgba(255,255,255,0.035)';
  ctx.lineWidth = 1;
  ctx.strokeRect(frameX + 0.5, frameY + 0.5, frameW - 1, frameH - 1);
}
