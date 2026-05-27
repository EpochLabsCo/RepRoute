import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type TouchEvent } from 'react'
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
  BellRing,
  Bookmark,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock3,
  Compass,
  Download,
  ExternalLink,
  Flame,
  GripVertical,
  Map as MapIcon,
  Navigation,
  MoonStar,
  NotebookPen,
  Phone,
  Plus,
  Route,
  Search,
  Settings2,
  Star,
  SunMedium,
  Target,
  Trash2,
  Truck,
  Upload,
  UserRound,
  Users,
} from 'lucide-react'
import './App.css'
import { uiText } from './constants/uiText'
import RepRouteMap, { type RepRouteMapMarker } from './components/RepRouteMap'
import {
  buildCrmExportRecord,
  buildCrmExportRows,
  buildCsvContent,
  getCrmExportFormats,
  getCrmExportScopes,
  getFutureCrmApiTargets,
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

type AssignedPriority = 'Hot' | 'Warm' | 'Cold'
type Priority = AssignedPriority | 'Unassigned'
type Theme = 'dark' | 'light'
type TravelMode = 'driving' | 'walking'
type View = 'dashboard' | 'map' | 'search' | 'saved' | 'follow-ups' | 'settings'
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
  lastContactDate?: string
  notes?: string
  priority?: AssignedPriority
  followUpDate?: string
  visitNote?: string
  visitOutcome?: OutcomeTag | ''
  routeCompleted?: boolean
  visitCompletedAt?: string
  editedByRepRouteUser?: boolean
}

type Prospect = BaseProspect & {
  followUpDate: string
  lastContactDate: string
  routeCompleted: boolean
  visitNote: string
  visitOutcome: OutcomeTag | ''
  visitCompletedAt: string
  editedByRepRouteUser: boolean
}

type BackupPayload = {
  liveProspects: BaseProspect[]
  savedProspects: string[]
  routeList: string[]
  prospectRecords: Record<string, ProspectRecord>
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
  | { status: 'success'; forRouteKey: string; distanceMiles: number; driveMinutes: number }
  | { status: 'error'; message: string }

type RouteActionMessage = { tone: 'info' | 'error' | 'success'; text: string } | null

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
const SUGGESTED_SEARCH_INDUSTRIES: SearchIndustry[] = [
  'General Contractors',
  'HVAC Contractors',
  'Oil & Gas',
  'Equipment Rental',
  'Property Management',
  'IT Services',
]
const ARRIVAL_RADIUS_OPTIONS: ArrivalDetectionRadiusFeet[] = [150, 300, 500, 1320]

const STORAGE_KEYS = {
  liveProspects: 'reproute:live-prospects',
  savedProspects: 'reproute:saved-prospects',
  prospectRecords: 'reproute:prospect-records',
  routeList: 'reproute:route-list',
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

function calculateDistanceMiles(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
) {
  return Number(calculateDistanceMilesPrecise(from, to).toFixed(1))
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

function formatCalendarDate(value: string) {
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
    year: 'numeric',
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
    distance: calculateDistanceMiles(searchCenter, { lat, lng }),
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
    return
  }

  const nextWindow = window.open(url, '_blank', 'noopener,noreferrer')

  if (!nextWindow) {
    window.location.assign(url)
  }
}

function getDataSourceLabel(source: SearchDataSource) {
  if (source === 'live') {
    return uiText.navigation.liveBadge
  }

  return uiText.errors.apiErrorLabel
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

      if (typeof record.editedByRepRouteUser === 'boolean') {
        nextRecord.editedByRepRouteUser = record.editedByRepRouteUser
      }

      if (Object.keys(nextRecord).length > 0) {
        prospectRecords[prospectId] = nextRecord
      }
    }
  }

  return {
    liveProspects,
    savedProspects,
    routeList,
    prospectRecords,
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
    followUps: records.filter(
      (record) => typeof record.followUpDate === 'string' && record.followUpDate !== '',
    ).length,
  }
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

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string
  value: string
  detail: string
  icon: typeof Route
}) {
  return (
    <article className="stat-card">
      <div className="stat-card__icon">
        <Icon size={18} />
      </div>
      <div>
        <p className="stat-card__label">{label}</p>
        <h3 className="stat-card__value">{value}</h3>
        <p className="stat-card__detail">{detail}</p>
      </div>
    </article>
  )
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

function DataSourceBadge({ source }: { source: SearchDataSource }) {
  return <span className={`source-badge source-badge--${source}`}>{getDataSourceLabel(source)}</span>
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

function RouteCalculationCard({
  routeCount,
  estimatedDriveMinutes,
  travelMode,
  filterSummary,
  onCalculate,
}: {
  routeCount: number
  estimatedDriveMinutes: number
  travelMode: TravelMode
  filterSummary: string
  onCalculate: () => void
}) {
  const disabled = routeCount === 0
  const travelModeLabel =
    travelMode === 'walking' ? uiText.navigation.travelMode.walking : uiText.navigation.travelMode.driving
  const helperText = disabled
    ? uiText.routes.calculation.emptyState
    : routeCount === 1
      ? uiText.routes.calculation.singleStopHint
      : uiText.routes.calculation.multiStopHint

  return (
    <section className="panel section-panel route-build-card">
      <div className="section-heading">
        <div>
          <div className="eyebrow eyebrow--tight">{uiText.routes.calculation.eyebrow}</div>
          <h2>{uiText.routes.calculation.heading}</h2>
        </div>
      </div>

      <p className="section-copy">{uiText.routes.calculation.description}</p>

      <div className="route-build-card__summary">
        <span className="meta-pill">{uiText.routes.calculation.stopCount(routeCount)}</span>
        {routeCount > 0 ? (
          <span className="meta-pill">
            {uiText.routes.calculation.estimatedDrive(formatDriveTime(estimatedDriveMinutes))}
          </span>
        ) : null}
        <span className="meta-pill">{uiText.routes.calculation.travelMode(travelModeLabel)}</span>
        {filterSummary ? (
          <span className="meta-pill meta-pill--accent">
            {uiText.routes.calculation.filters(filterSummary)}
          </span>
        ) : null}
      </div>

      <button
        type="button"
        className="button button--wide route-build-card__button"
        onClick={onCalculate}
        disabled={disabled}
      >
        {uiText.routes.calculation.button}
      </button>

      <p className="editor-hint route-build-card__hint">{helperText}</p>
    </section>
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
  onUpdateFollowUp: (prospectId: string, followUpDate: string) => void
  onUpdatePriority: (prospectId: string, priority: AssignedPriority) => void
  onUpdateOutcome: (prospectId: string, outcome: OutcomeTag | '') => void
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
          {prospect.routeCompleted ? <span className="meta-pill">{uiText.routes.completed}</span> : null}
          {prospect.visitCompletedAt ? (
            <span className="meta-pill">{formatDateTime(prospect.visitCompletedAt)}</span>
          ) : null}
        </div>
      </div>

      <div className="route-action-row">
        {callHref ? (
          <a className="route-action-button" href={callHref}>
            <Phone size={16} />
            {uiText.routes.actions.callBusiness}
          </a>
        ) : null}
        {websiteHref ? (
          <a className="route-action-button" href={websiteHref} target="_blank" rel="noreferrer">
            <ExternalLink size={16} />
            {uiText.routes.actions.openWebsite}
          </a>
        ) : null}
        <button type="button" className="route-action-button" onClick={() => onNavigate(prospect)}>
          <Navigation size={16} />
          {travelMode === 'walking'
            ? uiText.routes.actions.navigateWalk
            : uiText.routes.actions.navigateDrive}
        </button>
        <button
          type="button"
          className={`route-action-button ${isInRoute ? 'button--danger-outline' : ''}`}
          onClick={() => onToggleRoute(prospect.id)}
        >
          <Trash2 size={16} />
          {isInRoute ? uiText.search.card.removeRoute : uiText.search.card.addToRoute}
        </button>
      </div>

      <div className="current-stop-card__quick-actions">
        <button type="button" className="button" onClick={() => onToggleCompleted(prospect.id)}>
          {prospect.routeCompleted
            ? uiText.routes.currentStop.quickActions.markIncomplete
            : uiText.routes.currentStop.quickActions.markCompleted}
        </button>
        <button
          type="button"
          className="button button--ghost"
          onClick={() => (isSaved ? onOpenSaved(prospect.id) : onToggleSaved(prospect.id))}
        >
          {isSaved
            ? uiText.routes.currentStop.quickActions.openSaved
            : uiText.routes.currentStop.quickActions.saveProspect}
        </button>
        <button
          type="button"
          className={`button button--ghost ${openPanels.contact ? 'button--secondary' : ''}`}
          onClick={() => togglePanel('contact')}
        >
          {uiText.routes.currentStop.quickActions.editContactInfo}
        </button>
        <button
          type="button"
          className={`button button--ghost ${openPanels.visit ? 'button--secondary' : ''}`}
          onClick={() => togglePanel('visit')}
        >
          {uiText.routes.currentStop.quickActions.addVisitNotes}
        </button>
        <button
          type="button"
          className={`button button--ghost ${openPanels.followUp ? 'button--secondary' : ''}`}
          onClick={() => togglePanel('followUp')}
        >
          {uiText.routes.currentStop.quickActions.setFollowUp}
        </button>
        <button
          type="button"
          className={`button button--ghost ${openPanels.priority ? 'button--secondary' : ''}`}
          onClick={() => togglePanel('priority')}
        >
          {uiText.routes.currentStop.quickActions.changePriority}
        </button>
        <button
          type="button"
          className={`button button--ghost ${openPanels.outcome ? 'button--secondary' : ''}`}
          onClick={() => togglePanel('outcome')}
        >
          {uiText.routes.currentStop.quickActions.addOutcomeTag}
        </button>
        <button
          type="button"
          className="button button--ghost"
          onClick={() => onRequestRemove(prospect.id)}
        >
          {uiText.routes.actions.removeProspect}
        </button>
      </div>

      {openPanels.contact ? (
        <div className="current-stop-card__panel">
          <div className="field-group">
            <span className="field-label">{uiText.routes.currentStop.contactFields.contactName}</span>
            <input
              className="text-input"
              type="text"
              value={prospect.contactName}
              onChange={(event) =>
                onUpdateContactDetails(prospect.id, { contactName: event.target.value })
              }
            />
          </div>
          <div className="field-group">
            <span className="field-label">{uiText.routes.currentStop.contactFields.contactTitle}</span>
            <input
              className="text-input"
              type="text"
              value={prospect.contactTitle}
              onChange={(event) =>
                onUpdateContactDetails(prospect.id, { contactTitle: event.target.value })
              }
            />
          </div>
          <div className="field-group">
            <span className="field-label">{uiText.routes.currentStop.contactFields.phone}</span>
            <input
              className="text-input"
              type="tel"
              value={prospect.phone}
              onChange={(event) =>
                onUpdateContactDetails(prospect.id, { contactPhone: event.target.value })
              }
            />
          </div>
          <div className="field-group">
            <span className="field-label">{uiText.routes.currentStop.contactFields.email}</span>
            <input
              className="text-input"
              type="email"
              value={prospect.contactEmail}
              onChange={(event) =>
                onUpdateContactDetails(prospect.id, { contactEmail: event.target.value })
              }
            />
          </div>
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
            onChange={(event) => onUpdateFollowUp(prospect.id, event.target.value)}
          />
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
  onToggleCompleted,
  onToggleSaved,
  onToggleRoute,
  onUpdatePriority,
  onUpdateVisitNote,
  onUpdateOutcome,
  onRemove,
}: {
  index: number
  prospect: Prospect
  isCurrentStop: boolean
  isOnLocation: boolean
  isSaved: boolean
  travelMode: TravelMode
  onNavigate: (prospect: Prospect) => void
  onOpenSaved: (prospectId: string) => void
  onToggleCompleted: (prospectId: string) => void
  onToggleSaved: (prospectId: string) => void
  onToggleRoute: (prospectId: string) => void
  onUpdatePriority: (prospectId: string, priority: AssignedPriority) => void
  onUpdateVisitNote: (prospectId: string, note: string) => void
  onUpdateOutcome: (prospectId: string, outcome: OutcomeTag | '') => void
  onRemove: (prospectId: string) => void
}) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)
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
          <button
            type="button"
            className={`route-stop-check ${prospect.routeCompleted ? 'route-stop-check--checked' : ''}`}
            onClick={() => onToggleCompleted(prospect.id)}
            aria-label={
              prospect.routeCompleted
                ? uiText.routes.markStopIncompleteAria
                : uiText.routes.markStopCompleteAria
            }
          >
            {prospect.routeCompleted ? <CheckCircle2 size={22} /> : <Circle size={22} />}
          </button>

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
        {prospect.routeCompleted ? <span className="meta-pill">{uiText.routes.completed}</span> : null}
      </div>

      <div className="route-action-row">
        {callHref ? (
          <a className="route-action-button" href={callHref}>
            <Phone size={16} />
            {uiText.routes.actions.callBusiness}
          </a>
        ) : null}
        {websiteHref ? (
          <a className="route-action-button" href={websiteHref} target="_blank" rel="noreferrer">
            <ExternalLink size={16} />
            {uiText.routes.actions.openWebsite}
          </a>
        ) : null}
        <button type="button" className="route-action-button" onClick={() => onNavigate(prospect)}>
          <Navigation size={16} />
          {travelMode === 'walking'
            ? uiText.routes.actions.navigateWalk
            : uiText.routes.actions.navigateDrive}
        </button>
        <button
          type="button"
          className="route-action-button button--danger-outline"
          onClick={() => onToggleRoute(prospect.id)}
        >
          <Trash2 size={16} />
          {uiText.search.card.removeRoute}
        </button>
        <button
          type="button"
          className="route-action-button"
          onClick={() => (isSaved ? onOpenSaved(prospect.id) : onToggleSaved(prospect.id))}
        >
          <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} />
          {isSaved ? uiText.routes.actions.openSaved : uiText.routes.actions.saveProspect}
        </button>
      </div>

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

      <div className="route-stop-card__footer">
        <p>{prospect.address}</p>
        <button type="button" className="mini-button" onClick={() => onRemove(prospect.id)}>
          {uiText.routes.actions.removeProspect}
        </button>
      </div>
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
  onUpdatePriority,
  onRequestRemove,
  onToggleSaved,
  onToggleRoute,
}: {
  prospect: Prospect
  isSaved: boolean
  isInRoute: boolean
  travelMode: TravelMode
  onNavigate: (prospect: Prospect) => void
  onOpenSaved: (prospectId: string) => void
  onUpdatePriority: (prospectId: string, priority: AssignedPriority) => void
  onRequestRemove: (prospectId: string) => void
  onToggleSaved: (prospectId: string) => void
  onToggleRoute: (prospectId: string) => void
}) {
  const websiteHref = normalizeWebsiteUrl(prospect.website)
  const hasPhone = prospect.phone !== 'Phone unavailable'

  return (
    <article className="live-result-card">
      <div className="live-result-card__header">
        <div>
          <div className="eyebrow eyebrow--tight">{uiText.search.card.badge}</div>
          <h3>{prospect.businessName}</h3>
          <p>{prospect.category}</p>
        </div>
        <div className="live-result-card__meta">
          <span className={`meta-pill meta-pill--${getPriorityTone(prospect.priority)}`}>
            {prospect.priority}
          </span>
          {prospect.rating !== null ? <span className="meta-pill">{prospect.rating.toFixed(1)} stars</span> : null}
        </div>
      </div>

      <div className="live-result-card__details">
        <p>{prospect.address}</p>
        {hasPhone ? <p>{prospect.phone}</p> : null}
        {websiteHref ? (
          <a href={websiteHref} target="_blank" rel="noreferrer">
            {prospect.website}
          </a>
        ) : null}
      </div>

      <div className="live-result-card__actions">
        <button
          type="button"
          className={`button ${isSaved ? 'button--secondary' : ''}`}
          onClick={() => (isSaved ? onOpenSaved(prospect.id) : onToggleSaved(prospect.id))}
        >
          {isSaved ? uiText.search.card.saved : uiText.search.card.save}
        </button>
        <button
          type="button"
          className={`button ${isInRoute ? 'button--danger-outline' : ''}`}
          onClick={() => onToggleRoute(prospect.id)}
        >
          {isInRoute ? uiText.search.card.inRoute : uiText.search.card.addToRoute}
        </button>
        <button type="button" className="route-action-button" onClick={() => onNavigate(prospect)}>
          <Navigation size={16} />
          {travelMode === 'walking'
            ? uiText.search.card.navigateWalk
            : uiText.search.card.navigateDrive}
        </button>
        {isInRoute || isSaved ? (
          <button
            type="button"
            className="button button--ghost"
            onClick={() => onRequestRemove(prospect.id)}
          >
            {uiText.search.card.removeProspect}
          </button>
        ) : null}
      </div>

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
    </article>
  )
}

function ProspectCard({
  prospect,
  isInRoute,
  isExpanded,
  travelMode,
  onNavigate,
  onRequestRemove,
  onToggleRoute,
  onToggleExpanded,
  onUpdateNotes,
  onUpdatePriority,
  onUpdateFollowUp,
}: {
  prospect: Prospect
  isInRoute: boolean
  isExpanded: boolean
  travelMode: TravelMode
  onNavigate: (prospect: Prospect) => void
  onRequestRemove: (prospectId: string) => void
  onToggleRoute: (prospectId: string) => void
  onToggleExpanded: (prospectId: string) => void
  onUpdateNotes: (prospectId: string, notes: string) => void
  onUpdatePriority: (prospectId: string, priority: AssignedPriority) => void
  onUpdateFollowUp: (prospectId: string, followUpDate: string) => void
}) {
  const notesPreview = prospect.notes.trim() || prospect.visitNote.trim() || uiText.saved.notesPreviewEmpty
  const followUpStatus = prospect.followUpDate
    ? getFollowUpStatus(prospect.followUpDate)
    : uiText.followUps.noDate
  const routeStatus = isInRoute ? uiText.saved.routeStatusInRoute : uiText.saved.routeStatusNotInRoute
  const lastVisited = prospect.visitCompletedAt
    ? formatCalendarDate(prospect.visitCompletedAt)
    : uiText.saved.lastVisitedEmpty

  return (
    <article className="prospect-card">
      <div className="prospect-card__header">
        <div>
          <div className="eyebrow eyebrow--tight">{prospect.category}</div>
          <h3>{prospect.businessName}</h3>
          <p className="prospect-card__city">{prospect.city}</p>
        </div>
        <span className="meta-pill meta-pill--accent">{uiText.search.card.saved}</span>
      </div>

      <div className="prospect-card__meta">
        <span className={`meta-pill meta-pill--${getPriorityTone(prospect.priority)}`}>
          {prospect.priority}
        </span>
        <span className="meta-pill">{formatDistance(prospect.distance)}</span>
        {prospect.routeCompleted ? <span className="meta-pill">{uiText.routes.completed}</span> : null}
      </div>

      <div className="prospect-card__notes-block">
        <p className="prospect-card__footer-label">{uiText.saved.notesPreview}</p>
        <p className="prospect-card__notes prospect-card__notes--preview">{notesPreview}</p>
      </div>

      <div className="prospect-card__status-grid">
        <div className="prospect-card__status-item">
          <p className="prospect-card__footer-label">{uiText.saved.followUpStatus}</p>
          <p className="prospect-card__footer-copy">{followUpStatus}</p>
        </div>
        <div className="prospect-card__status-item">
          <p className="prospect-card__footer-label">{uiText.saved.routeStatus}</p>
          <p className="prospect-card__footer-copy">{routeStatus}</p>
        </div>
        <div className="prospect-card__status-item">
          <p className="prospect-card__footer-label">{uiText.saved.lastVisited}</p>
          <p className="prospect-card__footer-copy">{lastVisited}</p>
        </div>
      </div>

      <div className="prospect-card__footer">
        <div className="prospect-card__button-group prospect-card__button-group--saved">
          <button
            type="button"
            className={`button ${isInRoute ? 'button--danger-outline' : ''}`}
            onClick={() => onToggleRoute(prospect.id)}
          >
            {isInRoute ? uiText.search.card.inRoute : uiText.search.card.addToRoute}
          </button>
          <button type="button" className="button button--ghost" onClick={() => onNavigate(prospect)}>
            {travelMode === 'walking'
              ? uiText.search.card.navigateWalk
              : uiText.search.card.navigateDrive}
          </button>
          <button type="button" className="button button--ghost" onClick={() => onToggleExpanded(prospect.id)}>
            {isExpanded ? uiText.search.prospectCard.hide : uiText.saved.edit}
          </button>
          <button type="button" className="button button--ghost" onClick={() => onRequestRemove(prospect.id)}>
            {uiText.saved.remove}
          </button>
        </div>
      </div>

      {isExpanded ? (
        <div className="prospect-editor">
          <div className="field-group">
            <span className="field-label">{uiText.search.prospectCard.priority}</span>
            <div className="segment-row">
              {ASSIGNED_PRIORITY_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option}
                  className={`segment ${
                    prospect.priority === option ? 'segment--active' : ''
                  }`}
                  onClick={() => onUpdatePriority(prospect.id, option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="field-group">
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
              onChange={(event) => onUpdateFollowUp(prospect.id, event.target.value)}
            />
          </div>

          <label className="field-group">
            <span className="field-label">{uiText.search.prospectCard.prospectNotes}</span>
            <textarea
              className="text-area"
              rows={4}
              value={prospect.notes}
              onChange={(event) => onUpdateNotes(prospect.id, event.target.value)}
            />
          </label>

          <p className="editor-hint">{uiText.search.prospectCard.editorHint}</p>
        </div>
      ) : null}
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
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? ''
  const [activeView, setActiveView] = useState<View>('search')
  const [expandedProspectId, setExpandedProspectId] = useState<string | null>(null)
  const [backupMessage, setBackupMessage] = useState<BackupMessage | null>(null)
  const [crmExportMessage, setCrmExportMessage] = useState<BackupMessage | null>(null)
  const [accountMenuMessage, setAccountMenuMessage] = useState<BackupMessage | null>(null)
  const [actionToast, setActionToast] = useState<ToastMessage | null>(null)
  const [routeActionMessage, setRouteActionMessage] = useState<RouteActionMessage>(null)
  const [routeOptimization, setRouteOptimization] = useState<RouteOptimizationState>({ status: 'idle' })
  const [routeStartLocation, setRouteStartLocation] = useState('')
  const [notificationMessage, setNotificationMessage] = useState<BackupMessage | null>(null)
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [removeProspectPrompt, setRemoveProspectPrompt] = useState<RemoveProspectPrompt | null>(null)
  const [routeCalculationContext, setRouteCalculationContext] = useState<RouteCalculationContext | null>(
    null,
  )
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
    if (activeView !== 'map' || routeIds.length === 0) {
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
  }, [activeView, routeIds.length])

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
  const futureCrmApiTargets = useMemo(() => getFutureCrmApiTargets(), [])
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
          lastContactDate: record?.lastContactDate ?? '',
          followUpDate: record?.followUpDate ?? '',
          routeCompleted: record?.routeCompleted ?? false,
          visitNote: record?.visitNote ?? '',
          visitOutcome: record?.visitOutcome ?? '',
          visitCompletedAt: record?.visitCompletedAt ?? '',
          editedByRepRouteUser: record?.editedByRepRouteUser ?? false,
        }
      }),
    [liveProspects, prospectRecords],
  )

  const prospects = useMemo(() => liveCatalogProspects, [liveCatalogProspects])

  const prospectMap = useMemo(
    () => new globalThis.Map(prospects.map((prospect) => [prospect.id, prospect])),
    [prospects],
  )
  const promptedProspect = useMemo(
    () => (removeProspectPrompt ? prospectMap.get(removeProspectPrompt.prospectId) ?? null : null),
    [prospectMap, removeProspectPrompt],
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

  const scheduledFollowUps = useMemo(
    () =>
      prospects
        .filter((prospect) => prospect.followUpDate)
        .sort((left, right) => {
          if (left.followUpDate !== right.followUpDate) {
            return left.followUpDate.localeCompare(right.followUpDate)
          }

          return left.businessName.localeCompare(right.businessName)
        }),
    [prospects],
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
        return dedupe(scheduledFollowUps)
      case 'all':
      default:
        return dedupe(prospects)
    }
  }, [crmExportScope, prospects, routeProspects, savedProspects, scheduledFollowUps])

  const crmExportPreview = useMemo(() => {
    const records = crmScopedProspects.map((prospect) =>
      buildCrmExportRecord({
        address: prospect.address,
        businessName: prospect.businessName,
        category: prospect.category,
        contactName: prospect.contactName,
        contactEmail: prospect.contactEmail,
        contactTitle: prospect.contactTitle,
        editedByRepRouteUser: prospect.editedByRepRouteUser,
        followUpDate: prospect.followUpDate,
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
      }),
    )

    return {
      records,
      ...buildCrmExportRows(records, crmExportFormat),
    }
  }, [crmExportFormat, crmScopedProspects])

  const hotTerritoryProspects = useMemo(
    () =>
      [...prospects]
        .filter((prospect) => prospect.priority === 'Hot')
        .sort((left, right) => left.distance - right.distance)
        .slice(0, 3),
    [prospects],
  )

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
  const nearbyRouteProspects = useMemo(() => {
    if (routeProspects.length === 0) {
      return []
    }

    const routeSet = new Set(routeIds)

    return prospects
      .filter((prospect) => !routeSet.has(prospect.id))
      .map((prospect) => {
        const nearestDistance = Math.min(
          ...routeProspects.map((routeProspect) =>
            calculateDistanceMiles(routeProspect.location, prospect.location),
          ),
        )

        return {
          prospect,
          nearestDistance,
        }
      })
      .filter((entry) => entry.nearestDistance <= 5)
      .sort((left, right) => left.nearestDistance - right.nearestDistance)
      .slice(0, 5)
  }, [prospects, routeIds, routeProspects])

  const upcomingThisWeek = scheduledFollowUps.filter((prospect) => {
    const daysUntil = getDaysUntil(prospect.followUpDate)
    return daysUntil >= 0 && daysUntil <= 7
  }).length

  const dueNowCount = scheduledFollowUps.filter(
    (prospect) => getFollowUpStatus(prospect.followUpDate) === uiText.followUps.statuses.dueNow,
  ).length
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
  const effectiveRadiusMiles = getEffectiveRadiusMiles(searchRadiusChoice, customRadiusMiles)
  const usesCurrentLocation = searchRadiusChoice === 'current-location' || !manualMarketLabel
  const effectiveRadiusLabel = effectiveRadiusMiles
    ? uiText.search.filters.radius(effectiveRadiusMiles)
    : uiText.search.radiusOptionLabels.custom
  const routeCalculationFilterSummary = summarizeSearchFilters({
    selectedIndustries,
    radiusLabel: effectiveRadiusLabel,
    market: usesCurrentLocation ? '' : manualMarketLabel,
    usesCurrentLocation,
  })
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
    }),
    [liveProspects, prospectRecords, routeIds, savedIds],
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
    setRouteIds((current) =>
      current.includes(prospectId)
        ? current.filter((id) => id !== prospectId)
        : [...current, prospectId],
    )
  }

  function openRemoveProspectPrompt(prospectId: string) {
    setRemoveProspectPrompt({ prospectId })
  }

  function closeRemoveProspectPrompt() {
    setRemoveProspectPrompt(null)
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

  function updateProspectFollowUp(prospectId: string, followUpDate: string) {
    updateProspectRecord(prospectId, (current) => ({
      ...current,
      followUpDate,
    }))
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
    }))
  }

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

  function addNearbyProspect() {
    const nextProspect = nearbyRouteProspects[0]?.prospect

    if (!nextProspect) {
      return
    }

    setRouteIds((current) =>
      current.includes(nextProspect.id) ? current : [...current, nextProspect.id],
    )
  }

  function handleNavigateProspect(prospect: Prospect) {
    openExternalNavigation(createNavigateHref(prospect, travelMode))
  }

  function handleNavigateEntireRoute() {
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

    if (stopsForNavigation.length > 25) {
      setRouteActionMessage({ tone: 'error', text: uiText.routes.optimization.routeTooLarge })
      return
    }

    if (!stopsForNavigation.every((stop) => isFiniteLatLng(stop.location))) {
      setRouteActionMessage({ tone: 'error', text: uiText.routes.optimization.missingCoordinates })
      return
    }

    openExternalNavigation(createEntireRouteNavigateHref(startOrigin, stopsForNavigation, travelMode))
  }

  async function optimizeRoute(originOverride?: string) {
    if (routeProspects.length < 2) {
      setRouteActionMessage({ tone: 'error', text: uiText.routes.optimization.noStops })
      return
    }

    if (routeProspects.length > 25) {
      setRouteActionMessage({ tone: 'error', text: uiText.routes.optimization.routeTooLarge })
      return
    }

    if (!routeProspects.every((stop) => isFiniteLatLng(stop.location))) {
      setRouteActionMessage({ tone: 'error', text: uiText.routes.optimization.missingCoordinates })
      return
    }

    if (typeof window === 'undefined' || !('google' in window) || !window.google?.maps) {
      setRouteActionMessage({ tone: 'error', text: uiText.routes.optimization.error })
      return
    }

    const destinationProspect = routeProspects[routeProspects.length - 1]
    if (!destinationProspect) {
      return
    }

    const origin =
      routeTrackerLocation ??
      (originOverride?.trim()
        ? originOverride.trim()
        : routeStartLocation.trim()
          ? routeStartLocation.trim()
          : manualMarketLabel
            ? manualMarketLabel
            : routeProspects[0]?.location ?? null)

    setRouteOptimization({ status: 'loading' })
    setRouteActionMessage(null)

    const usesFirstStopOrigin = !routeTrackerLocation && !originOverride?.trim() && !routeStartLocation.trim() && !manualMarketLabel
    const originStop = usesFirstStopOrigin ? routeProspects[0] ?? null : null
    const waypointProspects = usesFirstStopOrigin ? routeProspects.slice(1, -1) : routeProspects.slice(0, -1)
    const waypointIds = waypointProspects.map((prospect) => prospect.id)

    const request: google.maps.DirectionsRequest = {
      origin,
      destination: destinationProspect.location,
      travelMode: google.maps.TravelMode.DRIVING,
      optimizeWaypoints: true,
      waypoints: waypointProspects.map((prospect) => ({
        location: prospect.location,
        stopover: true,
      })),
    }

    const service = new google.maps.DirectionsService()

    const response = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
      service.route(request, (result, status) => {
        if (status !== google.maps.DirectionsStatus.OK || !result) {
          reject(new Error(String(status)))
          return
        }
        resolve(result)
      })
    }).catch(() => null)

    if (!response?.routes?.[0]) {
      setRouteOptimization({ status: 'idle' })
      setRouteActionMessage({ tone: 'error', text: uiText.routes.optimization.error })
      return
    }

    const route = response.routes[0]
    const waypointOrder = route.waypoint_order ?? []

    if (waypointOrder.length !== waypointIds.length) {
      setRouteOptimization({ status: 'idle' })
      setRouteActionMessage({ tone: 'error', text: uiText.routes.optimization.error })
      return
    }

    const optimizedWaypointIds = waypointOrder.map((index) => waypointIds[index]).filter(Boolean)
    const optimizedIds = originStop
      ? [originStop.id, ...optimizedWaypointIds, destinationProspect.id]
      : [...optimizedWaypointIds, destinationProspect.id]
    const optimizedKey = optimizedIds.join('|')

    const legs = route.legs ?? []
    const distanceMeters = legs.reduce((sum, leg) => sum + (leg.distance?.value ?? 0), 0)
    const durationSeconds = legs.reduce((sum, leg) => sum + (leg.duration?.value ?? 0), 0)
    const distanceMiles = metersToMiles(distanceMeters)
    const driveMinutes = secondsToMinutes(durationSeconds)

    setRouteIds(optimizedIds)
    setRouteOptimization({
      status: 'success',
      forRouteKey: optimizedKey,
      distanceMiles,
      driveMinutes,
    })
    setActionToast({
      type: 'success',
      text: uiText.routes.optimization.optimized,
    })

    if (routeCalculationContext) {
      setRouteCalculationContext({
        ...routeCalculationContext,
      })
    }
  }

  function clearRoute() {
    setRouteIds([])
  }

  function handleCalculateRoute() {
    if (routeProspects.length === 0) {
      return
    }

    setRouteCalculationContext({
      filterSummary: routeCalculationFilterSummary,
    })
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
      const locationBias = {
        latitude: activeSearchCenter.lat,
        longitude: activeSearchCenter.lng,
        radiusMeters: milesToMeters(effectiveRadiusMiles),
      }

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
      const normalizedProspects = dedupedPlaces.reduce<BaseProspect[]>((collection, place) => {
        const matchingEntry = successfulResults.find((entry) =>
          entry.result.places.some((candidate) =>
            candidate.id && place.id
              ? candidate.id === place.id
              : candidate.displayName?.text === place.displayName?.text &&
                candidate.formattedAddress === place.formattedAddress,
          ),
        )
        const prospect = toLiveProspect(
          place,
          matchingEntry?.term ?? industries[0],
          fallbackLocationLabel,
          activeSearchCenter,
        )

        if (prospect) {
          collection.push(prospect)
        }

        return collection
      }, [])

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
          query: filterSummary,
        })
        return
      }

      setLiveSearchIds([])
      if (failedResults.length > 0) {
        setSearchStatus({
          source: 'api-error',
          message: failedResults[0]?.result.error ?? uiText.errors.searchFailedDetail,
          details: failedResults.map((entry) => `${entry.term}: ${entry.result.error}`).join(' | '),
          query: filterSummary,
        })
      } else {
        setSearchStatus({
          source: 'live',
          message: uiText.search.statusMessages.noLiveResults(filterSummary || 'your filters'),
          resultsCount: 0,
          query: filterSummary,
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

  function handleExportBackup() {
    try {
      const backup: BackupFile = {
        app: 'RepRoute',
        version: 1,
        exportedAt: new Date().toISOString(),
        data: currentBackupPayload,
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

  function confirmImport() {
    if (!importPreview) {
      return
    }

    setLiveProspects(importPreview.payload.liveProspects)
    setSavedIds(importPreview.payload.savedProspects)
    setRouteIds(importPreview.payload.routeList)
    setProspectRecords(importPreview.payload.prospectRecords)
    setExpandedProspectId(null)
    setLiveSearchIds([])
    setSearchStatus(null)
    setImportPreview(null)
    setBackupMessage({
      type: 'success',
      text: uiText.errors.backupImported(importPreview.fileName),
    })
  }

  function renderDashboard() {
    const nextFollowUp = scheduledFollowUps[0]
    const routeSnapshotSection = (
      <section className="panel section-panel">
        <div className="section-heading">
          <div>
            <div className="eyebrow eyebrow--tight">{uiText.routes.routeSnapshotEyebrow}</div>
            <h2>{uiText.routes.routeSnapshotHeading}</h2>
          </div>
          <button type="button" className="link-button" onClick={() => setActiveView('map')}>
            {uiText.routes.openRoute} <ChevronRight size={16} />
          </button>
        </div>

        {routeProspects.length > 0 ? (
          <div className="route-preview">
            {routeProspects.slice(0, 3).map((prospect, index) => (
              <div className="route-preview__item" key={prospect.id}>
                <div className="route-preview__step">{index + 1}</div>
                <div className="route-preview__content">
                  <h3>{prospect.businessName}</h3>
                  <p>
                    {prospect.category} · {formatDistance(prospect.distance)}
                  </p>
                </div>
                <span className={`meta-pill meta-pill--${getPriorityTone(prospect.priority)}`}>
                  {prospect.priority}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title={uiText.emptyStates.noRouteLoadedTitle}
            copy={uiText.emptyStates.noRouteLoadedCopy}
            icon={Route}
            actionLabel={uiText.onboarding.hotTargetsEmptyAction}
            onAction={() => setActiveView('search')}
          />
        )}
      </section>
    )

    return (
      <>
        <section className="panel hero-panel">
          <div className="hero-panel__badge">
            <Compass size={14} />
            {uiText.onboarding.heroBadge}
          </div>
          <h1>{uiText.onboarding.heroHeading}</h1>
          <p className="hero-panel__copy">{uiText.onboarding.heroDescription}</p>

          <div className="hero-panel__metrics">
            <div>
              <span>{uiText.onboarding.metrics.savedProspects}</span>
              <strong>{savedProspects.length}</strong>
            </div>
            <div>
              <span>{uiText.onboarding.metrics.routeStops}</span>
              <strong>{routeProspects.length}</strong>
            </div>
            <div>
              <span>{uiText.onboarding.metrics.followUpsDue}</span>
              <strong>{dueNowCount}</strong>
            </div>
          </div>

          <div className="button-row">
            <button type="button" className="button" onClick={() => setActiveView('search')}>
              {uiText.onboarding.actions.findProspects}
            </button>
            <button type="button" className="button button--ghost" onClick={() => setActiveView('map')}>
              {uiText.onboarding.actions.viewRoute}
            </button>
          </div>
        </section>

        <section className="panel section-panel prospect-cta-panel">
          <div className="section-heading">
            <div>
              <div className="eyebrow eyebrow--tight">{uiText.onboarding.startHereEyebrow}</div>
              <h2>{uiText.search.heading}</h2>
            </div>
            <DataSourceBadge source={effectiveSearchStatus.source} />
          </div>

          <p className="section-copy">{uiText.search.prominentDescription}</p>

          <div className="chip-row">
            {SUGGESTED_SEARCH_INDUSTRIES.slice(0, 4).map((industry) => (
              <button
                type="button"
                key={industry}
                className={`chip ${selectedIndustries.includes(industry) ? 'chip--active' : ''}`}
                onClick={() => {
                  toggleIndustrySelection(industry)
                  setActiveView('search')
                }}
              >
                {industry}
              </button>
            ))}
          </div>

          <button type="button" className="button button--wide" onClick={() => setActiveView('search')}>
            {uiText.routes.suggestedKeywordCta}
          </button>
        </section>

        <section className="stat-grid">
          <StatCard
            label={uiText.onboarding.metrics.realProspectsLoaded}
            value={`${prospects.length}`}
            detail={uiText.onboarding.realProspectsDetail}
            icon={Search}
          />
          <StatCard
            label={uiText.routes.stats.routeStopsLabel}
            value={`${routeProspects.length} stops`}
            detail={uiText.routes.stats.routeStopsDetail(`${routeMiles.toFixed(1)} mi`)}
            icon={Truck}
          />
          <StatCard
            label={uiText.followUps.stats.scheduled}
            value={`${scheduledFollowUps.length}`}
            detail={uiText.onboarding.upcomingFollowUpsDetail(upcomingThisWeek)}
            icon={CalendarClock}
          />
        </section>

        <section className="panel section-panel">
          <div className="section-heading">
            <div>
              <div className="eyebrow eyebrow--tight">{uiText.search.statusHeading}</div>
              <h2>{uiText.search.catalogHeading}</h2>
            </div>
            <button type="button" className="link-button" onClick={() => setActiveView('settings')}>
              {uiText.search.testButton} <ChevronRight size={16} />
            </button>
          </div>

          {prospects.length > 0 ? (
            <div className="saved-summary">
              <div className="saved-summary__block">
                <Search size={18} />
                <div>
                  <strong>{uiText.onboarding.storedProspectsSummary(prospects.length)}</strong>
                  <p>{uiText.onboarding.catalogSummary}</p>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              title={uiText.emptyStates.noRealProspectsTitle}
              copy={uiText.emptyStates.noRealProspectsCopy}
              icon={Search}
              actionLabel={uiText.onboarding.hotTargetsEmptyAction}
              onAction={() => setActiveView('search')}
            />
          )}
        </section>

        {routeProspects.length > 0 ? routeSnapshotSection : null}

        <section className="panel section-panel">
          <div className="section-heading">
            <div>
              <div className="eyebrow eyebrow--tight">{uiText.onboarding.hotTargetsEyebrow}</div>
              <h2>{uiText.onboarding.hotTargetsHeading}</h2>
            </div>
          </div>

          {hotTerritoryProspects.length > 0 ? (
            <div className="stack">
              {hotTerritoryProspects.map((prospect) => (
                <ProspectCard
                  key={prospect.id}
                  prospect={prospect}
                  isInRoute={routeIds.includes(prospect.id)}
                  isExpanded={expandedProspectId === prospect.id}
                  travelMode={travelMode}
                  onNavigate={handleNavigateProspect}
                  onRequestRemove={openRemoveProspectPrompt}
                  onToggleRoute={toggleRoute}
                  onToggleExpanded={toggleExpandedProspect}
                  onUpdateNotes={updateProspectNotes}
                  onUpdatePriority={updateProspectPriority}
                  onUpdateFollowUp={updateProspectFollowUp}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title={uiText.emptyStates.noHotProspectsTitle}
              copy={uiText.emptyStates.noHotProspectsCopy}
              icon={Flame}
              actionLabel={uiText.onboarding.hotTargetsEmptyAction}
              onAction={() => setActiveView('search')}
            />
          )}

          {nextFollowUp ? (
            <div className="mini-callout">
              <CalendarClock size={16} />
              <div>
                <strong>{uiText.onboarding.nextFollowUp}</strong>
                <p>
                  {nextFollowUp.businessName} on {formatFollowUpDate(nextFollowUp.followUpDate)}
                </p>
              </div>
            </div>
          ) : null}
        </section>

        {routeProspects.length === 0 ? routeSnapshotSection : null}
      </>
    )
  }

  function renderMapView() {
    const selectedTravelModeLabel =
      travelMode === 'walking' ? uiText.navigation.travelMode.walking : uiText.navigation.travelMode.driving

    return (
      <>
        {routeCalculationContext && routeProspects.length > 0 ? (
          <section ref={routeCalculationSummaryRef} className="panel section-panel route-build-card">
            <div className="section-heading">
              <div>
                <div className="eyebrow eyebrow--tight">{uiText.routes.calculation.eyebrow}</div>
                <h2>{uiText.routes.calculation.summaryHeading}</h2>
              </div>
            </div>

            <div className="route-build-card__summary">
              <span className="meta-pill">{uiText.routes.calculation.stopCount(routeProspects.length)}</span>
              <span className="meta-pill">
                {uiText.routes.calculation.estimatedDrive(formatDriveTime(estimatedDriveMinutes))}
              </span>
              <span className="meta-pill">{uiText.routes.optimization.totalDistance(routeMiles.toFixed(1))}</span>
              <span className="meta-pill">
                {uiText.routes.calculation.travelMode(selectedTravelModeLabel)}
              </span>
              {routeCalculationContext.filterSummary ? (
                <span className="meta-pill meta-pill--accent">
                  {uiText.routes.calculation.filters(routeCalculationContext.filterSummary)}
                </span>
              ) : null}
            </div>

            <div
              className={`status-banner ${
                routeProspects.length === 1 ? 'status-banner--info' : 'status-banner--success'
              }`}
            >
              <p>
                {routeProspects.length === 1
                  ? uiText.routes.calculation.singleStopHint
                  : uiText.routes.calculation.multiStopHint}
              </p>
            </div>
          </section>
        ) : null}

        <section ref={routeMapSectionRef} className="panel section-panel">
          <div className="section-heading">
            <div>
              <div className="eyebrow eyebrow--tight">{uiText.routes.routeMapEyebrow}</div>
              <h2>{uiText.routes.routeMapHeading}</h2>
            </div>
            <DataSourceBadge source={effectiveSearchStatus.source} />
          </div>
          {routeProspects.length > 0 ? (
            <div className="button-row route-map-actions">
              <button
                type="button"
                className="button"
                onClick={() => optimizeRoute()}
                disabled={routeOptimization.status === 'loading' || routeProspects.length < 2}
              >
                <Route size={16} />
                {routeOptimization.status === 'loading'
                  ? uiText.routes.optimization.optimizing
                  : uiText.routes.optimization.button}
              </button>
              <button type="button" className="button button--ghost" onClick={handleNavigateEntireRoute}>
                <Navigation size={16} />
                {uiText.routes.navigateEntireRoute}
              </button>
              <button
                type="button"
                className="button button--ghost"
                onClick={clearRoute}
              >
                <Trash2 size={16} />
                {uiText.routes.clearRoute}
              </button>
            </div>
          ) : null}
          <p className="section-copy map-panel__copy">
            {uiText.routes.routeMapDescription}
          </p>

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

          <div
            className={`status-banner ${
              effectiveSearchStatus.source === 'api-error'
                ? 'status-banner--error'
                : 'status-banner--info'
            }`}
          >
            <p>{effectiveSearchStatus.message}</p>
            {effectiveSearchStatus.details ? <p>{effectiveSearchStatus.details}</p> : null}
          </div>

          <RepRouteMap
            markers={mapMarkers}
            onToggleSaved={toggleSaved}
            onToggleRoute={toggleRoute}
          />

          <div className="map-marker-summary">
            <span className="map-marker-summary__item">
              <span className="map-key map-key--search" />
              {uiText.routes.mapSummary.searchResults(searchResultProspects.length)}
            </span>
            <span className="map-marker-summary__item">
              <span className="map-key map-key--saved" />
              {uiText.routes.mapSummary.savedProspects(savedProspects.length)}
            </span>
            <span className="map-marker-summary__item">
              <span className="map-key map-key--route" />
              {uiText.routes.mapSummary.routeStops(routeProspects.length)}
            </span>
          </div>

          <div className="inline-summary">
            <span>{uiText.routes.mapSummary.visiblePins(mapMarkers.length)}</span>
            <span>{uiText.routes.todayListSummary(routeProspects.length)}</span>
            <span>{uiText.routes.mapSummary.routeMiles(routeMiles.toFixed(1))}</span>
            <span>{uiText.routes.mapSummary.nearbySuggestions(nearbyRouteProspects.length)}</span>
          </div>
        </section>

        {searchResultProspects.length > 0 ? (
          <section className="panel section-panel">
            <div className="section-heading">
              <div>
                <div className="eyebrow eyebrow--tight">{uiText.search.resultsEyebrow}</div>
                <h2>{uiText.search.resultsHeading}</h2>
              </div>
              <DataSourceBadge source={effectiveSearchStatus.source} />
            </div>

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
                  onUpdatePriority={updateProspectPriority}
                  onRequestRemove={openRemoveProspectPrompt}
                  onToggleSaved={toggleSaved}
                  onToggleRoute={toggleRoute}
                />
              ))}
            </div>
          </section>
        ) : null}

        {routeProspects.length > 0 ? (
          <>
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
              />
            ) : null}

            <section className="stat-grid">
              <StatCard
                label={uiText.routes.stats.completedStops}
                value={`${completedRouteStops}`}
                detail={uiText.routes.stats.completedStopsDetail(remainingRouteStops)}
                icon={CheckCircle2}
              />
              <StatCard
                label={uiText.routes.stats.estimatedDriveTime}
                value={formatDriveTime(estimatedDriveMinutes)}
                detail={uiText.routes.stats.estimatedDriveTimeDetail(`${routeMiles.toFixed(1)} route miles`)}
                icon={Clock3}
              />
              <StatCard
                label={uiText.routes.stats.completion}
                value={`${completionPercentage}%`}
                detail={uiText.routes.stats.completionDetail}
                icon={Target}
              />
              <StatCard
                label={uiText.routes.stats.nearbyProspects}
                value={`${nearbyRouteProspects.length}`}
                detail={uiText.routes.stats.nearbyProspectsDetail}
                icon={Truck}
              />
            </section>

            <section className="panel section-panel">
              <div className="section-heading">
                <div>
                  <div className="eyebrow eyebrow--tight">{uiText.routes.fieldWorkflowEyebrow}</div>
                  <h2>{uiText.routes.fieldWorkflowHeading}</h2>
                </div>
                <span className="meta-pill">
                  {currentRouteStop
                    ? uiText.routes.nextStop(currentRouteStop.businessName)
                    : uiText.routes.routeReady}
                </span>
              </div>

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

              {routeTrackerState === 'denied' && !routeStartLocation.trim() ? (
                <div className="status-banner status-banner--info">
                  <p>{uiText.routes.optimization.locationOffMessage}</p>
                </div>
              ) : null}

              <div className="route-progress-track" aria-hidden="true">
                <span
                  className="route-progress-track__fill"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>

              {currentRouteStop ? (
                <div className="mini-callout">
                  <Navigation size={16} />
                  <div>
                    <strong>{uiText.routes.currentFocusTitle}</strong>
                    <p>
                      {currentRouteStop.businessName} · {currentRouteStop.address}
                    </p>
                  </div>
                </div>
              ) : null}

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
                        onToggleCompleted={toggleRouteCompleted}
                        onToggleSaved={toggleSaved}
                        onToggleRoute={toggleRoute}
                        onUpdatePriority={updateProspectPriority}
                        onUpdateVisitNote={updateVisitNote}
                        onUpdateOutcome={updateVisitOutcome}
                        onRemove={openRemoveProspectPrompt}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </section>

            <section className="panel section-panel">
              <div className="section-heading">
                <div>
                  <div className="eyebrow eyebrow--tight">{uiText.routes.nearbyEyebrow}</div>
                  <h2>{uiText.routes.nearbyHeading}</h2>
                </div>
                <span className="meta-pill">{uiText.routes.withinFiveMiles}</span>
              </div>

              {nearbyRouteProspects.length > 0 ? (
                <div className="nearby-prospect-stack">
                  {nearbyRouteProspects.map(({ prospect, nearestDistance }) => (
                    <article className="nearby-prospect-card" key={prospect.id}>
                      <div>
                        <h3>{prospect.businessName}</h3>
                        <p>
                          {prospect.category} · {uiText.routes.nearbyDistanceLabel(nearestDistance)}
                        </p>
                      </div>
                      <button
                        type="button"
                        className={`button ${routeIds.includes(prospect.id) ? 'button--danger-outline' : ''}`}
                        onClick={() =>
                          toggleRoute(prospect.id)
                        }
                      >
                        {routeIds.includes(prospect.id) ? uiText.search.card.removeRoute : uiText.routes.actions.addToRoute}
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={uiText.emptyStates.noNearbyTitle}
                  copy={uiText.emptyStates.noNearbyCopy}
                  icon={Search}
                  actionLabel={uiText.saved.emptyAction}
                  onAction={() => setActiveView('search')}
                />
              )}
            </section>

            {nearbyRouteProspects.length > 0 ? (
              <button type="button" className="floating-route-fab" onClick={addNearbyProspect}>
                <Plus size={18} />
                {uiText.routes.actions.addNearbyProspect}
              </button>
            ) : null}
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
    return (
      <>
        <section className="panel section-panel">
          <div className="section-heading">
            <div>
              <div className="eyebrow eyebrow--tight">{uiText.search.eyebrow}</div>
              <h2>{uiText.search.heading}</h2>
            </div>
            <DataSourceBadge source={effectiveSearchStatus.source} />
          </div>

          <div className="prominent-search-callout">
            <strong>{uiText.search.prominentTitle}</strong>
            <p>{uiText.search.prominentDescription}</p>
          </div>

          <section className="location-access-panel">
            <div className="location-access-panel__header">
              <strong>{uiText.search.locationPanel.heading}</strong>
              <span
                className={`meta-pill ${
                  searchLocationState === 'granted'
                    ? 'meta-pill--accent'
                    : searchLocationState === 'denied'
                      ? 'meta-pill--hot'
                      : searchLocationState === 'unsupported'
                        ? 'meta-pill--cold'
                        : 'meta-pill--warm'
                }`}
              >
                {searchLocationState === 'granted'
                  ? uiText.search.locationPanel.statusOn
                  : searchLocationState === 'denied'
                    ? uiText.search.locationPanel.statusOff
                    : searchLocationState === 'unsupported'
                      ? uiText.search.locationPanel.statusUnavailable
                      : uiText.search.locationPanel.statusNeeded}
              </span>
            </div>
            <p className="section-copy">{uiText.search.locationPanel.helper}</p>

            {searchLocationState === 'denied' ? (
              <div className="status-banner status-banner--error">
                <p>{uiText.search.locationPanel.blocked}</p>
              </div>
            ) : null}

            {searchLocationState !== 'granted' && searchLocationState !== 'unsupported' ? (
              <button type="button" className="button button--wide" onClick={requestSearchLocationAccess}>
                {uiText.search.locationPanel.turnOn}
              </button>
            ) : null}

            {searchLocationState === 'unsupported' ? (
              <div className="status-banner status-banner--info">
                <p>{uiText.search.location.unsupported}</p>
              </div>
            ) : null}
          </section>

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
              <p className="editor-hint">{uiText.search.marketHelp}</p>
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

          <div className="chip-row">
            {SUGGESTED_SEARCH_INDUSTRIES.map((industry) => (
              <button
                type="button"
                key={industry}
                className={`chip ${selectedIndustries.includes(industry) ? 'chip--active' : ''}`}
                onClick={() => toggleIndustrySelection(industry)}
              >
                {industry}
              </button>
            ))}
          </div>

          <div className="field-group">
            <p className="field-label">{uiText.search.selectedFiltersLabel}</p>
            <div className="chip-row">
              <span className="chip chip--static">{effectiveRadiusLabel}</span>
              {usesCurrentLocation ? (
                <span className="chip chip--static">{uiText.search.filters.currentLocation}</span>
              ) : null}
              {selectedIndustries.length > 0 ? (
                <span className="chip chip--static">
                  {uiText.search.filters.industries(selectedIndustries)}
                </span>
              ) : null}
              {manualMarket.trim() && !usesCurrentLocation ? (
                <span className="chip chip--static">
                  {uiText.search.filters.market(manualMarket.trim())}
                </span>
              ) : null}
            </div>
          </div>

          <div
            className={`status-banner ${
              effectiveSearchStatus.source === 'api-error'
                ? 'status-banner--error'
                : 'status-banner--info'
            }`}
          >
            <p>{effectiveSearchStatus.message}</p>
            {typeof effectiveSearchStatus.resultsCount === 'number' ? (
              <p>{uiText.search.summary.resultsReturned(effectiveSearchStatus.resultsCount)}</p>
            ) : null}
            {effectiveSearchStatus.details ? <p>{effectiveSearchStatus.details}</p> : null}
          </div>

          <div className="inline-summary">
            <span>
              {effectiveSearchStatus.source === 'live'
                ? uiText.search.summary.results(searchResultProspects.length)
                : uiText.search.summary.error}
            </span>
            <button type="button" className="text-button" onClick={() => setActiveView('settings')}>
              {uiText.search.openSettings}
            </button>
          </div>
        </section>

        <RouteCalculationCard
          routeCount={routeProspects.length}
          estimatedDriveMinutes={estimatedDriveMinutes}
          travelMode={travelMode}
          filterSummary={routeCalculationFilterSummary}
          onCalculate={handleCalculateRoute}
        />

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
                onUpdatePriority={updateProspectPriority}
                onRequestRemove={openRemoveProspectPrompt}
                onToggleSaved={toggleSaved}
                onToggleRoute={toggleRoute}
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
        <section className="panel section-panel">
          <div className="section-heading">
            <div>
              <div className="eyebrow eyebrow--tight">{uiText.saved.eyebrow}</div>
              <h2>{uiText.saved.heading}</h2>
            </div>
            <span className="meta-pill">{uiText.saved.countLabel(savedProspects.length)}</span>
          </div>

          <div className="saved-summary">
            <div className="saved-summary__block">
              <Bookmark size={18} />
              <div>
                <strong>{uiText.saved.summaryPrimaryTitle}</strong>
                <p>{uiText.saved.summaryPrimaryDescription}</p>
              </div>
            </div>
            <div className="saved-summary__block">
              <NotebookPen size={18} />
              <div>
                <strong>{uiText.saved.summarySecondaryTitle}</strong>
                <p>{uiText.saved.summarySecondaryDescription}</p>
              </div>
            </div>
          </div>
        </section>

        <RouteCalculationCard
          routeCount={routeProspects.length}
          estimatedDriveMinutes={estimatedDriveMinutes}
          travelMode={travelMode}
          filterSummary={routeCalculationFilterSummary}
          onCalculate={handleCalculateRoute}
        />

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
                onRequestRemove={openRemoveProspectPrompt}
                onToggleRoute={toggleRoute}
                onToggleExpanded={toggleExpandedProspect}
                onUpdateNotes={updateProspectNotes}
                onUpdatePriority={updateProspectPriority}
                onUpdateFollowUp={updateProspectFollowUp}
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

  function renderFollowUpsView() {
    return (
      <>
        <section className="stat-grid">
          <StatCard
            label={uiText.followUps.stats.scheduled}
            value={`${scheduledFollowUps.length}`}
            detail={uiText.followUps.stats.scheduledDetail}
            icon={CalendarClock}
          />
          <StatCard
            label={uiText.followUps.stats.dueNow}
            value={`${dueNowCount}`}
            detail={uiText.followUps.stats.dueNowDetail}
            icon={Flame}
          />
          <StatCard
            label={uiText.followUps.stats.thisWeek}
            value={`${upcomingThisWeek}`}
            detail={uiText.followUps.stats.thisWeekDetail}
            icon={Users}
          />
        </section>

        {scheduledFollowUps.length > 0 ? (
          <section className="stack">
            {scheduledFollowUps.map((prospect) => {
              const followUpStatus = getFollowUpStatus(prospect.followUpDate)

              return (
                <article className="follow-up-card" key={prospect.id}>
                  <div className="follow-up-card__header">
                    <div>
                      <div className="eyebrow eyebrow--tight">{prospect.category}</div>
                      <h3>{prospect.businessName}</h3>
                      <p>{prospect.city}</p>
                    </div>
                    <span
                      className={`meta-pill ${
                        followUpStatus === uiText.followUps.statuses.dueNow
                          ? 'meta-pill--hot'
                          : followUpStatus === uiText.followUps.statuses.tomorrow ||
                              followUpStatus === uiText.followUps.statuses.thisWeek
                            ? 'meta-pill--warm'
                            : 'meta-pill--cold'
                      }`}
                    >
                      {followUpStatus}
                    </span>
                  </div>

                  <div className="follow-up-card__meta">
                    <span>{formatFollowUpDate(prospect.followUpDate)}</span>
                    <span>Priority: {prospect.priority}</span>
                    <span>
                      {savedIds.includes(prospect.id)
                        ? uiText.followUps.savedStatus
                        : uiText.followUps.unsavedStatus}
                    </span>
                  </div>

                  <p className="follow-up-card__notes">{prospect.notes}</p>

                  <div className="follow-up-card__footer">
                    <span className="meta-pill meta-pill--accent">{prospect.nextTouch}</span>
                    <button
                      type="button"
                      className="mini-button"
                      onClick={() => {
                        setExpandedProspectId(prospect.id)
                        setActiveView(savedIds.includes(prospect.id) ? 'saved' : 'search')
                      }}
                    >
                      {uiText.followUps.openProspect}
                    </button>
                  </div>
                </article>
              )
            })}
          </section>
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
        <section ref={settingsTopRef} className="panel section-panel">
          <div className="profile-card">
            <div className="profile-card__avatar">
              <UserRound size={22} />
            </div>
            <div>
              <h2>{uiText.navigation.accountMenu.workspaceTitle}</h2>
              <p>{uiText.navigation.accountMenu.workspaceDescription}</p>
            </div>
          </div>

          <div className="settings-stack">
            <button
              type="button"
              className="setting-row"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              <div>
                <strong>{uiText.settings.appearanceTitle}</strong>
                <p>{uiText.settings.appearanceDescription}</p>
              </div>
              <span className="meta-pill">
                {theme === 'dark' ? uiText.settings.darkMode : uiText.settings.lightMode}
              </span>
            </button>
          </div>
        </section>

        <section className="panel section-panel">
          <div className="settings-stack">
            <label className="field-group">
              <span className="field-label">{uiText.settings.arrivalDetectionLabel}</span>
              <span className="section-copy">{uiText.settings.arrivalDetectionDescription}</span>
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

        <section className="panel section-panel">
          <div className="section-heading">
            <div>
              <div className="eyebrow eyebrow--tight">{uiText.settings.googlePlacesEyebrow}</div>
              <h2>{uiText.settings.googlePlacesHeading}</h2>
            </div>
            <span className="meta-pill">
              {googleMapsApiKey ? uiText.settings.apiKeyDetected : uiText.settings.apiKeyMissing}
            </span>
          </div>

          <p className="section-copy">{uiText.settings.googlePlacesDescription}</p>

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

        <section ref={notificationSectionRef} className="panel section-panel">
          <div className="section-heading">
            <div>
              <div className="eyebrow eyebrow--tight">{uiText.settings.notifications.eyebrow}</div>
              <h2>{uiText.settings.notifications.heading}</h2>
            </div>
            <span className="meta-pill">{notificationPermissionLabel}</span>
          </div>

          <p className="section-copy">{uiText.settings.notifications.description}</p>

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

          <div className="inline-summary">
            <span>{uiText.settings.notifications.localOnlyNote}</span>
          </div>
        </section>

        <section ref={crmExportSectionRef} className="panel section-panel">
          <div className="section-heading">
            <div>
              <div className="eyebrow eyebrow--tight">{uiText.crmExport.eyebrow}</div>
              <h2>{uiText.crmExport.heading}</h2>
            </div>
            <span className="meta-pill">{uiText.crmExport.rowsLabel(crmExportPreview.records.length)}</span>
          </div>

          <p className="section-copy">{uiText.crmExport.description}</p>

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

          <div className="inline-summary">
            <span>{uiText.crmExport.futureIntegrationsLabel(futureCrmApiTargets)}</span>
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

        <section ref={backupSectionRef} className="panel section-panel">
          <div className="section-heading">
            <div>
              <div className="eyebrow eyebrow--tight">{uiText.settings.backupEyebrow}</div>
              <h2>{uiText.settings.backupHeading}</h2>
            </div>
          </div>

          <p className="section-copy">{uiText.settings.backupDescription}</p>

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

        <section className="panel section-panel">
          <div className="section-heading">
            <div>
              <div className="eyebrow eyebrow--tight">{uiText.settings.storageEyebrow}</div>
              <h2>{uiText.settings.storageHeading}</h2>
            </div>
          </div>

          <div className="saved-summary">
            <div className="saved-summary__block">
              <Star size={18} />
              <div>
                <strong>{uiText.settings.storageLocalTitle}</strong>
                <p>{uiText.settings.storageLocalDescription}</p>
              </div>
            </div>
            <div className="saved-summary__block">
              <Route size={18} />
              <div>
                <strong>{uiText.settings.storageLiveTitle}</strong>
                <p>{uiText.settings.storageLiveDescription}</p>
              </div>
            </div>
          </div>
        </section>
      </>
    )
  }

  function renderActiveView() {
    switch (activeView) {
      case 'dashboard':
        return renderDashboard()
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

        <section className="screen-intro">
          <div className="eyebrow">{uiText.navigation.liveBadge}</div>
          <h2>{displayMeta.title}</h2>
          <p>{displayMeta.subtitle}</p>
        </section>

        {(['dashboard', 'map', 'search', 'saved'] as View[]).includes(activeView) ? (
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

      </main>

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
                onClick={() => setActiveView(item.id)}
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
