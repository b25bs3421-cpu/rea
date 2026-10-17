import { useMemo, useState } from 'react';
import { useApp } from '../state/AppContext';
import { EmptyState, PageHeader, TitleGrid } from '../components/Layout';
import { usePageTitle } from '../lib/hooks';
import { cx } from '../lib/utils';
import { navigate } from '../lib/router';
import { PlusIcon } from '../components/Icons';

export function MyListPage() {
  const { profileState } = useApp();
  const [filter, setFilter] = useState<'all' | 'series' | 'film'>('all');
  usePageTitle('My List — REELIX');

  const titles = useMemo(() => {
    const list = profileState?.myList ?? [];
    return list.filter((title) => filter === 'all' || title.type === filter);
  }, [filter, profileState]);

  const total = profileState?.myList.length ?? 0;
  const films = profileState?.myList.filter((title) => title.type === 'film').length ?? 0;
  const series = total - films;

  return (
    <div className="page page--padded">
      <PageHeader
        eyebrow="Saved for later"
        title="My List"
        description={
          total
            ? `${total} ${total === 1 ? 'title' : 'titles'} saved to this profile.`
            : 'Everything you add to My List appears here, on every device.'
        }
        actions={
          total > 0 ? (
            <div className="list-stats">
              <span>{series} series</span>
              <span className="dot-sep" />
              <span>{films} films</span>
            </div>
          ) : undefined
        }
      >
        {total > 0 && (
          <div className="filter-chips">
            {(
              [
                ['all', `All (${total})`],
                ['series', `TV (${series})`],
                ['film', `Films (${films})`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={cx('filter-chip', filter === id && 'is-active')}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </PageHeader>

      {total === 0 ? (
        <EmptyState
          icon={<PlusIcon size={26} />}
          title="Your list is waiting"
          description="Tap the + on any title to save it here. Your list stays with this profile."
          action={
            <button type="button" className="btn btn--primary" onClick={() => navigate('/')}>
              Find something to watch
            </button>
          }
        />
      ) : titles.length ? (
        <TitleGrid titles={titles} />
      ) : (
        <EmptyState
          title={`No ${filter === 'film' ? 'films' : 'series'} in My List`}
          description="Switch the filter or add something new."
          action={
            <button type="button" className="btn btn--secondary" onClick={() => setFilter('all')}>
              Show all saved titles
            </button>
          }
        />
      )}
    </div>
  );
}
