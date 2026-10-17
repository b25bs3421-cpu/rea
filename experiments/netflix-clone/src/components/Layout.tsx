import type { ReactNode } from 'react';
import type { TitleLite } from '../types';
import { TitleCard } from './TitleCard';
import { cx } from '../lib/utils';
import { Spinner } from './Spinner';
import { SparkIcon } from './Icons';

export function PageHeader({
  title,
  eyebrow,
  description,
  actions,
  children,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div className="page-header__row">
        <div>
          {eyebrow && <p className="page-header__eyebrow">{eyebrow}</p>}
          <h1 className="page-header__title">{title}</h1>
          {description && <p className="page-header__description">{description}</p>}
        </div>
        {actions && <div className="page-header__actions">{actions}</div>}
      </div>
      {children}
    </header>
  );
}

export function TitleGrid({
  titles,
  emptyLabel = 'Nothing here yet.',
  variant = 'grid',
}: {
  titles: TitleLite[];
  emptyLabel?: string;
  variant?: 'grid' | 'top10';
}) {
  if (!titles.length) return <p className="grid-empty">{emptyLabel}</p>;
  return (
    <div className={cx('title-grid', variant === 'top10' && 'title-grid--top10')}>
      {titles.map((title) =>
        variant === 'top10' ? (
          <TitleCard key={title.id} title={title} variant="top10" rank={title.rank} />
        ) : (
          <TitleCard key={title.id} title={title} variant="grid" />
        ),
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">{icon ?? <SparkIcon size={26} />}</span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function PageLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="page-loader">
      <Spinner size={34} label={label} />
    </div>
  );
}

export function SkeletonLine({ width = '100%', height = 14 }: { width?: string | number; height?: number }) {
  return <span className="skeleton-line" style={{ width, height }} />;
}

export function HomeSkeleton() {
  return (
    <div className="home-skeleton" aria-busy="true" aria-label="Loading your home page">
      <div className="home-skeleton__hero">
        <SkeletonLine width="38%" height={22} />
        <SkeletonLine width="52%" height={64} />
        <SkeletonLine width="46%" height={16} />
        <div className="home-skeleton__actions">
          <SkeletonLine width={120} height={44} />
          <SkeletonLine width={140} height={44} />
        </div>
      </div>
      {[0, 1, 2].map((row) => (
        <div className="home-skeleton__row" key={row}>
          <SkeletonLine width={180} height={20} />
          <div className="home-skeleton__cards">
            {[0, 1, 2, 3, 4, 5].map((card) => (
              <span className="skeleton-card" key={card} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
