import { useMemo } from 'react';
import { useApp } from '../state/AppContext';
import { navigate, useRoute } from '../lib/router';
import { usePageTitle } from '../lib/hooks';
import { EmptyState, PageHeader, TitleGrid } from '../components/Layout';

export function GenrePage() {
  const route = useRoute();
  const genre = route.name === 'genre' ? route.genre : '';
  const genreLabel = genre ? genre.charAt(0).toUpperCase() + genre.slice(1) : '';
  const { catalog } = useApp();
  usePageTitle(genreLabel ? `${genreLabel} — REELIX` : 'Genre — REELIX');

  const titles = useMemo(
    () =>
      catalog
        .filter((title) => title.genres.some((item) => item.toLowerCase() === genre.toLowerCase()))
        .sort((a, b) => b.trend - a.trend),
    [catalog, genre],
  );

  const related = useMemo(() => {
    const counts = new Map<string, number>();
    for (const title of titles) {
      for (const item of title.genres) {
        if (item.toLowerCase() !== genre.toLowerCase()) counts.set(item, (counts.get(item) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name]) => name);
  }, [genre, titles]);

  return (
    <div className="page page--padded">
      <PageHeader
        eyebrow="Genre"
        title={genreLabel}
        description={
          titles.length
            ? `${titles.length} ${titles.length === 1 ? 'title' : 'titles'} in ${genreLabel} on REELIX.`
            : 'No titles match that genre yet.'
        }
      >
        {related.length > 0 && (
          <div className="filter-chips" role="group" aria-label="Related genres">
            {related.map((name) => (
              <button key={name} type="button" className="filter-chip" onClick={() => navigate(`/genre/${encodeURIComponent(name.toLowerCase())}`)}>
                {name}
              </button>
            ))}
          </div>
        )}
      </PageHeader>
      {titles.length ? (
        <TitleGrid titles={titles} />
      ) : (
        <EmptyState
          title="Nothing in this genre yet"
          description="Try another genre, or explore the full REELIX catalogue."
          action={
            <button type="button" className="btn btn--primary" onClick={() => navigate('/browse/tv')}>
              Browse TV Shows
            </button>
          }
        />
      )}
    </div>
  );
}
