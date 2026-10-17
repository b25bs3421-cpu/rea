import { useMemo, useState } from 'react';
import { useApp } from '../state/AppContext';
import { PageHeader, TitleGrid, EmptyState } from '../components/Layout';
import { WideArt } from '../components/Artwork';
import { usePageTitle } from '../lib/hooks';
import { cx, formatDate } from '../lib/utils';
import { navigate } from '../lib/router';
import { BellIcon, CheckIcon } from '../components/Icons';

const TABS = [
  { id: 'everyone', label: "Everyone's Watching" },
  { id: 'top10', label: 'Top 10' },
  { id: 'coming', label: 'Coming Soon' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function NewPopularPage() {
  const { catalog, profileState, toggleReminder } = useApp();
  const [tab, setTab] = useState<TabId>('everyone');
  usePageTitle('New & Popular — REELIX');

  const available = useMemo(
    () => catalog.filter((title) => title.status !== 'coming-soon'),
    [catalog],
  );
  const everyone = useMemo(() => [...available].sort((a, b) => b.trend - a.trend), [available]);
  const newest = useMemo(
    () =>
      [...available].sort(
        (a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime(),
      ),
    [available],
  );
  const top10 = useMemo(
    () =>
      available
        .filter((title) => title.rank && title.rank <= 10)
        .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99)),
    [available],
  );
  const coming = useMemo(
    () =>
      catalog
        .filter((title) => title.status === 'coming-soon')
        .sort((a, b) => new Date(a.comingSoonDate ?? a.dateAdded).getTime() - new Date(b.comingSoonDate ?? b.dateAdded).getTime()),
    [catalog],
  );

  return (
    <div className="page page--padded">
      <PageHeader
        eyebrow="What’s hot"
        title="New & Popular"
        description="The titles everyone is talking about, the weekly Top 10, and what’s arriving next."
      >
        <div className="segmented" role="tablist" aria-label="New and popular views">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={cx('segmented__item', tab === item.id && 'is-active')}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </PageHeader>

      {tab === 'everyone' && (
        <>
          <section className="new-section">
            <div className="section-heading">
              <h2>Everyone’s watching this week</h2>
              <p>Ranked by what REELIX viewers in India are streaming right now.</p>
            </div>
            <TitleGrid titles={everyone.slice(0, 12)} />
          </section>
          <section className="new-section">
            <div className="section-heading">
              <h2>New on REELIX</h2>
              <p>Freshly added films and series, newest first.</p>
            </div>
            <div className="new-list">
              {newest.slice(0, 8).map((title, index) => (
                <button
                  key={title.id}
                  type="button"
                  className="new-list__item"
                  onClick={() => navigate(`/title/${title.id}`)}
                >
                  <span className="new-list__index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="new-list__art">
                    <WideArt title={title} showTitle={false} />
                  </span>
                  <span className="new-list__copy">
                    <span className="new-list__date">{formatDate(title.dateAdded, { day: 'numeric', month: 'short' })}</span>
                    <strong>{title.title}</strong>
                    <span>{title.logline}</span>
                  </span>
                  <span className="new-list__meta">
                    {title.match ?? title.matchSeed}% Match · {title.maturity}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {tab === 'top10' && (
        <section className="new-section">
          <div className="section-heading section-heading--with-badge">
            <span className="top10-badge">TOP 10</span>
            <div>
              <h2>Top 10 in India today</h2>
              <p>Updated weekly. The most-watched titles across every profile on REELIX.</p>
            </div>
          </div>
          {top10.length ? (
            <TitleGrid titles={top10} variant="top10" />
          ) : (
            <EmptyState title="The chart is being counted" description="Check back soon for this week’s Top 10." />
          )}
        </section>
      )}

      {tab === 'coming' && (
        <section className="new-section">
          <div className="section-heading">
            <h2>Coming soon to REELIX</h2>
            <p>Set a reminder and we’ll let you know when these arrive.</p>
          </div>
          {coming.length ? (
            <div className="coming-grid">
              {coming.map((title) => {
                const reminded = profileState?.reminders.includes(title.id) ?? title.reminder;
                return (
                  <article key={title.id} className="coming-card">
                    <button type="button" className="coming-card__art" onClick={() => navigate(`/title/${title.id}`)}>
                      <WideArt title={title} showTitle={false} />
                      <span className="coming-card__date">
                        {formatDate(title.comingSoonDate ?? title.dateAdded, { month: 'short', year: undefined })}
                      </span>
                    </button>
                    <div className="coming-card__body">
                      <h3>{title.title}</h3>
                      <p>{title.logline}</p>
                      <div className="coming-card__foot">
                        <span>{title.genres.slice(0, 2).join(' · ')}</span>
                        <button
                          type="button"
                          className={cx('btn btn--tiny', reminded ? 'btn--secondary' : 'btn--primary')}
                          onClick={() => void toggleReminder(title.id)}
                        >
                          {reminded ? <CheckIcon size={14} /> : <BellIcon size={14} />}
                          {reminded ? 'Reminder set' : 'Remind me'}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState title="Nothing announced yet" description="New titles are added every month. Check back soon." />
          )}
        </section>
      )}
    </div>
  );
}
