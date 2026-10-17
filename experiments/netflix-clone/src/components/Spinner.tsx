import { cx } from '../lib/utils';

export function Spinner({ size = 28, className, label = 'Loading' }: { size?: number; className?: string; label?: string }) {
  return (
    <span className={cx('spinner', className)} style={{ width: size, height: size }} role="status" aria-label={label}>
      <span className="spinner__ring" aria-hidden />
      <span className="spinner__sr">{label}</span>
    </span>
  );
}

export function FullPageLoader({ label = 'Preparing your experience' }: { label?: string }) {
  return (
    <div className="full-loader">
      <div className="full-loader__brand" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <p>{label}</p>
    </div>
  );
}
