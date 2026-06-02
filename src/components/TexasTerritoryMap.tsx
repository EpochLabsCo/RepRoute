import { useMemo } from 'react'
import type { Territory, TerritoryMapRegion } from '../lib/territories/types'

type TexasTerritoryMapProps = {
  territories: Territory[]
  mapRegions: TerritoryMapRegion[]
  selectedTerritoryId: string | null
  onSelectTerritory: (territoryId: string) => void
}

export default function TexasTerritoryMap({
  territories,
  mapRegions,
  selectedTerritoryId,
  onSelectTerritory,
}: TexasTerritoryMapProps) {
  const colorById = useMemo(
    () => new Map(territories.map((territory) => [territory.id, territory.color])),
    [territories],
  )

  return (
    <div className="texas-territory-map">
      <svg
        viewBox="0 0 400 440"
        className="texas-territory-map__svg"
        role="img"
        aria-label="Texas sales territories map"
      >
        <defs>
          <linearGradient id="texas-map-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(49, 196, 190, 0.08)" />
            <stop offset="100%" stopColor="rgba(111, 91, 255, 0.1)" />
          </linearGradient>
        </defs>

        {/* Stylized Texas outline */}
        <path
          className="texas-territory-map__outline"
          d="M 40 24 L 340 24 L 375 120 L 385 260 L 355 400 L 220 430 L 70 410 L 25 280 L 20 140 Z"
          fill="url(#texas-map-bg)"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="2"
        />

        {mapRegions.map((region) => {
          const isSelected = region.territoryId === selectedTerritoryId
          const fill = colorById.get(region.territoryId) ?? '#31c4be'

          return (
            <g key={region.territoryId} className="texas-territory-map__region-group">
              <path
                d={region.path}
                fill={fill}
                fillOpacity={isSelected ? 0.72 : 0.42}
                stroke={isSelected ? '#ffffff' : 'rgba(255,255,255,0.35)'}
                strokeWidth={isSelected ? 2.5 : 1.25}
                className={`texas-territory-map__region ${isSelected ? 'texas-territory-map__region--selected' : ''}`}
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
                aria-label={region.mapLabel}
              />
              <text
                x={region.labelX}
                y={region.labelY}
                className="texas-territory-map__label"
                pointerEvents="none"
              >
                {region.mapLabel}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
