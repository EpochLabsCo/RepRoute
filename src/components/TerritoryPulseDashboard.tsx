import { Route } from 'lucide-react'
import { uiText } from '../constants/uiText'
import type { PriorityAccount, TerritoryPulseMetrics } from '../lib/territoryPulse'

type TerritoryPulseDashboardProps = {
  metrics: TerritoryPulseMetrics
  priorityAccounts: PriorityAccount[]
  onAddToRoute: (prospectId: string) => void
  onOpenSearch: () => void
}

export default function TerritoryPulseDashboard({
  metrics,
  priorityAccounts,
  onAddToRoute,
  onOpenSearch,
}: TerritoryPulseDashboardProps) {
  const metricCards = [
    {
      key: 'new',
      label: uiText.territoryPulse.metrics.newProspects.label,
      value: uiText.territoryPulse.metrics.newProspects.value(metrics.newProspects),
    },
    {
      key: 'never',
      label: uiText.territoryPulse.metrics.neverVisited.label,
      value: uiText.territoryPulse.metrics.neverVisited.value(metrics.neverVisited),
    },
    {
      key: 'overdue',
      label: uiText.territoryPulse.metrics.overdueAccounts.label,
      value: uiText.territoryPulse.metrics.overdueAccounts.value(metrics.overdueAccounts),
    },
    {
      key: 'planned',
      label: uiText.territoryPulse.metrics.plannedStops.label,
      value: uiText.territoryPulse.metrics.plannedStops.value(metrics.plannedStops),
    },
  ]

  return (
    <div className="territory-pulse">
      <section className="panel section-panel section-panel--compact territory-pulse__intro">
        <div className="eyebrow eyebrow--tight">{uiText.territoryPulse.eyebrow}</div>
        <h2 className="territory-pulse__title">{uiText.territoryPulse.title}</h2>
        <p className="section-copy">{uiText.territoryPulse.subtitle}</p>
      </section>

      <section className="panel section-panel section-panel--compact territory-pulse__metrics">
        <div className="territory-pulse__metrics-grid">
          {metricCards.map((card) => (
            <article key={card.key} className="territory-pulse__metric-card">
              <span className="territory-pulse__metric-label">{card.label}</span>
              <strong className="territory-pulse__metric-value">{card.value}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="panel section-panel territory-pulse__priority">
        <div className="territory-pulse__priority-head">
          <div>
            <h3>{uiText.territoryPulse.priorityAccounts.title}</h3>
            <p className="section-copy">{uiText.territoryPulse.priorityAccounts.description}</p>
          </div>
        </div>

        {priorityAccounts.length > 0 ? (
          <ul className="territory-pulse__account-list">
            {priorityAccounts.map((account) => (
              <li key={account.id} className="territory-pulse__account-card">
                <div className="territory-pulse__account-main">
                  <strong>{account.businessName}</strong>
                  <p className="territory-pulse__account-city">{account.city}</p>
                  <dl className="territory-pulse__account-meta">
                    <div>
                      <dt>{uiText.territoryPulse.priorityAccounts.lastVisit}</dt>
                      <dd>{account.lastVisitLabel}</dd>
                    </div>
                    <div>
                      <dt>{uiText.territoryPulse.priorityAccounts.visitCount}</dt>
                      <dd>{account.visitCount}</dd>
                    </div>
                  </dl>
                </div>
                <button
                  type="button"
                  className={`button button--ghost territory-pulse__route-btn ${
                    account.isInRoute ? 'territory-pulse__route-btn--on-route' : ''
                  }`}
                  onClick={() => onAddToRoute(account.id)}
                  disabled={account.isInRoute}
                >
                  <Route size={16} />
                  {account.isInRoute
                    ? uiText.territoryPulse.priorityAccounts.onRoute
                    : uiText.territoryPulse.priorityAccounts.addToRoute}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="territory-pulse__empty">
            <p>{uiText.territoryPulse.priorityAccounts.empty}</p>
            <button type="button" className="button button--ghost" onClick={onOpenSearch}>
              {uiText.territoryPulse.priorityAccounts.emptyAction}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
