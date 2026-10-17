import { useApp } from '../state/AppContext';
import { navigate, useRoute } from '../lib/router';
import { EmptyState, PageHeader, TitleGrid } from '../components/Layout';
import { usePageTitle } from '../lib/hooks';

export function RowPage() {
  const route = useRoute();
  const { home } = useApp();
  const rowId = route.name === 'row' ? route.rowId : '';
  const row = home?.rows.find((candidate) => candidate.id === rowId);
  usePageTitle(row ? `${row.title} — REELIX` : 'REELIX');

  if (!row) {
    return (
      <div className="page page--padded">
        <EmptyState
          title="This collection has moved"
          description="We couldn’t find that collection in your current recommendations."
          action={
            <button type="button" className="btn btn--primary" onClick={() => navigate('/')}>
              Back to home
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="page page--padded">
      <PageHeader
        eyebrow="Collection"
        title={row.title}
        description={row.subtitle ?? `${row.items.length} titles picked for you.`}
      />
      <TitleGrid titles={row.items} />
    </div>
  );
}
