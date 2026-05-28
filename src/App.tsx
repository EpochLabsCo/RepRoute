import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type TouchEvent,
} from 'react'
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  AlertTriangle,
  ArrowLeft,
  BellRing,
  Bookmark,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  UtensilsCrossed,
  GripVertical,
  Map as MapIcon,
  Navigation,
  MoonStar,
  Route,
  Search,
  Settings2,
  SunMedium,
  Trash2,
  Upload,
  UserRound,
  X,
} from 'lucide-react'
import './App.css'
import { uiText } from './constants/uiText'
import RepRouteMap, { type RepRouteMapMarker, type RouteLineRenderStatus } from './components/RepRouteMap'
import type { RouteNavigationStop } from './components/RepRouteNavigationMap'
import RouteNavigationView, { type RouteNavigationLegSummary } from './components/RouteNavigationView'
import {
  buildCrmExportRecord,
  buildCrmExportRows,
  buildCsvContent,
  getCrmExportFormats,
  getCrmExportScopes,
  type CrmExportFormat,
  type CrmExportScope,
} from './lib/crmExport'
import {
  DEFAULT_NOTIFICATION_LOG,
  DEFAULT_NOTIFICATION_PREFERENCES,
  getBrowserNotificationPermission,
  getLocalDateKey,
  hasReminderTimePassed,
  requestBrowserNotificationPermission,
  showBrowserNotification,
  type BrowserNotificationPermission,
  type NotificationPreferences,
  type NotificationReminderLog,
} from './lib/notifications'
import { searchGooglePlaces, type GooglePlacesApiPlace } from './lib/googlePlaces'
import {
  CardMoreActions,
  CardMoreMenuButton,
  CardMoreMenuLink,
  ProspectPrimaryActions,
} from './components/ProspectCardActions'
import BusinessCardAttachStopSheet from './components/BusinessCardAttachStopSheet'
import BusinessCardPreviewStrip from './components/BusinessCardPreviewStrip'
import BusinessCardScanButton from './components/BusinessCardScanButton'
import BusinessCardSection from './components/BusinessCardSection'
import FollowUpCard from './components/FollowUpCard'
import {
  buildFollowUpSnapshot,
  DEFAULT_FOLLOW_UP_TIME,
  groupFollowUpsBySection,
  isValidFollowUpDate,
  migrateFollowUpsFromProspectRecords,
  resolveFollowUpRouteStatus,
  sanitizeFollowUpStore,
  type FollowUpEntry,
} from './lib/followUps'
import {
  getBusinessCardDataUrl,
  getBusinessCardObjectUrl,
  removeBusinessCardImage,
  restoreBusinessCardFromDataUrl,
  saveBusinessCardImage,
} from './lib/businessCardStorage'
import {
  fetchRouteDirectionsWithFallback,
  optimizeRouteStopOrder,
  ROUTE_OPTIMIZATION_BATCH_STOPS,
  validateRouteStopsForDirections,
  waitForGoogleMaps,
  type RouteDirectionsStop,
} from './lib/routeDirections'

type AssignedPriority = 'Hot' | 'Warm' | 'Cold'
type Priority = AssignedPriority | 'Unassigned'
type Theme = 'dark' | 'light'
type TravelMode = 'driving' | 'walking'
type View = 'dashboard' | 'map' | 'search' | 'saved' | 'follow-ups' | 'settings'

type FoodNearbySession = {
  anchor: Prospect
  returnView: View
}
type SearchDataSource = 'live' | 'api-error'
type OutcomeTag =
  | 'No Answer'
  | 'Decision Maker Met'
  | 'Follow-Up Needed'
  | 'Quote Opportunity'
  | 'Not Interested'
  | 'Bad Address'
  | 'Existing Customer'

type BaseProspect = {
  id: string
  googlePlaceId: string
  businessName: string
  contactName: string
  contactTitle: string
  contactEmail: string
  category: string
  distance: number
  priority: Priority
  lastContact: string
  notes: string
  city: string
  nextTouch: string
  address: string
  rating: number | null
  phone: string
  website: string
  location: {
    lat: number
    lng: number
  }
}

type ProspectRecord = {
  contactName?: string
  contactTitle?: string
  contactEmail?: string
  contactPhone?: string
  contactWebsite?: string
  addressOverride?: string
  locationOverride?: { lat: number; lng: number }
  googlePlaceIdOverride?: string
  lastContactDate?: string
  notes?: string
  priority?: AssignedPriority
  followUpDate?: string
  followUpTime?: string
  followUpCompleted?: boolean
  followUpCompletedAt?: string
  visitNote?: string
  visitOutcome?: OutcomeTag | ''
  routeCompleted?: boolean
  visitCompletedAt?: string
  isFoodStop?: boolean
  editedByRepRouteUser?: boolean
  businessCardCapturedAt?: string
  businessCardMimeType?: string
  businessCardImageDataUrl?: string
}

type Prospect = BaseProspect & {
  followUpDate: string
  followUpTime: string
  lastContactDate: string
  routeCompleted: boolean
  visitNote: string
  visitOutcome: OutcomeTag | ''
  visitCompletedAt: string
  isFoodStop: boolean
  editedByRepRouteUser: boolean
  businessCardCapturedAt: string
}

type BackupPayload = {
  liveProspects: BaseProspect[]
  savedProspects: string[]
  routeList: string[]
  prospectRecords: Record<string, ProspectRecord>
  followUpEntries: Record<string, import('./lib/followUps').FollowUpEntry>
}

type BackupFile = {
  app: 'RepRoute'
  version: 1
  exportedAt: string
  data: BackupPayload
}

type BackupMessage = {
  type: 'success' | 'error' | 'info'
  text: string
}

type ToastMessage = {
  type: 'success' | 'error' | 'info'
  text: string
}

type RouteOptimizationState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'success'
      forRouteKey: string
      distanceMiles: number
      driveMinutes: number
      optimizedCount: number
      skippedCount: number
      batched: boolean
    }
  | { status: 'error'; message: string }

type RouteActionMessage = { tone: 'info' | 'error' | 'success'; text: string; persistent?: boolean } | null

type RouteOptimizationDebug = {
  lastAttemptedAt: string
  status: 'idle' | 'loading' | 'success' | 'error'
  directionsStatus?: string
  message?: string
  origin?: unknown
  destination?: unknown
  waypointCount?: number
  stopCount: number
  optimizedCount: number
  skippedCount: number
  batched: boolean
  missingCoordinatesCount: number
} | null

type RouteRenderDebug = {
  lastAttemptedAt: string
  mapReady: boolean
  validStopCount: number
  invalidRemovedCount: number
  autoRemovedStopNames: string[]
  routeStatus: string
  directionsStatus: string
  rendererStatus: RouteLineRenderStatus
  usedFallback: boolean
  partialLine: boolean
  waypointCount: number
  requestedStopCount: number
} | null

type ImportPreview = {
  fileName: string
  exportedAt: string
  payload: BackupPayload
}

type SearchStatus = {
  source: SearchDataSource
  message: string
  details?: string
  resultsCount?: number
  query?: string
}

type ConnectionTestState = {
  status: 'idle' | 'running' | 'success' | 'error'
  message: string
  resultsCount?: number
  details?: string
}

type SearchLocationState = 'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported'
type SearchRadiusMiles = (typeof uiText.search.radiusOptions)[number]
type SearchRadiusChoice = 'current-location' | SearchRadiusMiles | 'custom'
type SearchIndustryGroup = (typeof uiText.search.industryGroups)[number]
type SearchIndustry = SearchIndustryGroup['options'][number]
type ArrivalDetectionRadiusFeet = 150 | 300 | 500 | 1320
type RouteTrackingState = 'idle' | 'tracking' | 'denied' | 'unsupported' | 'error'
type RouteCalculationContext = {
  filterSummary: string
}
type PendingRouteScrollTarget = 'summary' | 'map'
type RemoveProspectPrompt = {
  prospectId: string
}

type SettingsSection = 'top' | 'notifications' | 'crm' | 'backup'

const ROUTE_OUTCOME_OPTIONS: OutcomeTag[] = [...uiText.routes.outcomeTags]
const ASSIGNED_PRIORITY_OPTIONS: AssignedPriority[] = ['Hot', 'Warm', 'Cold']
const SEARCH_RADIUS_OPTIONS: SearchRadiusMiles[] = [...uiText.search.radiusOptions]
const SEARCH_INDUSTRY_GROUPS = uiText.search.industryGroups.map((group) => ({
  label: group.label,
  options: [...group.options],
})) as Array<{ label: string; options: SearchIndustry[] }>
const SEARCH_INDUSTRY_OPTIONS = SEARCH_INDUSTRY_GROUPS.flatMap((group) => group.options)
const ARRIVAL_RADIUS_OPTIONS: ArrivalDetectionRadiusFeet[] = [150, 300, 500, 1320]

const STORAGE_KEYS = {
  liveProspects: 'reproute:live-prospects',
  savedProspects: 'reproute:saved-prospects',
  prospectRecords: 'reproute:prospect-records',
  routeList: 'reproute:route-list',
  followUpEntries: 'reproute:follow-up-entries',
  notificationPreferences: 'reproute:notification-preferences',
  notificationReminderLog: 'reproute:notification-reminder-log',
  arrivalDetectionRadiusFeet: 'reproute:arrival-detection-radius-feet',
  theme: 'reproute:theme',
} as const

const AUSTIN_FALLBACK = { lat: 30.2672, lng: -97.7431 }

const screenMeta: Record<View, { title: string; subtitle: string }> = uiText.navigation.screenMeta

function usePersistentState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key)
      return stored ? (JSON.parse(stored) as T) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue] as const
}

function formatDistance(distance: number) {
  return `${distance.toFixed(1)} mi`
}

function formatDriveTime(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`
  }

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (remainingMinutes === 0) {
    return `${hours} hr`
  }

  return `${hours} hr ${remainingMinutes} min`
}

function formatFollowUpDate(date: string) {
  if (!date) {
    return uiText.followUps.noDate
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00`))
}

function formatBackupTimestamp(timestamp: string) {
  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return uiText.settings.unknownExportDate
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isAssignedPriority(value: unknown): value is AssignedPriority {
  return value === 'Hot' || value === 'Warm' || value === 'Cold'
}

function isPriority(value: unknown): value is Priority {
  return value === 'Unassigned' || isAssignedPriority(value)
}

function getPriorityTone(priority: Priority) {
  return priority === 'Hot'
    ? 'hot'
    : priority === 'Warm'
      ? 'warm'
      : priority === 'Cold'
        ? 'cold'
        : 'unassigned'
}

function isOutcomeTag(value: unknown): value is OutcomeTag {
  return ROUTE_OUTCOME_OPTIONS.includes(value as OutcomeTag)
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function isIsoDateTime(value: unknown): value is string {
  return typeof value === 'string' && (value === '' || !Number.isNaN(Date.parse(value)))
}

function uniqueStrings(values: string[]) {
  return [...new Set(values)]
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function extractCity(address: string, fallbackLocation: string) {
  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length >= 3) {
    return `${parts[1]}, ${parts[2]}`
  }

  if (parts.length >= 2) {
    return parts[1]
  }

  return fallbackLocation || 'Unknown area'
}

function calculateDistanceMilesPrecise(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
) {
  const toRadians = (value: number) => (value * Math.PI) / 180
  const earthRadiusMiles = 3958.8
  const dLat = toRadians(to.lat - from.lat)
  const dLng = toRadians(to.lng - from.lng)
  const startLat = toRadians(from.lat)
  const endLat = toRadians(to.lat)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(startLat) * Math.cos(endLat)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return earthRadiusMiles * c
}

function feetToMiles(feet: number) {
  return feet / 5280
}

function milesToFeet(miles: number) {
  return Math.round(miles * 5280)
}

function formatDistanceFeet(feet: number) {
  if (feet >= 1320) {
    const miles = feetToMiles(feet)
    return `${miles < 1 ? miles.toFixed(2) : miles.toFixed(1)} mi`
  }

  return `${Math.round(feet)} ft`
}

function formatDateTime(value: string) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function metersToMiles(meters: number) {
  return meters / 1609.344
}

function secondsToMinutes(seconds: number) {
  return Math.round(seconds / 60)
}

function isFiniteLatLng(value: { lat: number; lng: number } | null | undefined) {
  return Boolean(
    value &&
      Number.isFinite(value.lat) &&
      Number.isFinite(value.lng) &&
      Math.abs(value.lat) <= 90 &&
      Math.abs(value.lng) <= 180,
  )
}

function formatOriginParam(origin: string | { lat: number; lng: number }) {
  return typeof origin === 'string' ? origin : `${origin.lat},${origin.lng}`
}

function resolveDirectionsLocation(prospect: Prospect) {
  if (isFiniteLatLng(prospect.location)) {
    return prospect.location
  }

  const trimmed = prospect.address?.trim()
  if (trimmed) {
    return trimmed
  }

  return null
}

function getGoogleDirectionsTravelMode(mode: TravelMode) {
  return mode === 'walking' ? google.maps.TravelMode.WALKING : google.maps.TravelMode.DRIVING
}

function createFallbackLiveProspectId(place: GooglePlacesApiPlace, query: string) {
  const name = place.displayName?.text?.trim() ?? 'place'
  const address = place.formattedAddress?.trim() ?? query
  return `gplace:${slugify(`${name}-${address}`)}`
}

function toLiveProspect(
  place: GooglePlacesApiPlace,
  keyword: string,
  location: string,
  searchCenter = AUSTIN_FALLBACK,
  distanceMilesPrecise?: number,
): BaseProspect | null {
  const lat = place.location?.latitude
  const lng = place.location?.longitude

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return null
  }

  const businessName = place.displayName?.text?.trim() || 'Unnamed business'
  const address = place.formattedAddress?.trim() || location.trim() || 'Address unavailable'
  const rating = typeof place.rating === 'number' ? place.rating : null
  const category =
    keyword.trim().length > 0
      ? titleCase(keyword.trim())
      : place.types?.[0]
        ? titleCase(place.types[0].replace(/_/g, ' '))
        : 'Business'

  return {
    id: place.id ? `gplace:${place.id}` : createFallbackLiveProspectId(place, `${keyword} ${location}`),
    googlePlaceId: place.id?.trim() ?? '',
    businessName,
    contactName: '',
    contactTitle: '',
    contactEmail: '',
    category,
    distance: Number((distanceMilesPrecise ?? calculateDistanceMilesPrecise(searchCenter, { lat, lng })).toFixed(1)),
    priority: 'Unassigned',
    lastContact: 'Not contacted yet',
    notes: 'Imported from Live Search.',
    city: extractCity(address, location.trim()),
    nextTouch: 'Review fit, save if promising, and add to route if qualified.',
    address,
    rating,
    phone: place.nationalPhoneNumber?.trim() || 'Phone unavailable',
    website: place.websiteUri?.trim() || 'Website unavailable',
    location: { lat, lng },
  }
}

function mergeProspectCatalog(current: BaseProspect[], incoming: BaseProspect[]) {
  const merged = new globalThis.Map(current.map((prospect) => [prospect.id, prospect]))

  for (const prospect of incoming) {
    merged.set(prospect.id, prospect)
  }

  return Array.from(merged.values())
}

function normalizeWebsiteUrl(website: string) {
  if (!website || website === 'Website unavailable') {
    return ''
  }

  return website.startsWith('http://') || website.startsWith('https://')
    ? website
    : `https://${website}`
}

type FoodRadiusMiles = 0.5 | 1 | 3 | 5
const FOOD_RADIUS_OPTIONS: FoodRadiusMiles[] = [0.5, 1, 3, 5]
const FOOD_SEARCH_TERMS = ['restaurants', 'coffee', 'breakfast', 'lunch', 'catering'] as const
type FoodQuickChip = 'Coffee' | 'Breakfast' | 'Lunch' | 'BBQ' | 'Tacos' | 'Catering'
const FOOD_QUICK_CHIPS: FoodQuickChip[] = ['Coffee', 'Breakfast', 'Lunch', 'BBQ', 'Tacos', 'Catering']

function createCallHref(phone: string) {
  const digits = phone.replace(/[^\d+]/g, '')
  return digits ? `tel:${digits}` : ''
}

function getMapsDestination(prospect: Prospect) {
  return prospect.address
    ? prospect.address
    : `${prospect.location.lat},${prospect.location.lng}`
}

function getGoogleMapsHref(prospect: Prospect, travelMode: TravelMode) {
  const url = new URL('https://www.google.com/maps/dir/')

  url.searchParams.set('api', '1')
  url.searchParams.set('destination', getMapsDestination(prospect))
  url.searchParams.set('travelmode', travelMode)

  if (prospect.googlePlaceId) {
    url.searchParams.set('destination_place_id', prospect.googlePlaceId)
  }

  return url.toString()
}

function getAppleMapsHref(prospect: Prospect, travelMode: TravelMode) {
  const url = new URL('https://maps.apple.com/')

  url.searchParams.set('daddr', `${prospect.location.lat},${prospect.location.lng}`)
  url.searchParams.set('dirflg', travelMode === 'walking' ? 'w' : 'd')
  url.searchParams.set('q', prospect.businessName)

  return url.toString()
}

function prefersAppleMaps() {
  if (typeof navigator === 'undefined') {
    return false
  }

  const userAgent = navigator.userAgent
  const vendor = navigator.vendor ?? ''
  const isIos = /iPhone|iPad|iPod/i.test(userAgent)
  const isMacSafari =
    /Macintosh/i.test(userAgent) &&
    /Safari/i.test(userAgent) &&
    !/Chrome|CriOS|Chromium|Edg|OPR|Firefox/i.test(userAgent) &&
    /Apple/i.test(vendor)

  return isIos || isMacSafari
}

function prefersGoogleMaps() {
  if (typeof navigator === 'undefined') {
    return false
  }

  const userAgent = navigator.userAgent
  return /Android/i.test(userAgent) || /Chrome|CriOS/i.test(userAgent)
}

function createNavigateHref(prospect: Prospect, travelMode: TravelMode) {
  if (prefersAppleMaps()) {
    return getAppleMapsHref(prospect, travelMode)
  }

  if (prefersGoogleMaps()) {
    return getGoogleMapsHref(prospect, travelMode)
  }

  return getGoogleMapsHref(prospect, travelMode)
}

function createEntireRouteNavigateHref(
  origin: string | { lat: number; lng: number } | null,
  routeProspects: Prospect[],
  travelMode: TravelMode,
) {
  if (routeProspects.length <= 1) {
    return routeProspects[0] ? createNavigateHref(routeProspects[0], travelMode) : ''
  }

  const url = new URL('https://www.google.com/maps/dir/')
  const orderedStops = routeProspects.map((prospect) => getMapsDestination(prospect))

  url.searchParams.set('api', '1')
  if (origin) {
    url.searchParams.set('origin', formatOriginParam(origin))
  }
  url.searchParams.set('destination', orderedStops[orderedStops.length - 1] ?? '')
  url.searchParams.set('travelmode', travelMode)

  const waypoints = orderedStops.slice(0, -1)

  if (waypoints.length > 0) {
    url.searchParams.set('waypoints', waypoints.join('|'))
  }

  return url.toString()
}

function openExternalNavigation(url: string) {
  if (!url) {
    return false
  }

  const nextWindow = window.open(url, '_blank', 'noopener,noreferrer')
  return Boolean(nextWindow)
}

const ROUTE_GUIDANCE_HISTORY_STATE = { reprouteRouteMode: 'guidance' } as const

function buildStopLegMap(
  routeProspects: Prospect[],
  directions: google.maps.DirectionsResult | null,
  originIsFirstStop: boolean,
): Record<string, RouteNavigationLegSummary | null> {
  const legs = directions?.routes?.[0]?.legs ?? []
  const map: Record<string, RouteNavigationLegSummary | null> = {}
  let legIndex = 0

  for (let index = 0; index < routeProspects.length; index += 1) {
    const stop = routeProspects[index]

    if (index === 0 && originIsFirstStop) {
      map[stop.id] = {
        distanceText: uiText.routes.inAppNavigation.atStart,
        durationText: '',
      }
      continue
    }

    const leg = legs[legIndex]
    legIndex += 1
    map[stop.id] = leg
      ? {
          distanceText: leg.distance?.text ?? '',
          durationText: leg.duration?.text ?? '',
        }
      : null
  }

  return map
}

function prospectToRouteDirectionsStop(prospect: Prospect): RouteDirectionsStop {
  return {
    id: prospect.id,
    businessName: prospect.businessName,
    address: prospect.address,
    googlePlaceId: prospect.googlePlaceId,
    location: prospect.location,
  }
}

function sanitizeBaseProspect(value: unknown): BaseProspect | null {
  if (!isRecord(value)) {
    return null
  }

  const location = isRecord(value.location) ? value.location : null

  if (
      typeof value.id !== 'string' ||
      typeof value.businessName !== 'string' ||
    typeof value.category !== 'string' ||
    typeof value.distance !== 'number' ||
    !isPriority(value.priority) ||
    typeof value.lastContact !== 'string' ||
    typeof value.notes !== 'string' ||
    typeof value.city !== 'string' ||
    typeof value.nextTouch !== 'string' ||
    typeof value.address !== 'string' ||
    (typeof value.rating !== 'number' && value.rating !== null) ||
    typeof value.phone !== 'string' ||
    typeof value.website !== 'string' ||
    !location ||
    typeof location.lat !== 'number' ||
    typeof location.lng !== 'number'
  ) {
    return null
  }

  return {
    id: value.id,
    googlePlaceId:
      typeof value.googlePlaceId === 'string'
        ? value.googlePlaceId
        : value.id.startsWith('gplace:')
          ? value.id.slice('gplace:'.length)
          : '',
    businessName: value.businessName,
    contactName: typeof value.contactName === 'string' ? value.contactName : '',
    contactTitle: typeof value.contactTitle === 'string' ? value.contactTitle : '',
    contactEmail: typeof value.contactEmail === 'string' ? value.contactEmail : '',
    category: value.category,
    distance: value.distance,
    priority: value.priority,
    lastContact: value.lastContact,
    notes: value.notes,
    city: value.city,
    nextTouch: value.nextTouch,
    address: value.address,
    rating: value.rating,
    phone: value.phone,
    website: value.website,
    location: {
      lat: location.lat,
      lng: location.lng,
    },
  }
}

function sanitizeBackupPayload(value: unknown): BackupPayload {
  if (!isRecord(value)) {
    throw new Error('This file is not a valid RepRoute backup.')
  }

  if (value.app !== 'RepRoute' || value.version !== 1 || !isRecord(value.data)) {
    throw new Error('This file is not a valid RepRoute backup.')
  }

  const data = value.data
  const liveProspects = Array.isArray(data.liveProspects)
    ? data.liveProspects
        .map((prospect) => sanitizeBaseProspect(prospect))
        .filter((prospect): prospect is BaseProspect => prospect !== null)
    : []
  const prospectIds = new Set(liveProspects.map((prospect) => prospect.id))

  const savedProspects = uniqueStrings(
    Array.isArray(data.savedProspects)
      ? data.savedProspects.filter(
          (item): item is string => typeof item === 'string' && prospectIds.has(item),
        )
      : [],
  )

  const routeList = uniqueStrings(
    Array.isArray(data.routeList)
      ? data.routeList.filter(
          (item): item is string => typeof item === 'string' && prospectIds.has(item),
        )
      : [],
  )

  const prospectRecords: Record<string, ProspectRecord> = {}

  if (isRecord(data.prospectRecords)) {
    for (const [prospectId, record] of Object.entries(data.prospectRecords)) {
      if (!prospectIds.has(prospectId) || !isRecord(record)) {
        continue
      }

      const nextRecord: ProspectRecord = {}

      if (typeof record.contactName === 'string') {
        nextRecord.contactName = record.contactName
      }

      if (typeof record.contactTitle === 'string') {
        nextRecord.contactTitle = record.contactTitle
      }

      if (typeof record.contactEmail === 'string') {
        nextRecord.contactEmail = record.contactEmail
      }

      if (typeof record.contactPhone === 'string') {
        nextRecord.contactPhone = record.contactPhone
      }

      if (typeof record.contactWebsite === 'string') {
        nextRecord.contactWebsite = record.contactWebsite
      }

      if (typeof record.addressOverride === 'string') {
        nextRecord.addressOverride = record.addressOverride
      }

      if (isRecord(record.locationOverride)) {
        const lat = record.locationOverride.lat
        const lng = record.locationOverride.lng
        if (typeof lat === 'number' && typeof lng === 'number') {
          nextRecord.locationOverride = { lat, lng }
        }
      }

      if (typeof record.googlePlaceIdOverride === 'string') {
        nextRecord.googlePlaceIdOverride = record.googlePlaceIdOverride
      }

      if (record.lastContactDate === '' || isIsoDate(record.lastContactDate)) {
        nextRecord.lastContactDate = record.lastContactDate
      }

      if (typeof record.notes === 'string') {
        nextRecord.notes = record.notes
      }

      if (isAssignedPriority(record.priority)) {
        nextRecord.priority = record.priority
      }

      if (record.followUpDate === '' || isIsoDate(record.followUpDate)) {
        nextRecord.followUpDate = record.followUpDate
      }

      if (typeof record.followUpTime === 'string') {
        nextRecord.followUpTime = record.followUpTime
      }

      if (typeof record.followUpCompleted === 'boolean') {
        nextRecord.followUpCompleted = record.followUpCompleted
      }

      if (isIsoDateTime(record.followUpCompletedAt)) {
        nextRecord.followUpCompletedAt = record.followUpCompletedAt
      }

      if (typeof record.visitNote === 'string') {
        nextRecord.visitNote = record.visitNote
      }

      if (record.visitOutcome === '' || isOutcomeTag(record.visitOutcome)) {
        nextRecord.visitOutcome = record.visitOutcome
      }

      if (typeof record.routeCompleted === 'boolean') {
        nextRecord.routeCompleted = record.routeCompleted
      }

      if (isIsoDateTime(record.visitCompletedAt)) {
        nextRecord.visitCompletedAt = record.visitCompletedAt
      }

      if (typeof record.isFoodStop === 'boolean') {
        nextRecord.isFoodStop = record.isFoodStop
      }

      if (typeof record.editedByRepRouteUser === 'boolean') {
        nextRecord.editedByRepRouteUser = record.editedByRepRouteUser
      }

      if (isIsoDateTime(record.businessCardCapturedAt)) {
        nextRecord.businessCardCapturedAt = record.businessCardCapturedAt
      }

      if (typeof record.businessCardMimeType === 'string') {
        nextRecord.businessCardMimeType = record.businessCardMimeType
      }

      if (typeof record.businessCardImageDataUrl === 'string' && record.businessCardImageDataUrl.startsWith('data:')) {
        nextRecord.businessCardImageDataUrl = record.businessCardImageDataUrl
      }

      if (Object.keys(nextRecord).length > 0) {
        prospectRecords[prospectId] = nextRecord
      }
    }
  }

  const followUpEntries = sanitizeFollowUpStore(
    isRecord(data.followUpEntries) ? data.followUpEntries : {},
  )

  return {
    liveProspects,
    savedProspects,
    routeList,
    prospectRecords,
    followUpEntries,
  }
}

function summarizeBackupPayload(payload: BackupPayload) {
  const records = Object.values(payload.prospectRecords)

  return {
    liveProspects: payload.liveProspects.length,
    saved: payload.savedProspects.length,
    route: payload.routeList.length,
    notes: records.filter((record) => typeof record.notes === 'string').length,
    priorities: records.filter((record) => typeof record.priority === 'string').length,
    followUps: Object.keys(payload.followUpEntries ?? {}).length,
    businessCards: records.filter((record) => typeof record.businessCardCapturedAt === 'string').length,
  }
}

async function enrichProspectRecordsForBackup(records: Record<string, ProspectRecord>) {
  const enriched: Record<string, ProspectRecord> = {}

  for (const [prospectId, record] of Object.entries(records)) {
    if (!record.businessCardCapturedAt) {
      enriched[prospectId] = record
      continue
    }

    const dataUrl = await getBusinessCardDataUrl(prospectId)
    enriched[prospectId] = dataUrl ? { ...record, businessCardImageDataUrl: dataUrl } : record
  }

  return enriched
}

async function restoreProspectRecordsFromBackup(records: Record<string, ProspectRecord>) {
  const restored: Record<string, ProspectRecord> = {}

  for (const [prospectId, record] of Object.entries(records)) {
    const { businessCardImageDataUrl, ...rest } = record

    if (businessCardImageDataUrl?.startsWith('data:')) {
      await restoreBusinessCardFromDataUrl(
        prospectId,
        businessCardImageDataUrl,
        record.businessCardMimeType,
      )
    }

    restored[prospectId] = rest
  }

  return restored
}

function getDaysUntil(date: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const target = new Date(`${date}T00:00:00`)
  const millisecondsPerDay = 24 * 60 * 60 * 1000
  return Math.round((target.getTime() - today.getTime()) / millisecondsPerDay)
}

function getFollowUpStatus(date: string) {
  const daysUntil = getDaysUntil(date)

  if (daysUntil <= 0) {
    return uiText.followUps.statuses.dueNow
  }

  if (daysUntil === 1) {
    return uiText.followUps.statuses.tomorrow
  }

  if (daysUntil <= 7) {
    return uiText.followUps.statuses.thisWeek
  }

  return uiText.followUps.statuses.later
}

function formatProspectNames(prospects: Prospect[], limit = 3) {
  const names = prospects.slice(0, limit).map((prospect) => prospect.businessName)

  if (prospects.length <= limit) {
    return names
  }

  return [...names, `+${prospects.length - limit} more`]
}

function milesToMeters(miles: number) {
  return Math.round(miles * 1609.34)
}

function getEffectiveRadiusMiles(radiusChoice: SearchRadiusChoice, customRadiusMiles: string) {
  if (radiusChoice === 'custom') {
    const parsedRadius = Number(customRadiusMiles)
    return Number.isFinite(parsedRadius) && parsedRadius > 0 ? parsedRadius : null
  }

  if (radiusChoice === 'current-location') {
    return 10
  }

  return radiusChoice
}

function summarizeSearchFilters({
  selectedIndustries,
  radiusLabel,
  market,
  usesCurrentLocation,
}: {
  selectedIndustries: string[]
  radiusLabel: string
  market: string
  usesCurrentLocation: boolean
}) {
  const parts = [
    radiusLabel,
    selectedIndustries.length > 0 ? uiText.search.filters.industries(selectedIndustries) : '',
    market.trim() ? uiText.search.filters.market(market.trim()) : '',
    !market.trim() || usesCurrentLocation ? uiText.search.filters.currentLocation : '',
  ].filter(Boolean)

  return parts.join(' · ')
}

function dedupePlaces(places: GooglePlacesApiPlace[]) {
  const unique = new globalThis.Map<string, GooglePlacesApiPlace>()

  for (const place of places) {
    const fallbackKey = `${place.displayName?.text?.trim() ?? ''}:${place.formattedAddress?.trim() ?? ''}`
    const key = place.id?.trim() || fallbackKey

    if (!unique.has(key)) {
      unique.set(key, place)
    }
  }

  return Array.from(unique.values())
}

function EmptyState({
  title,
  copy,
  icon: Icon,
  actionLabel,
  onAction,
}: {
  title: string
  copy: string
  icon: typeof Route
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <section className="panel empty-state">
      <div className="empty-state__icon">
        <Icon size={20} />
      </div>
      <h3>{title}</h3>
      <p>{copy}</p>
      {actionLabel && onAction ? (
        <button type="button" className="button" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </section>
  )
}

function RemoveProspectSheet({
  prospect,
  isSaved,
  isInRoute,
  onRemoveFromRoute,
  onRemoveFromSaved,
  onCancel,
}: {
  prospect: Prospect
  isSaved: boolean
  isInRoute: boolean
  onRemoveFromRoute: () => void
  onRemoveFromSaved: () => void
  onCancel: () => void
}) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-prospect-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-sheet__handle" aria-hidden="true" />
        <div className="eyebrow eyebrow--tight">{uiText.routes.removal.heading}</div>
        <h2 id="remove-prospect-title">{prospect.businessName}</h2>
        <p className="section-copy">{uiText.routes.removal.description}</p>

        <div className="modal-sheet__actions">
          <button
            type="button"
            className="button"
            onClick={onRemoveFromRoute}
            disabled={!isInRoute}
          >
            {uiText.routes.removal.removeFromRoute}
          </button>
          <button
            type="button"
            className="button button--ghost"
            onClick={onRemoveFromSaved}
            disabled={!isSaved}
          >
            {uiText.routes.removal.removeFromSaved}
          </button>
          <button type="button" className="button button--ghost" onClick={onCancel}>
            {uiText.routes.removal.cancel}
          </button>
        </div>
      </div>
    </div>
  )
}

function FoodNearbyModal({
  anchorProspect,
  radiusMiles,
  activeChip,
  isLoading,
  error,
  results,
  savedAsFoodStopIds,
  onChangeRadius,
  onSelectChip,
  onNavigate,
  onSaveAsFoodStop,
  onBack,
  onClose,
}: {
  anchorProspect: Prospect
  radiusMiles: FoodRadiusMiles
  activeChip: FoodQuickChip | null
  isLoading: boolean
  error: string | null
  results: Prospect[]
  savedAsFoodStopIds: Set<string>
  onChangeRadius: (miles: FoodRadiusMiles) => void
  onSelectChip: (chip: FoodQuickChip | null) => void
  onNavigate: (prospect: Prospect) => void
  onSaveAsFoodStop: (prospectId: string) => void
  onBack: () => void
  onClose: () => void
}) {
  return (
    <div className="food-nearby-modal" role="dialog" aria-modal="true" aria-labelledby="food-nearby-title">
      <button
        type="button"
        className="food-nearby-modal__backdrop"
        aria-label={uiText.foodNearby.closeAriaLabel}
        onClick={onClose}
      />

      <div className="food-nearby-modal__panel">
        <header className="food-nearby-modal__header">
          <button type="button" className="button button--ghost food-nearby-modal__back" onClick={onBack}>
            <ArrowLeft size={18} />
            {uiText.foodNearby.backToProspect}
          </button>
          <div className="food-nearby-modal__title-wrap">
            <div className="eyebrow eyebrow--tight">{uiText.foodNearby.eyebrow}</div>
            <h2 id="food-nearby-title">{uiText.foodNearby.heading(anchorProspect.businessName)}</h2>
          </div>
          <button
            type="button"
            className="icon-button food-nearby-modal__close"
            onClick={onClose}
            aria-label={uiText.foodNearby.closeAriaLabel}
          >
            <X size={18} />
          </button>
        </header>

        <div className="food-nearby-modal__body">
          <p className="section-copy food-nearby-modal__description">{uiText.foodNearby.description}</p>

        <div className="field-group">
          <span className="field-label">{uiText.foodNearby.radiusLabel}</span>
          <div className="chip-row chip-row--tight">
            {FOOD_RADIUS_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`chip ${radiusMiles === option ? 'chip--active' : ''}`}
                onClick={() => onChangeRadius(option)}
              >
                {uiText.foodNearby.radiusOption(option)}
              </button>
            ))}
          </div>
        </div>

        <div className="field-group">
          <span className="field-label">{uiText.foodNearby.quickFiltersLabel}</span>
          <div className="chip-row chip-row--tight">
            <button
              type="button"
              className={`chip ${activeChip === null ? 'chip--active' : ''}`}
              onClick={() => onSelectChip(null)}
            >
              {uiText.foodNearby.quickFilterAll}
            </button>
            {FOOD_QUICK_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                className={`chip ${activeChip === chip ? 'chip--active' : ''}`}
                onClick={() => onSelectChip(chip)}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="status-banner status-banner--info">
            <p>{uiText.foodNearby.loading}</p>
          </div>
        ) : null}

        {error ? (
          <div className="status-banner status-banner--error">
            <p>{error}</p>
          </div>
        ) : null}

        {results.length === 0 && !isLoading && !error ? (
          <div className="status-banner status-banner--info">
            <p>{uiText.foodNearby.empty}</p>
          </div>
        ) : null}

        <div className="food-results-stack">
          {results.map((result) => {
            const websiteHref = normalizeWebsiteUrl(result.website)
            const hasPhone = result.phone !== 'Phone unavailable'
            const alreadySaved = savedAsFoodStopIds.has(result.id)

            return (
              <article key={result.id} className="food-result-card">
                <div className="food-result-card__top">
                  <div>
                    <div className="eyebrow eyebrow--tight">{uiText.foodNearby.resultBadge}</div>
                    <h3>{result.businessName}</h3>
                    <p>{result.category}</p>
                  </div>
                  <div className="food-result-card__meta">
                    <span className="meta-pill">{uiText.foodNearby.distanceAway(formatDistance(result.distance))}</span>
                    {result.rating !== null ? (
                      <span className="meta-pill">{result.rating.toFixed(1)} stars</span>
                    ) : null}
                  </div>
                </div>

                <div className="food-result-card__details">
                  <p>{result.address}</p>
                  {hasPhone ? <p>{result.phone}</p> : null}
                  {websiteHref ? (
                    <a href={websiteHref} target="_blank" rel="noreferrer">
                      {result.website}
                    </a>
                  ) : null}
                </div>

                <div className="food-result-card__actions">
                  <button type="button" className="button button--ghost" onClick={() => onNavigate(result)}>
                    <Navigation size={16} />
                    {uiText.foodNearby.navigate}
                  </button>
                  <button
                    type="button"
                    className={`button ${alreadySaved ? 'button--secondary' : ''}`}
                    onClick={() => onSaveAsFoodStop(result.id)}
                    disabled={alreadySaved}
                  >
                    {alreadySaved ? uiText.foodNearby.savedAsFoodStop : uiText.foodNearby.saveAsFoodStop}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
        </div>

        <div className="food-nearby-modal__footer">
          <button type="button" className="button button--ghost button--wide" onClick={onClose}>
            {uiText.foodNearby.closeFoodNearby}
          </button>
        </div>
      </div>
    </div>
  )
}

function InvalidStopsPanel({
  invalidStops,
  onRemoveStop,
  onEditAddress,
  onRemoveInvalidAndRecalculate,
  onDismiss,
}: {
  invalidStops: Array<{
    prospect: Prospect
    missing: Array<'address' | 'coordinates' | 'placeId'>
  }>
  onRemoveStop: (prospectId: string) => void
  onEditAddress: (prospectId: string) => void
  onRemoveInvalidAndRecalculate: () => void
  onDismiss: () => void
}) {
  return (
    <section className="panel section-panel invalid-stops-panel">
      <div className="section-heading">
        <div>
          <div className="eyebrow eyebrow--tight">{uiText.routes.invalidStops.eyebrow}</div>
          <h2>{uiText.routes.invalidStops.heading}</h2>
        </div>
        <button type="button" className="text-button" onClick={onDismiss}>
          {uiText.routes.invalidStops.cancel}
        </button>
      </div>
      <p className="section-copy">{uiText.routes.invalidStops.description}</p>

      <div className="invalid-stop-stack">
        {invalidStops.map(({ prospect, missing }) => (
          <article key={prospect.id} className="invalid-stop-card">
            <div className="invalid-stop-card__top">
              <div>
                <strong>{prospect.businessName}</strong>
                <p className="section-copy">{prospect.address || 'Address unavailable'}</p>
              </div>
              <div className="invalid-stop-card__reasons">
                {missing.map((reason) => (
                  <span key={reason} className="meta-pill meta-pill--hot">
                    {reason === 'address'
                      ? uiText.routes.invalidStops.missingAddress
                      : reason === 'coordinates'
                        ? uiText.routes.invalidStops.missingCoordinates
                        : uiText.routes.invalidStops.missingPlaceId}
                  </span>
                ))}
              </div>
            </div>

            <div className="button-row">
              <button
                type="button"
                className="button button--ghost"
                onClick={() => onEditAddress(prospect.id)}
              >
                {uiText.routes.invalidStops.editAddress}
              </button>
              <button
                type="button"
                className="button button--danger-outline"
                onClick={() => onRemoveStop(prospect.id)}
              >
                {uiText.routes.invalidStops.removeStop}
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="button-row" style={{ marginTop: 12 }}>
        <button type="button" className="button button--wide" onClick={onRemoveInvalidAndRecalculate}>
          {uiText.routes.invalidStops.removeAndRecalculate}
        </button>
      </div>
    </section>
  )
}

function EditAddressSheet({
  prospect,
  onSave,
  onCancel,
}: {
  prospect: Prospect
  onSave: (nextAddress: string) => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(prospect.address)

  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-address-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-sheet__handle" aria-hidden="true" />
        <div className="eyebrow eyebrow--tight">{uiText.routes.invalidStops.eyebrow}</div>
        <h2 id="edit-address-title">{uiText.routes.invalidStops.editAddress}</h2>
        <p className="section-copy">{prospect.businessName}</p>

        <label className="field-group">
          <span className="field-label">{uiText.routes.invalidStops.addressLabel}</span>
          <input
            className="text-input"
            type="text"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={uiText.routes.invalidStops.addressPlaceholder}
          />
        </label>

        <div className="modal-sheet__actions">
          <button type="button" className="button" onClick={() => onSave(value)}>
            {uiText.routes.invalidStops.saveAddress}
          </button>
          <button type="button" className="button button--ghost" onClick={onCancel}>
            {uiText.routes.invalidStops.cancel}
          </button>
        </div>
      </div>
    </div>
  )
}

function CurrentStopCard({
  prospect,
  isOnLocation,
  distanceFeet,
  trackingMessage,
  isSaved,
  isInRoute,
  travelMode,
  onNavigate,
  onOpenSaved,
  onFindFoodNearby,
  onRequestRemove,
  onToggleCompleted,
  onToggleSaved,
  onToggleRoute,
  onUpdateContactDetails,
  onUpdateNotes,
  onUpdateVisitNote,
  onUpdateFollowUp,
  onUpdatePriority,
  onUpdateOutcome,
  cardPreviewUrl,
  onRemoveBusinessCard,
  onRouteBusinessCardCapture,
}: {
  prospect: Prospect
  isOnLocation: boolean
  distanceFeet: number | null
  trackingMessage: string
  isSaved: boolean
  isInRoute: boolean
  travelMode: TravelMode
  onNavigate: (prospect: Prospect) => void
  onOpenSaved: (prospectId: string) => void
  onFindFoodNearby: (prospectId: string) => void
  onRequestRemove: (prospectId: string) => void
  onToggleCompleted: (prospectId: string) => void
  onToggleSaved: (prospectId: string) => void
  onToggleRoute: (prospectId: string) => void
  onUpdateContactDetails: (
    prospectId: string,
    fields: Partial<
      Pick<ProspectRecord, 'contactName' | 'contactTitle' | 'contactEmail' | 'contactPhone' | 'contactWebsite'>
    >,
  ) => void
  onUpdateNotes: (prospectId: string, notes: string) => void
  onUpdateVisitNote: (prospectId: string, note: string) => void
  onUpdateFollowUp: (prospectId: string, followUpDate: string, followUpTime?: string, confirmSave?: boolean) => void
  onUpdatePriority: (prospectId: string, priority: AssignedPriority) => void
  onUpdateOutcome: (prospectId: string, outcome: OutcomeTag | '') => void
  cardPreviewUrl: string | null
  onRemoveBusinessCard: (prospectId: string) => void
  onRouteBusinessCardCapture: (file: File) => void
}) {
  const [openPanels, setOpenPanels] = useState({
    contact: true,
    visit: true,
    followUp: true,
    priority: false,
    outcome: true,
  })
  const websiteHref = normalizeWebsiteUrl(prospect.website)
  const callHref = createCallHref(prospect.phone)

  function togglePanel(panel: keyof typeof openPanels) {
    setOpenPanels((current) => ({
      ...current,
      [panel]: !current[panel],
    }))
  }

  return (
    <section
      className={`panel section-panel current-stop-card ${
        isOnLocation ? 'current-stop-card--on-location' : ''
      }`}
    >
      <div className="section-heading">
        <div>
          <div className="eyebrow eyebrow--tight">{uiText.routes.currentStop.eyebrow}</div>
          <h2>{uiText.routes.currentStop.heading}</h2>
        </div>
        <span className="meta-pill meta-pill--accent">
          {isOnLocation ? uiText.routes.currentStop.onLocation : uiText.routes.currentStop.enRoute}
        </span>
      </div>

      <div
        className={`status-banner ${
          isOnLocation ? 'status-banner--success' : 'status-banner--info'
        }`}
      >
        <p>{trackingMessage}</p>
        {distanceFeet !== null ? (
          <p>{uiText.routes.currentStop.distanceAway(formatDistanceFeet(distanceFeet))}</p>
        ) : null}
      </div>

      <div className="current-stop-card__summary">
        <div>
          <h3>{prospect.businessName}</h3>
          <p>
            {prospect.category} · {prospect.address}
          </p>
        </div>
        <div className="route-stop-card__meta">
          <span className={`meta-pill meta-pill--${getPriorityTone(prospect.priority)}`}>
            {prospect.priority}
          </span>
        {prospect.isFoodStop ? (
          <span className="meta-pill meta-pill--accent">{uiText.foodNearby.foodStopLabel}</span>
        ) : null}
          {prospect.routeCompleted ? <span className="meta-pill">{uiText.routes.completed}</span> : null}
          {prospect.visitCompletedAt ? (
            <span className="meta-pill">{formatDateTime(prospect.visitCompletedAt)}</span>
          ) : null}
        </div>
      </div>

      <ProspectPrimaryActions
        callHref={callHref}
        onNavigate={() => onNavigate(prospect)}
        navigateLabel={
          travelMode === 'walking'
            ? uiText.routes.actions.navigateWalk
            : uiText.routes.actions.navigateDrive
        }
        isInRoute={isInRoute}
        onToggleRoute={() => onToggleRoute(prospect.id)}
        addRouteLabel={uiText.search.card.addToRoute}
        removeRouteLabel={uiText.search.card.removeRoute}
        showMarkCompleted
        routeCompleted={Boolean(prospect.routeCompleted)}
        onToggleCompleted={() => onToggleCompleted(prospect.id)}
      />

      <BusinessCardPreviewStrip
        prospectId={prospect.id}
        previewUrl={cardPreviewUrl}
        onCapture={onRouteBusinessCardCapture}
        onRemoveCard={() => onRemoveBusinessCard(prospect.id)}
      />

      <CardMoreActions>
        {websiteHref ? (
          <CardMoreMenuLink href={websiteHref}>
            <ExternalLink size={16} />
            {uiText.routes.actions.openWebsite}
          </CardMoreMenuLink>
        ) : null}
        <CardMoreMenuButton onClick={() => onFindFoodNearby(prospect.id)}>
          <UtensilsCrossed size={16} />
          {uiText.foodNearby.findFoodNearby}
        </CardMoreMenuButton>
        <BusinessCardScanButton
          className="card-more__action"
          onFileSelected={onRouteBusinessCardCapture}
        />
        <CardMoreMenuButton onClick={() => (isSaved ? onOpenSaved(prospect.id) : onToggleSaved(prospect.id))}>
          <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} />
          {isSaved
            ? uiText.routes.currentStop.quickActions.openSaved
            : uiText.routes.currentStop.quickActions.saveProspect}
        </CardMoreMenuButton>
        <CardMoreMenuButton onClick={() => togglePanel('contact')}>
          {uiText.routes.currentStop.quickActions.editContactInfo}
        </CardMoreMenuButton>
        <CardMoreMenuButton onClick={() => togglePanel('visit')}>
          {uiText.routes.currentStop.quickActions.addVisitNotes}
        </CardMoreMenuButton>
        <CardMoreMenuButton onClick={() => togglePanel('followUp')}>
          {uiText.routes.currentStop.quickActions.setFollowUp}
        </CardMoreMenuButton>
        <CardMoreMenuButton onClick={() => togglePanel('priority')}>
          {uiText.routes.currentStop.quickActions.changePriority}
        </CardMoreMenuButton>
        <CardMoreMenuButton onClick={() => togglePanel('outcome')}>
          {uiText.routes.currentStop.quickActions.addOutcomeTag}
        </CardMoreMenuButton>
        {prospect.routeCompleted ? (
          <CardMoreMenuButton onClick={() => onToggleCompleted(prospect.id)}>
            {uiText.routes.currentStop.quickActions.markIncomplete}
          </CardMoreMenuButton>
        ) : null}
        <CardMoreMenuButton onClick={() => onRequestRemove(prospect.id)}>
          {uiText.routes.actions.removeProspect}
        </CardMoreMenuButton>
      </CardMoreActions>

      {openPanels.contact ? (
        <div className="current-stop-card__panel">
          <BusinessCardSection
            prospectId={prospect.id}
            previewUrl={cardPreviewUrl}
            contact={{
              contactName: prospect.contactName,
              contactTitle: prospect.contactTitle,
              contactPhone: prospect.phone,
              contactEmail: prospect.contactEmail,
            }}
            onCapture={onRouteBusinessCardCapture}
            onRemoveCard={() => onRemoveBusinessCard(prospect.id)}
            onUpdateContact={(fields) => onUpdateContactDetails(prospect.id, fields)}
            showScanButton={false}
          />
          <div className="field-group">
            <span className="field-label">{uiText.routes.currentStop.contactFields.website}</span>
            <input
              className="text-input"
              type="url"
              value={prospect.website}
              onChange={(event) =>
                onUpdateContactDetails(prospect.id, { contactWebsite: event.target.value })
              }
            />
          </div>
          <label className="field-group">
            <span className="field-label">{uiText.routes.currentStop.contactFields.notes}</span>
            <textarea
              className="text-area text-area--compact"
              rows={3}
              value={prospect.notes}
              onChange={(event) => onUpdateNotes(prospect.id, event.target.value)}
            />
          </label>
        </div>
      ) : null}

      {openPanels.visit ? (
        <label className="field-group current-stop-card__panel">
          <span className="field-label">{uiText.routes.quickNoteLabel}</span>
          <textarea
            className="text-area text-area--compact"
            rows={4}
            value={prospect.visitNote}
            onChange={(event) => onUpdateVisitNote(prospect.id, event.target.value)}
            placeholder={uiText.routes.quickNotePlaceholder}
          />
        </label>
      ) : null}

      {openPanels.followUp ? (
        <div className="field-group current-stop-card__panel">
          <div className="field-header">
            <span className="field-label">{uiText.search.prospectCard.followUpDate}</span>
            {prospect.followUpDate ? (
              <button
                type="button"
                className="text-button"
                onClick={() => onUpdateFollowUp(prospect.id, '')}
              >
                {uiText.search.prospectCard.clear}
              </button>
            ) : null}
          </div>
          <input
            className="text-input"
            type="date"
            value={prospect.followUpDate}
            onChange={(event) => onUpdateFollowUp(prospect.id, event.target.value, prospect.followUpTime)}
          />
          <div className="field-group">
            <span className="field-label">{uiText.followUps.timeLabel}</span>
            <input
              className="text-input"
              type="time"
              value={prospect.followUpTime}
              disabled={!prospect.followUpDate}
              onChange={(event) =>
                onUpdateFollowUp(prospect.id, prospect.followUpDate, event.target.value)
              }
            />
          </div>
          <button
            type="button"
            className="button button--ghost"
            disabled={!prospect.followUpDate}
            onClick={() =>
              onUpdateFollowUp(prospect.id, prospect.followUpDate, prospect.followUpTime, true)
            }
          >
            {uiText.followUps.saveFollowUp}
          </button>
        </div>
      ) : null}

      {openPanels.priority ? (
        <div className="field-group current-stop-card__panel">
          <span className="field-label">{uiText.search.prospectCard.priority}</span>
          <div className="segment-row">
            {ASSIGNED_PRIORITY_OPTIONS.map((option) => (
              <button
                type="button"
                key={option}
                className={`segment ${prospect.priority === option ? 'segment--active' : ''}`}
                onClick={() => onUpdatePriority(prospect.id, option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {openPanels.outcome ? (
        <div className="field-group current-stop-card__panel">
          <span className="field-label">{uiText.routes.visitOutcomeLabel}</span>
          <div className="route-outcome-grid">
            {ROUTE_OUTCOME_OPTIONS.map((option) => (
              <button
                type="button"
                key={option}
                className={`route-outcome-chip ${
                  prospect.visitOutcome === option ? 'route-outcome-chip--active' : ''
                }`}
                onClick={() =>
                  onUpdateOutcome(prospect.id, prospect.visitOutcome === option ? '' : option)
                }
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}

function RouteWorkflowStopCard({
  index,
  prospect,
  isCurrentStop,
  isOnLocation,
  isSaved,
  travelMode,
  onNavigate,
  onOpenSaved,
  onFindFoodNearby,
  onToggleCompleted,
  onToggleSaved,
  onToggleRoute,
  onUpdatePriority,
  onUpdateVisitNote,
  onUpdateOutcome,
  onRemove,
  cardPreviewUrl,
  onRemoveBusinessCard,
  onRouteBusinessCardCapture,
  onUpdateContactDetails,
}: {
  index: number
  prospect: Prospect
  isCurrentStop: boolean
  isOnLocation: boolean
  isSaved: boolean
  travelMode: TravelMode
  onNavigate: (prospect: Prospect) => void
  onOpenSaved: (prospectId: string) => void
  onFindFoodNearby: (prospectId: string) => void
  onToggleCompleted: (prospectId: string) => void
  onToggleSaved: (prospectId: string) => void
  onToggleRoute: (prospectId: string) => void
  onUpdatePriority: (prospectId: string, priority: AssignedPriority) => void
  onUpdateVisitNote: (prospectId: string, note: string) => void
  onUpdateOutcome: (prospectId: string, outcome: OutcomeTag | '') => void
  onRemove: (prospectId: string) => void
  cardPreviewUrl: string | null
  onRemoveBusinessCard: (prospectId: string) => void
  onRouteBusinessCardCapture: (file: File) => void
  onUpdateContactDetails: (
    prospectId: string,
    fields: Partial<
      Pick<ProspectRecord, 'contactName' | 'contactTitle' | 'contactEmail' | 'contactPhone' | 'contactWebsite'>
    >,
  ) => void
}) {
  const [openPanels, setOpenPanels] = useState({
    contact: false,
    visit: false,
    priority: false,
    outcome: false,
  })
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  function togglePanel(panel: keyof typeof openPanels) {
    setOpenPanels((current) => ({
      ...current,
      [panel]: !current[panel],
    }))
  }
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: prospect.id })
  const callHref = createCallHref(prospect.phone)
  const websiteHref = normalizeWebsiteUrl(prospect.website)

  function handleTouchStart(event: TouchEvent<HTMLElement>) {
    const touch = event.touches[0]

    if (!touch) {
      return
    }

    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    }
  }

  function handleTouchEnd(event: TouchEvent<HTMLElement>) {
    const start = touchStartRef.current
    const touch = event.changedTouches[0]
    touchStartRef.current = null

    if (!start || !touch) {
      return
    }

    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y

    if (deltaX <= -72 && Math.abs(deltaX) > Math.abs(deltaY) + 18) {
      onRemove(prospect.id)
    }
  }

  return (
    <article
      ref={setNodeRef}
      className={`route-stop-card ${prospect.routeCompleted ? 'route-stop-card--completed' : ''} ${
        isDragging ? 'route-stop-card--dragging' : ''
      } ${isCurrentStop ? 'route-stop-card--current' : ''} ${
        isOnLocation ? 'route-stop-card--on-location' : ''
      }`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="route-stop-card__top">
        <div className="route-stop-card__heading">
          <div className="route-stop-card__title-block">
            <div className="route-stop-card__eyebrow">{uiText.routes.stopLabel(index)}</div>
            <h3>{prospect.businessName}</h3>
            <p>
              {prospect.category} · {formatDistance(prospect.distance)}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="drag-handle"
          aria-label={uiText.routes.reorderStopAria}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={20} />
        </button>
      </div>

      <div className="route-stop-card__meta">
        {isOnLocation ? (
          <span className="meta-pill meta-pill--accent">{uiText.routes.currentStop.onLocation}</span>
        ) : null}
        {!isOnLocation && isCurrentStop ? (
          <span className="meta-pill">{uiText.routes.currentStop.label}</span>
        ) : null}
        <span className={`meta-pill meta-pill--${getPriorityTone(prospect.priority)}`}>
          {prospect.priority}
        </span>
        {prospect.visitOutcome ? (
          <span className="meta-pill meta-pill--accent">{prospect.visitOutcome}</span>
        ) : null}
        {prospect.isFoodStop ? (
          <span className="meta-pill meta-pill--accent">{uiText.foodNearby.foodStopLabel}</span>
        ) : null}
        {prospect.routeCompleted ? <span className="meta-pill">{uiText.routes.completed}</span> : null}
      </div>

      <ProspectPrimaryActions
        callHref={callHref}
        onNavigate={() => onNavigate(prospect)}
        navigateLabel={
          travelMode === 'walking'
            ? uiText.routes.actions.navigateWalk
            : uiText.routes.actions.navigateDrive
        }
        isInRoute
        onToggleRoute={() => onToggleRoute(prospect.id)}
        addRouteLabel={uiText.search.card.addToRoute}
        removeRouteLabel={uiText.search.card.removeRoute}
        showMarkCompleted
        routeCompleted={Boolean(prospect.routeCompleted)}
        onToggleCompleted={() => onToggleCompleted(prospect.id)}
      />

      <BusinessCardPreviewStrip
        prospectId={prospect.id}
        previewUrl={cardPreviewUrl}
        onCapture={onRouteBusinessCardCapture}
        onRemoveCard={() => onRemoveBusinessCard(prospect.id)}
      />

      <p className="route-stop-card__address">{prospect.address}</p>

      <CardMoreActions>
        {websiteHref ? (
          <CardMoreMenuLink href={websiteHref}>
            <ExternalLink size={16} />
            {uiText.routes.actions.openWebsite}
          </CardMoreMenuLink>
        ) : null}
        <CardMoreMenuButton onClick={() => onFindFoodNearby(prospect.id)}>
          <UtensilsCrossed size={16} />
          {uiText.foodNearby.findFoodNearby}
        </CardMoreMenuButton>
        <BusinessCardScanButton
          className="card-more__action"
          onFileSelected={onRouteBusinessCardCapture}
        />
        <CardMoreMenuButton onClick={() => (isSaved ? onOpenSaved(prospect.id) : onToggleSaved(prospect.id))}>
          <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} />
          {isSaved ? uiText.routes.actions.openSaved : uiText.routes.actions.saveProspect}
        </CardMoreMenuButton>
        <CardMoreMenuButton onClick={() => togglePanel('contact')}>
          {uiText.routes.currentStop.quickActions.editContactInfo}
        </CardMoreMenuButton>
        <CardMoreMenuButton onClick={() => togglePanel('visit')}>
          {uiText.routes.currentStop.quickActions.addVisitNotes}
        </CardMoreMenuButton>
        <CardMoreMenuButton onClick={() => togglePanel('priority')}>
          {uiText.routes.currentStop.quickActions.changePriority}
        </CardMoreMenuButton>
        <CardMoreMenuButton onClick={() => togglePanel('outcome')}>
          {uiText.routes.currentStop.quickActions.addOutcomeTag}
        </CardMoreMenuButton>
        {prospect.routeCompleted ? (
          <CardMoreMenuButton onClick={() => onToggleCompleted(prospect.id)}>
            {uiText.routes.currentStop.quickActions.markIncomplete}
          </CardMoreMenuButton>
        ) : null}
        <CardMoreMenuButton onClick={() => onRemove(prospect.id)}>
          {uiText.routes.actions.removeProspect}
        </CardMoreMenuButton>
        {openPanels.contact ? (
          <BusinessCardSection
            prospectId={prospect.id}
            previewUrl={cardPreviewUrl}
            contact={{
              contactName: prospect.contactName,
              contactTitle: prospect.contactTitle,
              contactPhone: prospect.phone,
              contactEmail: prospect.contactEmail,
            }}
            onCapture={onRouteBusinessCardCapture}
            onRemoveCard={() => onRemoveBusinessCard(prospect.id)}
            onUpdateContact={(fields) => onUpdateContactDetails(prospect.id, fields)}
            showScanButton={false}
          />
        ) : null}
        {openPanels.visit ? (
          <label className="field-group">
            <span className="field-label">{uiText.routes.quickNoteLabel}</span>
            <textarea
              className="text-area text-area--compact"
              rows={3}
              value={prospect.visitNote}
              onChange={(event) => onUpdateVisitNote(prospect.id, event.target.value)}
              placeholder={uiText.routes.quickNotePlaceholder}
            />
          </label>
        ) : null}
        {openPanels.priority ? (
          <div className="field-group">
            <span className="field-label">{uiText.search.prospectCard.priority}</span>
            <div className="segment-row">
              {ASSIGNED_PRIORITY_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option}
                  className={`segment ${prospect.priority === option ? 'segment--active' : ''}`}
                  onClick={() => onUpdatePriority(prospect.id, option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {openPanels.outcome ? (
          <div className="field-group">
            <span className="field-label">{uiText.routes.visitOutcomeLabel}</span>
            <div className="route-outcome-grid">
              {ROUTE_OUTCOME_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option}
                  className={`route-outcome-chip ${
                    prospect.visitOutcome === option ? 'route-outcome-chip--active' : ''
                  }`}
                  onClick={() =>
                    onUpdateOutcome(prospect.id, prospect.visitOutcome === option ? '' : option)
                  }
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </CardMoreActions>
    </article>
  )
}

// (OptimizeRouteSheet removed — starting location is now a persistent field on Today’s Route.)

function LiveSearchResultCard({
  prospect,
  isSaved,
  isInRoute,
  travelMode,
  onNavigate,
  onOpenSaved,
  onFindFoodNearby,
  onUpdatePriority,
  onRequestRemove,
  onToggleSaved,
  onToggleRoute,
  onToggleCompleted,
}: {
  prospect: Prospect
  isSaved: boolean
  isInRoute: boolean
  travelMode: TravelMode
  onNavigate: (prospect: Prospect) => void
  onOpenSaved: (prospectId: string) => void
  onFindFoodNearby: (prospectId: string) => void
  onUpdatePriority: (prospectId: string, priority: AssignedPriority) => void
  onRequestRemove: (prospectId: string) => void
  onToggleSaved: (prospectId: string) => void
  onToggleRoute: (prospectId: string) => void
  onToggleCompleted: (prospectId: string) => void
}) {
  const callHref = createCallHref(prospect.phone)
  const websiteHref = normalizeWebsiteUrl(prospect.website)
  const [priorityOpen, setPriorityOpen] = useState(false)

  return (
    <article className="live-result-card">
      <div className="live-result-card__header">
        <div>
          <h3>{prospect.businessName}</h3>
          <p>
            {prospect.category} · {formatDistance(prospect.distance)}
          </p>
        </div>
        <span className={`meta-pill meta-pill--${getPriorityTone(prospect.priority)}`}>
          {prospect.priority}
        </span>
      </div>

      <p className="live-result-card__address">{prospect.address}</p>

      <ProspectPrimaryActions
        callHref={callHref}
        onNavigate={() => onNavigate(prospect)}
        navigateLabel={
          travelMode === 'walking' ? uiText.search.card.navigateWalk : uiText.search.card.navigateDrive
        }
        isInRoute={isInRoute}
        onToggleRoute={() => onToggleRoute(prospect.id)}
        addRouteLabel={uiText.search.card.addToRoute}
        removeRouteLabel={uiText.search.card.removeRoute}
        showMarkCompleted={isInRoute}
        routeCompleted={Boolean(prospect.routeCompleted)}
        onToggleCompleted={() => onToggleCompleted(prospect.id)}
      />

      <CardMoreActions>
        {websiteHref ? (
          <CardMoreMenuLink href={websiteHref}>
            <ExternalLink size={16} />
            {uiText.routes.actions.openWebsite}
          </CardMoreMenuLink>
        ) : null}
        <CardMoreMenuButton onClick={() => onFindFoodNearby(prospect.id)}>
          <UtensilsCrossed size={16} />
          {uiText.foodNearby.findFoodNearby}
        </CardMoreMenuButton>
        <CardMoreMenuButton onClick={() => (isSaved ? onOpenSaved(prospect.id) : onToggleSaved(prospect.id))}>
          <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} />
          {isSaved ? uiText.search.card.saved : uiText.search.card.save}
        </CardMoreMenuButton>
        <CardMoreMenuButton onClick={() => setPriorityOpen((current) => !current)}>
          {uiText.routes.currentStop.quickActions.changePriority}
        </CardMoreMenuButton>
        {isInRoute && prospect.routeCompleted ? (
          <CardMoreMenuButton onClick={() => onToggleCompleted(prospect.id)}>
            {uiText.routes.currentStop.quickActions.markIncomplete}
          </CardMoreMenuButton>
        ) : null}
        {isInRoute || isSaved ? (
          <CardMoreMenuButton onClick={() => onRequestRemove(prospect.id)}>
            {uiText.search.card.removeProspect}
          </CardMoreMenuButton>
        ) : null}
        {priorityOpen ? (
          <div className="field-group">
            <span className="field-label">{uiText.search.prospectCard.priority}</span>
            <div className="segment-row">
              {ASSIGNED_PRIORITY_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option}
                  className={`segment ${prospect.priority === option ? 'segment--active' : ''}`}
                  onClick={() => onUpdatePriority(prospect.id, option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </CardMoreActions>
    </article>
  )
}

function ProspectCard({
  prospect,
  isInRoute,
  isExpanded,
  travelMode,
  onNavigate,
  onFindFoodNearby,
  onRequestRemove,
  onToggleRoute,
  onToggleCompleted,
  onToggleExpanded,
  onUpdateNotes,
  onUpdatePriority,
}: {
  prospect: Prospect
  isInRoute: boolean
  isExpanded: boolean
  travelMode: TravelMode
  onNavigate: (prospect: Prospect) => void
  onFindFoodNearby: (prospectId: string) => void
  onRequestRemove: (prospectId: string) => void
  onToggleRoute: (prospectId: string) => void
  onToggleCompleted: (prospectId: string) => void
  onToggleExpanded: (prospectId: string) => void
  onUpdateNotes: (prospectId: string, notes: string) => void
  onUpdatePriority: (prospectId: string, priority: AssignedPriority) => void
}) {
  const callHref = createCallHref(prospect.phone)
  const websiteHref = normalizeWebsiteUrl(prospect.website)
  const [priorityOpen, setPriorityOpen] = useState(false)
  const notesPreview = prospect.notes.trim()

  return (
    <article className="prospect-card">
      <div className="prospect-card__header">
        <div>
          <h3>{prospect.businessName}</h3>
          <p className="prospect-card__city">
            {prospect.category} · {prospect.city}
          </p>
        </div>
        <span className={`meta-pill meta-pill--${getPriorityTone(prospect.priority)}`}>
          {prospect.priority}
        </span>
      </div>

      {notesPreview ? <p className="prospect-card__notes prospect-card__notes--preview">{notesPreview}</p> : null}

      <ProspectPrimaryActions
        callHref={callHref}
        onNavigate={() => onNavigate(prospect)}
        navigateLabel={
          travelMode === 'walking' ? uiText.search.card.navigateWalk : uiText.search.card.navigateDrive
        }
        isInRoute={isInRoute}
        onToggleRoute={() => onToggleRoute(prospect.id)}
        addRouteLabel={uiText.search.card.addToRoute}
        removeRouteLabel={uiText.search.card.removeRoute}
        showMarkCompleted={isInRoute}
        routeCompleted={Boolean(prospect.routeCompleted)}
        onToggleCompleted={() => onToggleCompleted(prospect.id)}
      />

      <CardMoreActions>
        {websiteHref ? (
          <CardMoreMenuLink href={websiteHref}>
            <ExternalLink size={16} />
            {uiText.routes.actions.openWebsite}
          </CardMoreMenuLink>
        ) : null}
        <CardMoreMenuButton onClick={() => onFindFoodNearby(prospect.id)}>
          <UtensilsCrossed size={16} />
          {uiText.foodNearby.findFoodNearby}
        </CardMoreMenuButton>
        <CardMoreMenuButton onClick={() => onToggleExpanded(prospect.id)}>
          {isExpanded ? uiText.search.prospectCard.hide : uiText.routes.currentStop.quickActions.addVisitNotes}
        </CardMoreMenuButton>
        <CardMoreMenuButton onClick={() => setPriorityOpen((current) => !current)}>
          {uiText.routes.currentStop.quickActions.changePriority}
        </CardMoreMenuButton>
        {isInRoute && prospect.routeCompleted ? (
          <CardMoreMenuButton onClick={() => onToggleCompleted(prospect.id)}>
            {uiText.routes.currentStop.quickActions.markIncomplete}
          </CardMoreMenuButton>
        ) : null}
        <CardMoreMenuButton onClick={() => onRequestRemove(prospect.id)}>
          {uiText.saved.remove}
        </CardMoreMenuButton>
        {priorityOpen ? (
          <div className="field-group">
            <span className="field-label">{uiText.search.prospectCard.priority}</span>
            <div className="segment-row">
              {ASSIGNED_PRIORITY_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option}
                  className={`segment ${prospect.priority === option ? 'segment--active' : ''}`}
                  onClick={() => onUpdatePriority(prospect.id, option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {isExpanded ? (
          <label className="field-group">
            <span className="field-label">{uiText.search.prospectCard.prospectNotes}</span>
            <textarea
              className="text-area"
              rows={4}
              value={prospect.notes}
              onChange={(event) => onUpdateNotes(prospect.id, event.target.value)}
            />
          </label>
        ) : null}
      </CardMoreActions>
    </article>
  )
}

function App() {
  const importFileInputRef = useRef<HTMLInputElement | null>(null)
  const accountMenuRef = useRef<HTMLDivElement | null>(null)
  const pendingSettingsSectionRef = useRef<SettingsSection | null>(null)
  const pendingRouteScrollTargetRef = useRef<PendingRouteScrollTarget | null>(null)
  const settingsTopRef = useRef<HTMLElement | null>(null)
  const notificationSectionRef = useRef<HTMLElement | null>(null)
  const crmExportSectionRef = useRef<HTMLElement | null>(null)
  const backupSectionRef = useRef<HTMLElement | null>(null)
  const routeCalculationSummaryRef = useRef<HTMLElement | null>(null)
  const routeMapSectionRef = useRef<HTMLElement | null>(null)
  const routeNavHistoryPushedRef = useRef(false)
  const routeDirectionsRequestIdRef = useRef(0)
  const optimizeRouteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const routeNavSuppressPopStateRef = useRef(false)
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? ''
  const [activeView, setActiveView] = useState<View>('search')
  const [expandedProspectId, setExpandedProspectId] = useState<string | null>(null)
  const [backupMessage, setBackupMessage] = useState<BackupMessage | null>(null)
  const [crmExportMessage, setCrmExportMessage] = useState<BackupMessage | null>(null)
  const [accountMenuMessage, setAccountMenuMessage] = useState<BackupMessage | null>(null)
  const [actionToast, setActionToast] = useState<ToastMessage | null>(null)
  const [routeActionMessage, setRouteActionMessage] = useState<RouteActionMessage>(null)
  const [routeOptimization, setRouteOptimization] = useState<RouteOptimizationState>({ status: 'idle' })
  const [routeOptimizationDebug, setRouteOptimizationDebug] = useState<RouteOptimizationDebug>(null)
  const [routeStartLocation, setRouteStartLocation] = useState('')
  const [routeNavigationOpen, setRouteNavigationOpen] = useState(false)
  const [routeNavigationDirections, setRouteNavigationDirections] =
    useState<google.maps.DirectionsResult | null>(null)
  const [routeDirectionsApiStatus, setRouteDirectionsApiStatus] = useState<string | null>(null)
  const [routeNavigationLoading, setRouteNavigationLoading] = useState(false)
  const [routeNavigationError, setRouteNavigationError] = useState<string | null>(null)
  const [routeRenderDebug, setRouteRenderDebug] = useState<RouteRenderDebug>(null)
  const [routeLineRenderStatus, setRouteLineRenderStatus] = useState<RouteLineRenderStatus>('idle')
  const [navigationActiveStopId, setNavigationActiveStopId] = useState<string | null>(null)
  const [navigationArrivedStopIds, setNavigationArrivedStopIds] = useState<Record<string, boolean>>({})
  const [foodNearbySession, setFoodNearbySession] = useState<FoodNearbySession | null>(null)
  const [businessCardPreviewUrls, setBusinessCardPreviewUrls] = useState<Record<string, string>>({})
  const [businessCardPendingAttach, setBusinessCardPendingAttach] = useState<{ file: File } | null>(null)
  const [foodNearbyRadiusMiles, setFoodNearbyRadiusMiles] = useState<FoodRadiusMiles>(1)
  const [foodNearbyActiveChip, setFoodNearbyActiveChip] = useState<FoodQuickChip | null>(null)
  const [foodNearbyLoading, setFoodNearbyLoading] = useState(false)
  const [foodNearbyError, setFoodNearbyError] = useState<string | null>(null)
  const [foodNearbyResultIds, setFoodNearbyResultIds] = useState<string[]>([])
  const [notificationMessage, setNotificationMessage] = useState<BackupMessage | null>(null)
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [removeProspectPrompt, setRemoveProspectPrompt] = useState<RemoveProspectPrompt | null>(null)
  const [routeCalculationContext, setRouteCalculationContext] = useState<RouteCalculationContext | null>(
    null,
  )
  const [invalidStopsDismissedForRouteKey, setInvalidStopsDismissedForRouteKey] = useState<string | null>(null)
  const [editAddressProspectId, setEditAddressProspectId] = useState<string | null>(null)
  const [theme, setTheme] = usePersistentState<Theme>(STORAGE_KEYS.theme, 'dark')
  const [liveProspects, setLiveProspects] = usePersistentState<BaseProspect[]>(
    STORAGE_KEYS.liveProspects,
    [],
  )
  const [savedIds, setSavedIds] = usePersistentState<string[]>(STORAGE_KEYS.savedProspects, [])
  const [routeIds, setRouteIds] = usePersistentState<string[]>(STORAGE_KEYS.routeList, [])
  const [prospectRecords, setProspectRecords] = usePersistentState<Record<string, ProspectRecord>>(
    STORAGE_KEYS.prospectRecords,
    {},
  )
  const [followUpEntries, setFollowUpEntries] = usePersistentState<Record<string, FollowUpEntry>>(
    STORAGE_KEYS.followUpEntries,
    {},
  )
  const [editingFollowUpId, setEditingFollowUpId] = useState<string | null>(null)
  const [followUpEditDraft, setFollowUpEditDraft] = useState({
    date: '',
    time: DEFAULT_FOLLOW_UP_TIME,
    notes: '',
  })
  const lastFollowUpSaveRef = useRef<Record<string, { date: string; time: string; at: number }>>({})
  const [notificationPreferences, setNotificationPreferences] =
    usePersistentState<NotificationPreferences>(
      STORAGE_KEYS.notificationPreferences,
      DEFAULT_NOTIFICATION_PREFERENCES,
    )
  const [notificationReminderLog, setNotificationReminderLog] =
    usePersistentState<NotificationReminderLog>(
      STORAGE_KEYS.notificationReminderLog,
      DEFAULT_NOTIFICATION_LOG,
    )
  const [arrivalDetectionRadiusFeet, setArrivalDetectionRadiusFeet] =
    usePersistentState<ArrivalDetectionRadiusFeet>(STORAGE_KEYS.arrivalDetectionRadiusFeet, 300)
  const [manualMarket, setManualMarket] = useState('')
  const [searchRadiusChoice, setSearchRadiusChoice] = useState<SearchRadiusChoice>('current-location')
  const [customRadiusMiles, setCustomRadiusMiles] = useState('35')
  const [selectedIndustries, setSelectedIndustries] = useState<SearchIndustry[]>([])
  const [industryDropdownOpen, setIndustryDropdownOpen] = useState(false)
  const [industrySearchQuery, setIndustrySearchQuery] = useState('')
  const [collapsedIndustryGroups, setCollapsedIndustryGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(SEARCH_INDUSTRY_GROUPS.map((group) => [group.label, false])),
  )
  const [searchLocationState, setSearchLocationState] = useState<SearchLocationState>(() => {
    if (typeof navigator === 'undefined') {
      return 'idle'
    }

    return navigator.geolocation ? 'requesting' : 'unsupported'
  })
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null)
  const [routeTrackerState, setRouteTrackerState] = useState<RouteTrackingState>(() => {
    if (typeof navigator === 'undefined') {
      return 'idle'
    }

    return navigator.geolocation ? 'idle' : 'unsupported'
  })
  const [routeTrackerLocation, setRouteTrackerLocation] = useState<{ lat: number; lng: number } | null>(
    null,
  )
  const [travelMode, setTravelMode] = useState<TravelMode>('driving')
  const [crmExportFormat, setCrmExportFormat] = useState<CrmExportFormat>('generic')
  const [crmExportScope, setCrmExportScope] = useState<CrmExportScope>('all')
  const [liveSearchIds, setLiveSearchIds] = useState<string[]>([])
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false)
  const [searchStatus, setSearchStatus] = useState<SearchStatus | null>(null)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<BrowserNotificationPermission>(
    () => getBrowserNotificationPermission(),
  )
  const [connectionTest, setConnectionTest] = useState<ConnectionTestState>({
    status: 'idle',
    message: uiText.settings.googlePlacesDescription,
  })
  const routeSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  )

  function scrollToSettingsSection(section: SettingsSection) {
    const target =
      section === 'notifications'
        ? notificationSectionRef.current
        : section === 'crm'
        ? crmExportSectionRef.current
        : section === 'backup'
          ? backupSectionRef.current
          : settingsTopRef.current

    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    console.info('[RepRoute] VITE_GOOGLE_MAPS_API_KEY detected:', googleMapsApiKey.length > 0)
  }, [googleMapsApiKey])

  useEffect(() => {
    if (!navigator.geolocation) {
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSearchCenter({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setSearchLocationState('granted')
      },
      () => {
        setSearchCenter(null)
        setSearchLocationState('denied')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      },
    )
  }, [])

  function requestSearchLocationAccess() {
    if (!navigator.geolocation) {
      setSearchCenter(null)
      setSearchLocationState('unsupported')
      return
    }

    setSearchLocationState('requesting')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = { lat: position.coords.latitude, lng: position.coords.longitude }
        setSearchCenter(next)
        setSearchLocationState('granted')

        // Keep route features in sync for this session.
        setRouteTrackerLocation(next)
        setRouteTrackerState('tracking')

        const shouldAutoSearch =
          selectedIndustries.length > 0 && (searchRadiusChoice === 'current-location' || !manualMarket.trim())
        if (shouldAutoSearch) {
          void runLiveSearch({ market: manualMarket, industries: selectedIndustries })
        }
      },
      (error) => {
        setSearchCenter(null)
        setSearchLocationState(error.code === error.PERMISSION_DENIED ? 'denied' : 'unsupported')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    )
  }

  useEffect(() => {
    if (routeIds.length === 0) {
      return
    }

    if (activeView !== 'map' && !routeNavigationOpen) {
      return
    }

    if (!navigator.geolocation) {
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setRouteTrackerLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setRouteTrackerState('tracking')
      },
      (error) => {
        setRouteTrackerState(error.code === error.PERMISSION_DENIED ? 'denied' : 'error')
        setRouteTrackerLocation(null)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      },
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [activeView, routeIds.length, routeNavigationOpen])

  useEffect(() => {
    const syncPermission = () => {
      setNotificationPermission(getBrowserNotificationPermission())
    }

    syncPermission()
    window.addEventListener('focus', syncPermission)

    return () => {
      window.removeEventListener('focus', syncPermission)
    }
  }, [])

  useEffect(() => {
    if (!accountMenuOpen) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setAccountMenuOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [accountMenuOpen])

  useEffect(() => {
    if (activeView !== 'settings' || !pendingSettingsSectionRef.current) {
      return
    }

    scrollToSettingsSection(pendingSettingsSectionRef.current)
    pendingSettingsSectionRef.current = null
  }, [activeView])

  useEffect(() => {
    if (routeIds.length > 0) {
      return
    }

    setRouteCalculationContext(null)
  }, [routeIds.length])

  useEffect(() => {
    if (activeView !== 'map' || !pendingRouteScrollTargetRef.current) {
      return
    }

    const target =
      pendingRouteScrollTargetRef.current === 'summary'
        ? routeCalculationSummaryRef.current ?? routeMapSectionRef.current
        : routeMapSectionRef.current

    if (!target) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      pendingRouteScrollTargetRef.current = null
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [activeView, routeCalculationContext, routeIds.length])

  useEffect(() => {
    if (!actionToast) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setActionToast(null)
    }, 2200)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [actionToast])

  useEffect(() => {
    if (!routeActionMessage) {
      return
    }

    if (routeActionMessage.persistent) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setRouteActionMessage(null)
    }, 4200)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [routeActionMessage])

  useEffect(() => {
    if (!industryDropdownOpen) {
      setIndustrySearchQuery('')
    }
  }, [industryDropdownOpen])

  useEffect(() => {
    if (routeOptimization.status !== 'success') {
      return
    }

    const routeKey = routeIds.join('|')
    if (routeOptimization.forRouteKey !== routeKey) {
      setRouteOptimization({ status: 'idle' })
    }
  }, [routeIds, routeOptimization])

  const effectiveSearchStatus = useMemo<SearchStatus>(
    () =>
      searchStatus ??
      (googleMapsApiKey
        ? {
            source: 'live',
            message: uiText.search.prominentDescription,
          }
        : {
            source: 'api-error',
            message: uiText.errors.connectGooglePlaces,
            details: uiText.errors.connectGooglePlacesDetail,
          }),
    [googleMapsApiKey, searchStatus],
  )
  const crmExportFormats = useMemo(() => getCrmExportFormats(), [])
  const crmExportScopes = useMemo(() => getCrmExportScopes(), [])
  const navigationItems = useMemo<
    Array<{ id: View; label: string; icon: typeof Route; badgeCount?: number }>
  >(
    () => [
      { id: 'search', label: uiText.navigation.items.search, icon: Search },
      { id: 'map', label: uiText.navigation.items.map, icon: MapIcon },
      {
        id: 'saved',
        label: uiText.navigation.items.saved,
        icon: Bookmark,
        badgeCount: savedIds.length,
      },
      {
        id: 'follow-ups',
        label: uiText.navigation.items.followUps,
        icon: CalendarClock,
      },
      { id: 'settings', label: uiText.navigation.items.settings, icon: Settings2 },
    ],
    [savedIds.length],
  )
  const normalizedIndustrySearchQuery = industrySearchQuery.trim().toLowerCase()
  const filteredIndustryGroups = useMemo(
    () =>
      SEARCH_INDUSTRY_GROUPS.map((group) => ({
        ...group,
        options: group.options.filter((industry) =>
          normalizedIndustrySearchQuery
            ? industry.toLowerCase().includes(normalizedIndustrySearchQuery)
            : true,
        ),
      })).filter((group) => group.options.length > 0),
    [normalizedIndustrySearchQuery],
  )

  const liveCatalogProspects = useMemo(
    () =>
      liveProspects.map((prospect) => {
        const record = prospectRecords[prospect.id]
        return {
          ...prospect,
          googlePlaceId: record?.googlePlaceIdOverride ?? prospect.googlePlaceId,
          contactName: record?.contactName ?? prospect.contactName,
          contactTitle: record?.contactTitle ?? prospect.contactTitle,
          contactEmail: record?.contactEmail ?? prospect.contactEmail,
          notes: record?.notes ?? prospect.notes,
          priority: record?.priority ?? prospect.priority,
          lastContact: record?.lastContactDate
            ? formatFollowUpDate(record.lastContactDate)
            : prospect.lastContact,
          phone: record?.contactPhone ?? prospect.phone,
          website: record?.contactWebsite ?? prospect.website,
          address: record?.addressOverride ?? prospect.address,
          location: record?.locationOverride ?? prospect.location,
          lastContactDate: record?.lastContactDate ?? '',
          followUpDate: followUpEntries[prospect.id]?.followUpDate ?? record?.followUpDate ?? '',
          followUpTime:
            followUpEntries[prospect.id]?.followUpTime ??
            record?.followUpTime ??
            DEFAULT_FOLLOW_UP_TIME,
          routeCompleted: record?.routeCompleted ?? false,
          visitNote: record?.visitNote ?? '',
          visitOutcome: record?.visitOutcome ?? '',
          visitCompletedAt: record?.visitCompletedAt ?? '',
          isFoodStop: record?.isFoodStop ?? false,
          editedByRepRouteUser: record?.editedByRepRouteUser ?? false,
          businessCardCapturedAt: record?.businessCardCapturedAt ?? '',
        }
      }),
    [followUpEntries, liveProspects, prospectRecords],
  )

  const prospects = useMemo(() => liveCatalogProspects, [liveCatalogProspects])

  const prospectMap = useMemo(
    () => new globalThis.Map(prospects.map((prospect) => [prospect.id, prospect])),
    [prospects],
  )

  useEffect(() => {
    setFollowUpEntries((current) => {
      const migrated = migrateFollowUpsFromProspectRecords(
        prospectRecords,
        current,
        routeIds,
        savedIds,
        (prospectId) => {
          const prospect = prospectMap.get(prospectId)
          if (prospect) {
            return {
              businessName: prospect.businessName,
              address: prospect.address,
              category: prospect.category,
              city: prospect.city,
              phone: prospect.phone,
              contactName: prospect.contactName,
              contactTitle: prospect.contactTitle,
              contactEmail: prospect.contactEmail,
              notes: prospect.notes,
              priority: prospect.priority,
            }
          }

          const base = liveProspects.find((item) => item.id === prospectId)
          const record = prospectRecords[prospectId]

          if (!base) {
            return null
          }

          return {
            businessName: base.businessName,
            address: record?.addressOverride ?? base.address,
            category: base.category,
            city: base.city,
            phone: record?.contactPhone ?? base.phone,
            contactName: record?.contactName ?? base.contactName,
            contactTitle: record?.contactTitle ?? base.contactTitle,
            contactEmail: record?.contactEmail ?? base.contactEmail,
            notes: record?.notes ?? base.notes,
            priority: record?.priority ?? base.priority,
          }
        },
      )

      const hasNewEntry = Object.keys(migrated).some((key) => !current[key])
      return hasNewEntry ? migrated : current
    })
  }, [liveProspects, prospectMap, prospectRecords, routeIds, savedIds, setFollowUpEntries])

  useEffect(() => {
    setFollowUpEntries((current) => {
      let changed = false
      const next: Record<string, FollowUpEntry> = { ...current }

      for (const [prospectId, entry] of Object.entries(current)) {
        const routeStatus = resolveFollowUpRouteStatus(prospectId, routeIds, savedIds)

        if (entry.routeStatus !== routeStatus) {
          next[prospectId] = {
            ...entry,
            routeStatus,
            updatedAt: new Date().toISOString(),
          }
          changed = true
        }
      }

      return changed ? next : current
    })
  }, [routeIds, savedIds, setFollowUpEntries])

  const promptedProspect = useMemo(
    () => (removeProspectPrompt ? prospectMap.get(removeProspectPrompt.prospectId) ?? null : null),
    [prospectMap, removeProspectPrompt],
  )
  const foodNearbyAnchorProspect = foodNearbySession?.anchor ?? null
  const editAddressProspect = useMemo(
    () => (editAddressProspectId ? prospectMap.get(editAddressProspectId) ?? null : null),
    [editAddressProspectId, prospectMap],
  )
  const foodNearbyResults = useMemo(
    () => foodNearbyResultIds.map((id) => prospectMap.get(id)).filter(Boolean) as Prospect[],
    [foodNearbyResultIds, prospectMap],
  )

  const savedProspects = useMemo(
    () =>
      savedIds
        .map((id) => prospectMap.get(id))
        .filter((prospect): prospect is Prospect => Boolean(prospect)),
    [prospectMap, savedIds],
  )

  const routeProspects = useMemo(
    () =>
      routeIds
        .map((id) => prospectMap.get(id))
        .filter((prospect): prospect is Prospect => Boolean(prospect)),
    [prospectMap, routeIds],
  )
  const routeKey = useMemo(() => routeIds.join('|'), [routeIds])
  const foodStopIds = useMemo(
    () => new Set(routeProspects.filter((prospect) => prospect.isFoodStop).map((prospect) => prospect.id)),
    [routeProspects],
  )
  const invalidStops = useMemo(() => {
    return routeProspects
      .map((prospect) => {
        const missing: Array<'address' | 'coordinates' | 'placeId'> = []

        if (!prospect.address?.trim()) {
          missing.push('address')
        }

        if (!isFiniteLatLng(prospect.location)) {
          missing.push('coordinates')
        }

        if (!prospect.googlePlaceId?.trim()) {
          missing.push('placeId')
        }

        return { prospect, missing }
      })
      .filter((entry) => entry.missing.length > 0)
  }, [routeProspects])
  const showInvalidStopsPanel =
    invalidStops.length > 0 && invalidStopsDismissedForRouteKey !== routeKey
  const validRouteStopCount = routeProspects.length - invalidStops.length

  const liveSearchProspects = useMemo(
    () =>
      liveSearchIds
        .map((id) => prospectMap.get(id))
        .filter((prospect): prospect is Prospect => Boolean(prospect)),
    [liveSearchIds, prospectMap],
  )

  const searchResultProspects = useMemo(() => {
    if (effectiveSearchStatus.source === 'live') {
      return liveSearchProspects
    }

    return []
  }, [effectiveSearchStatus.source, liveSearchProspects])

  const mapMarkers = useMemo<RepRouteMapMarker[]>(() => {
    const filteredIds = new Set(searchResultProspects.map((prospect) => prospect.id))
    const savedSet = new Set(savedIds)
    const routeSet = new Set(routeIds)
    const routeOrderById = new globalThis.Map(routeIds.map((id, index) => [id, index + 1]))

    return prospects
      .filter(
        (prospect) =>
          filteredIds.has(prospect.id) || savedSet.has(prospect.id) || routeSet.has(prospect.id),
      )
      .map((prospect) => {
        const categories: RepRouteMapMarker['categories'] = []

        if (filteredIds.has(prospect.id)) {
          categories.push('search')
        }

        if (savedSet.has(prospect.id)) {
          categories.push('saved')
        }

        if (routeSet.has(prospect.id)) {
          categories.push('route')
        }
        if (routeSet.has(prospect.id) && prospect.isFoodStop) {
          categories.push('food')
        }

        return {
          id: prospect.id,
          businessName: prospect.businessName,
          address: prospect.address,
          phone: prospect.phone,
          website: prospect.website,
          rating: prospect.rating,
          position: prospect.location,
          isSaved: savedSet.has(prospect.id),
          isInRoute: routeSet.has(prospect.id),
          categories,
          routeOrder: routeOrderById.get(prospect.id),
        }
      })
  }, [prospects, routeIds, savedIds, searchResultProspects])

  const scheduledFollowUps = useMemo(() => {
    return Object.values(followUpEntries)
      .filter((entry) => !entry.completed && entry.followUpDate)
      .map((entry) => {
        const prospect = prospectMap.get(entry.prospectId)

        if (prospect) {
          return {
            ...prospect,
            followUpDate: entry.followUpDate,
            followUpTime: entry.followUpTime,
            notes: entry.notes || prospect.notes,
          }
        }

        return {
          id: entry.prospectId,
          businessName: entry.businessName,
          category: entry.category,
          city: entry.city,
          address: entry.address,
          phone: entry.phone,
          website: 'Website unavailable',
          contactName: entry.contactName,
          contactTitle: entry.contactTitle,
          contactEmail: entry.contactEmail,
          notes: entry.notes,
          priority: entry.priority as Prospect['priority'],
          distance: 0,
          rating: null,
          location: { lat: 0, lng: 0 },
          googlePlaceId: '',
          lastContact: 'Not contacted yet',
          nextTouch: '',
          followUpDate: entry.followUpDate,
          followUpTime: entry.followUpTime,
          lastContactDate: '',
          routeCompleted: false,
          visitNote: '',
          visitOutcome: '',
          visitCompletedAt: '',
          isFoodStop: false,
          editedByRepRouteUser: false,
          businessCardCapturedAt: '',
        } satisfies Prospect
      })
      .sort((left, right) => {
        if (left.followUpDate !== right.followUpDate) {
          return left.followUpDate.localeCompare(right.followUpDate)
        }

        return left.businessName.localeCompare(right.businessName)
      })
  }, [followUpEntries, prospectMap])

  const followUpGroups = useMemo(
    () => groupFollowUpsBySection(Object.values(followUpEntries), getLocalDateKey()),
    [followUpEntries],
  )

  const crmScopedProspects = useMemo(() => {
    const dedupe = (items: Prospect[]) =>
      Array.from(new globalThis.Map(items.map((prospect) => [prospect.id, prospect])).values())

    switch (crmExportScope) {
      case 'saved':
        return dedupe(savedProspects)
      case 'route':
        return dedupe(routeProspects)
      case 'followups':
        return dedupe(
          Object.values(followUpEntries).map((entry) => {
            const prospect = prospectMap.get(entry.prospectId)
            if (prospect) {
              return {
                ...prospect,
                followUpDate: entry.followUpDate,
                followUpTime: entry.followUpTime,
                notes: entry.notes || prospect.notes,
              }
            }

            return scheduledFollowUps.find((item) => item.id === entry.prospectId)
          }).filter((prospect): prospect is Prospect => Boolean(prospect)),
        )
      case 'all':
      default:
        return dedupe(prospects)
    }
  }, [crmExportScope, followUpEntries, prospectMap, prospects, routeProspects, savedProspects, scheduledFollowUps])

  const crmExportPreview = useMemo(() => {
    const records = crmScopedProspects.map((prospect) => {
      const followUpEntry = followUpEntries[prospect.id]

      return buildCrmExportRecord({
        address: prospect.address,
        businessName: prospect.businessName,
        category: prospect.category,
        contactName: prospect.contactName,
        contactEmail: prospect.contactEmail,
        contactTitle: prospect.contactTitle,
        editedByRepRouteUser: prospect.editedByRepRouteUser,
        followUpDate: followUpEntry?.followUpDate ?? prospect.followUpDate,
        followUpTime: followUpEntry?.followUpTime ?? prospect.followUpTime,
        followUpCompleted: followUpEntry?.completed,
        followUpRouteStatus: followUpEntry?.routeStatus,
        googlePlaceId: prospect.googlePlaceId,
        lastContactedDate:
          prospect.lastContactDate ||
          (prospect.lastContact === 'Not contacted yet' ? '' : prospect.lastContact),
        notes: prospect.notes,
        phone: prospect.phone,
        priority: prospect.priority,
        routeOutcomeTag: prospect.visitOutcome,
        visitCompleted: prospect.routeCompleted,
        visitCompletedDateTime: prospect.visitCompletedAt,
        visitNotes: prospect.visitNote,
        website: prospect.website,
        businessCardCapturedAt: prospect.businessCardCapturedAt,
      })
    })

    return {
      records,
      ...buildCrmExportRows(records, crmExportFormat),
    }
  }, [crmExportFormat, crmScopedProspects, followUpEntries])

  const routeMiles = useMemo(
    () => {
      const routeKey = routeIds.join('|')
      if (routeOptimization.status === 'success' && routeOptimization.forRouteKey === routeKey) {
        return routeOptimization.distanceMiles
      }

      return routeProspects.reduce((total, prospect) => total + prospect.distance, 0)
    },
    [routeIds, routeOptimization, routeProspects],
  )
  const completedRouteStops = useMemo(
    () => routeProspects.filter((prospect) => prospect.routeCompleted).length,
    [routeProspects],
  )
  const remainingRouteStops = routeProspects.length - completedRouteStops
  const completionPercentage =
    routeProspects.length > 0 ? Math.round((completedRouteStops / routeProspects.length) * 100) : 0
  const estimatedDriveMinutes = useMemo(
    () => {
      const routeKey = routeIds.join('|')
      if (routeOptimization.status === 'success' && routeOptimization.forRouteKey === routeKey) {
        return routeOptimization.driveMinutes
      }

      return Math.round(routeMiles * 2.4)
    },
    [routeIds, routeMiles, routeOptimization],
  )
  const currentRouteStop = useMemo(
    () => routeProspects.find((prospect) => !prospect.routeCompleted) ?? routeProspects[0] ?? null,
    [routeProspects],
  )
  const nextRouteStopAfterCurrent = useMemo(() => {
    if (!currentRouteStop) {
      return null
    }

    const currentIndex = routeProspects.findIndex((prospect) => prospect.id === currentRouteStop.id)
    return (
      routeProspects.slice(currentIndex + 1).find((prospect) => !prospect.routeCompleted) ??
      routeProspects.find(
        (prospect) => !prospect.routeCompleted && prospect.id !== currentRouteStop.id,
      ) ??
      null
    )
  }, [currentRouteStop, routeProspects])
  const arrivalDetectionRadiusMiles = feetToMiles(arrivalDetectionRadiusFeet)
  const routeStopDistances = useMemo(() => {
    if (!routeTrackerLocation) {
      return []
    }

    const arrivalCandidates =
      routeProspects.filter((prospect) => !prospect.routeCompleted).length > 0
        ? routeProspects.filter((prospect) => !prospect.routeCompleted)
        : routeProspects

    return arrivalCandidates
      .map((prospect) => {
        const distanceMiles = calculateDistanceMilesPrecise(routeTrackerLocation, prospect.location)
        return {
          prospect,
          distanceMiles,
          distanceFeet: milesToFeet(distanceMiles),
        }
      })
      .sort((left, right) => left.distanceMiles - right.distanceMiles)
  }, [routeProspects, routeTrackerLocation])
  const onLocationRouteStop = useMemo(
    () =>
      routeStopDistances.find((entry) => entry.distanceMiles <= arrivalDetectionRadiusMiles) ?? null,
    [arrivalDetectionRadiusMiles, routeStopDistances],
  )
  const closestTrackedRouteStop = routeStopDistances[0] ?? null
  const currentStopProspect =
    onLocationRouteStop?.prospect ?? closestTrackedRouteStop?.prospect ?? currentRouteStop
  const currentStopDistanceFeet = onLocationRouteStop?.distanceFeet ?? closestTrackedRouteStop?.distanceFeet ?? null
  const routeTrackerMessage =
    routeTrackerState === 'tracking'
      ? onLocationRouteStop
        ? uiText.routes.currentStop.onLocationMessage(
            onLocationRouteStop.prospect.businessName,
            formatDistanceFeet(onLocationRouteStop.distanceFeet),
          )
        : routeStopDistances[0]
          ? uiText.routes.currentStop.nearestMessage(
              routeStopDistances[0].prospect.businessName,
              formatDistanceFeet(routeStopDistances[0].distanceFeet),
            )
          : uiText.routes.currentStop.tracking
      : routeTrackerState === 'denied'
        ? uiText.routes.currentStop.locationDenied
        : routeTrackerState === 'unsupported'
          ? uiText.routes.currentStop.locationUnsupported
          : routeTrackerState === 'error'
            ? uiText.routes.currentStop.locationError
            : uiText.routes.currentStop.waiting
  const manualMarketLabel = manualMarket.trim()
  const routeOrigin = useMemo(() => {
    if (isFiniteLatLng(routeTrackerLocation)) {
      return { origin: routeTrackerLocation, source: 'current' as const }
    }

    const trimmedStart = routeStartLocation.trim()
    if (trimmedStart) {
      return { origin: trimmedStart, source: 'manual' as const }
    }

    if (manualMarketLabel) {
      return { origin: manualMarketLabel, source: 'market' as const }
    }

    const firstStop = routeProspects[0]
    if (firstStop && isFiniteLatLng(firstStop.location)) {
      return { origin: firstStop.location, source: 'first-stop' as const }
    }

    return { origin: null, source: null }
  }, [manualMarketLabel, routeProspects, routeStartLocation, routeTrackerLocation])
  const navigationStops = useMemo<RouteNavigationStop[]>(
    () =>
      routeProspects
        .filter((prospect) => isFiniteLatLng(prospect.location))
        .map((prospect, index) => ({
          id: prospect.id,
          businessName: prospect.businessName,
          position: prospect.location,
          routeOrder: index + 1,
          isActive: prospect.id === navigationActiveStopId,
          isCompleted: prospect.routeCompleted,
        })),
    [navigationActiveStopId, routeProspects],
  )
  const navigationLegByStopId = useMemo(
    () =>
      buildStopLegMap(
        routeProspects,
        routeNavigationDirections,
        routeOrigin.source === 'first-stop',
      ),
    [routeNavigationDirections, routeOrigin.source, routeProspects],
  )
  const effectiveRadiusMiles = getEffectiveRadiusMiles(searchRadiusChoice, customRadiusMiles)
  const notificationPermissionLabel =
    notificationPermission === 'granted'
      ? uiText.settings.notifications.permissionStatuses.granted
      : notificationPermission === 'denied'
        ? uiText.settings.notifications.permissionStatuses.denied
        : notificationPermission === 'default'
          ? uiText.settings.notifications.permissionStatuses.default
          : uiText.settings.notifications.permissionStatuses.unsupported

  const currentBackupPayload = useMemo<BackupPayload>(
    () => ({
      liveProspects,
      savedProspects: savedIds,
      routeList: routeIds,
      prospectRecords,
      followUpEntries,
    }),
    [followUpEntries, liveProspects, prospectRecords, routeIds, savedIds],
  )
  const currentBackupSummary = useMemo(
    () => summarizeBackupPayload(currentBackupPayload),
    [currentBackupPayload],
  )
  const importPreviewSummary = useMemo(
    () => (importPreview ? summarizeBackupPayload(importPreview.payload) : null),
    [importPreview],
  )

  useEffect(() => {
    if (!notificationPreferences.enabled || notificationPermission !== 'granted') {
      return
    }

    let cancelled = false

    const checkNotifications = async () => {
      const now = new Date()
      const todayKey = getLocalDateKey(now)
      const latestReminderLog = (() => {
        try {
          const stored = window.localStorage.getItem(STORAGE_KEYS.notificationReminderLog)
          return stored ? (JSON.parse(stored) as NotificationReminderLog) : notificationReminderLog
        } catch {
          return notificationReminderLog
        }
      })()
      const persistReminder = (type: keyof NotificationReminderLog) => {
        const nextLog = { ...latestReminderLog, [type]: todayKey }
        window.localStorage.setItem(STORAGE_KEYS.notificationReminderLog, JSON.stringify(nextLog))
        setNotificationReminderLog(nextLog)
      }
      const dueToday = scheduledFollowUps.filter((prospect) => prospect.followUpDate === todayKey)
      const overdueProspects = scheduledFollowUps.filter((prospect) => prospect.followUpDate < todayKey)

      if (
        notificationPreferences.followUpAlerts &&
        latestReminderLog.followUps !== todayKey &&
        hasReminderTimePassed(notificationPreferences.followUpTime, now) &&
        dueToday.length > 0
      ) {
        const wasShown = await showBrowserNotification({
          title: uiText.settings.notifications.reminders.followUpTitle(dueToday.length),
          body: uiText.settings.notifications.reminders.followUpBody(formatProspectNames(dueToday)),
          tag: 'reproute-followups',
        })

        if (wasShown && !cancelled) {
          persistReminder('followUps')
        }
      }

      if (
        notificationPreferences.dailyRouteReminder &&
        latestReminderLog.route !== todayKey &&
        hasReminderTimePassed(notificationPreferences.dailyRouteTime, now) &&
        routeProspects.length > 0
      ) {
        const wasShown = await showBrowserNotification({
          title: uiText.settings.notifications.reminders.routeTitle(routeProspects.length),
          body: uiText.settings.notifications.reminders.routeBody(currentRouteStop?.businessName ?? null),
          tag: 'reproute-route',
        })

        if (wasShown && !cancelled) {
          persistReminder('route')
        }
      }

      if (
        notificationPreferences.overdueProspectAlerts &&
        latestReminderLog.overdue !== todayKey &&
        hasReminderTimePassed(notificationPreferences.overdueProspectTime, now) &&
        overdueProspects.length > 0
      ) {
        const wasShown = await showBrowserNotification({
          title: uiText.settings.notifications.reminders.overdueTitle(overdueProspects.length),
          body: uiText.settings.notifications.reminders.overdueBody(
            formatProspectNames(overdueProspects),
          ),
          tag: 'reproute-overdue',
        })

        if (wasShown && !cancelled) {
          persistReminder('overdue')
        }
      }
    }

    void checkNotifications()
    const intervalId = window.setInterval(() => {
      void checkNotifications()
    }, 60000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [
    currentRouteStop,
    notificationPermission,
    notificationPreferences,
    notificationReminderLog,
    routeProspects,
    scheduledFollowUps,
    setNotificationReminderLog,
  ])

  function updateProspectRecord(
    prospectId: string,
    updater: (current: ProspectRecord | undefined) => ProspectRecord,
  ) {
    setProspectRecords((current) => ({
      ...current,
      [prospectId]: {
        ...updater(current[prospectId]),
        editedByRepRouteUser: true,
      },
    }))
  }

  function openSavedProspect(prospectId?: string) {
    setExpandedProspectId(prospectId ?? null)
    setActiveView('saved')
  }

  function toggleSaved(prospectId: string) {
    const isSaved = savedIds.includes(prospectId)

    setSavedIds((current) =>
      isSaved ? current.filter((id) => id !== prospectId) : [...current, prospectId],
    )

    if (isSaved && expandedProspectId === prospectId) {
      setExpandedProspectId(null)
    }

    if (!isSaved) {
      setActionToast({
        type: 'success',
        text: uiText.saved.savedMessage,
      })
    }
  }

  function toggleRoute(prospectId: string) {
    const wasInRoute = routeIds.includes(prospectId)

    setRouteIds((current) =>
      current.includes(prospectId)
        ? current.filter((id) => id !== prospectId)
        : [...current, prospectId],
    )

    if (!wasInRoute) {
      setActionToast({
        type: 'success',
        text: uiText.routes.actions.addedToRouteToast,
      })
    }
  }

  function openRemoveProspectPrompt(prospectId: string) {
    setRemoveProspectPrompt({ prospectId })
  }

  function closeRemoveProspectPrompt() {
    setRemoveProspectPrompt(null)
  }

  async function resolveFoodSearchCenter(anchor: Prospect) {
    if (isFiniteLatLng(anchor.location)) {
      return { ok: true as const, center: anchor.location }
    }

    const address = anchor.address?.trim()
    if (!address) {
      return { ok: false as const, error: uiText.errors.locationRequired }
    }

    const geocode = await searchGooglePlaces({
      apiKey: googleMapsApiKey,
      query: address,
      maxResultCount: 1,
    })

    if (!geocode.ok) {
      return { ok: false as const, error: geocode.error }
    }

    const placeWithLocation = geocode.places.find(
      (place) =>
        typeof place.location?.latitude === 'number' && typeof place.location?.longitude === 'number',
    )

    if (!placeWithLocation?.location) {
      return { ok: false as const, error: uiText.errors.locationRequired }
    }

    return {
      ok: true as const,
      center: {
        lat: placeWithLocation.location.latitude ?? AUSTIN_FALLBACK.lat,
        lng: placeWithLocation.location.longitude ?? AUSTIN_FALLBACK.lng,
      },
    }
  }

  function getFoodSearchTerms() {
    if (!foodNearbyActiveChip) {
      return [...FOOD_SEARCH_TERMS]
    }

    const map: Record<FoodQuickChip, string> = {
      Coffee: 'coffee',
      Breakfast: 'breakfast',
      Lunch: 'lunch',
      BBQ: 'bbq',
      Tacos: 'tacos',
      Catering: 'catering',
    }

    return [map[foodNearbyActiveChip]]
  }

  async function runFoodNearbySearch(anchor: Prospect) {
    setFoodNearbyLoading(true)
    setFoodNearbyError(null)
    setFoodNearbyResultIds([])

    const centerResult = await resolveFoodSearchCenter(anchor)
    if (!centerResult.ok) {
      setFoodNearbyLoading(false)
      setFoodNearbyError(centerResult.error)
      return
    }

    const searchCenter = centerResult.center
    const terms = getFoodSearchTerms()
    const locationBias = {
      latitude: searchCenter.lat,
      longitude: searchCenter.lng,
      radiusMeters: milesToMeters(foodNearbyRadiusMiles),
    }

    console.groupCollapsed('[RepRoute] Food Nearby')
    console.info('anchor', { id: anchor.id, name: anchor.businessName })
    console.info('radiusMiles', foodNearbyRadiusMiles)
    console.info('center', searchCenter)
    console.info('terms', terms)
    console.groupEnd()

    const results = await Promise.all(
      terms.map(async (term) => ({
        term,
        result: await searchGooglePlaces({
          apiKey: googleMapsApiKey,
          query: `${term} near ${anchor.address || anchor.businessName}`.trim(),
          maxResultCount: 8,
          locationBias,
        }),
      })),
    )

    const successfulResults: Array<{
      term: string
      result: { ok: true; places: GooglePlacesApiPlace[]; query: string }
    }> = []
    const failedResults: Array<{
      term: string
      result: { ok: false; error: string; details: unknown; query: string; status: number | null }
    }> = []

    for (const entry of results) {
      if (entry.result.ok) {
        successfulResults.push({ term: entry.term, result: entry.result })
      } else {
        failedResults.push({ term: entry.term, result: entry.result })
      }
    }

    const dedupedPlaces = dedupePlaces(successfulResults.flatMap((entry) => entry.result.places))

    const normalizedWithDistance = dedupedPlaces.reduce<
      Array<{ prospect: BaseProspect; distanceMilesPrecise: number; lat: number; lng: number }>
    >((collection, place) => {
      const lat = place.location?.latitude
      const lng = place.location?.longitude

      if (typeof lat !== 'number' || typeof lng !== 'number') {
        return collection
      }

      const matchingEntry = successfulResults.find((entry) =>
        entry.result.places.some((candidate) =>
          candidate.id && place.id
            ? candidate.id === place.id
            : candidate.displayName?.text === place.displayName?.text &&
              candidate.formattedAddress === place.formattedAddress,
        ),
      )

      const distanceMilesPrecise = calculateDistanceMilesPrecise(searchCenter, { lat, lng })
      const prospect = toLiveProspect(
        place,
        matchingEntry?.term ?? 'Food',
        anchor.city,
        searchCenter,
        distanceMilesPrecise,
      )

      if (prospect) {
        collection.push({ prospect, distanceMilesPrecise, lat, lng })
      }

      return collection
    }, [])

    const withinRadius = normalizedWithDistance.filter(
      (entry) => entry.distanceMilesPrecise <= foodNearbyRadiusMiles,
    )
    withinRadius.sort((a, b) => a.distanceMilesPrecise - b.distanceMilesPrecise)
    const normalizedProspects = withinRadius.map((entry) => entry.prospect)

    console.groupCollapsed('[RepRoute] Food Nearby results')
    console.info('candidateCount', normalizedWithDistance.length)
    console.info('withinRadiusCount', normalizedProspects.length)
    console.table(
      normalizedWithDistance.map((entry) => ({
        name: entry.prospect.businessName,
        lat: entry.lat,
        lng: entry.lng,
        distanceMiles: Number(entry.distanceMilesPrecise.toFixed(2)),
        withinRadius: entry.distanceMilesPrecise <= foodNearbyRadiusMiles,
      })),
    )
    console.groupEnd()

    if (normalizedProspects.length > 0) {
      setLiveProspects((current) => mergeProspectCatalog(current, normalizedProspects))
      setFoodNearbyResultIds(normalizedProspects.map((prospect) => prospect.id))
      setFoodNearbyLoading(false)
      return
    }

    setFoodNearbyLoading(false)
    if (failedResults.length > 0 && normalizedWithDistance.length === 0) {
      setFoodNearbyError(failedResults[0]?.result.error ?? uiText.errors.searchFailedDetail)
    }
  }

  function dismissFoodNearby(restorePreviousView = false) {
    const returnView = foodNearbySession?.returnView

    setFoodNearbySession(null)
    setFoodNearbyError(null)
    setFoodNearbyLoading(false)
    setFoodNearbyResultIds([])
    setFoodNearbyRadiusMiles(1)
    setFoodNearbyActiveChip(null)

    if (restorePreviousView && returnView) {
      setActiveView(returnView)
    }
  }

  function openFoodNearby(prospectId: string) {
    const anchor = prospectMap.get(prospectId)

    if (!anchor) {
      return
    }

    setFoodNearbySession({
      anchor: {
        ...anchor,
        location: { ...anchor.location },
      },
      returnView: activeView,
    })
    setFoodNearbyRadiusMiles(1)
    setFoodNearbyActiveChip(null)
    setFoodNearbyError(null)
    setFoodNearbyResultIds([])
    setFoodNearbyLoading(true)
  }

  function closeFoodNearby() {
    dismissFoodNearby(true)
  }

  function handleRemoveFromRoute(prospectId: string) {
    setRouteIds((current) => current.filter((id) => id !== prospectId))
    if (expandedProspectId === prospectId) {
      setExpandedProspectId(null)
    }
    setRemoveProspectPrompt(null)
  }

  function handleRemoveFromSavedProspects(prospectId: string) {
    setSavedIds((current) => current.filter((id) => id !== prospectId))
    setRouteIds((current) => current.filter((id) => id !== prospectId))
    if (expandedProspectId === prospectId) {
      setExpandedProspectId(null)
    }
    setRemoveProspectPrompt(null)
  }

  function toggleRouteCompleted(prospectId: string) {
    updateProspectRecord(prospectId, (current) => ({
      ...current,
      routeCompleted: !(current?.routeCompleted ?? false),
      lastContactDate:
        !(current?.routeCompleted ?? false)
          ? new Date().toISOString().slice(0, 10)
          : current?.lastContactDate || '',
      visitCompletedAt:
        !(current?.routeCompleted ?? false) ? new Date().toISOString() : '',
    }))
  }

  function saveAsFoodStop(prospectId: string) {
    setRouteIds((current) => (current.includes(prospectId) ? current : [...current, prospectId]))
    updateProspectRecord(prospectId, (current) => ({
      ...current,
      isFoodStop: true,
    }))
    setActionToast({ type: 'success', text: uiText.foodNearby.addedFoodStopToast })
  }

  async function updateStopAddress(prospectId: string, address: string) {
    const trimmed = address.trim()
    if (!trimmed) {
      return
    }

    const result = await searchGooglePlaces({
      apiKey: googleMapsApiKey,
      query: trimmed,
      maxResultCount: 1,
    })

    if (!result.ok) {
      setRouteActionMessage({ tone: 'error', text: result.error, persistent: true })
      return
    }

    const placeWithLocation = result.places.find(
      (place) =>
        typeof place.location?.latitude === 'number' && typeof place.location?.longitude === 'number',
    )

    updateProspectRecord(prospectId, (current) => ({
      ...current,
      addressOverride: trimmed,
      locationOverride:
        placeWithLocation?.location &&
        typeof placeWithLocation.location.latitude === 'number' &&
        typeof placeWithLocation.location.longitude === 'number'
          ? {
              lat: placeWithLocation.location.latitude,
              lng: placeWithLocation.location.longitude,
            }
          : current?.locationOverride,
      googlePlaceIdOverride: placeWithLocation?.id?.trim() ? placeWithLocation.id.trim() : current?.googlePlaceIdOverride,
    }))
  }

  function removeStopFromRoute(prospectId: string) {
    setRouteIds((current) => current.filter((id) => id !== prospectId))
  }

  async function removeInvalidStopsAndRecalculate() {
    const invalidIds = new Set(invalidStops.map((entry) => entry.prospect.id))
    const validStops = routeProspects.filter((prospect) => !invalidIds.has(prospect.id))

    if (validStops.length === 0) {
      setRouteActionMessage({ tone: 'error', text: uiText.routes.invalidStops.noValidStops, persistent: true })
      return
    }

    setRouteIds(validStops.map((prospect) => prospect.id))
    setInvalidStopsDismissedForRouteKey(null)

    if (validStops.length > 1) {
      await optimizeRoute()
    }

    await loadRouteNavigationDirections()
  }

  function dismissInvalidStopsForCurrentRoute() {
    setInvalidStopsDismissedForRouteKey(routeKey)
  }

  function updateVisitNote(prospectId: string, visitNote: string) {
    updateProspectRecord(prospectId, (current) => ({
      ...current,
      visitNote,
    }))
  }

  function updateVisitOutcome(prospectId: string, visitOutcome: OutcomeTag | '') {
    updateProspectRecord(prospectId, (current) => ({
      ...current,
      visitOutcome,
    }))
  }

  function updateProspectPriority(prospectId: string, priority: AssignedPriority) {
    updateProspectRecord(prospectId, (current) => ({
      ...current,
      priority,
    }))
  }

  function removeFollowUp(prospectId: string) {
    setFollowUpEntries((current) => {
      if (!current[prospectId]) {
        return current
      }

      const next = { ...current }
      delete next[prospectId]
      return next
    })

    updateProspectRecord(prospectId, (current) => {
      const next = { ...current }
      delete next.followUpDate
      delete next.followUpTime
      delete next.followUpCompleted
      delete next.followUpCompletedAt
      return next
    })
  }

  function persistFollowUp(
    prospectId: string,
    followUpDate: string,
    options?: {
      followUpTime?: string
      notes?: string
      completed?: boolean
      completedAt?: string
      showToast?: boolean
      silent?: boolean
      confirmSave?: boolean
    },
  ) {
    if (!followUpDate) {
      removeFollowUp(prospectId)
      return
    }

    if (!isValidFollowUpDate(followUpDate)) {
      return
    }

    const prospect = prospectMap.get(prospectId)
    const base = liveProspects.find((item) => item.id === prospectId)
    const record = prospectRecords[prospectId]

    if (!prospect && !base) {
      return
    }

    const existing = followUpEntries[prospectId]
    const followUpTime =
      options?.followUpTime?.trim() ||
      existing?.followUpTime ||
      record?.followUpTime ||
      DEFAULT_FOLLOW_UP_TIME
    const notes =
      options?.notes ??
      existing?.notes ??
      prospect?.notes ??
      record?.notes ??
      base?.notes ??
      ''
    const completed = options?.completed ?? existing?.completed ?? false
    const completedAt = options?.completedAt ?? existing?.completedAt ?? ''

    const lastSave = lastFollowUpSaveRef.current[prospectId]
    if (
      !options?.silent &&
      existing &&
      existing.followUpDate === followUpDate &&
      existing.followUpTime === followUpTime &&
      existing.notes === notes &&
      existing.completed === completed &&
      lastSave &&
      lastSave.date === followUpDate &&
      lastSave.time === followUpTime &&
      Date.now() - lastSave.at < 2000
    ) {
      if (options?.confirmSave && options?.showToast !== false) {
        setActionToast({ type: 'success', text: uiText.followUps.savedToast })
      }

      return
    }

    const entry = buildFollowUpSnapshot({
      prospectId,
      businessName: prospect?.businessName ?? base?.businessName ?? existing?.businessName ?? prospectId,
      address: prospect?.address ?? record?.addressOverride ?? base?.address ?? existing?.address ?? '',
      category: prospect?.category ?? base?.category ?? existing?.category ?? 'Business',
      city: prospect?.city ?? base?.city ?? existing?.city ?? '',
      phone: prospect?.phone ?? record?.contactPhone ?? base?.phone ?? existing?.phone ?? '',
      contactName: prospect?.contactName ?? record?.contactName ?? base?.contactName ?? existing?.contactName ?? '',
      contactTitle:
        prospect?.contactTitle ?? record?.contactTitle ?? base?.contactTitle ?? existing?.contactTitle ?? '',
      contactEmail:
        prospect?.contactEmail ?? record?.contactEmail ?? base?.contactEmail ?? existing?.contactEmail ?? '',
      notes,
      priority: prospect?.priority ?? record?.priority ?? base?.priority ?? existing?.priority ?? 'Unassigned',
      routeIds,
      savedIds,
      followUpDate,
      followUpTime,
      completed,
      completedAt,
      existing,
    })

    setFollowUpEntries((current) => ({
      ...current,
      [prospectId]: entry,
    }))

    updateProspectRecord(prospectId, (current) => ({
      ...current,
      followUpDate,
      followUpTime,
      notes,
      followUpCompleted: completed,
      followUpCompletedAt: completedAt,
    }))

    lastFollowUpSaveRef.current[prospectId] = {
      date: followUpDate,
      time: followUpTime,
      at: Date.now(),
    }

    if (options?.showToast !== false) {
      setActionToast({ type: 'success', text: uiText.followUps.savedToast })
    }
  }

  function updateProspectFollowUp(
    prospectId: string,
    followUpDate: string,
    followUpTime?: string,
    confirmSave = false,
  ) {
    persistFollowUp(prospectId, followUpDate, { followUpTime, confirmSave })
  }

  function markFollowUpComplete(prospectId: string) {
    const existing = followUpEntries[prospectId]
    if (!existing || existing.completed) {
      return
    }

    persistFollowUp(prospectId, existing.followUpDate, {
      followUpTime: existing.followUpTime,
      notes: existing.notes,
      completed: true,
      completedAt: new Date().toISOString(),
      showToast: false,
    })
  }

  function rescheduleFollowUp(prospectId: string, followUpDate: string) {
    const existing = followUpEntries[prospectId]
    if (!existing) {
      return
    }

    persistFollowUp(prospectId, followUpDate, {
      followUpTime: existing.followUpTime,
      notes: existing.notes,
      completed: false,
      completedAt: '',
    })
  }

  function saveFollowUpEdit(prospectId: string) {
    persistFollowUp(prospectId, followUpEditDraft.date, {
      followUpTime: followUpEditDraft.time,
      notes: followUpEditDraft.notes,
    })
    setEditingFollowUpId(null)
  }

  function navigateFollowUp(entry: FollowUpEntry) {
    const prospect = prospectMap.get(entry.prospectId)

    if (prospect && isFiniteLatLng(prospect.location)) {
      openExternalNavigation(createNavigateHref(prospect, travelMode))
      return
    }

    if (entry.address.trim()) {
      const url = new URL('https://www.google.com/maps/search/')
      url.searchParams.set('api', '1')
      url.searchParams.set('query', entry.address)
      openExternalNavigation(url.toString())
    }
  }

  function startFollowUpEdit(entry: FollowUpEntry) {
    setEditingFollowUpId(entry.prospectId)
    setFollowUpEditDraft({
      date: entry.followUpDate,
      time: entry.followUpTime,
      notes: entry.notes,
    })
  }

  function updateProspectNotes(prospectId: string, notes: string) {
    updateProspectRecord(prospectId, (current) => ({
      ...current,
      notes,
    }))
  }

  function updateContactDetails(
    prospectId: string,
    fields: Partial<
      Pick<ProspectRecord, 'contactName' | 'contactTitle' | 'contactEmail' | 'contactPhone' | 'contactWebsite'>
    >,
  ) {
    updateProspectRecord(prospectId, (current) => ({
      ...current,
      ...fields,
      editedByRepRouteUser: true,
    }))
  }

  function handleRouteBusinessCardCapture(explicitProspectId: string | undefined, file: File) {
    if (explicitProspectId) {
      void captureBusinessCard(explicitProspectId, file)
      return
    }

    if (routeProspects.length === 1) {
      const onlyStop = routeProspects[0]
      if (onlyStop) {
        void captureBusinessCard(onlyStop.id, file)
      }
      return
    }

    setBusinessCardPendingAttach({ file })
  }

  function cancelBusinessCardAttach() {
    setBusinessCardPendingAttach(null)
  }

  function confirmBusinessCardAttach(prospectId: string) {
    const pendingFile = businessCardPendingAttach?.file

    if (!pendingFile) {
      return
    }

    setBusinessCardPendingAttach(null)
    void captureBusinessCard(prospectId, pendingFile)
  }

  async function captureBusinessCard(prospectId: string, file: File) {
    try {
      await saveBusinessCardImage(prospectId, file)
      const previewUrl = await getBusinessCardObjectUrl(prospectId)

      if (previewUrl) {
        setBusinessCardPreviewUrls((current) => {
          const previousUrl = current[prospectId]
          if (previousUrl) {
            URL.revokeObjectURL(previousUrl)
          }

          return {
            ...current,
            [prospectId]: previewUrl,
          }
        })
      }

      updateProspectRecord(prospectId, (current) => ({
        ...current,
        businessCardCapturedAt: new Date().toISOString(),
        businessCardMimeType: file.type || 'image/jpeg',
        editedByRepRouteUser: true,
      }))
    } catch {
      setActionToast({ type: 'error', text: uiText.routes.businessCard.captureFailed })
    }
  }

  function removeBusinessCard(prospectId: string) {
    void removeBusinessCardImage(prospectId).finally(() => {
      setBusinessCardPreviewUrls((current) => {
        const previousUrl = current[prospectId]
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl)
        }

        const next = { ...current }
        delete next[prospectId]
        return next
      })

      updateProspectRecord(prospectId, (current) => {
        const next = { ...current }
        delete next.businessCardCapturedAt
        delete next.businessCardMimeType
        delete next.businessCardImageDataUrl
        return next
      })

      setActionToast({ type: 'info', text: uiText.routes.businessCard.removed })
    })
  }

  useEffect(() => {
    let cancelled = false

    async function loadBusinessCardPreviews() {
      const entries = Object.entries(prospectRecords).filter(
        ([, record]) => typeof record.businessCardCapturedAt === 'string',
      )

      const urls: Record<string, string> = {}

      await Promise.all(
        entries.map(async ([prospectId]) => {
          const objectUrl = await getBusinessCardObjectUrl(prospectId)
          if (objectUrl) {
            urls[prospectId] = objectUrl
          }
        }),
      )

      if (!cancelled) {
        setBusinessCardPreviewUrls((current) => {
          for (const url of Object.values(current)) {
            URL.revokeObjectURL(url)
          }

          return urls
        })
      } else {
        for (const url of Object.values(urls)) {
          URL.revokeObjectURL(url)
        }
      }
    }

    void loadBusinessCardPreviews()

    return () => {
      cancelled = true
    }
  }, [prospectRecords])

  useEffect(() => {
    if (!foodNearbyAnchorProspect) {
      return
    }

    void runFoodNearbySearch(foodNearbyAnchorProspect)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- use foodNearby state intentionally
  }, [foodNearbySession, foodNearbyRadiusMiles, foodNearbyActiveChip])

  useEffect(() => {
    if (!foodNearbySession) {
      return
    }

    if (activeView !== foodNearbySession.returnView) {
      dismissFoodNearby(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dismiss when user leaves the originating tab
  }, [activeView, foodNearbySession])

  useEffect(() => {
    if (!foodNearbySession || typeof document === 'undefined') {
      return
    }

    const html = document.documentElement
    const previousHtmlOverflow = html.style.overflow
    const previousBodyOverflow = document.body.style.overflow
    const previousBodyTouchAction = document.body.style.touchAction
    html.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'

    return () => {
      html.style.overflow = previousHtmlOverflow
      document.body.style.overflow = previousBodyOverflow
      document.body.style.touchAction = previousBodyTouchAction
    }
  }, [foodNearbySession])

  useEffect(() => {
    if (!foodNearbySession || typeof window === 'undefined') {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeFoodNearby()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [foodNearbySession])

  function handleRouteDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    setRouteIds((current) => {
      const oldIndex = current.indexOf(String(active.id))
      const newIndex = current.indexOf(String(over.id))

      if (oldIndex === -1 || newIndex === -1) {
        return current
      }

      return arrayMove(current, oldIndex, newIndex)
    })
  }

  function handleNavigateProspect(prospect: Prospect) {
    if (routeIds.includes(prospect.id)) {
      void startRouteNavigationForStop(prospect.id)
      return
    }

    setActiveView('map')
    setActionToast({
      type: 'info',
      text: uiText.routes.inAppNavigation.addToRouteToNavigate,
    })
  }

  async function loadRouteNavigationDirections() {
    const requestId = ++routeDirectionsRequestIdRef.current
    const attemptedAt = new Date().toISOString()
    const origin =
      routeOrigin.origin ??
      (routeProspects[0] ? resolveDirectionsLocation(routeProspects[0]) : null)

    if (!origin) {
      setRouteNavigationDirections(null)
      setRouteDirectionsApiStatus(null)
      setRouteNavigationLoading(false)
      setRouteNavigationError(uiText.routes.inAppNavigation.needOrigin)
      setRouteRenderDebug({
        lastAttemptedAt: attemptedAt,
        mapReady: false,
        validStopCount: 0,
        invalidRemovedCount: 0,
        autoRemovedStopNames: [],
        routeStatus: 'missing-origin',
        directionsStatus: 'NO_ORIGIN',
        rendererStatus: 'no-directions',
        usedFallback: false,
        partialLine: false,
        waypointCount: 0,
        requestedStopCount: routeProspects.length,
      })
      return
    }

    setRouteNavigationLoading(true)
    setRouteNavigationError(null)
    setRouteLineRenderStatus('map-loading')

    const mapReady = await waitForGoogleMaps()
    const stopsInput = routeProspects.map(prospectToRouteDirectionsStop)
    const validation = validateRouteStopsForDirections(stopsInput)
    const autoRemovedNames = [
      ...validation.invalid.map((entry) => entry.stop.businessName),
      ...validation.duplicateRemoved.map((entry) => entry.stop.businessName),
    ]

    let routeIdsForDirections = routeIds

    if (autoRemovedNames.length > 0) {
      const validIdSet = new Set(validation.valid.map((stop) => stop.id))
      const nextRouteIds = routeIds.filter((id) => validIdSet.has(id))

      if (nextRouteIds.length !== routeIds.length) {
        console.warn('[RepRoute] Auto-removed invalid route stops', autoRemovedNames)
        setRouteIds(nextRouteIds)
        routeIdsForDirections = nextRouteIds
        setRouteActionMessage({
          tone: 'info',
          text: uiText.routes.routeRender.autoRemoved,
          persistent: true,
        })
      }
    }

    const validById = new Map(validation.valid.map((stop) => [stop.id, stop]))
    let orderedStops = routeIdsForDirections
      .map((id) => validById.get(id))
      .filter((stop): stop is RouteDirectionsStop => Boolean(stop))

    if (routeOrigin.source === 'first-stop') {
      const firstStopId = routeProspects[0]?.id
      if (firstStopId) {
        orderedStops = orderedStops.filter((stop) => stop.id !== firstStopId)
      }
    }

    if (orderedStops.length === 0) {
      setRouteNavigationDirections(null)
      setRouteDirectionsApiStatus(null)
      setRouteNavigationLoading(false)
      setRouteNavigationError(null)
      setRouteLineRenderStatus(mapReady ? 'map-ready' : 'map-loading')
      setRouteRenderDebug({
        lastAttemptedAt: attemptedAt,
        mapReady,
        validStopCount: validation.valid.length,
        invalidRemovedCount: autoRemovedNames.length,
        autoRemovedStopNames: autoRemovedNames,
        routeStatus: 'no-stops-for-line',
        directionsStatus: 'NO_STOPS',
        rendererStatus: mapReady ? 'no-directions' : 'map-loading',
        usedFallback: false,
        partialLine: false,
        waypointCount: 0,
        requestedStopCount: routeProspects.length,
      })
      return
    }

    if (!mapReady) {
      setRouteNavigationDirections(null)
      setRouteDirectionsApiStatus('NO_MAPS')
      setRouteNavigationLoading(false)
      setRouteNavigationError(uiText.routes.inAppNavigation.mapNotReady)
      setRouteLineRenderStatus('map-loading')
      setRouteRenderDebug({
        lastAttemptedAt: attemptedAt,
        mapReady: false,
        validStopCount: orderedStops.length,
        invalidRemovedCount: autoRemovedNames.length,
        autoRemovedStopNames: autoRemovedNames,
        routeStatus: 'map-not-ready',
        directionsStatus: 'NO_MAPS',
        rendererStatus: 'map-loading',
        usedFallback: false,
        partialLine: false,
        waypointCount: Math.max(0, orderedStops.length - 1),
        requestedStopCount: orderedStops.length,
      })
      return
    }

    if (requestId !== routeDirectionsRequestIdRef.current) {
      return
    }

    setRouteLineRenderStatus('map-ready')

    const fetchResult = await fetchRouteDirectionsWithFallback({
      origin,
      orderedStops,
      travelMode: getGoogleDirectionsTravelMode(travelMode),
    })

    if (requestId !== routeDirectionsRequestIdRef.current) {
      return
    }

    setRouteNavigationLoading(false)
    setRouteDirectionsApiStatus(fetchResult.status)

    const okStatus = String(google.maps.DirectionsStatus.OK)

    setRouteRenderDebug({
      lastAttemptedAt: attemptedAt,
      mapReady: true,
      validStopCount: orderedStops.length,
      invalidRemovedCount: autoRemovedNames.length,
      autoRemovedStopNames: autoRemovedNames,
      routeStatus:
        fetchResult.result && fetchResult.status === okStatus ? 'success' : 'error',
      directionsStatus: fetchResult.status,
      rendererStatus: 'rendering',
      usedFallback: fetchResult.usedFallback,
      partialLine: fetchResult.partialLine,
      waypointCount: fetchResult.waypointCount,
      requestedStopCount: fetchResult.requestedStopCount,
    })

    if (!fetchResult.result || fetchResult.status !== okStatus) {
      setRouteNavigationDirections(null)
      setRouteNavigationError(uiText.routes.inAppNavigation.routeLineError)
      setRouteLineRenderStatus('no-directions')
      console.warn('[RepRoute] Route navigation directions failed', fetchResult.status, fetchResult)
      return
    }

    setRouteNavigationDirections(fetchResult.result)
    setRouteNavigationError(null)
    setRouteLineRenderStatus('rendering')

    if (fetchResult.partialLine) {
      setRouteActionMessage({
        tone: 'info',
        text: uiText.routes.inAppNavigation.partialRouteLine,
        persistent: true,
      })
    }

    if (fetchResult.usedFallback) {
      console.info('[RepRoute] Route line used sequential fallback', fetchResult.status)
    }

    if (fetchResult.partialLine) {
      console.info('[RepRoute] Route line truncated for large route', fetchResult.requestedStopCount)
    }
  }

  function handleRouteLineRenderStatusChange(status: RouteLineRenderStatus) {
    setRouteLineRenderStatus(status)
    setRouteRenderDebug((current) => (current ? { ...current, rendererStatus: status } : current))
  }

  async function startRouteNavigationForStop(prospectId: string) {
    if (routeProspects.length === 0) {
      setRouteActionMessage({ tone: 'error', text: uiText.routes.optimization.noStops })
      return
    }

    const origin =
      routeOrigin.origin ??
      (routeProspects[0] ? resolveDirectionsLocation(routeProspects[0]) : null)

    if (!origin) {
      setRouteActionMessage({ tone: 'error', text: uiText.routes.inAppNavigation.needOrigin })
      return
    }

    setActiveView('map')
    setNavigationActiveStopId(prospectId)

    if (!routeNavigationOpen) {
      setNavigationArrivedStopIds({})
      setRouteNavigationOpen(true)

      if (typeof window !== 'undefined' && !routeNavHistoryPushedRef.current) {
        window.history.pushState(ROUTE_GUIDANCE_HISTORY_STATE, '')
        routeNavHistoryPushedRef.current = true
      }
    }

    await loadRouteNavigationDirections()
  }

  async function startRouteNavigation() {
    const firstIncomplete =
      routeProspects.find((prospect) => !prospect.routeCompleted)?.id ?? routeProspects[0]?.id

    if (!firstIncomplete) {
      setRouteActionMessage({ tone: 'error', text: uiText.routes.optimization.noStops })
      return
    }

    await startRouteNavigationForStop(firstIncomplete)
  }

  function closeRouteNavigation() {
    setRouteNavigationOpen(false)

    if (routeNavHistoryPushedRef.current && typeof window !== 'undefined') {
      routeNavSuppressPopStateRef.current = true
      routeNavHistoryPushedRef.current = false
      window.history.back()
    }
  }

  function handleNavigationMarkArrived(prospectId: string) {
    setNavigationArrivedStopIds((current) => ({
      ...current,
      [prospectId]: true,
    }))
    setNavigationActiveStopId(prospectId)
  }

  function handleNavigationMarkCompleted(prospectId: string) {
    const prospect = routeProspects.find((entry) => entry.id === prospectId)

    if (!prospect) {
      return
    }

    if (prospect.routeCompleted) {
      toggleRouteCompleted(prospectId)
      return
    }

    const currentIndex = routeProspects.findIndex((entry) => entry.id === prospectId)
    const nextStop =
      routeProspects.slice(currentIndex + 1).find((entry) => !entry.routeCompleted) ??
      routeProspects.find((entry) => !entry.routeCompleted && entry.id !== prospectId)

    toggleRouteCompleted(prospectId)
    setNavigationArrivedStopIds((current) => {
      const next = { ...current }
      delete next[prospectId]
      return next
    })

    if (nextStop) {
      setNavigationActiveStopId(nextStop.id)
    }
  }

  function handleOpenRouteInMaps() {
    if (routeProspects.length === 0) {
      setRouteActionMessage({ tone: 'error', text: uiText.routes.optimization.noStops })
      return
    }

    const startOrigin = routeOrigin.origin
    if (!startOrigin && routeTrackerState === 'denied') {
      setRouteActionMessage({ tone: 'info', text: uiText.routes.optimization.locationOffMessage })
      return
    }

    const stopsForNavigation =
      routeOrigin.source === 'first-stop' ? routeProspects.slice(1) : routeProspects

    if (!stopsForNavigation.every((stop) => isFiniteLatLng(stop.location))) {
      setRouteActionMessage({ tone: 'error', text: uiText.routes.optimization.missingCoordinates })
      return
    }

    const opened = openExternalNavigation(
      createEntireRouteNavigateHref(startOrigin, stopsForNavigation, travelMode),
    )

    if (!opened) {
      setActionToast({
        type: 'info',
        text: uiText.routes.inAppNavigation.mapsPopupBlocked,
      })
    }
  }

  useEffect(() => {
    if (activeView !== 'map' || routeIds.length === 0) {
      return
    }

    const timer = window.setTimeout(() => {
      void loadRouteNavigationDirections()
    }, 400)

    return () => window.clearTimeout(timer)
  }, [activeView, routeIds.join('|'), travelMode, routeStartLocation, manualMarketLabel])

  useEffect(() => {
    return () => {
      if (optimizeRouteTimerRef.current) {
        window.clearTimeout(optimizeRouteTimerRef.current)
      }
    }
  }, [])

  function scheduleOptimizeRoute(originOverride?: string) {
    if (optimizeRouteTimerRef.current) {
      window.clearTimeout(optimizeRouteTimerRef.current)
    }

    optimizeRouteTimerRef.current = window.setTimeout(() => {
      optimizeRouteTimerRef.current = null
      void optimizeRoute(originOverride)
    }, 400)
  }

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handlePopState = () => {
      if (routeNavSuppressPopStateRef.current) {
        routeNavSuppressPopStateRef.current = false
        return
      }

      if (routeNavigationOpen) {
        routeNavHistoryPushedRef.current = false
        setRouteNavigationOpen(false)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [routeNavigationOpen])

  useEffect(() => {
    if (routeIds.length === 0 && routeNavigationOpen) {
      routeNavHistoryPushedRef.current = false
      setRouteNavigationOpen(false)
      setRouteNavigationDirections(null)
      setRouteDirectionsApiStatus(null)
      setRouteNavigationLoading(false)
      setRouteNavigationError(null)
      setRouteRenderDebug(null)
      setRouteLineRenderStatus('idle')
    }
  }, [routeIds.length, routeNavigationOpen])

  async function optimizeRoute(originOverride?: string) {
    const attemptedAt = new Date().toISOString()
    const stopCount = routeProspects.length
    const missingCoordinatesCount = routeProspects.filter((stop) => !isFiniteLatLng(stop.location)).length
    const logPrefix = '[RepRoute] Optimize Route'

    const originCandidate =
      routeTrackerLocation ??
      (originOverride?.trim()
        ? originOverride.trim()
        : routeStartLocation.trim()
          ? routeStartLocation.trim()
          : null)

    const originFromMarket = manualMarketLabel ? manualMarketLabel : null
    const originResolved = originCandidate ?? originFromMarket ?? null

    const setDebug = (patch: Partial<NonNullable<RouteOptimizationDebug>>) => {
      setRouteOptimizationDebug({
        lastAttemptedAt: attemptedAt,
        status: 'idle',
        stopCount,
        optimizedCount: 0,
        skippedCount: 0,
        batched: false,
        missingCoordinatesCount,
        ...patch,
      })
    }

    console.groupCollapsed(`${logPrefix} (${attemptedAt})`)
    console.info('routeStopCount', stopCount)
    console.info('batchLimit', ROUTE_OPTIMIZATION_BATCH_STOPS)

    if (stopCount === 0) {
      console.warn('No route stops')
      console.groupEnd()
      setRouteActionMessage({ tone: 'error', text: uiText.routes.optimization.noStops, persistent: true })
      setDebug({ status: 'error', message: uiText.routes.optimization.noStops })
      return
    }

    const invalidStops = routeProspects
      .map((stop) => ({ stop, location: resolveDirectionsLocation(stop) }))
      .filter((entry) => !entry.location)

    if (invalidStops.length > 0) {
      const firstInvalid = invalidStops[0]?.stop
      const message = firstInvalid
        ? uiText.routes.optimization.invalidStop(firstInvalid.businessName)
        : uiText.routes.optimization.error
      console.warn('Invalid stops for directions', invalidStops.map((entry) => entry.stop.businessName))
      console.groupEnd()
      setRouteActionMessage({ tone: 'error', text: message, persistent: true })
      setDebug({ status: 'error', message })
      return
    }

    const mapsReady = await waitForGoogleMaps()
    if (!mapsReady) {
      console.warn('Google Maps JS not available')
      console.groupEnd()
      setRouteActionMessage({ tone: 'error', text: uiText.routes.optimization.error, persistent: true })
      setDebug({ status: 'error', message: uiText.routes.optimization.error })
      return
    }

    const origin =
      originResolved ??
      (routeProspects[0] ? resolveDirectionsLocation(routeProspects[0]) : null)

    if (!origin) {
      console.warn('No origin available')
      console.groupEnd()
      setRouteActionMessage({ tone: 'error', text: uiText.routes.optimization.error, persistent: true })
      setDebug({ status: 'error', message: uiText.routes.optimization.error })
      return
    }

    setRouteOptimization({ status: 'loading' })
    setRouteActionMessage(null)
    setDebug({ status: 'loading' })

    const directionsStops = routeProspects.map(prospectToRouteDirectionsStop)
    const optimization = await optimizeRouteStopOrder({
      origin,
      stops: directionsStops,
      travelMode: getGoogleDirectionsTravelMode(travelMode),
      batchStopLimit: ROUTE_OPTIMIZATION_BATCH_STOPS,
    })

    console.info('optimizeRouteStopOrder', optimization)
    console.groupEnd()

    const okStatus = String(google.maps.DirectionsStatus.OK)
    const distanceMiles = metersToMiles(optimization.distanceMeters)
    const driveMinutes = secondsToMinutes(optimization.durationSeconds)
    const waypointCount = Math.max(0, Math.min(optimization.optimizedStopCount, stopCount) - 1)

    if (optimization.status !== okStatus && optimization.status !== 'NO_STOPS') {
      setRouteOptimization({ status: 'idle' })
      setRouteActionMessage({ tone: 'error', text: uiText.routes.optimization.error, persistent: true })
      setDebug({
        status: 'error',
        directionsStatus: optimization.status,
        message: uiText.routes.optimization.error,
        origin,
        waypointCount,
        optimizedCount: optimization.optimizedStopCount,
        skippedCount: optimization.skippedStopCount,
        batched: optimization.batched,
      })
      return
    }

    const currentKey = routeIds.join('|')
    const optimizedKey = optimization.orderedIds.join('|')
    const orderChanged = optimizedKey !== currentKey

    if (orderChanged) {
      setRouteIds(optimization.orderedIds)
    }

    setRouteOptimization({
      status: 'success',
      forRouteKey: optimizedKey,
      distanceMiles,
      driveMinutes,
      optimizedCount: optimization.optimizedStopCount,
      skippedCount: optimization.skippedStopCount,
      batched: optimization.batched,
    })
    setDebug({
      status: 'success',
      directionsStatus: optimization.status,
      origin,
      waypointCount,
      optimizedCount: optimization.optimizedStopCount,
      skippedCount: optimization.skippedStopCount,
      batched: optimization.batched,
    })

    if (optimization.batched) {
      setRouteActionMessage({
        tone: 'info',
        text: uiText.routes.optimization.largeRouteBatch(ROUTE_OPTIMIZATION_BATCH_STOPS),
        persistent: true,
      })
    }

    setActionToast({ type: 'success', text: uiText.routes.optimization.optimized })
    await loadRouteNavigationDirections()

    if (routeCalculationContext) {
      setRouteCalculationContext({ ...routeCalculationContext })
    }
  }

  function clearRoute() {
    setRouteIds([])
  }

  function handleCalculateRouteFromSearch() {
    if (routeIds.length === 0) {
      return
    }

    const filterSummary = summarizeSearchFilters({
      selectedIndustries,
      radiusLabel: effectiveRadiusMiles
        ? uiText.search.filters.radius(effectiveRadiusMiles)
        : uiText.search.filters.radius(10),
      market: manualMarket,
      usesCurrentLocation: searchRadiusChoice === 'current-location',
    })

    setInvalidStopsDismissedForRouteKey(null)
    setRouteCalculationContext({ filterSummary })
    pendingRouteScrollTargetRef.current = 'summary'
    setActiveView('map')
  }

  function toggleExpandedProspect(prospectId: string) {
    setExpandedProspectId((current) => (current === prospectId ? null : prospectId))
  }

  function toggleIndustrySelection(industry: SearchIndustry) {
    setSelectedIndustries((current) =>
      current.includes(industry)
        ? current.filter((entry) => entry !== industry)
        : [...current, industry],
    )
  }

  function toggleIndustryGroup(groupLabel: string) {
    setCollapsedIndustryGroups((current) => ({
      ...current,
      [groupLabel]: !current[groupLabel],
    }))
  }

  function selectAllIndustries() {
    setSelectedIndustries(SEARCH_INDUSTRY_OPTIONS)
  }

  function clearAllIndustries() {
    setSelectedIndustries([])
  }

  async function resolveMarketSearchCenter(market: string) {
    const result = await searchGooglePlaces({
      apiKey: googleMapsApiKey,
      query: market,
      maxResultCount: 1,
    })

    if (!result.ok) {
      return {
        ok: false as const,
        error: result.error,
        details: result.details,
      }
    }

    const placeWithLocation = result.places.find(
      (place) =>
        typeof place.location?.latitude === 'number' && typeof place.location?.longitude === 'number',
    )

    if (!placeWithLocation?.location) {
      return {
        ok: false as const,
        error: `No searchable location was found for ${market}.`,
        details: result.places,
      }
    }

    return {
      ok: true as const,
      center: {
        lat: placeWithLocation.location.latitude ?? AUSTIN_FALLBACK.lat,
        lng: placeWithLocation.location.longitude ?? AUSTIN_FALLBACK.lng,
      },
    }
  }

  async function runLiveSearch({
    market,
    industries,
  }: {
    market: string
    industries: SearchIndustry[]
  }) {
    const trimmedMarket = market.trim()
    const searchTerms = industries

    if (searchTerms.length === 0) {
      setLiveSearchIds([])
      setSearchStatus({
        source: 'api-error',
        message: uiText.errors.searchMissingFields,
        details: uiText.errors.searchMissingFieldsDetail,
      })
      return
    }

    if (!effectiveRadiusMiles) {
      setLiveSearchIds([])
      setSearchStatus({
        source: 'api-error',
        message: `${uiText.search.customRadiusLabel} is required.`,
        details: `${uiText.search.customRadiusLabel} must be greater than 0.`,
      })
      return
    }

    const shouldUseCurrentLocation = searchRadiusChoice === 'current-location' || !trimmedMarket
    let activeSearchCenter: { lat: number; lng: number } | null = null
    let fallbackLocationLabel = trimmedMarket || uiText.routes.currentLocation

    if (shouldUseCurrentLocation) {
      if (searchLocationState !== 'granted' || !searchCenter) {
        setLiveSearchIds([])
        setSearchStatus({
          source: 'api-error',
          message: uiText.errors.locationRequired,
          details: uiText.search.location.denied,
        })
        return
      }

      activeSearchCenter = searchCenter
      fallbackLocationLabel = uiText.routes.currentLocation
    } else {
      const marketCenterResult = await resolveMarketSearchCenter(trimmedMarket)

      if (!marketCenterResult.ok) {
        setLiveSearchIds([])
        setSearchStatus({
          source: 'api-error',
          message: marketCenterResult.error,
          details:
            typeof marketCenterResult.details === 'string'
              ? marketCenterResult.details
              : undefined,
        })
        return
      }

      activeSearchCenter = marketCenterResult.center
    }

    setIsSearchingPlaces(true)

    try {
      const filterSummary = summarizeSearchFilters({
        selectedIndustries: industries,
        radiusLabel: uiText.search.filters.radius(effectiveRadiusMiles),
        market: shouldUseCurrentLocation ? '' : trimmedMarket,
        usesCurrentLocation: shouldUseCurrentLocation,
      })
      const radiusHardFilterSummary = uiText.search.radiusHardFilterSummary(
        effectiveRadiusMiles,
        shouldUseCurrentLocation ? uiText.routes.currentLocation : trimmedMarket,
      )
      const locationBias = {
        latitude: activeSearchCenter.lat,
        longitude: activeSearchCenter.lng,
        radiusMeters: milesToMeters(effectiveRadiusMiles),
      }

      console.groupCollapsed('[RepRoute] Live Search radius filter')
      console.info('selectedRadiusMiles', effectiveRadiusMiles)
      console.info('searchCenter', activeSearchCenter)
      console.info('radiusMeters (API hint)', locationBias.radiusMeters)
      console.info('market', trimmedMarket)
      console.info('usesCurrentLocation', shouldUseCurrentLocation)
      console.groupEnd()

      const results = await Promise.all(
        searchTerms.map(async (term) => ({
          term,
          result: await searchGooglePlaces({
            apiKey: googleMapsApiKey,
            query: trimmedMarket && !shouldUseCurrentLocation ? `${term} ${trimmedMarket}`.trim() : term,
            maxResultCount: 8,
            locationBias,
          }),
        })),
      )

      const successfulResults: Array<{
        term: string
        result: { ok: true; places: GooglePlacesApiPlace[]; query: string }
      }> = []
      const failedResults: Array<{
        term: string
        result: { ok: false; error: string; details: unknown; query: string; status: number | null }
      }> = []

      for (const entry of results) {
        if (entry.result.ok) {
          successfulResults.push({
            term: entry.term,
            result: entry.result,
          })
        } else {
          failedResults.push({
            term: entry.term,
            result: entry.result,
          })
        }
      }

      const dedupedPlaces = dedupePlaces(
        successfulResults.flatMap((entry) => entry.result.places),
      )
      const normalizedProspectsWithDistance = dedupedPlaces.reduce<
        Array<{ prospect: BaseProspect; distanceMilesPrecise: number; lat: number; lng: number }>
      >((collection, place) => {
        const lat = place.location?.latitude
        const lng = place.location?.longitude
        if (typeof lat !== 'number' || typeof lng !== 'number') {
          return collection
        }

        const matchingEntry = successfulResults.find((entry) =>
          entry.result.places.some((candidate) =>
            candidate.id && place.id
              ? candidate.id === place.id
              : candidate.displayName?.text === place.displayName?.text &&
                candidate.formattedAddress === place.formattedAddress,
          ),
        )
        const distanceMilesPrecise = calculateDistanceMilesPrecise(activeSearchCenter, { lat, lng })
        const prospect = toLiveProspect(
          place,
          matchingEntry?.term ?? industries[0],
          fallbackLocationLabel,
          activeSearchCenter,
          distanceMilesPrecise,
        )

        if (prospect && Number.isFinite(distanceMilesPrecise)) {
          collection.push({ prospect, distanceMilesPrecise, lat, lng })
        }

        return collection
      }, [])

      const withinRadius = normalizedProspectsWithDistance.filter(
        (entry) => entry.distanceMilesPrecise <= effectiveRadiusMiles,
      )
      withinRadius.sort((a, b) => a.distanceMilesPrecise - b.distanceMilesPrecise)
      const normalizedProspects = withinRadius.map((entry) => entry.prospect)

      console.groupCollapsed('[RepRoute] Live Search radius filter results')
      console.info('candidateCount', normalizedProspectsWithDistance.length)
      console.info('withinRadiusCount', normalizedProspects.length)
      console.table(
        normalizedProspectsWithDistance.map((entry) => ({
          id: entry.prospect.id,
          name: entry.prospect.businessName,
          lat: entry.lat,
          lng: entry.lng,
          distanceMiles: Number(entry.distanceMilesPrecise.toFixed(2)),
          withinRadius: entry.distanceMilesPrecise <= effectiveRadiusMiles,
        })),
      )
      console.groupEnd()

      if (normalizedProspects.length > 0) {
        setLiveProspects((current) => mergeProspectCatalog(current, normalizedProspects))
        setLiveSearchIds(normalizedProspects.map((prospect) => prospect.id))
        setSearchStatus({
          source: 'live',
          message: uiText.search.statusMessages.liveResults(
            normalizedProspects.length,
            filterSummary || 'your filters',
          ),
          details:
            failedResults.length > 0
              ? `${uiText.errors.searchFailedDetail} ${failedResults
                  .map((entry) => `${entry.term}: ${entry.result.error}`)
                  .join(' | ')}`
              : undefined,
          resultsCount: normalizedProspects.length,
          query: radiusHardFilterSummary,
        })
        return
      }

      setLiveSearchIds([])
      if (failedResults.length > 0) {
        setSearchStatus({
          source: 'api-error',
          message: failedResults[0]?.result.error ?? uiText.errors.searchFailedDetail,
          details: failedResults.map((entry) => `${entry.term}: ${entry.result.error}`).join(' | '),
          query: radiusHardFilterSummary,
        })
      } else {
        setSearchStatus({
          source: 'live',
          message:
            normalizedProspectsWithDistance.length > 0
              ? uiText.search.statusMessages.noLiveResultsWithinRadius
              : uiText.search.statusMessages.noLiveResults(filterSummary || 'your filters'),
          resultsCount: 0,
          query: radiusHardFilterSummary,
        })
      }
    } finally {
      setIsSearchingPlaces(false)
    }
  }

  async function handleLiveSearch(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    await runLiveSearch({
      market: manualMarket,
      industries: selectedIndustries,
    })
  }

  async function handleTestGooglePlacesConnection() {
    setConnectionTest({
      status: 'running',
      message: uiText.errors.googlePlacesConnectionRunning,
    })

    const result = await searchGooglePlaces({
      apiKey: googleMapsApiKey,
      query: 'equipment rental Austin TX',
      maxResultCount: 8,
    })

    if (result.ok) {
      setConnectionTest({
        status: 'success',
        message: uiText.errors.googlePlacesConnectionSucceeded,
        resultsCount: result.places.length,
      })
      return
    }

    setConnectionTest({
      status: 'error',
      message: uiText.errors.googlePlacesConnectionFailed,
      details: result.error,
      resultsCount: 0,
    })
  }

  async function handleNotificationPermissionRequest() {
    const permission = await requestBrowserNotificationPermission()
    setNotificationPermission(permission)

    if (permission === 'granted') {
      setNotificationPreferences((current) => ({ ...current, enabled: true }))
      setNotificationMessage({
        type: 'success',
        text: uiText.settings.notifications.messages.permissionGranted,
      })
      return
    }

    if (permission === 'denied') {
      setNotificationPreferences((current) => ({ ...current, enabled: false }))
      setNotificationMessage({
        type: 'error',
        text: uiText.settings.notifications.messages.permissionDenied,
      })
      return
    }

    setNotificationPreferences((current) => ({ ...current, enabled: false }))
    setNotificationMessage({
      type: permission === 'unsupported' ? 'error' : 'info',
      text:
        permission === 'unsupported'
          ? uiText.settings.notifications.messages.permissionUnsupported
          : uiText.settings.notifications.permissionPromptDescription,
    })
  }

  async function handleToggleNotificationsEnabled() {
    if (notificationPermission === 'unsupported') {
      setNotificationMessage({
        type: 'error',
        text: uiText.settings.notifications.messages.permissionUnsupported,
      })
      return
    }

    if (!notificationPreferences.enabled) {
      if (notificationPermission !== 'granted') {
        await handleNotificationPermissionRequest()
        return
      }

      setNotificationPreferences((current) => ({ ...current, enabled: true }))
      setNotificationMessage({
        type: 'success',
        text: uiText.settings.notifications.messages.reminderDelivered,
      })
      return
    }

    setNotificationPreferences((current) => ({ ...current, enabled: false }))
    setNotificationMessage({
      type: 'info',
      text: uiText.settings.notifications.messages.notificationsDisabled,
    })
  }

  function updateNotificationPreferences(
    updates: Partial<NotificationPreferences> | ((current: NotificationPreferences) => NotificationPreferences),
  ) {
    setNotificationPreferences((current) =>
      typeof updates === 'function' ? updates(current) : { ...current, ...updates },
    )
    setNotificationMessage(null)
  }

  function openImportPicker() {
    importFileInputRef.current?.click()
  }

  function openSettingsPanel(section: SettingsSection) {
    pendingSettingsSectionRef.current = section
    setActiveView('settings')
    setAccountMenuOpen(false)
    setAccountMenuMessage(null)

    if (activeView === 'settings') {
      window.requestAnimationFrame(() => {
        if (pendingSettingsSectionRef.current) {
          scrollToSettingsSection(pendingSettingsSectionRef.current)
          pendingSettingsSectionRef.current = null
        }
      })
    }
  }

  function handlePlaceholderSignIn() {
    setAccountMenuOpen(false)
    setAccountMenuMessage({
      type: 'info',
      text: uiText.navigation.accountMenu.signInPlaceholder,
    })
  }

  function handleDownloadCrmExport() {
    if (crmExportPreview.records.length === 0) {
      setCrmExportMessage({
        type: 'error',
        text: uiText.errors.noCrmDataForScope,
      })
      return
    }

    try {
      const csv = buildCsvContent(crmExportPreview.columns, crmExportPreview.rows)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      const dateStamp = new Date().toISOString().slice(0, 10)

      link.href = url
      link.download = `${crmExportPreview.profile.fileStem}-${crmExportScope}-${dateStamp}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => window.URL.revokeObjectURL(url), 0)

      setCrmExportMessage({
        type: 'success',
        text: uiText.crmExport.successMessage(
          crmExportPreview.records.length,
          crmExportPreview.profile.label,
        ),
      })
    } catch {
      setCrmExportMessage({
        type: 'error',
        text: uiText.errors.crmExportFailed,
      })
    }
  }

  async function handleExportBackup() {
    try {
      const prospectRecordsForBackup = await enrichProspectRecordsForBackup(prospectRecords)
      const backup: BackupFile = {
        app: 'RepRoute',
        version: 1,
        exportedAt: new Date().toISOString(),
        data: {
          ...currentBackupPayload,
          prospectRecords: prospectRecordsForBackup,
        },
      }

      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: 'application/json',
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      const dateStamp = new Date().toISOString().slice(0, 10)

      link.href = url
      link.download = `reproute-backup-${dateStamp}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => window.URL.revokeObjectURL(url), 0)

      setBackupMessage({
        type: 'success',
        text: uiText.errors.backupExported,
      })
    } catch {
      setBackupMessage({
        type: 'error',
        text: uiText.errors.backupExportFailed,
      })
    }
  }

  async function handleImportSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    try {
      const rawText = await file.text()
      const parsed = JSON.parse(rawText) as unknown
      const payload = sanitizeBackupPayload(parsed)
      const exportedAt =
        isRecord(parsed) &&
        typeof parsed.exportedAt === 'string' &&
        !Number.isNaN(Date.parse(parsed.exportedAt))
          ? parsed.exportedAt
          : new Date().toISOString()

      setImportPreview({
        fileName: file.name,
        exportedAt,
        payload,
      })
      setBackupMessage({
        type: 'success',
        text: uiText.errors.backupLoaded,
      })
    } catch (error) {
      setImportPreview(null)
      setBackupMessage({
        type: 'error',
        text: error instanceof Error ? error.message : uiText.errors.backupReadFailed,
      })
    } finally {
      event.target.value = ''
    }
  }

  function cancelImportPreview() {
    setImportPreview(null)
    setBackupMessage(null)
  }

  async function confirmImport() {
    if (!importPreview) {
      return
    }

    const restoredRecords = await restoreProspectRecordsFromBackup(importPreview.payload.prospectRecords)

    setLiveProspects(importPreview.payload.liveProspects)
    setSavedIds(importPreview.payload.savedProspects)
    setRouteIds(importPreview.payload.routeList)
    setProspectRecords(restoredRecords)
    setFollowUpEntries(sanitizeFollowUpStore(importPreview.payload.followUpEntries ?? {}))
    setExpandedProspectId(null)
    setLiveSearchIds([])
    setSearchStatus(null)
    setImportPreview(null)
    setBackupMessage({
      type: 'success',
      text: uiText.errors.backupImported(importPreview.fileName),
    })
  }

  function renderMapView() {
    if (routeNavigationOpen && routeProspects.length > 0) {
      return (
        <RouteNavigationView
          routeProspects={routeProspects}
          navigationStops={navigationStops}
          directions={routeNavigationDirections}
          directionsApiStatus={routeDirectionsApiStatus}
          directionsLoading={routeNavigationLoading}
          directionsError={routeNavigationError}
          onRouteLineRenderStatusChange={handleRouteLineRenderStatusChange}
          userLocation={routeTrackerLocation}
          activeStopId={navigationActiveStopId}
          arrivedStopIds={navigationArrivedStopIds}
          legByStopId={navigationLegByStopId}
          completedStops={completedRouteStops}
          remainingStops={remainingRouteStops}
          completionPercentage={completionPercentage}
          routeMiles={routeMiles}
          estimatedDriveMinutes={estimatedDriveMinutes}
          onClose={closeRouteNavigation}
          onOpenMaps={handleOpenRouteInMaps}
          onSelectStop={setNavigationActiveStopId}
          onMarkArrived={handleNavigationMarkArrived}
          onMarkCompleted={handleNavigationMarkCompleted}
          onUpdateVisitNote={updateVisitNote}
          onUpdateOutcome={updateVisitOutcome}
        />
      )
    }

    return (
      <>
        {showInvalidStopsPanel ? (
          <InvalidStopsPanel
            invalidStops={invalidStops}
            onRemoveStop={removeStopFromRoute}
            onEditAddress={(prospectId) => setEditAddressProspectId(prospectId)}
            onRemoveInvalidAndRecalculate={() => void removeInvalidStopsAndRecalculate()}
            onDismiss={dismissInvalidStopsForCurrentRoute}
          />
        ) : null}

        {routeProspects.length > 0 ? (
          <>
            {routeCalculationContext ? (
              <section
                ref={routeCalculationSummaryRef}
                className="panel section-panel route-calculation-summary"
              >
                <div className="eyebrow eyebrow--tight">{uiText.routes.calculation.eyebrow}</div>
                <h2 className="section-heading">{uiText.routes.calculation.summaryHeading}</h2>
                <p className="section-copy">{uiText.routes.calculation.stopCount(routeProspects.length)}</p>
                <p className="editor-hint">{uiText.routes.calculation.filters(routeCalculationContext.filterSummary)}</p>
                {validRouteStopCount >= 2 ? (
                  <div className="status-banner status-banner--info route-calculation-summary__prompt">
                    <p>{uiText.routes.calculation.readyToOptimize}</p>
                  </div>
                ) : (
                  <p className="section-copy">{uiText.routes.calculation.singleStopHint}</p>
                )}
              </section>
            ) : null}

            <section className="panel section-panel route-toolbar">
              <div className="route-toolbar__focus">
                {currentRouteStop ? (
                  <div>
                    <span className="field-label">{uiText.routes.inAppNavigation.currentStopLabel}</span>
                    <strong>{currentRouteStop.businessName}</strong>
                  </div>
                ) : null}
                {nextRouteStopAfterCurrent ? (
                  <div>
                    <span className="field-label">{uiText.routes.inAppNavigation.nextStopLabel}</span>
                    <strong>{nextRouteStopAfterCurrent.businessName}</strong>
                  </div>
                ) : null}
              </div>

              <div className="route-progress-track" aria-hidden="true">
                <span
                  className="route-progress-track__fill"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>

              <div className="inline-summary inline-summary--compact">
                <span className="meta-pill">
                  {uiText.routes.inAppNavigation.completedCount(completedRouteStops)}
                </span>
                <span className="meta-pill">
                  {uiText.routes.inAppNavigation.etaLabel}: {formatDriveTime(estimatedDriveMinutes)}
                </span>
                <span className="meta-pill">
                  {uiText.routes.inAppNavigation.distanceLabel}: {routeMiles.toFixed(1)} mi
                </span>
              </div>

              {routeNavigationLoading ? (
                <div className="status-banner status-banner--info">
                  <p>{uiText.routes.inAppNavigation.loadingRoute}</p>
                </div>
              ) : null}

              {routeNavigationError ? (
                <div className="status-banner status-banner--error">
                  <p>{routeNavigationError}</p>
                </div>
              ) : null}

              <div className="button-row route-toolbar__actions">
                <button type="button" className="button button--wide" onClick={() => void startRouteNavigation()}>
                  <Navigation size={16} />
                  {uiText.routes.inAppNavigation.startRoute}
                </button>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => scheduleOptimizeRoute()}
                  disabled={routeOptimization.status === 'loading'}
                >
                  <Route size={16} />
                  {routeOptimization.status === 'loading'
                    ? uiText.routes.optimization.optimizing
                    : uiText.routes.optimization.button}
                </button>
                <BusinessCardScanButton
                  className="button button--ghost"
                  onFileSelected={(file) => handleRouteBusinessCardCapture(undefined, file)}
                />
              </div>

              <CardMoreActions>
                <button type="button" className="button button--ghost" onClick={clearRoute}>
                  <Trash2 size={16} />
                  {uiText.routes.clearRoute}
                </button>
              </CardMoreActions>
            </section>

            <section ref={routeMapSectionRef} className="panel section-panel route-map-panel">
              {routeActionMessage ? (
                <div className={`status-banner status-banner--${routeActionMessage.tone}`}>
                  <p>{routeActionMessage.text}</p>
                </div>
              ) : null}

              {routeOptimization.status === 'success' && routeOptimization.forRouteKey === routeIds.join('|') ? (
                <div className="status-banner status-banner--success">
                  <p>
                    {uiText.routes.optimization.totalDriveTime(formatDriveTime(routeOptimization.driveMinutes))} ·{' '}
                    {uiText.routes.optimization.totalDistance(routeOptimization.distanceMiles.toFixed(1))}
                  </p>
                </div>
              ) : null}

              <RepRouteMap
                markers={mapMarkers}
                directions={routeNavigationDirections}
                directionsApiStatus={routeDirectionsApiStatus}
                userLocation={routeTrackerLocation}
                activeRouteStopId={currentRouteStop?.id ?? null}
                onRouteLineRenderStatusChange={handleRouteLineRenderStatusChange}
                onToggleSaved={toggleSaved}
                onToggleRoute={toggleRoute}
              />

              <div className="route-map-external">
                <button
                  type="button"
                  className="button button--wide button--ghost route-map-external__button"
                  onClick={handleOpenRouteInMaps}
                >
                  <ExternalLink size={16} />
                  {uiText.routes.inAppNavigation.openInMaps}
                </button>
                <p className="route-map-external__hint">{uiText.routes.inAppNavigation.openInMapsHint}</p>
              </div>

              <div className="route-diagnostics-summary inline-summary inline-summary--compact">
                <span className="meta-pill">
                  {uiText.routes.routeRender.stopCount(routeProspects.length)}
                </span>
                <span className="meta-pill">
                  {uiText.routes.routeRender.optimizedCount(
                    routeOptimization.status === 'success'
                      ? routeOptimization.optimizedCount
                      : routeOptimizationDebug?.optimizedCount ?? routeProspects.length,
                  )}
                </span>
                <span className="meta-pill">
                  {uiText.routes.routeRender.skippedCount(
                    routeOptimization.status === 'success'
                      ? routeOptimization.skippedCount
                      : routeOptimizationDebug?.skippedCount ?? 0,
                  )}
                </span>
                <span className="meta-pill">
                  {uiText.routes.routeRender.apiStatus(routeDirectionsApiStatus ?? '—')}
                </span>
              </div>

              {import.meta.env.DEV ? (
                <details className="route-diagnostics">
                  <summary className="filter-dropdown__trigger">
                    {uiText.routes.routeRender.diagnosticsHeading}
                  </summary>
                  <div className="filter-dropdown__panel">
                    <div className="inline-summary">
                      <span>
                        {uiText.routes.routeRender.validStops(routeRenderDebug?.validStopCount ?? routeProspects.length)}
                      </span>
                      <span>
                        {uiText.routes.routeRender.invalidRemoved(routeRenderDebug?.invalidRemovedCount ?? 0)}
                      </span>
                    </div>
                    <div className="inline-summary">
                      <span>
                        {uiText.routes.routeRender.routeStatus}: {routeRenderDebug?.routeStatus ?? 'idle'}
                      </span>
                      <span>
                        {routeRenderDebug?.mapReady
                          ? uiText.routes.routeRender.mapReady
                          : uiText.routes.routeRender.mapLoading}
                      </span>
                    </div>
                    <div className="inline-summary">
                      <span>
                        {uiText.routes.routeRender.directionsStatus}: {routeDirectionsApiStatus ?? '—'}
                      </span>
                      <span>
                        {uiText.routes.routeRender.rendererStatus}: {routeLineRenderStatus}
                      </span>
                    </div>
                    {routeRenderDebug?.usedFallback ? (
                      <div className="status-banner status-banner--info">
                        <p>{uiText.routes.routeRender.usedFallback}</p>
                      </div>
                    ) : null}
                    {routeRenderDebug?.autoRemovedStopNames.length ? (
                      <div className="status-banner status-banner--info">
                        <p>
                          {uiText.routes.routeRender.autoRemoved}:{' '}
                          {routeRenderDebug.autoRemovedStopNames.join(', ')}
                        </p>
                      </div>
                    ) : null}
                    <div className="inline-summary">
                      <span>
                        {uiText.routes.routeRender.optimizedCount(routeOptimizationDebug?.optimizedCount ?? 0)}
                      </span>
                      <span>
                        {uiText.routes.routeRender.skippedCount(routeOptimizationDebug?.skippedCount ?? 0)}
                      </span>
                      <span>Last optimize: {routeOptimizationDebug?.status ?? 'idle'}</span>
                      <span>
                        {routeOptimizationDebug?.directionsStatus
                          ? `Optimize API: ${routeOptimizationDebug.directionsStatus}`
                          : ''}
                      </span>
                    </div>
                    {routeOptimizationDebug?.message ? (
                      <div className="status-banner status-banner--error">
                        <p>{routeOptimizationDebug.message}</p>
                      </div>
                    ) : null}
                    <pre className="editor-hint" style={{ whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify({ routeRenderDebug, routeOptimizationDebug }, null, 2)}
                    </pre>
                  </div>
                </details>
              ) : null}
            </section>

            {currentStopProspect ? (
              <CurrentStopCard
                key={currentStopProspect.id}
                prospect={currentStopProspect}
                isOnLocation={Boolean(onLocationRouteStop)}
                distanceFeet={currentStopDistanceFeet}
                trackingMessage={routeTrackerMessage}
                isSaved={savedIds.includes(currentStopProspect.id)}
                isInRoute={routeIds.includes(currentStopProspect.id)}
                travelMode={travelMode}
                onNavigate={handleNavigateProspect}
                onOpenSaved={openSavedProspect}
                onFindFoodNearby={openFoodNearby}
                onRequestRemove={openRemoveProspectPrompt}
                onToggleCompleted={toggleRouteCompleted}
                onToggleSaved={toggleSaved}
                onToggleRoute={toggleRoute}
                onUpdateContactDetails={updateContactDetails}
                onUpdateNotes={updateProspectNotes}
                onUpdateVisitNote={updateVisitNote}
                onUpdateFollowUp={updateProspectFollowUp}
                onUpdatePriority={updateProspectPriority}
                onUpdateOutcome={updateVisitOutcome}
                cardPreviewUrl={businessCardPreviewUrls[currentStopProspect.id] ?? null}
                onRemoveBusinessCard={removeBusinessCard}
                onRouteBusinessCardCapture={(file) =>
                  handleRouteBusinessCardCapture(currentStopProspect.id, file)
                }
              />
            ) : null}

            <section className="panel section-panel section-panel--compact">
              <label className="field-group">
                <span className="field-label">{uiText.routes.optimization.startingLocationLabel}</span>
                <div className="search-field">
                  <MapIcon size={18} />
                  <input
                    type="search"
                    value={routeStartLocation}
                    onChange={(event) => setRouteStartLocation(event.target.value)}
                    placeholder={uiText.routes.optimization.startingLocationPlaceholder}
                    aria-label={uiText.routes.optimization.startingLocationLabel}
                  />
                </div>
                <div className="button-row">
                  <button
                    type="button"
                    className="button button--ghost"
                    onClick={() => {
                      if (isFiniteLatLng(routeTrackerLocation)) {
                        const currentLocation = routeTrackerLocation as { lat: number; lng: number }
                        setRouteStartLocation(`${currentLocation.lat},${currentLocation.lng}`)
                        setRouteActionMessage(null)
                        return
                      }

                      setRouteActionMessage({ tone: 'info', text: uiText.routes.optimization.locationOffMessage })
                    }}
                  >
                    {uiText.routes.optimization.useCurrentLocation}
                  </button>
                </div>
              </label>

              <DndContext
                sensors={routeSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleRouteDragEnd}
              >
                <SortableContext
                  items={routeProspects.map((prospect) => prospect.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="route-workflow-stack">
                    {routeProspects.map((prospect, index) => (
                      <RouteWorkflowStopCard
                        key={prospect.id}
                        index={index}
                        prospect={prospect}
                        isCurrentStop={currentStopProspect?.id === prospect.id}
                        isOnLocation={onLocationRouteStop?.prospect.id === prospect.id}
                        isSaved={savedIds.includes(prospect.id)}
                        travelMode={travelMode}
                        onNavigate={handleNavigateProspect}
                        onOpenSaved={openSavedProspect}
                        onFindFoodNearby={openFoodNearby}
                        onToggleCompleted={toggleRouteCompleted}
                        onToggleSaved={toggleSaved}
                        onToggleRoute={toggleRoute}
                        onUpdatePriority={updateProspectPriority}
                        onUpdateVisitNote={updateVisitNote}
                        onUpdateOutcome={updateVisitOutcome}
                        onRemove={openRemoveProspectPrompt}
                        cardPreviewUrl={businessCardPreviewUrls[prospect.id] ?? null}
                        onRemoveBusinessCard={removeBusinessCard}
                        onRouteBusinessCardCapture={(file) =>
                          handleRouteBusinessCardCapture(prospect.id, file)
                        }
                        onUpdateContactDetails={updateContactDetails}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </section>
          </>
        ) : (
          <EmptyState
            title={uiText.emptyStates.noRouteTitle}
            copy={uiText.emptyStates.noRouteCopy}
            icon={MapIcon}
            actionLabel={uiText.saved.emptyAction}
            onAction={() => setActiveView('search')}
          />
        )}
      </>
    )
  }

  function renderSearchView() {
    const showLocationBanner =
      searchLocationState === 'denied' || searchLocationState === 'unsupported'

    return (
      <>
        <section className="panel section-panel section-panel--compact">
          {showLocationBanner ? (
            <div
              className={`status-banner ${
                searchLocationState === 'denied' ? 'status-banner--error' : 'status-banner--info'
              }`}
            >
              <p>
                {searchLocationState === 'denied'
                  ? uiText.search.locationPanel.blocked
                  : uiText.search.location.unsupported}
              </p>
              {searchLocationState === 'denied' ? (
                <button type="button" className="text-button" onClick={requestSearchLocationAccess}>
                  {uiText.search.locationPanel.turnOn}
                </button>
              ) : null}
            </div>
          ) : searchLocationState !== 'granted' ? (
            <button type="button" className="button button--ghost button--wide" onClick={requestSearchLocationAccess}>
              {uiText.search.locationPanel.turnOn}
            </button>
          ) : null}

          <form className="live-search-form" onSubmit={handleLiveSearch}>
            <label className="field-group">
              <span className="field-label">{uiText.search.marketLabel}</span>
              <div className="search-field">
                <MapIcon size={18} />
                <input
                  type="search"
                  value={manualMarket}
                  onChange={(event) => setManualMarket(event.target.value)}
                  placeholder={uiText.search.marketPlaceholder}
                  aria-label={uiText.search.marketLabel}
                />
              </div>
            </label>

            <label className="field-group">
              <span className="field-label">{uiText.search.radiusLabel}</span>
              <select
                className="text-input filter-select"
                value={String(searchRadiusChoice)}
                onChange={(event) => {
                  const nextValue = event.target.value

                  if (nextValue === 'current-location' || nextValue === 'custom') {
                    setSearchRadiusChoice(nextValue)
                    return
                  }

                  setSearchRadiusChoice(Number(nextValue) as SearchRadiusMiles)
                }}
              >
                <option value="current-location">{uiText.search.radiusOptionLabels.currentLocation}</option>
                {SEARCH_RADIUS_OPTIONS.map((radius) => (
                  <option key={radius} value={radius}>
                    {uiText.search.filters.radius(radius)}
                  </option>
                ))}
                <option value="custom">{uiText.search.radiusOptionLabels.custom}</option>
              </select>
            </label>

            {searchRadiusChoice === 'custom' ? (
              <label className="field-group">
                <span className="field-label">{uiText.search.customRadiusLabel}</span>
                <div className="search-field">
                  <Route size={18} />
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    step="1"
                    value={customRadiusMiles}
                    onChange={(event) => setCustomRadiusMiles(event.target.value)}
                    placeholder="35"
                    aria-label={uiText.search.customRadiusLabel}
                  />
                </div>
              </label>
            ) : null}

            <div className="field-group">
              <span className="field-label">{uiText.search.industriesLabel}</span>
              <details
                className="filter-dropdown"
                open={industryDropdownOpen}
                onToggle={(event) => setIndustryDropdownOpen(event.currentTarget.open)}
              >
                <summary className="filter-dropdown__trigger">
                  <span>{uiText.search.industriesSelected(selectedIndustries.length)}</span>
                  <ChevronDown size={16} />
                </summary>
                <div className="filter-dropdown__panel">
                  <div className="filter-dropdown__toolbar">
                    <button type="button" className="text-button" onClick={selectAllIndustries}>
                      {uiText.search.industriesSelectAll}
                    </button>
                    <button type="button" className="text-button" onClick={clearAllIndustries}>
                      {uiText.search.industriesClearAll}
                    </button>
                  </div>
                  <label className="search-field filter-dropdown__search">
                    <Search size={16} />
                    <input
                      type="search"
                      value={industrySearchQuery}
                      onChange={(event) => setIndustrySearchQuery(event.target.value)}
                      placeholder={uiText.search.industriesSearchPlaceholder}
                      aria-label={uiText.search.industriesSearchPlaceholder}
                    />
                  </label>
                  <div className="filter-dropdown__groups">
                    {filteredIndustryGroups.length > 0 ? (
                      filteredIndustryGroups.map((group) => {
                        const groupOptions =
                          SEARCH_INDUSTRY_GROUPS.find((entry) => entry.label === group.label)?.options ?? group.options
                        const selectedCount = groupOptions.filter((industry) =>
                          selectedIndustries.includes(industry),
                        ).length
                        const isExpanded = normalizedIndustrySearchQuery
                          ? true
                          : !(collapsedIndustryGroups[group.label] ?? false)

                        return (
                          <section key={group.label} className="filter-dropdown__group">
                            <button
                              type="button"
                              className="filter-dropdown__group-toggle"
                              onClick={() => toggleIndustryGroup(group.label)}
                            >
                              <div className="filter-dropdown__group-copy">
                                <strong>{group.label}</strong>
                                <span>{uiText.search.industriesSectionSelected(selectedCount)}</span>
                              </div>
                              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                            {isExpanded ? (
                              <div className="filter-dropdown__group-options">
                                {group.options.map((industry) => (
                                  <label key={industry} className="filter-dropdown__option">
                                    <input
                                      type="checkbox"
                                      checked={selectedIndustries.includes(industry)}
                                      onChange={() => toggleIndustrySelection(industry)}
                                    />
                                    <span>{industry}</span>
                                  </label>
                                ))}
                              </div>
                            ) : null}
                          </section>
                        )
                      })
                    ) : (
                      <p className="filter-dropdown__empty">{uiText.search.industriesEmpty}</p>
                    )}
                  </div>
                </div>
              </details>
            </div>

            <button type="submit" className="button button--wide" disabled={isSearchingPlaces}>
              {isSearchingPlaces ? uiText.search.searchingButton : uiText.search.searchButton}
            </button>
          </form>

          {effectiveSearchStatus.source === 'api-error' ? (
            <div className="status-banner status-banner--error">
              <p>{effectiveSearchStatus.message}</p>
              {effectiveSearchStatus.details ? <p>{effectiveSearchStatus.details}</p> : null}
            </div>
          ) : effectiveSearchStatus.source === 'live' && searchResultProspects.length > 0 ? (
            <p className="inline-summary inline-summary--compact">
              {uiText.search.summary.results(searchResultProspects.length)}
            </p>
          ) : null}
        </section>

        <section className="panel section-panel search-route-calculate">
          <button
            type="button"
            className="button button--wide search-route-calculate__button"
            disabled={routeIds.length === 0}
            onClick={handleCalculateRouteFromSearch}
          >
            <Route size={18} />
            {uiText.routes.calculation.button}
          </button>
          <p className="search-route-calculate__hint">
            {routeIds.length === 0
              ? uiText.routes.calculation.emptyState
              : uiText.routes.calculation.stopCount(routeIds.length)}
          </p>
        </section>

        {searchResultProspects.length > 0 ? (
          <div className="live-results-stack">
            {searchResultProspects.map((prospect) => (
              <LiveSearchResultCard
                key={prospect.id}
                prospect={prospect}
                isSaved={savedIds.includes(prospect.id)}
                isInRoute={routeIds.includes(prospect.id)}
                travelMode={travelMode}
                onNavigate={handleNavigateProspect}
                onOpenSaved={openSavedProspect}
                onFindFoodNearby={openFoodNearby}
                onUpdatePriority={updateProspectPriority}
                onRequestRemove={openRemoveProspectPrompt}
                onToggleSaved={toggleSaved}
                onToggleRoute={toggleRoute}
                onToggleCompleted={toggleRouteCompleted}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title={
              !googleMapsApiKey
                ? uiText.emptyStates.connectGooglePlacesTitle
                : effectiveSearchStatus.source === 'api-error'
                  ? uiText.emptyStates.googlePlacesSearchFailedTitle
                  : uiText.emptyStates.noSearchResultsTitle
            }
            copy={
              !googleMapsApiKey
                ? uiText.emptyStates.noRealProspectsCopy
                : effectiveSearchStatus.source === 'api-error'
                  ? effectiveSearchStatus.message
                  : uiText.emptyStates.noSearchResultsCopy
            }
            icon={Search}
            actionLabel={
              effectiveSearchStatus.source === 'api-error' ? uiText.search.openSettings : undefined
            }
            onAction={
              effectiveSearchStatus.source === 'api-error'
                ? () => setActiveView('settings')
                : undefined
            }
          />
        )}
      </>
    )
  }

  function renderSavedView() {
    return (
      <>
        {savedProspects.length > 0 ? (
          <p className="inline-summary inline-summary--compact">
            {uiText.saved.countLabel(savedProspects.length)}
          </p>
        ) : null}

        {savedProspects.length > 0 ? (
          <div className="stack">
            {savedProspects.map((prospect) => (
              <ProspectCard
                key={prospect.id}
                prospect={prospect}
                isInRoute={routeIds.includes(prospect.id)}
                isExpanded={expandedProspectId === prospect.id}
                travelMode={travelMode}
                onNavigate={handleNavigateProspect}
                onFindFoodNearby={openFoodNearby}
                onRequestRemove={openRemoveProspectPrompt}
                onToggleRoute={toggleRoute}
                onToggleCompleted={toggleRouteCompleted}
                onToggleExpanded={toggleExpandedProspect}
                onUpdateNotes={updateProspectNotes}
                onUpdatePriority={updateProspectPriority}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title={uiText.emptyStates.noSavedTitle}
            copy={uiText.emptyStates.noSavedCopy}
            icon={Bookmark}
            actionLabel={uiText.saved.emptyAction}
            onAction={() => setActiveView('search')}
          />
        )}
      </>
    )
  }

  function renderFollowUpSection(title: string, sectionKey: string, entries: FollowUpEntry[]) {
    if (entries.length === 0) {
      return null
    }

    return (
      <section className="follow-up-section stack" key={sectionKey}>
        <div className="section-heading">
          <h2>{title}</h2>
          <span className="meta-pill">{entries.length}</span>
        </div>
        {entries.map((entry) => (
          <FollowUpCard
            key={entry.id}
            entry={entry}
            statusLabel={getFollowUpStatus(entry.followUpDate)}
            isEditing={editingFollowUpId === entry.prospectId}
            editDate={followUpEditDraft.date}
            editTime={followUpEditDraft.time}
            editNotes={followUpEditDraft.notes}
            onStartEdit={() => startFollowUpEdit(entry)}
            onCancelEdit={() => setEditingFollowUpId(null)}
            onSaveEdit={() => saveFollowUpEdit(entry.prospectId)}
            onEditDateChange={(value) => setFollowUpEditDraft((current) => ({ ...current, date: value }))}
            onEditTimeChange={(value) => setFollowUpEditDraft((current) => ({ ...current, time: value }))}
            onEditNotesChange={(value) => setFollowUpEditDraft((current) => ({ ...current, notes: value }))}
            onMarkComplete={() => markFollowUpComplete(entry.prospectId)}
            onReschedule={(date) => rescheduleFollowUp(entry.prospectId, date)}
            onNavigate={() => navigateFollowUp(entry)}
            onRemove={() => removeFollowUp(entry.prospectId)}
          />
        ))}
      </section>
    )
  }

  function renderFollowUpsView() {
    const hasFollowUps = Object.keys(followUpEntries).length > 0
    const pendingFollowUps = [
      ...followUpGroups.overdue,
      ...followUpGroups.today,
      ...followUpGroups.upcoming,
    ]

    return (
      <>
        {hasFollowUps ? (
          <div className="follow-up-sections stack">
            {renderFollowUpSection(uiText.followUps.sections.pending, 'pending', pendingFollowUps)}
            {renderFollowUpSection(uiText.followUps.sections.completed, 'completed', followUpGroups.completed)}
          </div>
        ) : (
          <EmptyState
            title={uiText.emptyStates.noFollowUpsTitle}
            copy={uiText.emptyStates.noFollowUpsCopy}
            icon={CalendarClock}
            actionLabel={uiText.onboarding.hotTargetsEmptyAction}
            onAction={() => setActiveView('search')}
          />
        )}
      </>
    )
  }

  function renderSettingsView() {
    return (
      <>
        <section ref={settingsTopRef} className="panel section-panel section-panel--compact">
          <div className="settings-stack">
            <label className="field-group">
              <span className="field-label">{uiText.settings.arrivalDetectionLabel}</span>
              <select
                className="text-input filter-select"
                value={arrivalDetectionRadiusFeet}
                onChange={(event) =>
                  setArrivalDetectionRadiusFeet(Number(event.target.value) as ArrivalDetectionRadiusFeet)
                }
              >
                {ARRIVAL_RADIUS_OPTIONS.map((radius) => (
                  <option key={radius} value={radius}>
                    {uiText.settings.arrivalDetectionOption(radius)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="panel section-panel section-panel--compact">
          <div className="section-heading">
            <h2>{uiText.settings.googlePlacesHeading}</h2>
            <span className="meta-pill">
              {googleMapsApiKey ? uiText.settings.apiKeyDetected : uiText.settings.apiKeyMissing}
            </span>
          </div>

          <button
            type="button"
            className="button"
            onClick={handleTestGooglePlacesConnection}
            disabled={connectionTest.status === 'running'}
          >
            {uiText.settings.testConnectionButton}
          </button>

          <div
            className={`status-banner ${
              connectionTest.status === 'error'
                ? 'status-banner--error'
                : connectionTest.status === 'success'
                  ? 'status-banner--success'
                  : 'status-banner--info'
            }`}
          >
            <p>{connectionTest.message}</p>
            {typeof connectionTest.resultsCount === 'number' ? (
              <p>{uiText.settings.resultsReturned(connectionTest.resultsCount)}</p>
            ) : null}
            {connectionTest.details ? <p>{uiText.settings.errorDetails(connectionTest.details)}</p> : null}
          </div>
        </section>

        <section ref={notificationSectionRef} className="panel section-panel section-panel--compact">
          <div className="section-heading">
            <h2>{uiText.settings.notifications.heading}</h2>
            <span className="meta-pill">{notificationPermissionLabel}</span>
          </div>

          {notificationPermission === 'unsupported' ? (
            <div className="status-banner status-banner--error">
              <p>{uiText.settings.notifications.messages.permissionUnsupported}</p>
            </div>
          ) : null}

          {notificationPermission !== 'granted' && notificationPermission !== 'unsupported' ? (
            <div className="notification-permission-card">
              <div className="notification-permission-card__copy">
                <BellRing size={18} />
                <div>
                  <strong>{uiText.settings.notifications.permissionPromptTitle}</strong>
                  <p>{uiText.settings.notifications.permissionPromptDescription}</p>
                </div>
              </div>
              <button
                type="button"
                className="button"
                onClick={() => void handleNotificationPermissionRequest()}
              >
                {uiText.settings.notifications.requestPermission}
              </button>
            </div>
          ) : null}

          {notificationMessage ? (
            <div className={`status-banner status-banner--${notificationMessage.type}`}>
              <p>{notificationMessage.text}</p>
            </div>
          ) : null}

          <div className="settings-stack notification-settings">
            <button
              type="button"
              className="setting-row notification-setting"
              onClick={() => void handleToggleNotificationsEnabled()}
            >
              <div>
                <strong>{uiText.settings.notifications.toggles.enable}</strong>
                <p>{uiText.settings.notifications.toggles.enableDescription}</p>
              </div>
              <span className="meta-pill">
                {notificationPreferences.enabled
                  ? uiText.settings.notifications.states.on
                  : uiText.settings.notifications.states.off}
              </span>
            </button>

            <button
              type="button"
              className={`setting-row notification-setting ${
                !notificationPreferences.enabled ? 'notification-setting--disabled' : ''
              }`}
              onClick={() =>
                notificationPreferences.enabled &&
                updateNotificationPreferences((current) => ({
                  ...current,
                  followUpAlerts: !current.followUpAlerts,
                }))
              }
              disabled={!notificationPreferences.enabled}
            >
              <div>
                <strong>{uiText.settings.notifications.toggles.followUps}</strong>
                <p>{uiText.settings.notifications.toggles.followUpsDescription}</p>
              </div>
              <span className="meta-pill">
                {notificationPreferences.followUpAlerts
                  ? uiText.settings.notifications.states.on
                  : uiText.settings.notifications.states.off}
              </span>
            </button>

            {notificationPreferences.enabled && notificationPreferences.followUpAlerts ? (
              <label className="field-group">
                <span className="field-label">{uiText.settings.notifications.followUpTimeLabel}</span>
                <input
                  className="text-input notification-time-input"
                  type="time"
                  value={notificationPreferences.followUpTime}
                  onChange={(event) =>
                    updateNotificationPreferences({ followUpTime: event.target.value })
                  }
                />
              </label>
            ) : null}

            <button
              type="button"
              className={`setting-row notification-setting ${
                !notificationPreferences.enabled ? 'notification-setting--disabled' : ''
              }`}
              onClick={() =>
                notificationPreferences.enabled &&
                updateNotificationPreferences((current) => ({
                  ...current,
                  dailyRouteReminder: !current.dailyRouteReminder,
                }))
              }
              disabled={!notificationPreferences.enabled}
            >
              <div>
                <strong>{uiText.settings.notifications.toggles.route}</strong>
                <p>{uiText.settings.notifications.toggles.routeDescription}</p>
              </div>
              <span className="meta-pill">
                {notificationPreferences.dailyRouteReminder
                  ? uiText.settings.notifications.states.on
                  : uiText.settings.notifications.states.off}
              </span>
            </button>

            {notificationPreferences.enabled && notificationPreferences.dailyRouteReminder ? (
              <label className="field-group">
                <span className="field-label">{uiText.settings.notifications.routeTimeLabel}</span>
                <input
                  className="text-input notification-time-input"
                  type="time"
                  value={notificationPreferences.dailyRouteTime}
                  onChange={(event) =>
                    updateNotificationPreferences({ dailyRouteTime: event.target.value })
                  }
                />
              </label>
            ) : null}

            <button
              type="button"
              className={`setting-row notification-setting ${
                !notificationPreferences.enabled ? 'notification-setting--disabled' : ''
              }`}
              onClick={() =>
                notificationPreferences.enabled &&
                updateNotificationPreferences((current) => ({
                  ...current,
                  overdueProspectAlerts: !current.overdueProspectAlerts,
                }))
              }
              disabled={!notificationPreferences.enabled}
            >
              <div>
                <strong>{uiText.settings.notifications.toggles.overdue}</strong>
                <p>{uiText.settings.notifications.toggles.overdueDescription}</p>
              </div>
              <span className="meta-pill">
                {notificationPreferences.overdueProspectAlerts
                  ? uiText.settings.notifications.states.on
                  : uiText.settings.notifications.states.off}
              </span>
            </button>

            {notificationPreferences.enabled && notificationPreferences.overdueProspectAlerts ? (
              <label className="field-group">
                <span className="field-label">{uiText.settings.notifications.overdueTimeLabel}</span>
                <input
                  className="text-input notification-time-input"
                  type="time"
                  value={notificationPreferences.overdueProspectTime}
                  onChange={(event) =>
                    updateNotificationPreferences({ overdueProspectTime: event.target.value })
                  }
                />
              </label>
            ) : null}
          </div>

        </section>

        <section ref={crmExportSectionRef} className="panel section-panel section-panel--compact">
          <div className="section-heading">
            <h2>{uiText.crmExport.heading}</h2>
            <span className="meta-pill">{uiText.crmExport.rowsLabel(crmExportPreview.records.length)}</span>
          </div>

          <div className="field-group">
            <span className="field-label">{uiText.crmExport.exportFormatLabel}</span>
            <div className="crm-option-grid">
              {crmExportFormats.map((format) => (
                <button
                  type="button"
                  key={format.id}
                  className={`crm-option-card ${
                    crmExportFormat === format.id ? 'crm-option-card--active' : ''
                  }`}
                  onClick={() => {
                    setCrmExportFormat(format.id)
                    setCrmExportMessage(null)
                  }}
                >
                  <strong>{format.label}</strong>
                  <span>Future API target: {format.futureApiTarget}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="field-group">
            <span className="field-label">{uiText.crmExport.exportScopeLabel}</span>
            <div className="chip-row">
              {crmExportScopes.map((scope) => (
                <button
                  type="button"
                  key={scope.id}
                  className={`chip ${crmExportScope === scope.id ? 'chip--active' : ''}`}
                  onClick={() => {
                    setCrmExportScope(scope.id)
                    setCrmExportMessage(null)
                  }}
                >
                  {scope.label}
                </button>
              ))}
            </div>
          </div>

          {crmExportMessage ? (
            <div className={`status-banner status-banner--${crmExportMessage.type}`}>
              <p>{crmExportMessage.text}</p>
            </div>
          ) : null}

          <div className="crm-preview-panel">
            <div className="crm-preview-panel__header">
              <div>
                <div className="eyebrow eyebrow--tight">{uiText.crmExport.previewEyebrow}</div>
                <h3>{crmExportPreview.profile.label}</h3>
              </div>
              <span className="meta-pill">
                {uiText.crmExport.recordsLabel(crmExportPreview.records.length)}
              </span>
            </div>

            {crmExportPreview.records.length > 0 ? (
              <div className="crm-preview-table-wrap">
                <table className="crm-preview-table">
                  <thead>
                    <tr>
                      {crmExportPreview.columns.map((column) => (
                        <th key={column}>{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {crmExportPreview.rows.slice(0, 5).map((row, rowIndex) => (
                      <tr key={`${crmExportPreview.profile.id}-${rowIndex}`}>
                        {row.map((value, cellIndex) => (
                          <td key={`${crmExportPreview.profile.id}-${rowIndex}-${cellIndex}`}>
                            {value || uiText.crmExport.previewFallback}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title={uiText.emptyStates.noCrmDataTitle}
                copy={uiText.emptyStates.noCrmDataCopy}
                icon={Download}
              />
            )}
          </div>

          <button
            type="button"
            className="button"
            onClick={handleDownloadCrmExport}
            disabled={crmExportPreview.records.length === 0}
          >
            <Download size={16} />
            {uiText.crmExport.downloadLabel(crmExportPreview.profile.label)}
          </button>
        </section>

        <section ref={backupSectionRef} className="panel section-panel section-panel--compact">
          <div className="section-heading">
            <h2>{uiText.settings.backupHeading}</h2>
          </div>

          <input
            ref={importFileInputRef}
            className="hidden-input"
            type="file"
            accept="application/json,.json"
            onChange={handleImportSelection}
          />

          <div className="backup-actions">
            <button type="button" className="button" onClick={handleExportBackup}>
              <Download size={16} />
              {uiText.settings.exportJson}
            </button>
            <button type="button" className="button button--ghost" onClick={openImportPicker}>
              <Upload size={16} />
              {uiText.settings.importJson}
            </button>
          </div>

          {backupMessage ? (
            <div className={`status-banner status-banner--${backupMessage.type}`}>
              <p>{backupMessage.text}</p>
            </div>
          ) : null}

          <div className="backup-summary-grid">
            <div className="backup-summary-card">
              <span className="field-label">{uiText.settings.backupSummaryLabels.realProspects}</span>
              <strong>{currentBackupSummary.liveProspects}</strong>
            </div>
            <div className="backup-summary-card">
              <span className="field-label">{uiText.settings.backupSummaryLabels.savedProspects}</span>
              <strong>{currentBackupSummary.saved}</strong>
            </div>
            <div className="backup-summary-card">
              <span className="field-label">{uiText.settings.backupSummaryLabels.routeStops}</span>
              <strong>{currentBackupSummary.route}</strong>
            </div>
            <div className="backup-summary-card">
              <span className="field-label">{uiText.settings.backupSummaryLabels.notes}</span>
              <strong>{currentBackupSummary.notes}</strong>
            </div>
            <div className="backup-summary-card">
              <span className="field-label">{uiText.settings.backupSummaryLabels.priorityEdits}</span>
              <strong>{currentBackupSummary.priorities}</strong>
            </div>
            <div className="backup-summary-card">
              <span className="field-label">{uiText.settings.backupSummaryLabels.followUps}</span>
              <strong>{currentBackupSummary.followUps}</strong>
            </div>
          </div>

          {importPreview && importPreviewSummary ? (
            <div className="backup-preview">
              <div className="backup-preview__header">
                <div>
                  <div className="eyebrow eyebrow--tight">{uiText.settings.importPreviewEyebrow}</div>
                  <h3>{importPreview.fileName}</h3>
                  <p>{formatBackupTimestamp(importPreview.exportedAt)}</p>
                </div>
                <span className="meta-pill">{uiText.settings.readyToReplace}</span>
              </div>

              <div className="backup-summary-grid">
                <div className="backup-summary-card">
                  <span className="field-label">{uiText.settings.backupSummaryLabels.realProspects}</span>
                  <strong>{importPreviewSummary.liveProspects}</strong>
                </div>
                <div className="backup-summary-card">
                  <span className="field-label">{uiText.settings.backupSummaryLabels.savedProspects}</span>
                  <strong>{importPreviewSummary.saved}</strong>
                </div>
                <div className="backup-summary-card">
                  <span className="field-label">{uiText.settings.backupSummaryLabels.routeStops}</span>
                  <strong>{importPreviewSummary.route}</strong>
                </div>
                <div className="backup-summary-card">
                  <span className="field-label">{uiText.settings.backupSummaryLabels.notes}</span>
                  <strong>{importPreviewSummary.notes}</strong>
                </div>
                <div className="backup-summary-card">
                  <span className="field-label">{uiText.settings.backupSummaryLabels.priorityEdits}</span>
                  <strong>{importPreviewSummary.priorities}</strong>
                </div>
                <div className="backup-summary-card">
                  <span className="field-label">{uiText.settings.backupSummaryLabels.followUps}</span>
                  <strong>{importPreviewSummary.followUps}</strong>
                </div>
              </div>

              <div className="backup-warning">
                <AlertTriangle size={18} />
                <p>{uiText.settings.importWarning}</p>
              </div>

              <div className="backup-actions">
                <button type="button" className="button" onClick={confirmImport}>
                  {uiText.settings.replaceLocalData}
                </button>
                <button type="button" className="button button--ghost" onClick={cancelImportPreview}>
                  {uiText.settings.cancel}
                </button>
              </div>
            </div>
          ) : null}
        </section>

      </>
    )
  }

  function renderActiveView() {
    switch (activeView) {
      case 'dashboard':
        return renderSearchView()
      case 'map':
        return renderMapView()
      case 'search':
        return renderSearchView()
      case 'saved':
        return renderSavedView()
      case 'follow-ups':
        return renderFollowUpsView()
      case 'settings':
        return renderSettingsView()
      default:
        return null
    }
  }

  const displayMeta = screenMeta[activeView]

  return (
    <div className="app-shell">
      <div className="ambient ambient--one" />
      <div className="ambient ambient--two" />

      <main className="mobile-app">
        <header className="app-header">
          <div className="brand-lockup">
            <div className="brand-lockup__logo">
              <img src="/favicon.svg" alt="" className="brand-lockup__logo-image" />
            </div>
            <div className="brand-lockup__text">
              <p className="brand-lockup__name">{uiText.navigation.appName}</p>
              <p className="brand-lockup__copy">{uiText.navigation.tagline}</p>
            </div>
          </div>

          <div className="app-header__actions">
            <button
              type="button"
              className="icon-button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={uiText.navigation.themeToggleAriaLabel}
            >
              {theme === 'dark' ? <SunMedium size={16} /> : <MoonStar size={16} />}
            </button>
            <div ref={accountMenuRef} className="account-menu">
              <button
                type="button"
                className={`account-menu__trigger ${accountMenuOpen ? 'account-menu__trigger--open' : ''}`}
                onClick={() => setAccountMenuOpen((current) => !current)}
                aria-expanded={accountMenuOpen}
                aria-haspopup="menu"
                aria-label={uiText.navigation.accountMenu.ariaLabel}
              >
                <span className="account-menu__icon">
                  <UserRound size={18} />
                </span>
                <ChevronDown size={16} />
              </button>

              {accountMenuOpen ? (
                <div className="account-menu__dropdown" role="menu">
                  <button type="button" className="account-menu__item" onClick={() => openSettingsPanel('top')}>
                    <Settings2 size={16} />
                    {uiText.navigation.accountMenu.settings}
                  </button>
                  <button type="button" className="account-menu__item" onClick={() => openSettingsPanel('crm')}>
                    <Download size={16} />
                    {uiText.navigation.accountMenu.exportCrm}
                  </button>
                  <button
                    type="button"
                    className="account-menu__item"
                    onClick={() => openSettingsPanel('backup')}
                  >
                    <Upload size={16} />
                    {uiText.navigation.accountMenu.backup}
                  </button>
                  <button type="button" className="account-menu__item" onClick={handlePlaceholderSignIn}>
                    <UserRound size={16} />
                    {uiText.navigation.accountMenu.signIn}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <section className="screen-intro screen-intro--compact">
          <h2>{displayMeta.title}</h2>
        </section>

        {activeView === 'map' ? (
          <section className="travel-mode-toolbar">
            <span className="field-label">{uiText.navigation.travelMode.label}</span>
            <div className="chip-row">
              {(['driving', 'walking'] as TravelMode[]).map((mode) => (
                <button
                  type="button"
                  key={mode}
                  className={`chip ${travelMode === mode ? 'chip--active' : ''}`}
                  onClick={() => setTravelMode(mode)}
                >
                  {mode === 'driving'
                    ? uiText.navigation.travelMode.driving
                    : uiText.navigation.travelMode.walking}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {accountMenuMessage ? (
          <section className={`status-banner status-banner--${accountMenuMessage.type}`}>
            <p>{accountMenuMessage.text}</p>
          </section>
        ) : null}

        <section className="screen-content">{renderActiveView()}</section>

        {promptedProspect ? (
          <RemoveProspectSheet
            prospect={promptedProspect}
            isSaved={savedIds.includes(promptedProspect.id)}
            isInRoute={routeIds.includes(promptedProspect.id)}
            onRemoveFromRoute={() => handleRemoveFromRoute(promptedProspect.id)}
            onRemoveFromSaved={() => handleRemoveFromSavedProspects(promptedProspect.id)}
            onCancel={closeRemoveProspectPrompt}
          />
        ) : null}

        {editAddressProspect ? (
          <EditAddressSheet
            prospect={editAddressProspect}
            onSave={(nextAddress) => {
              void updateStopAddress(editAddressProspect.id, nextAddress).finally(() => {
                setEditAddressProspectId(null)
              })
            }}
            onCancel={() => setEditAddressProspectId(null)}
          />
        ) : null}

      </main>

      {businessCardPendingAttach ? (
        <BusinessCardAttachStopSheet
          stops={routeProspects}
          onSelectStop={confirmBusinessCardAttach}
          onCancel={cancelBusinessCardAttach}
        />
      ) : null}

      {foodNearbyAnchorProspect ? (
        <FoodNearbyModal
          anchorProspect={foodNearbyAnchorProspect}
          radiusMiles={foodNearbyRadiusMiles}
          activeChip={foodNearbyActiveChip}
          isLoading={foodNearbyLoading}
          error={foodNearbyError}
          results={foodNearbyResults}
          savedAsFoodStopIds={foodStopIds}
          onChangeRadius={(miles) => setFoodNearbyRadiusMiles(miles)}
          onSelectChip={(chip) => setFoodNearbyActiveChip(chip)}
          onNavigate={handleNavigateProspect}
          onSaveAsFoodStop={saveAsFoodStop}
          onBack={closeFoodNearby}
          onClose={closeFoodNearby}
        />
      ) : null}

      {actionToast ? <section className={`floating-toast floating-toast--${actionToast.type}`}>{actionToast.text}</section> : null}

      <nav className="bottom-nav" aria-label={uiText.navigation.primaryNavAriaLabel}>
        <div className="bottom-nav__inner">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = activeView === item.id

            return (
              <button
                key={item.id}
                type="button"
                className={`bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''} ${
                  item.badgeCount ? 'bottom-nav__item--has-badge' : ''
                }`}
                onClick={() => {
                  if (foodNearbySession) {
                    dismissFoodNearby(false)
                  }
                  setActiveView(item.id)
                }}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className="bottom-nav__icon-wrap">
                  <Icon size={20} />
                  {item.badgeCount ? (
                    <span className="bottom-nav__badge">{item.badgeCount > 99 ? '99+' : item.badgeCount}</span>
                  ) : null}
                </span>
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

    </div>
  )
}

export default App
