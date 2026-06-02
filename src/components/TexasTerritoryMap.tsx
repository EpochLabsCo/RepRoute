import { useMemo } from 'react'
import type { TerritoryConfig, TerritoryMapRegion } from '../lib/territories/types'
import {
  TEXAS_CITY_MARKERS,
  TEXAS_GULF_WATER_PATH,
  TEXAS_I35_CORRIDOR_PATH,
  TEXAS_MAP_VIEWBOX,
  TEXAS_OUTLINE_PATH,
  TEXAS_TERRITORY_BORDER_PATHS,
} from '../data/texasMapGeometry'

type TexasTerritoryMapProps = {
  territories: TerritoryConfig[]
  mapRegions: TerritoryMapRegion[]
  selectedTerritoryId: string | null
  onSelectTerritory: (territoryId: string) => void
}

const { width: VIEW_W, height: VIEW_H } = TEXAS_MAP_VIEWBOX

export default function TexasTerritoryMap({
  territories,
  mapRegions,
  selectedTerritoryId,
  onSelectTerritory,
}: TexasTerritoryMapProps) {
  const territoryById = useMemo(
    () => new Map(territories.map((territory) => [territory.id, territory])),
    [territories],
  )

  return (
    <div className="texas-territory-map">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="texas-territory-map__svg"
        role="img"
        aria-label="Texas field sales territories map"
      >
        <defs>
          <clipPath id="texas-land-clip">
            <path d={TEXAS_OUTLINE_PATH} />
          </clipPath>
          <linearGradient id="texas-gulf-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(30, 80, 140, 0.15)" />
            <stop offset="100%" stopColor="rgba(20, 50, 100, 0.35)" />
          </linearGradient>
          <filter id="territory-selected-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="rgba(255,255,255,0.55)" />
          </filter>
          <filter id="territory-soft-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="rgba(0,0,0,0.35)" />
          </filter>
        </defs>

        <rect
          className="texas-territory-map__backdrop"
          width={VIEW_W}
          height={VIEW_H}
          rx="12"
        />

        <path
          className="texas-territory-map__water"
          d={TEXAS_GULF_WATER_PATH}
          fill="url(#texas-gulf-gradient)"
        />

        <path
          className="texas-territory-map__outline texas-territory-map__outline--under"
          d={TEXAS_OUTLINE_PATH}
          fill="rgba(5, 10, 20, 0.72)"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="1.5"
        />

        <g clipPath="url(#texas-land-clip)">
          {mapRegions.map((region) => {
            const territory = territoryById.get(region.territoryId)
            const isSelected = region.territoryId === selectedTerritoryId
            const fill = territory?.color ?? '#31c4be'
            const isEagleFord = region.territoryId === 'eagle-ford'
            const isCorridor = region.territoryId === 'san-antonio-i35'

            return (
              <path
                key={region.territoryId}
                d={region.path}
                fill={fill}
                fillOpacity={isSelected ? 0.82 : isEagleFord ? 0.62 : isCorridor ? 0.52 : 0.48}
                stroke={isSelected ? '#ffffff' : 'rgba(255,255,255,0.28)'}
                strokeWidth={isSelected ? 2.5 : 1.2}
                strokeLinejoin="round"
                strokeLinecap="round"
                className={[
                  'texas-territory-map__region',
                  isSelected && 'texas-territory-map__region--selected',
                  isEagleFord && 'texas-territory-map__region--eagle-ford',
                  isCorridor && 'texas-territory-map__region--corridor',
                ]
                  .filter(Boolean)
                  .join(' ')}
                filter={isSelected ? 'url(#territory-selected-glow)' : 'url(#territory-soft-shadow)'}
                onClick={() => onSelectTerritory(region.territoryId)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onSelectTerritory(region.territoryId)
                  }
                }}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={territory?.name ?? region.territoryId}
              />
            )
          })}

          <g className="texas-territory-map__borders" aria-hidden>
            {TEXAS_TERRITORY_BORDER_PATHS.map((path, index) => (
              <path
                key={`border-${index}`}
                d={path}
                fill="none"
                stroke="rgba(255,255,255,0.14)"
                strokeWidth="1"
                strokeLinecap="round"
              />
            ))}
          </g>

          <path
            className="texas-territory-map__i35"
            d={TEXAS_I35_CORRIDOR_PATH}
            fill="none"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="2"
            strokeDasharray="6 5"
            strokeLinecap="round"
            aria-hidden
          />
        </g>

        <path
          className="texas-territory-map__outline texas-territory-map__outline--frame"
          d={TEXAS_OUTLINE_PATH}
          fill="none"
          stroke="rgba(255,255,255,0.38)"
          strokeWidth="2.25"
          strokeLinejoin="round"
        />

        {TEXAS_CITY_MARKERS.map((city) => (
          <g key={city.name} className="texas-territory-map__city" aria-hidden>
            <circle cx={city.x} cy={city.y} r="3.5" className="texas-territory-map__city-dot" />
            <text x={city.x} y={city.y + 14} className="texas-territory-map__city-label">
              {city.name}
            </text>
          </g>
        ))}

        {mapRegions.map((region) => {
          const territory = territoryById.get(region.territoryId)
          const isSelected = region.territoryId === selectedTerritoryId
          const label = territory?.shortName ?? region.territoryId
          const labelWidth = Math.max(52, label.length * 7.2)

          return (
            <g
              key={`label-${region.territoryId}`}
              className={`texas-territory-map__label-group ${isSelected ? 'texas-territory-map__label-group--selected' : ''}`}
              pointerEvents="none"
              transform={`translate(${region.labelX - labelWidth / 2}, ${region.labelY - 10})`}
            >
              <rect
                width={labelWidth}
                height={18}
                rx={9}
                className="texas-territory-map__label-pill"
              />
              <text
                x={labelWidth / 2}
                y={12}
                className="texas-territory-map__label"
                textAnchor="middle"
              >
                {label}
              </text>
            </g>
          )
        })}

        <text x="548" y="420" className="texas-territory-map__water-label" pointerEvents="none">
          Gulf of Mexico
        </text>
      </svg>
    </div>
  )
}
