import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import { useApp } from '../state/AppContext';
import { navigate, navigateRoute, useRoute } from '../lib/router';
import { PageLoader, TitleGrid, EmptyState } from '../components/Layout';
import { WideArt } from '../components/Artwork';
import { useDebouncedValue, usePageTitle } from '../lib/hooks';
import type { SearchResponse } from '../types';
import { CloseIcon, PlayIcon, SearchIcon } from '../components/Icons';
import { cx } from '../lib/utils';

export function SearchPage() {
  const route = useRoute();
  const { activeProfile, profileState, recordSearch, clearSearches, catalog } = useApp();
  const initialQuery = route.name === 'search' ? route.query ?? '' : '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounced = useDebouncedValue(query.trim(), 220);
  const requestId = useRef(0);
  usePageTitle(query ? `${query} — Search REELIX` : 'Search — REELIX');

  useEffect(() => {
    if (route.name === 'search') setQuery(route.query ?? '');
  }, [route]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!activeProfile) return;
    const current = ++requestId.current;
    setLoading(true);
    api
      .search(debounced, activeProfile.id)
      .then((payload) => {
        if (current !== requestId.current) return;
        setResults(payload);
        setSearched(debounced.length > 0);
      })
      .catch(() => {
        if (current !== requestId.current) return;
        setResults({ titles: [], topSearches: [], genres: [] });
      })
      .finally(() => {
        if (current === requestId.current) setLoading(false);
      });
  }, [activeProfile, debounced]);

  const topSearches = results?.topSearches ?? catalog.slice().sort((a, b) => b.trend - a.trend).slice(0, 8);
  const genres = results?.genres ?? [...new Set(catalog.flatMap((title) => title.genres))].sort();
  const recent = profileState?.searches ?? [];
  const hasQuery = query.trim().length > 0;
  const showResults = hasQuery && searched;

  const submit = (value: string) => {
    const clean = value.trim();
    if (!clean) return;
    recordSearch(clean);
    navigateRoute({ name: 'search', query: clean }, { replace: true });
    inputRef.current?.blur();
  };

  const openTitle = (id: string) => {
    if (query.trim()) recordSearch(query.trim());
    navigate(`/title/${id}`);
  };

  const quickSearch = (value: string) => {
    setQuery(value);
    submit(value);
  };

  const suggestionTitles = useMemo(() => {
    if (!hasQuery) return [];
    if (results?.titles.length) return results.titles;
    const lower = query.toLowerCase();
    return catalog
      .filter(
        (title) =>
          title.genres.some((genre) => genre.toLowerCase().includes(lower)) ||
          title.moods.some((mood) => mood.toLowerCase().includes(lower)),
      )
      .slice(0, 8);
  }, [catalog, hasQuery, query, results]);

  return (
    <div className="page page--padded search-page">
      <form
        className="search-hero"
        onSubmit={(event) => {
          event.preventDefault();
          submit(query);
        }}
        role="search"
      >
        <div className={cx('search-hero__field', hasQuery && 'has-value')}>
          <SearchIcon size={24} />
          <input
            ref={inputRef}
            type="search"
            placeholder="Search titles, people, genres"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search the REELIX catalogue"
          />
          {hasQuery && (
            <button
              type="button"
              className="search-hero__clear"
              aria-label="Clear search"
              onClick={() => {
                setQuery('');
                setSearched(false);
                navigateRoute({ name: 'search' }, { replace: true });
                inputRef.current?.focus();
              }}
            >
              <CloseIcon size={18} />
            </button>
          )}
        </div>
      </form>

      {!hasQuery && (
        <>
          {recent.length > 0 && (
            <section className="search-section">
              <div className="search-section__head">
                <h2>Recent searches</h2>
                <button type="button" onClick={() => void clearSearches()}>
                  Clear
                </button>
              </div>
              <div className="search-recent">
                {recent.map((item) => (
                  <button key={item} type="button" className="search-recent__chip" onClick={() => quickSearch(item)}>
                    <SearchIcon size={14} />
                    {item}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="search-section">
            <div className="search-section__head">
              <h2>Top searches</h2>
            </div>
            <div className="top-searches">
              {topSearches.map((title, index) => (
                <button key={title.id} type="button" className="top-search" onClick={() => openTitle(title.id)}>
                  <span className="top-search__index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="top-search__art">
                    <WideArt title={title} showTitle={false} />
                    <span className="top-search__play">
                      <PlayIcon size={16} />
                    </span>
                  </span>
                  <span className="top-search__copy">
                    <strong>{title.title}</strong>
                    <span>
                      {title.type === 'film' ? 'Film' : 'Series'} · {title.genres.slice(0, 2).join(', ')}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="search-section">
            <div className="search-section__head">
              <h2>Browse by genre</h2>
            </div>
            <div className="genre-chips">
              {genres.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  className="genre-chip"
                  onClick={() => navigate(`/genre/${encodeURIComponent(genre.toLowerCase())}`)}
                >
                  {genre}
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {hasQuery && (
        <section className="search-section search-results" aria-live="polite">
          <div className="search-section__head">
            <h2>
              {loading && !searched
                ? 'Searching…'
                : `Results for “${query.trim()}”`}
            </h2>
            {results && searched && (
              <span className="search-count">
                {results.titles.length} {results.titles.length === 1 ? 'title' : 'titles'}
              </span>
            )}
          </div>
          {loading && !results ? (
            <PageLoader label="Searching" />
          ) : results && results.titles.length > 0 ? (
            <TitleGrid titles={results.titles} />
          ) : (
            <>
              <EmptyState
                title="No exact matches"
                description="Your search did not match a title, person or genre. Try one of these instead."
              />
              {suggestionTitles.length > 0 && (
                <TitleGrid titles={suggestionTitles} />
              )}
              <div className="genre-chips">
                {genres.slice(0, 12).map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    className="genre-chip"
                    onClick={() => navigate(`/genre/${encodeURIComponent(genre.toLowerCase())}`)}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
