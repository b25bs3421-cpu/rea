import { useState } from 'react';
import type { Art } from '../types';
import { cx } from '../lib/utils';
import { GeneratedArt } from './GeneratedArt';

interface ArtSource {
  id: string;
  title: string;
  art: Art;
  year?: number;
  format?: string;
}

function useImage(src: string | null | undefined) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return { src: failed ? null : src ?? null, loaded, setLoaded, setFailed };
}

interface PosterArtProps {
  title: ArtSource;
  className?: string;
  showTitle?: boolean;
  eager?: boolean;
}

export function PosterArt({ title, className, showTitle = false, eager = false }: PosterArtProps) {
  const image = useImage(title.art.poster);
  return (
    <div className={cx('art', 'art--poster', className)}>
      {image.src ? (
        <img
          src={image.src}
          alt={`${title.title} key art`}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          className={cx('art__img', image.loaded && 'is-loaded')}
          onLoad={() => image.setLoaded(true)}
          onError={() => image.setFailed(true)}
        />
      ) : (
        <GeneratedArt
          titleId={title.id}
          title={title.title}
          art={title.art}
          variant="poster"
          showTitle={showTitle}
          kicker={title.format}
        />
      )}
    </div>
  );
}

interface WideArtProps {
  title: ArtSource;
  className?: string;
  showTitle?: boolean;
  eager?: boolean;
}

export function WideArt({ title, className, showTitle = true, eager = false }: WideArtProps) {
  const image = useImage(title.art.backdrop ?? title.art.poster);
  return (
    <div className={cx('art', 'art--wide', className)}>
      {title.art.backdrop ? (
        <img
          src={title.art.backdrop}
          alt=""
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          className={cx('art__img', image.loaded && 'is-loaded')}
          onLoad={() => image.setLoaded(true)}
          onError={() => image.setFailed(true)}
        />
      ) : image.src ? (
        <img
          src={image.src}
          alt={`${title.title} key art`}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          className={cx('art__img', 'art__img--crop', image.loaded && 'is-loaded')}
          style={{ objectPosition: '50% 26%' }}
          onLoad={() => image.setLoaded(true)}
          onError={() => image.setFailed(true)}
        />
      ) : (
        <GeneratedArt
          titleId={title.id}
          title={title.title}
          art={title.art}
          variant="wide"
          showTitle={showTitle}
          kicker={title.format}
        />
      )}
    </div>
  );
}

interface HeroArtProps {
  title: ArtSource;
  className?: string;
  eager?: boolean;
}

export function HeroArt({ title, className, eager = true }: HeroArtProps) {
  const image = useImage(title.art.hero ?? title.art.backdrop);
  if (image.src) {
    return (
      <div className={cx('art', 'art--hero', className)}>
        <img
          src={image.src}
          alt=""
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          className={cx('art__img', image.loaded && 'is-loaded')}
          onLoad={() => image.setLoaded(true)}
          onError={() => image.setFailed(true)}
        />
      </div>
    );
  }
  return (
    <div className={cx('art', 'art--hero', 'art--composite', className)}>
      <GeneratedArt
        titleId={title.id}
        title={title.title}
        art={title.art}
        variant="billboard"
        showTitle={false}
        className="art__generated-bg"
      />
      {title.art.poster && (
        <div className="art__poster-figure">
          <img src={title.art.poster} alt="" loading={eager ? 'eager' : 'lazy'} decoding="async" />
          <span className="art__poster-glow" aria-hidden />
        </div>
      )}
    </div>
  );
}

interface EpisodeStillProps {
  title: ArtSource;
  episodeNumber: number;
  className?: string;
}

export function EpisodeStill({ title, episodeNumber, className }: EpisodeStillProps) {
  const image = useImage(title.art.backdrop ?? title.art.poster);
  if (image.src) {
    return (
      <div className={cx('art', 'art--still', className)}>
        <img
          src={image.src}
          alt=""
          loading="lazy"
          decoding="async"
          className={cx('art__img', !title.art.backdrop && 'art__img--crop-alt', image.loaded && 'is-loaded')}
          onLoad={() => image.setLoaded(true)}
          onError={() => image.setFailed(true)}
          style={{ filter: `saturate(0.9) hue-rotate(${(episodeNumber % 4) * 4}deg)` }}
        />
      </div>
    );
  }
  return (
    <div className={cx('art', 'art--still', className)}>
      <GeneratedArt
        titleId={`${title.id}-still-${episodeNumber}`}
        title={title.title}
        art={title.art}
        variant="wide"
        showTitle={false}
      />
    </div>
  );
}
