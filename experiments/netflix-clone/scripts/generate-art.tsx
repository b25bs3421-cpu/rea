/**
 * Final art pipeline for REELIX.
 *
 * All key art is generated for this project. Three sources feed the build:
 *
 *  1. PHOTOGRAPHIC — cinematic key art produced for the demo; the clean 16:9
 *     "hero" frame is kept for billboards and the poster is derived from it.
 *  2. POSTER ONLY  — cinematic posters without a matching wide frame; the
 *     backdrop is composed from the poster (blurred fill + poster figure).
 *  3. GENERATED    — no photography; poster/backdrop/hero are rasterised from
 *     the app's own <GeneratedArt> fallback so the catalogue stays consistent.
 *
 * Everything is written as compressed JPEG into public/art.
 * Run with `npm run art`.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import sharp from 'sharp';
import { GeneratedArt } from '../src/components/GeneratedArt';
import { CATALOG } from '../server/catalog.mjs';

const ART_DIR = 'public/art';
mkdirSync(ART_DIR, { recursive: true });

/** Titles whose hero images were generated as clean 16:9 frames. */
const PHOTO_HEROES = ['blackwater', 'neon-district', 'last-orbit'];
/** Titles that only have a photographic poster. */
const PHOTO_POSTERS = ['paper-crown', 'deep-signal', 'crimson-protocol', 'glasshouse'];
/** Titles with no photography at all. */
const GENERATED = [
  'night-shift', 'afterlight', 'sierra', 'hollow-creek', 'static-bloom',
  'long-way-home', 'midnight-market', 'ironwood', 'counterweight', 'little-kingdoms',
  'quiet-fleet', 'borrowed-light', 'signal-lost', 'second-summer', 'grand-bazaar',
  'ninth-floor', 'wild-lines', 'karst', 'palindrome',
];

interface CatalogTitle {
  id: string;
  title: string;
  format: string;
  art: {
    poster: string | null;
    backdrop: string | null;
    hero?: string | null;
    colors: string[];
    titleStyle: 'serif' | 'display' | 'wide' | 'sans';
  };
}

const titles = CATALOG as CatalogTitle[];
const byId = new Map(titles.map((title) => [title.id, title]));

function findSource(id: string, suffix: string) {
  for (const ext of ['png', 'jpg']) {
    const candidate = `${ART_DIR}/${id}-${suffix}.${ext}`;
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

async function jpeg(input: string | Buffer, width: number, height: number, out: string, quality = 86) {
  const result = await sharp(input)
    .resize(width, height, { fit: 'cover', position: 'attention' })
    .jpeg({ quality, mozjpeg: true })
    .toFile(out);
  return `${result.width}x${result.height}`;
}

async function composeBackdropFromPoster(id: string, source: string | Buffer) {
  const background = await sharp(source)
    .resize(1600, 900, { fit: 'cover', position: 'attention' })
    .blur(34)
    .modulate({ brightness: 0.46, saturation: 1.1 })
    .toBuffer();

  const poster = await sharp(source).resize({ height: 860 }).toBuffer();
  const meta = await sharp(poster).metadata();
  const width = meta.width ?? 574;
  const left = Math.max(1600 - width - 110, 700);

  const shade = Buffer.from(`<svg width="1600" height="900" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="left" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#06060a" stop-opacity="0.95"/>
        <stop offset="0.52" stop-color="#06060a" stop-opacity="0.6"/>
        <stop offset="1" stop-color="#06060a" stop-opacity="0.12"/>
      </linearGradient>
      <linearGradient id="bottom" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0.5" stop-color="#06060a" stop-opacity="0"/>
        <stop offset="1" stop-color="#06060a" stop-opacity="0.8"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.7" cy="0.42" r="0.44">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.18"/>
        <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="1600" height="900" fill="url(#left)"/>
    <rect width="1600" height="900" fill="url(#bottom)"/>
    <rect width="1600" height="900" fill="url(#glow)"/>
  </svg>`);

  await sharp(background)
    .composite([
      { input: shade, top: 0, left: 0 },
      { input: poster, top: 20, left },
    ])
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(`${ART_DIR}/${id}-backdrop.jpg`);

  // Clean hero frame: the poster cropped to 16:9 with a cinematic side shade.
  const heroBase = await sharp(source)
    .resize(1920, 1080, { fit: 'cover', position: 'centre' })
    .modulate({ brightness: 0.82, saturation: 1.05 })
    .toBuffer();
  const heroShade = Buffer.from(`<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="hl" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#050509" stop-opacity="0.92"/>
        <stop offset="0.42" stop-color="#050509" stop-opacity="0.55"/>
        <stop offset="0.72" stop-color="#050509" stop-opacity="0.08"/>
        <stop offset="1" stop-color="#050509" stop-opacity="0.35"/>
      </linearGradient>
      <linearGradient id="hb" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0.55" stop-color="#050509" stop-opacity="0"/>
        <stop offset="1" stop-color="#050509" stop-opacity="0.55"/>
      </linearGradient>
    </defs>
    <rect width="1920" height="1080" fill="url(#hl)"/>
    <rect width="1920" height="1080" fill="url(#hb)"/>
  </svg>`);
  await sharp(heroBase)
    .composite([{ input: heroShade, top: 0, left: 0 }])
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(`${ART_DIR}/${id}-hero.jpg`);
}

function generatedSvg(title: CatalogTitle, variant: 'poster' | 'wide', showTitle: boolean) {
  const markup = renderToStaticMarkup(
    createElement(GeneratedArt, {
      titleId: title.id,
      title: title.title,
      art: title.art,
      variant,
      showTitle,
      kicker: title.format,
      grain: false,
    }),
  );
  return markup
    .replace(/^<svg /, '<svg xmlns="http://www.w3.org/2000/svg" ')
    .replace(/width="[^"]*"/, '')
    .replace(/height="[^"]*"/, '');
}

const report: string[] = [];

for (const id of PHOTO_HEROES) {
  const source = findSource(id, 'backdrop');
  if (!source) {
    report.push(`SKIP  ${id}  no photographic source`);
    continue;
  }
  const buffer = await sharp(source).toBuffer();
  const backdrop = await jpeg(buffer, 1600, 900, `${ART_DIR}/${id}-backdrop.jpg`);
  const heroSize = await jpeg(buffer, 1920, 1080, `${ART_DIR}/${id}-hero-tmp.jpg`);
  const posterSource = findSource(id, 'poster');
  const poster = posterSource
    ? await jpeg(await sharp(posterSource).toBuffer(), 800, 1200, `${ART_DIR}/${id}-poster.jpg`, 88)
    : 'missing';
  const { renameSync } = await import('node:fs');
  renameSync(`${ART_DIR}/${id}-hero-tmp.jpg`, `${ART_DIR}/${id}-hero.jpg`);
  report.push(`photo     ${id}  poster ${poster} · backdrop ${backdrop} · hero ${heroSize}`);
}

for (const id of PHOTO_POSTERS) {
  const source = findSource(id, 'poster');
  if (!source) {
    report.push(`SKIP  ${id}  no poster source`);
    continue;
  }
  const sourceBuffer = await sharp(source).toBuffer();
  const poster = await jpeg(sourceBuffer, 800, 1200, `${ART_DIR}/${id}-poster.jpg`, 88);
  await composeBackdropFromPoster(id, sourceBuffer);
  report.push(`composite ${id}  poster ${poster} · backdrop + hero derived`);
}

for (const id of GENERATED) {
  const title = byId.get(id);
  if (!title) continue;
  const poster = await jpeg(Buffer.from(generatedSvg(title, 'poster', true)), 800, 1200, `${ART_DIR}/${id}-poster.jpg`, 88);
  const backdrop = await jpeg(Buffer.from(generatedSvg(title, 'wide', true)), 1600, 900, `${ART_DIR}/${id}-backdrop.jpg`);
  const hero = await jpeg(Buffer.from(generatedSvg(title, 'wide', false)), 1600, 900, `${ART_DIR}/${id}-hero.jpg`);
  report.push(`generated ${id}  poster ${poster} · backdrop ${backdrop} · hero ${hero}`);
}

writeFileSync('/tmp/art-report.txt', report.join('\n'));
console.log(report.join('\n'));
console.log(`\n${report.length} titles processed`);
