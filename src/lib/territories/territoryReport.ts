import { buildCsvContent } from '../crmExport'
import type { TerritoryConfig, TerritoryProspectRef } from './types'
import type { TerritoryDashboardStats } from './territoryData'

export type TerritoryReportProspectRow = TerritoryProspectRef & {
  address: string
  priority: string
  onRoute: boolean
}

export function buildTerritoryReportCsv(
  territory: TerritoryConfig,
  stats: TerritoryDashboardStats,
  prospectRows: TerritoryReportProspectRow[],
) {
  const generatedAt = new Date().toISOString()
  const summaryLines = [
    ['Territory Report'],
    ['Territory', territory.name],
    ['Region Type', territory.regionType],
    ['Generated', generatedAt],
    [],
    ['Prospects in territory', String(stats.prospectCount)],
    ['Active route in territory', stats.routeCount > 0 ? 'Yes' : 'No'],
    ['Route stops in territory', String(stats.stopCount)],
    [],
    ['Top Cities', 'Prospects', 'Route Stops'],
    ...stats.topCities.map((city) => [
      city.city,
      String(city.prospectCount),
      String(city.stopCount),
    ]),
    [],
    ['Target Industries', territory.targetIndustries.join('; ')],
    [],
    ['Priority Accounts', 'In Catalog'],
    ...stats.priorityAccountMatches.map((account) => [
      account.name,
      account.inCatalog ? 'Yes' : 'No',
    ]),
    [],
  ]

  const prospectColumns = [
    'Business Name',
    'City',
    'Address',
    'Priority',
    'On Route',
  ]
  const prospectData = prospectRows.map((row) => [
    row.businessName,
    row.city,
    row.address,
    row.priority,
    row.onRoute ? 'Yes' : 'No',
  ])

  const summaryCsv = summaryLines
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const prospectsCsv = buildCsvContent(prospectColumns, prospectData)

  return `${summaryCsv}\n${prospectsCsv}`
}

export function downloadTerritoryReportCsv(
  territory: TerritoryConfig,
  csv: string,
) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  const dateStamp = new Date().toISOString().slice(0, 10)
  const safeName = territory.shortName.replace(/[^\w.-]+/g, '-').toLowerCase() || 'territory'

  link.href = url
  link.download = `reproute-territory-${safeName}-${dateStamp}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => window.URL.revokeObjectURL(url), 0)
}
