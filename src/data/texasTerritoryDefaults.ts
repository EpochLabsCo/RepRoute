import type { Territory, TerritoryMapRegion } from '../lib/territories/types'

const NOW = '2026-01-15T12:00:00.000Z'

function territoryMeta(
  meta: Omit<Territory, 'prospects' | 'customers' | 'routes'>,
): Territory {
  return {
    ...meta,
    prospects: [],
    customers: [],
    routes: [],
  }
}

/**
 * Default Texas sales territories for RepRoute V1.
 * Edit names, descriptions, cities, colors, and notes here.
 * Map shapes are in TEXAS_MAP_REGIONS below.
 * Live prospect/route/stop counts are computed from RepRoute data at runtime.
 */
export const TEXAS_TERRITORY_DEFAULTS: Territory[] = [
  territoryMeta({
    id: 'austin-central',
    name: 'Austin / Central Texas',
    description:
      'State capital corridor and I-35 growth markets. Strong tech, construction, and industrial supply density.',
    region: 'Central Texas',
    cities: ['Austin', 'Round Rock', 'Georgetown', 'San Marcos', 'Temple'],
    color: '#31c4be',
    notes: 'Q1 focus: industrial parks along SH-130 and north Austin.',
    createdAt: NOW,
    updatedAt: NOW,
  }),
  territoryMeta({
    id: 'san-antonio',
    name: 'San Antonio',
    description: 'Military, logistics, and south-central manufacturing hub with steady field-rep coverage.',
    region: 'South Central Texas',
    cities: ['San Antonio', 'New Braunfels', 'Schertz', 'Converse'],
    color: '#6f5bff',
    notes: '',
    createdAt: NOW,
    updatedAt: NOW,
  }),
  territoryMeta({
    id: 'eagle-ford',
    name: 'Eagle Ford',
    description: 'Oilfield services, energy suppliers, and rural industrial accounts across the shale play.',
    region: 'Eagle Ford Shale',
    cities: ['Victoria', 'Cuero', 'Karnes City', 'Pleasanton', 'Alice'],
    color: '#f4a261',
    notes: 'Coordinate with energy vertical campaigns.',
    createdAt: NOW,
    updatedAt: NOW,
  }),
  territoryMeta({
    id: 'permian',
    name: 'Permian Basin',
    description: 'West Texas energy and industrial core — high mileage routes, high account value.',
    region: 'West Texas',
    cities: ['Midland', 'Odessa', 'Big Spring', 'Andrews', 'Monahans'],
    color: '#e76f51',
    notes: 'Long drive days — batch routes by county.',
    createdAt: NOW,
    updatedAt: NOW,
  }),
  territoryMeta({
    id: 'houston-ship-channel',
    name: 'Houston / Ship Channel',
    description: 'Refining, petrochemical, maritime, and Gulf Coast industrial concentration.',
    region: 'Upper Gulf Coast',
    cities: ['Houston', 'Pasadena', 'Baytown', 'Deer Park', 'La Porte'],
    color: '#2a9d8f',
    notes: 'Heavy traffic — plan AM starts.',
    createdAt: NOW,
    updatedAt: NOW,
  }),
  territoryMeta({
    id: 'dfw-metroplex',
    name: 'DFW Metroplex',
    description: 'Dallas–Fort Worth manufacturing, distribution, and corporate branch density.',
    region: 'North Texas',
    cities: ['Dallas', 'Fort Worth', 'Arlington', 'Irving', 'Garland', 'Plano'],
    color: '#457b9d',
    notes: '',
    createdAt: NOW,
    updatedAt: NOW,
  }),
  territoryMeta({
    id: 'east-texas',
    name: 'East Texas',
    description: 'Timber, paper, chemicals, and regional distribution along the Louisiana border.',
    region: 'East Texas',
    cities: ['Tyler', 'Longview', 'Marshall', 'Lufkin', 'Nacogdoches'],
    color: '#588157',
    notes: 'Pair with forest products campaigns.',
    createdAt: NOW,
    updatedAt: NOW,
  }),
  territoryMeta({
    id: 'coastal-bend',
    name: 'Coastal Bend',
    description: 'Port Corpus Christi corridor, refining, and coastal industrial accounts.',
    region: 'South Texas Coast',
    cities: ['Corpus Christi', 'Portland', 'Rockport', 'Kingsville'],
    color: '#48cae4',
    notes: '',
    createdAt: NOW,
    updatedAt: NOW,
  }),
  territoryMeta({
    id: 'rio-grande-valley',
    name: 'Rio Grande Valley',
    description: 'Border trade, produce logistics, and growing industrial parks in the Valley.',
    region: 'Rio Grande Valley',
    cities: ['McAllen', 'Edinburg', 'Harlingen', 'Brownsville', 'Pharr'],
    color: '#9b5de5',
    notes: 'Bilingual collateral recommended.',
    createdAt: NOW,
    updatedAt: NOW,
  }),
  territoryMeta({
    id: 'panhandle-west',
    name: 'Panhandle / West Texas',
    description: 'Agriculture, wind energy, and wide-open routes across the Panhandle and far west.',
    region: 'Panhandle',
    cities: ['Amarillo', 'Lubbock', 'Plainview', 'Childress', 'El Paso'],
    color: '#cdb4db',
    notes: 'Weather delays common in winter.',
    createdAt: NOW,
    updatedAt: NOW,
  }),
]

export const TEXAS_MAP_REGIONS: TerritoryMapRegion[] = [
  {
    territoryId: 'panhandle-west',
    mapLabel: 'Panhandle',
    labelX: 155,
    labelY: 52,
    path: 'M 95 28 L 305 28 L 295 88 L 105 88 Z',
  },
  {
    territoryId: 'permian',
    mapLabel: 'Permian',
    labelX: 72,
    labelY: 155,
    path: 'M 28 95 L 95 88 L 105 200 L 45 215 Z',
  },
  {
    territoryId: 'dfw-metroplex',
    mapLabel: 'DFW',
    labelX: 195,
    labelY: 118,
    path: 'M 195 88 L 295 88 L 285 155 L 175 155 Z',
  },
  {
    territoryId: 'east-texas',
    mapLabel: 'East TX',
    labelX: 318,
    labelY: 175,
    path: 'M 285 155 L 372 145 L 365 255 L 275 240 Z',
  },
  {
    territoryId: 'houston-ship-channel',
    mapLabel: 'Houston',
    labelX: 300,
    labelY: 248,
    path: 'M 255 240 L 365 255 L 350 320 L 240 305 Z',
  },
  {
    territoryId: 'austin-central',
    mapLabel: 'Austin',
    labelX: 175,
    labelY: 218,
    path: 'M 155 165 L 245 165 L 235 255 L 145 248 Z',
  },
  {
    territoryId: 'san-antonio',
    mapLabel: 'San Antonio',
    labelX: 168,
    labelY: 288,
    path: 'M 145 248 L 235 255 L 225 325 L 125 318 Z',
  },
  {
    territoryId: 'eagle-ford',
    mapLabel: 'Eagle Ford',
    labelX: 248,
    labelY: 305,
    path: 'M 225 285 L 310 295 L 295 355 L 210 345 Z',
  },
  {
    territoryId: 'coastal-bend',
    mapLabel: 'Coastal',
    labelX: 285,
    labelY: 355,
    path: 'M 295 320 L 365 330 L 345 395 L 265 385 Z',
  },
  {
    territoryId: 'rio-grande-valley',
    mapLabel: 'RGV',
    labelX: 195,
    labelY: 395,
    path: 'M 125 330 L 265 385 L 240 420 L 95 405 Z',
  },
]

export function getTerritoryById(id: string, territories = TEXAS_TERRITORY_DEFAULTS) {
  return territories.find((territory) => territory.id === id) ?? null
}

export function getMapRegionForTerritory(territoryId: string, regions = TEXAS_MAP_REGIONS) {
  return regions.find((region) => region.territoryId === territoryId) ?? null
}
