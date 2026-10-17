import { useMemo, useState } from 'react';
import { useApp } from '../state/AppContext';
import { navigate, useRoute } from '../lib/router';
import { PageHeader, PageLoader, TitleGrid } from '../components/Layout';
import { usePageTitle } from '../lib/hooks';
import { cx } from '../lib/utils';

export function BrowsePage() {
  const route = useRoute();
  const kind = route.name === 'browse' && route.kind === 'movies' ? 'movies' : 'tv';
  const isMovies = kind === 'movies';
  const { catalog, loadingProfile } = useApp();
  const [genre, setGenre] = useState<string>('All');
  const [sort, setSort] = useState<'trending' | 'newest' | 'az'>('trending');
  usePageTitle(isMovies ? 'Movies — REELIX' : 'TV Shows — REELIX');

  const pool = useMemo(
    () => catalog.filter((title) => title.type === (isMovies ? 'film' : 'series')),
    [catalog, isMovies],
  );

  const genres = useMemo(() => {
    const counts = new Map<string, number>();
    for (const title of pool) {
      for (const item of title.genres) counts.set(item, (counts.get(item) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [pool]);

  const filtered = useMemo(() => {
    const items = pool.filter((title) => genre === 'All' || title.genres.includes(genre));
    if (sort === 'newest') {
      return [...items].sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());
    }
    if (sort === 'az') return [...items].sort((a, b) => a.title.localeCompare(b.title));
    return [...items].sort((a, b) => b.trend - a.trend);
  }, [genre, pool, sort]);

  if (loadingProfile && !catalog.length) return <PageLoader label="Loading the catalogue" />;

  return (
    <div className="page page--padded">
      <PageHeader
        eyebrow="Catalogue"
        title={isMovies ? 'Movies' : 'TV Shows'}
        description={
          isMovies
            ? 'Feature films, documentaries and animated stories from the REELIX catalogue.'
            : 'Limited series, returning favourites and documentaries — all streaming now.'
        }
        actions={
          <label className="select-label">
            <span>Sort</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
              <option value="trending">Trending</option>
              <option value="newest">Newest first</option>
              <option value="az">A to Z</option>
            </select>
          </label>
        }
      >
        <div className="filter-chips" role="group" aria-label="Filter by genre">
          <button
            type="button"
            className={cx('filter-chip', genre === 'All' && 'is-active')}
            onClick={() => setGenre('All')}
          >
            All {isMovies ? 'movies' : 'series'}
          </button>
          {genres.map(([name, count]) => (
            <button
              key={name}
              type="button"
              className={cx('filter-chip', genre === name && 'is-active')}
              onClick={() => setGenre(name)}
            >
              {name}
              <span>{count}</span>
            </button>
          ))}
        </div>
      </PageHeader>

      <div className="browse__count">
        <strong>{filtered.length}</strong> {filtered.length === 1 ? 'title' : 'titles'}
        {genre !== 'All' && <span> · {genre}</span>}
      </div>
      <TitleGrid titles={filtered} />
      <div className="browse__explore">
        <h2>Browse another shelf</h2>
        <div className="browse__links">
          <button type="button" className="btn btn--secondary" onClick={() => navigate('/browse/tv')}>
            TV Shows
          </button>
          <button type="button" className="btn btn--secondary" onClick={() => navigate('/browse/movies')}>
            Movies
          </button>
          <button type="button" className="btn btn--secondary" onClick={() => navigate('/new')}>
            New & Popular
          </button>
          <button type="button" className="btn btn--secondary" onClick={() => navigate('/search')}>
            Search the catalogue
          </button>
        </div>
      </div>
    </div>
  );
}
