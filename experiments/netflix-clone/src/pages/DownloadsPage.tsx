import { useState } from 'react';
import { useApp } from '../state/AppContext';
import { EmptyState, PageHeader } from '../components/Layout';
import { WideArt } from '../components/Artwork';
import { usePageTitle } from '../lib/hooks';
import { navigate } from '../lib/router';
import { formatDate, cx } from '../lib/utils';
import { CheckCircleIcon, DownloadIcon, PlayIcon, TrashIcon } from '../components/Icons';

export function DownloadsPage() {
  const { profileState, removeDownload, addDownload, notify } = useApp();
  const [smart, setSmart] = useState(true);
  usePageTitle('Downloads — REELIX');
  const downloads = profileState?.downloads ?? [];
  const totalMb = downloads.reduce((sum, item) => sum + item.sizeMb, 0);
  const capacityMb = 64_000;
  const used = Math.min(100, (totalMb / capacityMb) * 100);

  const playDownload = (titleId: string, episodeId: string) => {
    const path = episodeId && episodeId !== 'film' ? `/watch/${titleId}/${episodeId}` : `/watch/${titleId}`;
    navigate(path);
  };

  return (
    <div className="page page--padded downloads-page">
      <PageHeader
        eyebrow="Watch offline"
        title="Downloads"
        description="Your downloaded titles live here. Downloads in this demo are simulated — no media file is written to your device."
        actions={
          downloads.length > 0 ? (
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => notify('All downloads are already up to date (demo).')}
            >
              <DownloadIcon size={16} />
              Check for updates
            </button>
          ) : undefined
        }
      />

      <div className="downloads-summary">
        <div className="downloads-summary__item">
          <span>Downloaded titles</span>
          <strong>{downloads.length}</strong>
        </div>
        <div className="downloads-summary__item">
          <span>Storage used</span>
          <strong>{totalMb ? `${(totalMb / 1024).toFixed(1)} GB` : '0 GB'}</strong>
        </div>
        <div className="downloads-summary__meter">
          <div className="downloads-summary__meter-labels">
            <span>This device</span>
            <span>{Math.round(used)}% of 64 GB</span>
          </div>
          <div className="progress-track">
            <span style={{ width: `${Math.max(used, 1.5)}%` }} />
          </div>
        </div>
      </div>

      <label className="setting-row setting-row--inline downloads-smart">
        <span>
          <strong>Smart Downloads</strong>
          <small>Delete a downloaded episode after you watch it, and fetch the next one on Wi-Fi.</small>
        </span>
        <span className={cx('switch', smart && 'is-on')}>
          <input
            type="checkbox"
            checked={smart}
            onChange={(event) => {
              setSmart(event.target.checked);
              notify(`Smart Downloads ${event.target.checked ? 'on' : 'off'} (demo).`);
            }}
          />
          <span className="switch__track" aria-hidden>
            <span className="switch__thumb" />
          </span>
        </span>
      </label>

      {downloads.length === 0 ? (
        <EmptyState
          icon={<DownloadIcon size={26} />}
          title="No downloads yet"
          description="Open a film or episode and use Download to keep it on this device. In this demo the file is represented by a record, not a real video file."
          action={
            <button type="button" className="btn btn--primary" onClick={() => navigate('/')}>
              Find something to download
            </button>
          }
        />
      ) : (
        <ul className="download-list">
          {downloads.map((item) => (
            <li key={`${item.titleId}-${item.episodeId}`} className="download-item">
              <button
                type="button"
                className="download-item__art"
                onClick={() => navigate(`/title/${item.titleId}`)}
                aria-label={`Open ${item.title.title}`}
              >
                <WideArt title={item.title} showTitle={false} />
                <span className="download-item__quality">{item.quality}</span>
              </button>
              <div className="download-item__copy">
                <button type="button" className="download-item__title" onClick={() => navigate(`/title/${item.titleId}`)}>
                  {item.title.title}
                </button>
                <span className="download-item__episode">
                  {item.episode
                    ? `S${item.episode.season}:E${item.episode.episode} · ${item.episode.title}`
                    : `${item.title.year} · ${item.title.format}`}
                </span>
                <span className="download-item__meta">
                  {item.quality} · {item.sizeMb >= 1024 ? `${(item.sizeMb / 1024).toFixed(1)} GB` : `${item.sizeMb} MB`} · Downloaded {formatDate(item.createdAt, { day: 'numeric', month: 'short' })}
                </span>
                <span className="download-item__status">
                  <CheckCircleIcon size={14} /> Ready to watch offline
                </span>
              </div>
              <div className="download-item__actions">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => playDownload(item.titleId, item.episodeId)}
                >
                  <PlayIcon size={16} />
                  Play
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => void removeDownload(item.titleId, item.episodeId)}
                >
                  <TrashIcon size={16} />
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="downloads-suggestions">
        <div className="section-heading">
          <h2>Add more to your downloads</h2>
          <p>Popular titles you haven’t downloaded yet.</p>
        </div>
        <div className="downloads-suggestions__grid">
          {(profileState?.myList ?? []).slice(0, 3).map((title) => (
            <article key={title.id} className="download-suggestion">
              <button type="button" className="download-suggestion__art" onClick={() => navigate(`/title/${title.id}`)}>
                <WideArt title={title} showTitle={false} />
              </button>
              <div className="download-suggestion__body">
                <strong>{title.title}</strong>
                <span>{title.type === 'film' ? 'Film' : 'Series'} · {title.genres[0]}</span>
                <button
                  type="button"
                  className="btn btn--tiny btn--secondary"
                  onClick={() => void addDownload(title.id, title.type === 'film' ? 'film' : 's1e1', 'HD')}
                >
                  <DownloadIcon size={14} /> Download HD
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
