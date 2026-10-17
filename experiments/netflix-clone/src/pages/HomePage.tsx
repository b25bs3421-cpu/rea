import { useApp } from '../state/AppContext';
import { Billboard } from '../components/Billboard';
import { Row } from '../components/Row';
import { HomeSkeleton } from '../components/Layout';
import { usePageTitle } from '../lib/hooks';

export function HomePage() {
  const { home, activeProfile } = useApp();
  usePageTitle(activeProfile?.kids ? 'REELIX Kids' : 'REELIX — Home');

  if (!home) return <HomeSkeleton />;

  return (
    <div className="home">
      <Billboard titles={home.billboard} />
      <div className="home__rows">
        {home.rows.map((row, index) => (
          <Row key={`${row.id}-${index}`} row={row} index={index} />
        ))}
      </div>
      <div className="home__endcap">
        <p>
          You’ve reached the end of this week’s recommendations. Every title above is part of the
          original REELIX demo catalog.
        </p>
      </div>
    </div>
  );
}
