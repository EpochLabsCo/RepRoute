import type { TerritoryMapRegion } from '../lib/territories/types'

/** SVG coordinate space — tuned for organic Texas field-sales map */
export const TEXAS_MAP_VIEWBOX = { width: 600, height: 680 } as const

export type TexasCityMarker = {
  name: string
  x: number
  y: number
}

/**
 * Recognizable Texas silhouette: panhandle, Big Bend west curve, Gulf bays, RGV tip.
 * Curves are stylized for sales reps, not survey-grade GIS.
 */
export const TEXAS_OUTLINE_PATH = [
  'M 108 58',
  'L 498 58',
  'Q 528 58 536 88',
  'L 552 168',
  'Q 568 248 558 318',
  'Q 548 388 522 438',
  'Q 498 488 452 518',
  'Q 402 548 348 562',
  'Q 288 578 232 568',
  'Q 178 558 142 522',
  'L 98 468',
  'Q 72 418 68 358',
  'L 62 278',
  'Q 58 218 72 168',
  'L 92 98',
  'Q 98 62 108 58',
  'Z',
].join(' ')

/** Decorative Gulf / coastal water (rendered outside clip) */
export const TEXAS_GULF_WATER_PATH = [
  'M 522 438',
  'Q 568 400 590 460',
  'L 600 680',
  'L 420 680',
  'Q 452 548 348 562',
  'Q 402 548 452 518',
  'Q 498 488 522 438',
  'Z',
].join(' ')

/** I-35 corridor guide (Austin ↔ San Antonio) */
export const TEXAS_I35_CORRIDOR_PATH = [
  'M 268 292',
  'Q 278 328 288 362',
  'Q 298 398 308 432',
].join(' ')

export const TEXAS_CITY_MARKERS: TexasCityMarker[] = [
  { name: 'Amarillo', x: 198, y: 108 },
  { name: 'Midland', x: 142, y: 248 },
  { name: 'Dallas', x: 338, y: 198 },
  { name: 'Tyler', x: 468, y: 268 },
  { name: 'Austin', x: 278, y: 318 },
  { name: 'Houston', x: 468, y: 388 },
  { name: 'San Antonio', x: 298, y: 418 },
  { name: 'Corpus Christi', x: 438, y: 478 },
  { name: 'McAllen', x: 318, y: 548 },
]

/**
 * Organic sales territories — curved internal boundaries, geographically placed.
 * Regions are clipped to TEXAS_OUTLINE_PATH in the map component.
 */
export const TEXAS_MAP_REGIONS: TerritoryMapRegion[] = [
  {
    territoryId: 'panhandle-west',
    labelX: 308,
    labelY: 118,
    path: [
      'M 108 58',
      'L 498 58',
      'Q 528 58 536 88',
      'L 552 168',
      'Q 520 178 468 182',
      'L 318 188',
      'Q 218 192 158 178',
      'L 108 58',
      'Z',
    ].join(' '),
  },
  {
    territoryId: 'permian',
    labelX: 138,
    labelY: 268,
    path: [
      'M 62 278',
      'L 72 168',
      'Q 98 162 158 178',
      'L 318 188',
      'Q 302 248 288 308',
      'Q 228 328 168 322',
      'L 98 312',
      'Q 68 298 62 278',
      'Z',
    ].join(' '),
  },
  {
    territoryId: 'dfw-north-texas',
    labelX: 358,
    labelY: 218,
    path: [
      'M 318 188',
      'L 468 182',
      'Q 512 188 528 218',
      'Q 518 258 478 278',
      'L 368 288',
      'Q 328 292 288 308',
      'L 318 188',
      'Z',
    ].join(' '),
  },
  {
    territoryId: 'east-texas',
    labelX: 498,
    labelY: 298,
    path: [
      'M 528 218',
      'L 552 168',
      'Q 568 248 558 318',
      'Q 538 348 498 358',
      'L 418 348',
      'Q 378 338 368 288',
      'L 478 278',
      'Q 518 258 528 218',
      'Z',
    ].join(' '),
  },
  {
    territoryId: 'austin-central',
    labelX: 248,
    labelY: 318,
    path: [
      'M 288 308',
      'L 368 288',
      'Q 388 318 378 348',
      'Q 348 368 308 372',
      'L 258 368',
      'Q 238 348 248 318',
      'L 288 308',
      'Z',
    ].join(' '),
  },
  {
    territoryId: 'san-antonio-i35',
    labelX: 278,
    labelY: 398,
    path: [
      'M 248 318',
      'L 258 368',
      'Q 268 398 288 418',
      'L 318 428',
      'Q 338 438 348 448',
      'L 318 458',
      'Q 288 448 268 428',
      'L 238 388',
      'Q 228 358 248 318',
      'Z',
    ].join(' '),
  },
  {
    territoryId: 'houston-ship-channel',
    labelX: 488,
    labelY: 388,
    path: [
      'M 378 348',
      'L 418 348',
      'Q 458 358 498 358',
      'Q 522 378 515 418',
      'Q 488 438 448 432',
      'L 388 418',
      'Q 358 398 378 348',
      'Z',
    ].join(' '),
  },
  {
    territoryId: 'eagle-ford',
    labelX: 368,
    labelY: 448,
    path: [
      'M 318 428',
      'L 348 448',
      'Q 388 458 428 452',
      'Q 468 448 488 428',
      'Q 498 468 468 498',
      'Q 418 512 358 502',
      'L 308 478',
      'Q 298 452 318 428',
      'Z',
    ].join(' '),
  },
  {
    territoryId: 'coastal-bend',
    labelX: 468,
    labelY: 478,
    path: [
      'M 448 432',
      'L 515 418',
      'Q 538 448 522 478',
      'Q 498 508 458 518',
      'L 418 512',
      'Q 388 498 358 502',
      'L 468 498',
      'Q 488 468 448 432',
      'Z',
    ].join(' '),
  },
  {
    territoryId: 'rio-grande-valley',
    labelX: 298,
    labelY: 548,
    path: [
      'M 238 388',
      'L 268 428',
      'Q 288 448 308 478',
      'L 358 502',
      'Q 388 528 368 558',
      'Q 328 578 278 568',
      'Q 228 558 198 528',
      'L 168 488',
      'Q 198 428 238 388',
      'Z',
    ].join(' '),
  },
]

/** Shared internal borders drawn on top for a cartographic feel */
export const TEXAS_TERRITORY_BORDER_PATHS: string[] = [
  'M 158 178 Q 238 192 318 188 Q 398 184 468 182',
  'M 288 308 Q 328 300 368 288 Q 408 276 478 278',
  'M 258 368 Q 298 392 348 448',
  'M 378 348 Q 418 378 448 432 Q 478 468 488 428',
  'M 308 478 Q 358 498 418 512 Q 468 518 522 478',
  'M 168 322 Q 228 338 288 308',
  'M 348 448 Q 388 458 428 452',
]
