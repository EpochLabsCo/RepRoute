import { FileText, MapPin, Plus, Route, Users } from 'lucide-react'
import type { TerritoryConfig } from '../lib/territories/types'
import type { TerritoryDashboardStats } from '../lib/territories/territoryData'
import { uiText } from '../constants/uiText'

type TerritoryDashboardProps = {
  territory: TerritoryConfig
  stats: TerritoryDashboardStats
  onViewProspects: () => void
  onCreateRoute: () => void
  onGenerateReport: () => void
}

export default function TerritoryDashboard({
  territory,
  stats,
  onViewProspects,
  onCreateRoute,
  onGenerateReport,
}: TerritoryDashboardProps) {
  const workTodayHint =
    stats.stopCount > 0
      ? uiText.territories.dashboard.workTodayOnRoute(stats.stopCount)
      : stats.prospectCount > 0
        ? uiText.territories.dashboard.workTodayProspects(stats.prospectCount)
        : uiText.territories.dashboard.workTodayEmpty

  return (
    <section
      className="panel section-panel territory-dashboard"
      style={{ '--territory-accent': territory.color } as React.CSSProperties}
    >
      <header className="territory-dashboard__header">
        <span className="territory-dashboard__swatch" aria-hidden />
        <div>
          <div className="eyebrow eyebrow--tight">{uiText.territories.dashboard.eyebrow}</div>
          <h3>{territory.name}</h3>
          <p className="territory-dashboard__hint">{workTodayHint}</p>
        </div>
      </header>

      <div className="territory-dashboard__stats" aria-label={uiText.territories.dashboard.statsLabel}>
        <div className="territory-dashboard__stat">
          <strong>{stats.prospectCount}</strong>
          <span>{uiText.territories.prospectCount}</span>
        </div>
        <div className="territory-dashboard__stat">
          <strong>{stats.routeCount}</strong>
          <span>{uiText.territories.routeCount}</span>
        </div>
        <div className="territory-dashboard__stat">
          <strong>{stats.stopCount}</strong>
          <span>{uiText.territories.stopCount}</span>
        </div>
      </div>

      <div className="territory-dashboard__actions territory-dashboard__actions--primary">
        <button type="button" className="button button--wide" onClick={onCreateRoute}>
          <Plus size={16} />
          {uiText.territories.createRoute}
        </button>
        <button type="button" className="button button--ghost button--wide" onClick={onViewProspects}>
          <Users size={16} />
          {uiText.territories.viewProspects}
        </button>
        <button type="button" className="button button--ghost button--wide" onClick={onGenerateReport}>
          <FileText size={16} />
          {uiText.territories.generateReport}
        </button>
      </div>

      <section className="territory-dashboard__section">
        <h4>{uiText.territories.dashboard.topCities}</h4>
        {stats.topCities.length > 0 ? (
          <ul className="territory-dashboard__city-list">
            {stats.topCities.map((city) => (
              <li key={city.city}>
                <span className="territory-dashboard__city-name">
                  <MapPin size={14} aria-hidden />
                  {city.city}
                </span>
                <span className="territory-dashboard__city-counts">
                  {uiText.territories.dashboard.cityCounts(city.prospectCount, city.stopCount)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="editor-hint">{uiText.territories.dashboard.noCityData}</p>
        )}
      </section>

      <section className="territory-dashboard__section">
        <h4>{uiText.territories.priorityAccounts}</h4>
        <ul className="territory-dashboard__priority-list">
          {stats.priorityAccountMatches.map((account) => (
            <li
              key={account.name}
              className={
                account.inCatalog
                  ? 'territory-dashboard__priority-item territory-dashboard__priority-item--matched'
                  : 'territory-dashboard__priority-item'
              }
            >
              <strong>{account.name}</strong>
              <span>
                {account.inCatalog
                  ? account.businessName ?? uiText.territories.dashboard.inCatalog
                  : uiText.territories.dashboard.notInCatalog}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="territory-dashboard__section">
        <h4>{uiText.territories.targetIndustries}</h4>
        <div className="territory-dashboard__chips">
          {territory.targetIndustries.map((industry) => (
            <span key={industry} className="meta-pill">
              {industry}
            </span>
          ))}
        </div>
      </section>

      {stats.routeStops.length > 0 ? (
        <section className="territory-dashboard__section">
          <h4>
            <Route size={16} aria-hidden />
            {uiText.territories.dashboard.routeStopsHeading}
          </h4>
          <ul className="territory-dashboard__prospect-list">
            {stats.routeStops.map((stop) => (
              <li key={stop.id}>
                <strong>{stop.businessName}</strong>
                <span>{stop.city}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {stats.prospects.length > 0 ? (
        <section className="territory-dashboard__section">
          <h4>{uiText.territories.dashboard.prospectsHeading}</h4>
          <ul className="territory-dashboard__prospect-list">
            {stats.prospects.slice(0, 8).map((prospect) => (
              <li key={prospect.id}>
                <strong>{prospect.businessName}</strong>
                <span>{prospect.city}</span>
              </li>
            ))}
          </ul>
          {stats.prospects.length > 8 ? (
            <button type="button" className="button button--ghost button--wide" onClick={onViewProspects}>
              {uiText.territories.dashboard.viewAllProspects(stats.prospects.length)}
            </button>
          ) : null}
        </section>
      ) : (
        <div className="territory-dashboard__empty">
          <h4>{uiText.territories.emptyTitle}</h4>
          <p>{uiText.territories.emptyCopy}</p>
        </div>
      )}
    </section>
  )
}
