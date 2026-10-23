import { useApp } from '../../state/AppState';
import { GovernanceDrawer } from './GovernanceDrawer';
import { InvestorDrawer } from './InvestorDrawer';
import { IncidentDrawer, IssuerDrawer, RiskDrawer } from './OpsDrawers';
import { TrancheDrawer } from './TrancheDrawer';

export function DrawerHost() {
  const { drawer, closeDrawer } = useApp();
  if (!drawer) return null;
  const p = { id: drawer.id, onClose: closeDrawer, key: `${drawer.kind}-${drawer.id}` };
  switch (drawer.kind) {
    case 'tranche': return <TrancheDrawer {...p} />;
    case 'investor': return <InvestorDrawer {...p} />;
    case 'issuer': return <IssuerDrawer {...p} />;
    case 'incident': return <IncidentDrawer {...p} />;
    case 'risk': return <RiskDrawer {...p} />;
    case 'governance': return <GovernanceDrawer {...p} />;
  }
}
