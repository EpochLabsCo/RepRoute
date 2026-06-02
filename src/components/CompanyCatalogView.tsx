import { useMemo, useRef } from 'react'
import { Bookmark, Building2, Plus, Route } from 'lucide-react'
import {
  filterCatalogCompanies,
  getActiveCatalogLetters,
  groupCatalogByLetter,
  type CatalogCompany,
} from '../lib/companyCatalog'
import { uiText } from '../constants/uiText'

type CompanyCatalogViewProps = {
  companies: CatalogCompany[]
  query: string
  onQueryChange: (value: string) => void
  onSelectCompany: (companyId: string) => void
  onAddCompany: () => void
  territoryFilterLabel?: string | null
  onClearTerritoryFilter?: () => void
}

export default function CompanyCatalogView({
  companies,
  query,
  onQueryChange,
  onSelectCompany,
  onAddCompany,
  territoryFilterLabel = null,
  onClearTerritoryFilter,
}: CompanyCatalogViewProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const filtered = useMemo(() => filterCatalogCompanies(companies, query), [companies, query])
  const groups = useMemo(() => groupCatalogByLetter(filtered), [filtered])
  const activeLetters = useMemo(() => getActiveCatalogLetters(filtered), [filtered])

  function scrollToLetter(letter: string) {
    const target = listRef.current?.querySelector(`#catalog-letter-${letter}`)
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="company-catalog">
      <section className="panel section-panel section-panel--compact company-catalog__intro">
        <div className="eyebrow eyebrow--tight">{uiText.companyCatalog.eyebrow}</div>
        <h2 className="company-catalog__title">{uiText.companyCatalog.heading}</h2>
        <p className="section-copy">{uiText.companyCatalog.description}</p>
        <p className="company-catalog__legend">
          <span className="meta-pill meta-pill--search">{uiText.companyCatalog.legend.catalog}</span>
          <span className="meta-pill meta-pill--saved">{uiText.companyCatalog.legend.saved}</span>
          <span className="meta-pill meta-pill--route">{uiText.companyCatalog.legend.onRoute}</span>
        </p>
      </section>

      {territoryFilterLabel ? (
        <section className="panel section-panel section-panel--compact company-catalog__filter-banner">
          <p className="company-catalog__filter-label">{territoryFilterLabel}</p>
          {onClearTerritoryFilter ? (
            <button type="button" className="button button--ghost" onClick={onClearTerritoryFilter}>
              {uiText.territories.catalogFilterClear}
            </button>
          ) : null}
        </section>
      ) : null}

      <section className="panel section-panel section-panel--compact company-catalog__toolbar">
        <label className="field-group">
          <span className="field-label">{uiText.companyCatalog.searchLabel}</span>
          <input
            type="search"
            className="text-input"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={uiText.companyCatalog.searchPlaceholder}
          />
        </label>
        <button type="button" className="button button--wide" onClick={onAddCompany}>
          <Plus size={18} />
          {uiText.companyCatalog.addCompany}
        </button>
        <p className="editor-hint company-catalog__count">
          {uiText.companyCatalog.companyCount(filtered.length)}
        </p>
      </section>

      {filtered.length > 0 ? (
        <>
          <nav className="company-catalog__index" aria-label={uiText.companyCatalog.indexLabel}>
            {activeLetters.map((letter) => (
              <button
                key={letter}
                type="button"
                className="company-catalog__index-letter"
                onClick={() => scrollToLetter(letter)}
              >
                {letter}
              </button>
            ))}
          </nav>

          <div ref={listRef} className="company-catalog__list">
            {groups.map((group) => (
              <section
                key={group.letter}
                id={`catalog-letter-${group.letter}`}
                className="company-catalog__group"
              >
                <h3 className="company-catalog__group-letter">{group.letter}</h3>
                <div className="company-catalog__group-list">
                  {group.companies.map((company) => (
                    <button
                      key={company.id}
                      type="button"
                      className="company-catalog__card"
                      onClick={() => onSelectCompany(company.id)}
                    >
                      <div className="company-catalog__card-main">
                        <Building2 size={18} aria-hidden />
                        <div>
                          <strong>{company.businessName}</strong>
                          <p>{company.category}</p>
                          <p className="company-catalog__card-address">{company.address}</p>
                        </div>
                      </div>
                      <div className="company-catalog__card-badges">
                        <span className="meta-pill meta-pill--search">
                          {uiText.companyCatalog.legend.catalog}
                        </span>
                        {company.isInRoute ? (
                          <span className="meta-pill meta-pill--route">
                            <Route size={12} />
                            {uiText.companyCatalog.legend.onRoute}
                          </span>
                        ) : null}
                        {company.hasFollowUp ? (
                          <span className="meta-pill meta-pill--accent">
                            {uiText.companyCatalog.legend.followUp}
                          </span>
                        ) : null}
                        {company.crmExportedAt ? (
                          <span className="meta-pill">{uiText.companyCatalog.legend.crmExported}</span>
                        ) : null}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      ) : (
        <section className="panel section-panel company-catalog__empty">
          <Bookmark size={28} />
          <h3>{uiText.companyCatalog.emptyTitle}</h3>
          <p>{uiText.companyCatalog.emptyCopy}</p>
          <button type="button" className="button" onClick={onAddCompany}>
            <Plus size={16} />
            {uiText.companyCatalog.addCompany}
          </button>
        </section>
      )}
    </div>
  )
}
