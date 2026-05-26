import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
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
  LayoutDashboard,
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
import { searchGooglePlaces, type GooglePlacesApiPlace } from './lib/googlePlaces'

type Priority = 'Hot' | 'Warm' | 'Cold'
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

type BaseProspect = {
  id: string
  googlePlaceId: string
  businessName: string
  contactName: string
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
  lastContactDate?: string
  notes?: string
  priority?: Priority
  followUpDate?: string
  visitNote?: string
  visitOutcome?: OutcomeTag | ''
  routeCompleted?: boolean
}

type Prospect = BaseProspect & {
  followUpDate: string
  lastContactDate: string
  routeCompleted: boolean
  visitNote: string
  visitOutcome: OutcomeTag | ''
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

const SUGGESTED_SEARCH_KEYWORDS = [
  'equipment rental',
  'pipeline operators',
  'natural gas companies',
  'oilfield services',
  'industrial supply',
  'HVAC contractors',
  'electrical contractors',
  'plumbing contractors',
  'construction companies',
] as const

const ROUTE_OUTCOME_OPTIONS: OutcomeTag[] = [
  'No Answer',
  'Decision Maker Met',
  'Follow-Up Needed',
  'Quote Opportunity',
  'Not Interested',
]

const STORAGE_KEYS = {
  liveProspects: 'reproute:live-prospects',
  savedProspects: 'reproute:saved-prospects',
  prospectRecords: 'reproute:prospect-records',
  routeList: 'reproute:route-list',
  theme: 'reproute:theme',
} as const

const AUSTIN_FALLBACK = { lat: 30.2672, lng: -97.7431 }

const screenMeta: Record<View, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Territory command',
    subtitle: 'Search real businesses with Google Places and keep your route work saved locally.',
  },
  map: {
    title: 'Today’s route',
    subtitle: 'Stack nearby stops, remove low-value detours, and clear the day when you are done.',
  },
  search: {
    title: 'Prospect search',
    subtitle: 'Run live Google Places searches by keyword and city, then save or route the real accounts.',
  },
  saved: {
    title: 'Saved prospects',
    subtitle: 'Keep promising accounts ready for future route days and follow-up work.',
  },
  'follow-ups': {
    title: 'Follow-ups',
    subtitle: 'Every scheduled callback and visit, sorted by date and saved on this device.',
  },
  settings: {
    title: 'Workspace settings',
    subtitle: 'Test Google Places, export your local data, and manage workspace preferences.',
  },
}

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
    return 'No follow-up set'
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
    return 'Unknown export date'
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

function isPriority(value: unknown): value is Priority {
  return value === 'Hot' || value === 'Warm' || value === 'Cold'
}

function isOutcomeTag(value: unknown): value is OutcomeTag {
  return ROUTE_OUTCOME_OPTIONS.includes(value as OutcomeTag)
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
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

function calculateDistanceMiles(
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

  return Number((earthRadiusMiles * c).toFixed(1))
}

function priorityFromRating(rating: number | null): Priority {
  if (rating === null) {
    return 'Warm'
  }

  if (rating >= 4.6) {
    return 'Hot'
  }

  if (rating >= 4) {
    return 'Warm'
  }

  return 'Cold'
}

function createFallbackLiveProspectId(place: GooglePlacesApiPlace, query: string) {
  const name = place.displayName?.text?.trim() ?? 'place'
  const address = place.formattedAddress?.trim() ?? query
  return `gplace:${slugify(`${name}-${address}`)}`
}

function toLiveProspect(place: GooglePlacesApiPlace, keyword: string, location: string) {
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
        : 'Live Google Place'

  return {
    id: place.id ? `gplace:${place.id}` : createFallbackLiveProspectId(place, `${keyword} ${location}`),
    googlePlaceId: place.id?.trim() ?? '',
    businessName,
    contactName: '',
    category,
    distance: calculateDistanceMiles(AUSTIN_FALLBACK, { lat, lng }),
    priority: priorityFromRating(rating),
    lastContact: 'Not contacted yet',
    notes: 'Imported from a live Google Places search.',
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

function createEntireRouteNavigateHref(routeProspects: Prospect[], travelMode: TravelMode) {
  if (routeProspects.length <= 1) {
    return routeProspects[0] ? createNavigateHref(routeProspects[0], travelMode) : ''
  }

  const url = new URL('https://www.google.com/maps/dir/')
  const orderedStops = routeProspects.map((prospect) => getMapsDestination(prospect))

  url.searchParams.set('api', '1')
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
    return 'Live Google Places'
  }

  return 'API error'
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

      if (record.lastContactDate === '' || isIsoDate(record.lastContactDate)) {
        nextRecord.lastContactDate = record.lastContactDate
      }

      if (typeof record.notes === 'string') {
        nextRecord.notes = record.notes
      }

      if (isPriority(record.priority)) {
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
    return 'Due now'
  }

  if (daysUntil === 1) {
    return 'Tomorrow'
  }

  if (daysUntil <= 7) {
    return 'This week'
  }

  return 'Later'
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

function RouteWorkflowStopCard({
  index,
  prospect,
  travelMode,
  onNavigate,
  onToggleCompleted,
  onUpdateVisitNote,
  onUpdateOutcome,
  onRemove,
}: {
  index: number
  prospect: Prospect
  travelMode: TravelMode
  onNavigate: (prospect: Prospect) => void
  onToggleCompleted: (prospectId: string) => void
  onUpdateVisitNote: (prospectId: string, note: string) => void
  onUpdateOutcome: (prospectId: string, outcome: OutcomeTag | '') => void
  onRemove: (prospectId: string) => void
}) {
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

  return (
    <article
      ref={setNodeRef}
      className={`route-stop-card ${prospect.routeCompleted ? 'route-stop-card--completed' : ''} ${
        isDragging ? 'route-stop-card--dragging' : ''
      }`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <div className="route-stop-card__top">
        <div className="route-stop-card__heading">
          <button
            type="button"
            className={`route-stop-check ${prospect.routeCompleted ? 'route-stop-check--checked' : ''}`}
            onClick={() => onToggleCompleted(prospect.id)}
            aria-label={prospect.routeCompleted ? 'Mark stop incomplete' : 'Mark stop complete'}
          >
            {prospect.routeCompleted ? <CheckCircle2 size={22} /> : <Circle size={22} />}
          </button>

          <div className="route-stop-card__title-block">
            <div className="route-stop-card__eyebrow">Stop {index + 1}</div>
            <h3>{prospect.businessName}</h3>
            <p>
              {prospect.category} · {formatDistance(prospect.distance)}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="drag-handle"
          aria-label="Reorder stop"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={20} />
        </button>
      </div>

      <div className="route-stop-card__meta">
        <span className={`meta-pill meta-pill--${prospect.priority.toLowerCase()}`}>
          {prospect.priority}
        </span>
        {prospect.visitOutcome ? (
          <span className="meta-pill meta-pill--accent">{prospect.visitOutcome}</span>
        ) : null}
        {prospect.routeCompleted ? <span className="meta-pill">Completed</span> : null}
      </div>

      <div className="route-action-row">
        {callHref ? (
          <a className="route-action-button" href={callHref}>
            <Phone size={16} />
            Call Business
          </a>
        ) : null}
        {websiteHref ? (
          <a className="route-action-button" href={websiteHref} target="_blank" rel="noreferrer">
            <ExternalLink size={16} />
            Open Website
          </a>
        ) : null}
        <button type="button" className="route-action-button" onClick={() => onNavigate(prospect)}>
          <Navigation size={16} />
          Navigate {travelMode === 'walking' ? 'Walk' : 'Drive'}
        </button>
      </div>

      <div className="field-group">
        <span className="field-label">Visit outcome</span>
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
        <span className="field-label">Quick note after visit</span>
        <textarea
          className="text-area text-area--compact"
          rows={3}
          value={prospect.visitNote}
          onChange={(event) => onUpdateVisitNote(prospect.id, event.target.value)}
          placeholder="Add what happened at this stop..."
        />
      </label>

      <div className="route-stop-card__footer">
        <p>{prospect.address}</p>
        <button type="button" className="mini-button" onClick={() => onRemove(prospect.id)}>
          Remove
        </button>
      </div>
    </article>
  )
}

function LiveSearchResultCard({
  prospect,
  isSaved,
  isInRoute,
  travelMode,
  onNavigate,
  onToggleSaved,
  onToggleRoute,
}: {
  prospect: Prospect
  isSaved: boolean
  isInRoute: boolean
  travelMode: TravelMode
  onNavigate: (prospect: Prospect) => void
  onToggleSaved: (prospectId: string) => void
  onToggleRoute: (prospectId: string) => void
}) {
  const websiteHref = normalizeWebsiteUrl(prospect.website)
  const hasPhone = prospect.phone !== 'Phone unavailable'

  return (
    <article className="live-result-card">
      <div className="live-result-card__header">
        <div>
          <div className="eyebrow eyebrow--tight">Live Google Places</div>
          <h3>{prospect.businessName}</h3>
          <p>{prospect.category}</p>
        </div>
        {prospect.rating !== null ? <span className="meta-pill">{prospect.rating.toFixed(1)} stars</span> : null}
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
          onClick={() => onToggleSaved(prospect.id)}
        >
          {isSaved ? 'Saved' : 'Save Prospect'}
        </button>
        <button
          type="button"
          className={`button ${isInRoute ? 'button--secondary' : ''}`}
          onClick={() => onToggleRoute(prospect.id)}
        >
          {isInRoute ? 'In Route' : 'Add to Route'}
        </button>
        <button type="button" className="route-action-button" onClick={() => onNavigate(prospect)}>
          <Navigation size={16} />
          Navigate {travelMode === 'walking' ? 'Walk' : 'Drive'}
        </button>
      </div>
    </article>
  )
}

function ProspectCard({
  prospect,
  isSaved,
  isInRoute,
  isExpanded,
  travelMode,
  onNavigate,
  onToggleSaved,
  onToggleRoute,
  onToggleExpanded,
  onUpdateNotes,
  onUpdatePriority,
  onUpdateFollowUp,
}: {
  prospect: Prospect
  isSaved: boolean
  isInRoute: boolean
  isExpanded: boolean
  travelMode: TravelMode
  onNavigate: (prospect: Prospect) => void
  onToggleSaved: (prospectId: string) => void
  onToggleRoute: (prospectId: string) => void
  onToggleExpanded: (prospectId: string) => void
  onUpdateNotes: (prospectId: string, notes: string) => void
  onUpdatePriority: (prospectId: string, priority: Priority) => void
  onUpdateFollowUp: (prospectId: string, followUpDate: string) => void
}) {
  return (
    <article className="prospect-card">
      <div className="prospect-card__header">
        <div>
          <div className="eyebrow eyebrow--tight">{prospect.category}</div>
          <h3>{prospect.businessName}</h3>
          <p className="prospect-card__city">{prospect.city}</p>
        </div>

        <button
          type="button"
          className={`icon-button ${isSaved ? 'icon-button--active' : ''}`}
          aria-label={isSaved ? 'Remove from saved prospects' : 'Save prospect'}
          onClick={() => onToggleSaved(prospect.id)}
        >
          <Star size={16} fill={isSaved ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="prospect-card__meta">
        <span className="meta-pill">{formatDistance(prospect.distance)}</span>
        <span className={`meta-pill meta-pill--${prospect.priority.toLowerCase()}`}>
          {prospect.priority}
        </span>
        <span className="meta-pill">{prospect.lastContact}</span>
        {prospect.followUpDate ? (
          <span className="meta-pill meta-pill--accent">
            Follow-up {formatFollowUpDate(prospect.followUpDate)}
          </span>
        ) : null}
      </div>

      <div className="prospect-card__notes-block">
        <p className="prospect-card__footer-label">Notes</p>
        <p className="prospect-card__notes">{prospect.notes}</p>
      </div>

      <div className="prospect-card__footer">
        <div>
          <p className="prospect-card__footer-label">Next touch</p>
          <p className="prospect-card__footer-copy">{prospect.nextTouch}</p>
        </div>

        <div className="prospect-card__button-group">
          <button
            type="button"
            className={`button ${isInRoute ? 'button--secondary' : ''}`}
            onClick={() => onToggleRoute(prospect.id)}
          >
            {isInRoute ? 'Remove Route' : 'Add to Route'}
          </button>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => onToggleExpanded(prospect.id)}
          >
            {isExpanded ? 'Hide' : 'Manage'}
          </button>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => onNavigate(prospect)}
          >
            Navigate {travelMode === 'walking' ? 'Walk' : 'Drive'}
          </button>
        </div>
      </div>

      {isExpanded ? (
        <div className="prospect-editor">
          <div className="field-group">
            <span className="field-label">Priority</span>
            <div className="segment-row">
              {(['Hot', 'Warm', 'Cold'] as Priority[]).map((option) => (
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
              <span className="field-label">Follow-up date</span>
              {prospect.followUpDate ? (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => onUpdateFollowUp(prospect.id, '')}
                >
                  Clear
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
            <span className="field-label">Prospect notes</span>
            <textarea
              className="text-area"
              rows={4}
              value={prospect.notes}
              onChange={(event) => onUpdateNotes(prospect.id, event.target.value)}
            />
          </label>

          <p className="editor-hint">Edits save instantly to local storage on this device.</p>
        </div>
      ) : null}
    </article>
  )
}

function App() {
  const importFileInputRef = useRef<HTMLInputElement | null>(null)
  const accountMenuRef = useRef<HTMLDivElement | null>(null)
  const pendingSettingsSectionRef = useRef<'top' | 'crm' | 'backup' | null>(null)
  const settingsTopRef = useRef<HTMLElement | null>(null)
  const crmExportSectionRef = useRef<HTMLElement | null>(null)
  const backupSectionRef = useRef<HTMLElement | null>(null)
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? ''
  const [activeView, setActiveView] = useState<View>('search')
  const [expandedProspectId, setExpandedProspectId] = useState<string | null>(null)
  const [backupMessage, setBackupMessage] = useState<BackupMessage | null>(null)
  const [crmExportMessage, setCrmExportMessage] = useState<BackupMessage | null>(null)
  const [accountMenuMessage, setAccountMenuMessage] = useState<BackupMessage | null>(null)
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
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
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchLocation, setSearchLocation] = useState('Austin TX')
  const [priorityFilter, setPriorityFilter] = useState<'All' | Priority>('All')
  const [travelMode, setTravelMode] = useState<TravelMode>('driving')
  const [crmExportFormat, setCrmExportFormat] = useState<CrmExportFormat>('generic')
  const [crmExportScope, setCrmExportScope] = useState<CrmExportScope>('all')
  const [liveSearchIds, setLiveSearchIds] = useState<string[]>([])
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false)
  const [searchStatus, setSearchStatus] = useState<SearchStatus | null>(null)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [connectionTest, setConnectionTest] = useState<ConnectionTestState>({
    status: 'idle',
    message: 'Run a live Google Places test to verify this API key and search flow.',
  })
  const routeSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  )

  function scrollToSettingsSection(section: 'top' | 'crm' | 'backup') {
    const target =
      section === 'crm'
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

  const effectiveSearchStatus = useMemo<SearchStatus>(
    () =>
      searchStatus ??
      (googleMapsApiKey
        ? {
            source: 'live',
            message: 'Enter a keyword and city to search live Google Places results.',
          }
        : {
            source: 'api-error',
            message: 'Connect Google Places to search real businesses.',
            details: 'Add a valid `VITE_GOOGLE_MAPS_API_KEY` to load real Places results.',
          }),
    [googleMapsApiKey, searchStatus],
  )
  const crmExportFormats = useMemo(() => getCrmExportFormats(), [])
  const crmExportScopes = useMemo(() => getCrmExportScopes(), [])
  const futureCrmApiTargets = useMemo(() => getFutureCrmApiTargets(), [])
  const navigationItems = useMemo<Array<{ id: View; label: string; icon: typeof Route }>>(
    () =>
      routeIds.length > 0
        ? [
            { id: 'search', label: 'Search', icon: Search },
            { id: 'map', label: 'Route', icon: MapIcon },
            { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
            { id: 'saved', label: 'Saved', icon: Bookmark },
            { id: 'follow-ups', label: 'Follow-Ups', icon: CalendarClock },
            { id: 'settings', label: 'Settings', icon: Settings2 },
          ]
        : [
            { id: 'search', label: 'Search', icon: Search },
            { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
            { id: 'saved', label: 'Saved', icon: Bookmark },
            { id: 'follow-ups', label: 'Follow-Ups', icon: CalendarClock },
            { id: 'settings', label: 'Settings', icon: Settings2 },
            { id: 'map', label: 'Route', icon: MapIcon },
          ],
    [routeIds.length],
  )

  const liveCatalogProspects = useMemo(
    () =>
      liveProspects.map((prospect) => {
        const record = prospectRecords[prospect.id]
        return {
          ...prospect,
          contactName: record?.contactName ?? prospect.contactName,
          notes: record?.notes ?? prospect.notes,
          priority: record?.priority ?? prospect.priority,
          lastContact: record?.lastContactDate
            ? formatFollowUpDate(record.lastContactDate)
            : prospect.lastContact,
          lastContactDate: record?.lastContactDate ?? '',
          followUpDate: record?.followUpDate ?? '',
          routeCompleted: record?.routeCompleted ?? false,
          visitNote: record?.visitNote ?? '',
          visitOutcome: record?.visitOutcome ?? '',
        }
      }),
    [liveProspects, prospectRecords],
  )

  const prospects = useMemo(() => liveCatalogProspects, [liveCatalogProspects])

  const prospectMap = useMemo(
    () => new globalThis.Map(prospects.map((prospect) => [prospect.id, prospect])),
    [prospects],
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
        .filter((prospect): prospect is Prospect => Boolean(prospect))
        .filter((prospect) => priorityFilter === 'All' || prospect.priority === priorityFilter),
    [liveSearchIds, priorityFilter, prospectMap],
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
        followUpDate: prospect.followUpDate,
        googlePlaceId: prospect.googlePlaceId,
        lastContactedDate:
          prospect.lastContactDate ||
          (prospect.lastContact === 'Not contacted yet' ? '' : prospect.lastContact),
        notes: prospect.notes,
        phone: prospect.phone,
        priority: prospect.priority,
        routeOutcomeTag: prospect.visitOutcome,
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
    () => routeProspects.reduce((total, prospect) => total + prospect.distance, 0),
    [routeProspects],
  )
  const completedRouteStops = useMemo(
    () => routeProspects.filter((prospect) => prospect.routeCompleted).length,
    [routeProspects],
  )
  const remainingRouteStops = routeProspects.length - completedRouteStops
  const completionPercentage =
    routeProspects.length > 0 ? Math.round((completedRouteStops / routeProspects.length) * 100) : 0
  const estimatedDriveMinutes = useMemo(
    () => Math.round(routeMiles * 2.4),
    [routeMiles],
  )
  const currentRouteStop = useMemo(
    () => routeProspects.find((prospect) => !prospect.routeCompleted) ?? routeProspects[0] ?? null,
    [routeProspects],
  )
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
    (prospect) => getFollowUpStatus(prospect.followUpDate) === 'Due now',
  ).length

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

  function updateProspectRecord(
    prospectId: string,
    updater: (current: ProspectRecord | undefined) => ProspectRecord,
  ) {
    setProspectRecords((current) => ({
      ...current,
      [prospectId]: updater(current[prospectId]),
    }))
  }

  function toggleSaved(prospectId: string) {
    setSavedIds((current) =>
      current.includes(prospectId)
        ? current.filter((id) => id !== prospectId)
        : [...current, prospectId],
    )
  }

  function toggleRoute(prospectId: string) {
    setRouteIds((current) =>
      current.includes(prospectId)
        ? current.filter((id) => id !== prospectId)
        : [...current, prospectId],
    )
  }

  function toggleRouteCompleted(prospectId: string) {
    updateProspectRecord(prospectId, (current) => ({
      ...current,
      routeCompleted: !(current?.routeCompleted ?? false),
      lastContactDate:
        current?.lastContactDate || new Date().toISOString().slice(0, 10),
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
      return
    }

    openExternalNavigation(createEntireRouteNavigateHref(routeProspects, travelMode))
  }

  function clearRoute() {
    setRouteIds([])
  }

  function toggleExpandedProspect(prospectId: string) {
    setExpandedProspectId((current) => (current === prospectId ? null : prospectId))
  }

  async function runLiveSearch(keyword: string, location: string) {
    if (!keyword || !location) {
      setLiveSearchIds([])
      setSearchStatus({
        source: 'api-error',
        message: 'Enter both a keyword and city before running a live Google Places search.',
        details: 'Google Places needs both fields to run a real business search.',
      })
      return
    }

    setIsSearchingPlaces(true)

    const result = await searchGooglePlaces({
      apiKey: googleMapsApiKey,
      keyword,
      location,
      maxResultCount: 12,
    })

    if (result.ok) {
      const normalizedProspects = result.places.reduce<BaseProspect[]>((collection, place) => {
        const prospect = toLiveProspect(place, keyword, location)

        if (prospect) {
          collection.push(prospect)
        }

        return collection
      }, [])

      setLiveProspects((current) => mergeProspectCatalog(current, normalizedProspects))
      setLiveSearchIds(normalizedProspects.map((prospect) => prospect.id))
      setSearchStatus({
        source: 'live',
        message:
          normalizedProspects.length > 0
            ? `Live Google Places returned ${normalizedProspects.length} result(s) for "${result.query}".`
            : `Google Places returned 0 live results for "${result.query}".`,
        resultsCount: normalizedProspects.length,
        query: result.query,
      })
    } else {
      setLiveSearchIds([])
      setSearchStatus({
        source: 'api-error',
        message: result.error,
        details: 'Google Places search failed. Review the API error and try again.',
        query: result.query,
      })
    }

    setIsSearchingPlaces(false)
  }

  async function handleLiveSearch(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    await runLiveSearch(searchKeyword.trim(), searchLocation.trim())
  }

  async function handleSuggestedSearch(keyword: string) {
    setSearchKeyword(keyword)
    await runLiveSearch(keyword, searchLocation.trim())
  }

  async function handleTestGooglePlacesConnection() {
    setConnectionTest({
      status: 'running',
      message: 'Testing Google Places with "equipment rental Austin TX"...',
    })

    const result = await searchGooglePlaces({
      apiKey: googleMapsApiKey,
      keyword: 'equipment rental',
      location: 'Austin TX',
      maxResultCount: 8,
    })

    if (result.ok) {
      setConnectionTest({
        status: 'success',
        message: 'Google Places connection succeeded.',
        resultsCount: result.places.length,
      })
      return
    }

    setConnectionTest({
      status: 'error',
      message: 'Google Places connection failed.',
      details: result.error,
      resultsCount: 0,
    })
  }

  function openImportPicker() {
    importFileInputRef.current?.click()
  }

  function openSettingsPanel(section: 'top' | 'crm' | 'backup') {
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
      text: 'Sign in is coming soon. This profile area is ready for future authentication support.',
    })
  }

  function handleDownloadCrmExport() {
    if (crmExportPreview.records.length === 0) {
      setCrmExportMessage({
        type: 'error',
        text: 'No prospects are available for that CRM export scope yet.',
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
        text: `Exported ${crmExportPreview.records.length} record(s) as ${crmExportPreview.profile.label}.`,
      })
    } catch {
      setCrmExportMessage({
        type: 'error',
        text: 'RepRoute could not generate that CRM export CSV.',
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
        text: 'RepRoute data exported as a JSON backup.',
      })
    } catch {
      setBackupMessage({
        type: 'error',
        text: 'RepRoute could not export a backup file.',
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
        text: 'Backup loaded. Review the preview before replacing current local data.',
      })
    } catch (error) {
      setImportPreview(null)
      setBackupMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'RepRoute could not read that backup file.',
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
    setSearchKeyword('')
    setPriorityFilter('All')
    setLiveSearchIds([])
    setSearchStatus(null)
    setImportPreview(null)
    setBackupMessage({
      type: 'success',
      text: `Imported ${importPreview.fileName}. Existing local RepRoute data was replaced.`,
    })
  }

  function renderDashboard() {
    const nextFollowUp = scheduledFollowUps[0]
    const routeSnapshotSection = (
      <section className="panel section-panel">
        <div className="section-heading">
          <div>
            <div className="eyebrow eyebrow--tight">Today’s route focus</div>
            <h2>Route snapshot</h2>
          </div>
          <button type="button" className="link-button" onClick={() => setActiveView('map')}>
            Open route <ChevronRight size={16} />
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
                <span className={`meta-pill meta-pill--${prospect.priority.toLowerCase()}`}>
                  {prospect.priority}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No route loaded yet"
            copy="Add a few prospects from Search or Saved Prospects to build today’s drive plan."
            icon={Route}
            actionLabel="Go to search"
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
            Live route planning
          </div>
          <h1>Build a sharper field day with real businesses, routes, and follow-ups that stick.</h1>
          <p className="hero-panel__copy">
            RepRoute remembers your real prospects, saved list, route stops, notes, priorities,
            and follow-up dates between visits.
          </p>

          <div className="hero-panel__metrics">
            <div>
              <span>Saved prospects</span>
              <strong>{savedProspects.length}</strong>
            </div>
            <div>
              <span>Route stops</span>
              <strong>{routeProspects.length}</strong>
            </div>
            <div>
              <span>Follow-ups due</span>
              <strong>{dueNowCount}</strong>
            </div>
          </div>

          <div className="button-row">
            <button type="button" className="button" onClick={() => setActiveView('search')}>
              Find prospects
            </button>
            <button type="button" className="button button--ghost" onClick={() => setActiveView('map')}>
              View route
            </button>
          </div>
        </section>

        <section className="panel section-panel prospect-cta-panel">
          <div className="section-heading">
            <div>
              <div className="eyebrow eyebrow--tight">Start here</div>
              <h2>Find real prospects</h2>
            </div>
            <DataSourceBadge source={effectiveSearchStatus.source} />
          </div>

          <p className="section-copy">
            Search live Google Places first, save the strongest accounts, and only move into route work once you have stops worth running.
          </p>

          <div className="chip-row">
            {SUGGESTED_SEARCH_KEYWORDS.slice(0, 4).map((keyword) => (
              <button
                type="button"
                key={keyword}
                className="chip"
                onClick={() => {
                  setSearchKeyword(keyword)
                  setActiveView('search')
                }}
              >
                {keyword}
              </button>
            ))}
          </div>

          <button type="button" className="button button--wide" onClick={() => setActiveView('search')}>
            Find real prospects
          </button>
        </section>

        <section className="stat-grid">
          <StatCard
            label="Real prospects loaded"
            value={`${prospects.length}`}
            detail="Live Google Places businesses currently stored on this device"
            icon={Search}
          />
          <StatCard
            label="Today’s route"
            value={`${routeProspects.length} stops`}
            detail={`${routeMiles.toFixed(1)} mi currently loaded into the route`}
            icon={Truck}
          />
          <StatCard
            label="Upcoming follow-ups"
            value={`${scheduledFollowUps.length}`}
            detail={`${upcomingThisWeek} scheduled in the next seven days`}
            icon={CalendarClock}
          />
        </section>

        <section className="panel section-panel">
          <div className="section-heading">
            <div>
              <div className="eyebrow eyebrow--tight">Live search status</div>
              <h2>Google Places catalog</h2>
            </div>
            <button type="button" className="link-button" onClick={() => setActiveView('settings')}>
              Test <ChevronRight size={16} />
            </button>
          </div>

          {prospects.length > 0 ? (
            <div className="saved-summary">
              <div className="saved-summary__block">
                <Search size={18} />
                <div>
                  <strong>{prospects.length} real businesses stored locally</strong>
                  <p>Saved prospects, route stops, and follow-ups all come from live Google Places searches.</p>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              title="No real prospects loaded yet"
              copy="Connect Google Places to search real businesses."
              icon={Search}
              actionLabel="Open search"
              onAction={() => setActiveView('search')}
            />
          )}
        </section>

        {routeProspects.length > 0 ? routeSnapshotSection : null}

        <section className="panel section-panel">
          <div className="section-heading">
            <div>
              <div className="eyebrow eyebrow--tight">Best nearby opportunities</div>
              <h2>Hot targets</h2>
            </div>
          </div>

          {hotTerritoryProspects.length > 0 ? (
            <div className="stack">
              {hotTerritoryProspects.map((prospect) => (
                <ProspectCard
                  key={prospect.id}
                  prospect={prospect}
                  isSaved={savedIds.includes(prospect.id)}
                  isInRoute={routeIds.includes(prospect.id)}
                  isExpanded={expandedProspectId === prospect.id}
                  travelMode={travelMode}
                  onNavigate={handleNavigateProspect}
                  onToggleSaved={toggleSaved}
                  onToggleRoute={toggleRoute}
                  onToggleExpanded={toggleExpandedProspect}
                  onUpdateNotes={(prospectId, notes) =>
                    updateProspectRecord(prospectId, (current) => ({ ...current, notes }))
                  }
                  onUpdatePriority={(prospectId, priority) =>
                    updateProspectRecord(prospectId, (current) => ({ ...current, priority }))
                  }
                  onUpdateFollowUp={(prospectId, followUpDate) =>
                    updateProspectRecord(prospectId, (current) => ({
                      ...current,
                      followUpDate,
                    }))
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No hot prospects yet"
              copy="Use Search to qualify accounts and mark the best opportunities as Hot."
              icon={Flame}
              actionLabel="Open search"
              onAction={() => setActiveView('search')}
            />
          )}

          {nextFollowUp ? (
            <div className="mini-callout">
              <CalendarClock size={16} />
              <div>
                <strong>Next follow-up</strong>
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
    return (
      <>
        <section className="panel section-panel">
          <div className="section-heading">
            <div>
              <div className="eyebrow eyebrow--tight">Live territory board</div>
              <h2>Route map</h2>
            </div>
            <DataSourceBadge source={effectiveSearchStatus.source} />
          </div>
          {routeProspects.length > 0 ? (
            <div className="button-row route-map-actions">
              <button type="button" className="button" onClick={handleNavigateEntireRoute}>
                <Navigation size={16} />
                Navigate Entire Route
              </button>
              <button
                type="button"
                className="button button--ghost"
                onClick={clearRoute}
              >
                <Trash2 size={16} />
                Clear route
              </button>
            </div>
          ) : null}
          <p className="section-copy map-panel__copy">
            Search results, saved prospects, and route stops stay visible on the map while you work the day.
          </p>

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
              {searchResultProspects.length} search results
            </span>
            <span className="map-marker-summary__item">
              <span className="map-key map-key--saved" />
              {savedProspects.length} saved prospects
            </span>
            <span className="map-marker-summary__item">
              <span className="map-key map-key--route" />
              {routeProspects.length} route stops
            </span>
          </div>

          <div className="inline-summary">
            <span>{mapMarkers.length} visible pins</span>
            <span>{routeProspects.length} stops in today’s list</span>
            <span>{routeMiles.toFixed(1)} total route miles</span>
            <span>{nearbyRouteProspects.length} nearby suggestions</span>
          </div>
        </section>

        {searchResultProspects.length > 0 ? (
          <section className="panel section-panel">
            <div className="section-heading">
              <div>
                <div className="eyebrow eyebrow--tight">Live results</div>
                <h2>Search results</h2>
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
                  onToggleSaved={toggleSaved}
                  onToggleRoute={toggleRoute}
                />
              ))}
            </div>
          </section>
        ) : null}

        {routeProspects.length > 0 ? (
          <>
            <section className="stat-grid">
              <StatCard
                label="Completed stops"
                value={`${completedRouteStops}`}
                detail={`${remainingRouteStops} remaining on today’s route`}
                icon={CheckCircle2}
              />
              <StatCard
                label="Estimated drive time"
                value={formatDriveTime(estimatedDriveMinutes)}
                detail={`${routeMiles.toFixed(1)} route miles currently planned`}
                icon={Clock3}
              />
              <StatCard
                label="Completion"
                value={`${completionPercentage}%`}
                detail="Progress across the active route"
                icon={Target}
              />
              <StatCard
                label="Nearby prospects"
                value={`${nearbyRouteProspects.length}`}
                detail="Within 5 miles of the current route"
                icon={Truck}
              />
            </section>

            <section className="panel section-panel">
              <div className="section-heading">
                <div>
                  <div className="eyebrow eyebrow--tight">Field workflow</div>
                  <h2>Today’s Route</h2>
                </div>
                <span className="meta-pill">{currentRouteStop ? `Next: ${currentRouteStop.businessName}` : 'Route ready'}</span>
              </div>

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
                    <strong>Current focus</strong>
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
                        travelMode={travelMode}
                        onNavigate={handleNavigateProspect}
                        onToggleCompleted={toggleRouteCompleted}
                        onUpdateVisitNote={updateVisitNote}
                        onUpdateOutcome={updateVisitOutcome}
                        onRemove={toggleRoute}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </section>

            <section className="panel section-panel">
              <div className="section-heading">
                <div>
                  <div className="eyebrow eyebrow--tight">Nearby coverage</div>
                  <h2>Nearby Prospects</h2>
                </div>
                <span className="meta-pill">Within 5 miles</span>
              </div>

              {nearbyRouteProspects.length > 0 ? (
                <div className="nearby-prospect-stack">
                  {nearbyRouteProspects.map(({ prospect, nearestDistance }) => (
                    <article className="nearby-prospect-card" key={prospect.id}>
                      <div>
                        <h3>{prospect.businessName}</h3>
                        <p>
                          {prospect.category} · {nearestDistance.toFixed(1)} mi from route
                        </p>
                      </div>
                      <button
                        type="button"
                        className="button"
                        onClick={() =>
                          setRouteIds((current) =>
                            current.includes(prospect.id) ? current : [...current, prospect.id],
                          )
                        }
                      >
                        Add to Route
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No nearby prospects right now"
                  copy="Search a few more real businesses to get route-side suggestions within 5 miles."
                  icon={Search}
                  actionLabel="Search prospects"
                  onAction={() => setActiveView('search')}
                />
              )}
            </section>

            {nearbyRouteProspects.length > 0 ? (
              <button type="button" className="floating-route-fab" onClick={addNearbyProspect}>
                <Plus size={18} />
                Add Nearby Prospect
              </button>
            ) : null}
          </>
        ) : (
          <EmptyState
            title="Your route is empty"
            copy="Add prospects to today’s route from Search or Saved Prospects, then come back here to review the sequence."
            icon={MapIcon}
            actionLabel="Search prospects"
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
              <div className="eyebrow eyebrow--tight">Google Places first</div>
              <h2>Find real prospects</h2>
            </div>
            <DataSourceBadge source={effectiveSearchStatus.source} />
          </div>

          <div className="prominent-search-callout">
            <strong>Find real prospects</strong>
            <p>Use keyword + city searches to load live Google Places businesses, then save or route the best fits.</p>
          </div>

          <form className="live-search-form" onSubmit={handleLiveSearch}>
            <label className="field-group">
              <span className="field-label">Keyword</span>
              <div className="search-field">
                <Search size={18} />
                <input
                  type="search"
                  value={searchKeyword}
                  onChange={(event) => setSearchKeyword(event.target.value)}
                  placeholder="equipment rental"
                  aria-label="Search keyword"
                />
              </div>
            </label>

            <label className="field-group">
              <span className="field-label">City or market</span>
              <div className="search-field">
                <MapIcon size={18} />
                <input
                  type="search"
                  value={searchLocation}
                  onChange={(event) => setSearchLocation(event.target.value)}
                  placeholder="Austin TX"
                  aria-label="Search location"
                />
              </div>
            </label>

            <button type="submit" className="button button--wide" disabled={isSearchingPlaces}>
              {isSearchingPlaces ? 'Searching Google Places...' : 'Search Google Places'}
            </button>
          </form>

          <div className="chip-row">
            {SUGGESTED_SEARCH_KEYWORDS.map((keyword) => (
              <button
                type="button"
                key={keyword}
                className={`chip ${searchKeyword === keyword ? 'chip--active' : ''}`}
                onClick={() => void handleSuggestedSearch(keyword)}
              >
                {keyword}
              </button>
            ))}
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
              <p>{effectiveSearchStatus.resultsCount} result(s) returned.</p>
            ) : null}
            {effectiveSearchStatus.details ? <p>{effectiveSearchStatus.details}</p> : null}
          </div>

          <div>
            <p className="field-label">Priority filter</p>
            <div className="chip-row">
              {(['All', 'Hot', 'Warm', 'Cold'] as Array<'All' | Priority>).map((option) => (
                <button
                  type="button"
                  key={option}
                  className={`chip ${priorityFilter === option ? 'chip--active' : ''}`}
                  onClick={() => setPriorityFilter(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="inline-summary">
            <span>
              {effectiveSearchStatus.source === 'live'
                ? `${searchResultProspects.length} live Google Places results`
                : 'Google Places error'}
            </span>
            <button type="button" className="text-button" onClick={() => setActiveView('settings')}>
              Open settings
            </button>
          </div>
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
                onToggleSaved={toggleSaved}
                onToggleRoute={toggleRoute}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title={
              !googleMapsApiKey
                ? 'Connect Google Places'
                : effectiveSearchStatus.source === 'api-error'
                  ? 'Google Places search failed'
                  : 'No real businesses found'
            }
            copy={
              !googleMapsApiKey
                ? 'Connect Google Places to search real businesses.'
                : effectiveSearchStatus.source === 'api-error'
                  ? effectiveSearchStatus.message
                  : 'No real businesses found. Try a different keyword or location.'
            }
            icon={Search}
            actionLabel={effectiveSearchStatus.source === 'api-error' ? 'Open settings' : undefined}
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
              <div className="eyebrow eyebrow--tight">Saved pipeline</div>
              <h2>Saved prospects</h2>
            </div>
            <span className="meta-pill">{savedProspects.length} saved</span>
          </div>

          <div className="saved-summary">
            <div className="saved-summary__block">
              <Bookmark size={18} />
              <div>
                <strong>Keep the bench warm</strong>
                <p>Saved prospects stay available even if they are not on today’s route.</p>
              </div>
            </div>
            <div className="saved-summary__block">
              <NotebookPen size={18} />
              <div>
                <strong>Notes travel with them</strong>
                <p>Every note, priority, and follow-up date is stored locally for revisit later.</p>
              </div>
            </div>
          </div>
        </section>

        {savedProspects.length > 0 ? (
          <div className="stack">
            {savedProspects.map((prospect) => (
              <ProspectCard
                key={prospect.id}
                prospect={prospect}
                isSaved={savedIds.includes(prospect.id)}
                isInRoute={routeIds.includes(prospect.id)}
                isExpanded={expandedProspectId === prospect.id}
                travelMode={travelMode}
                onNavigate={handleNavigateProspect}
                onToggleSaved={toggleSaved}
                onToggleRoute={toggleRoute}
                onToggleExpanded={toggleExpandedProspect}
                onUpdateNotes={(prospectId, notes) =>
                  updateProspectRecord(prospectId, (current) => ({ ...current, notes }))
                }
                onUpdatePriority={(prospectId, priority) =>
                  updateProspectRecord(prospectId, (current) => ({ ...current, priority }))
                }
                onUpdateFollowUp={(prospectId, followUpDate) =>
                  updateProspectRecord(prospectId, (current) => ({
                    ...current,
                    followUpDate,
                  }))
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No saved prospects yet"
            copy="Tap the star on a prospect to keep it in your saved pipeline."
            icon={Bookmark}
            actionLabel="Browse prospects"
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
            label="Scheduled follow-ups"
            value={`${scheduledFollowUps.length}`}
            detail="Every local follow-up date currently tracked"
            icon={CalendarClock}
          />
          <StatCard
            label="Due now"
            value={`${dueNowCount}`}
            detail="Prospects that should be touched today or earlier"
            icon={Flame}
          />
          <StatCard
            label="This week"
            value={`${upcomingThisWeek}`}
            detail="Follow-ups landing within the next seven days"
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
                        followUpStatus === 'Due now'
                          ? 'meta-pill--hot'
                          : followUpStatus === 'Tomorrow' || followUpStatus === 'This week'
                            ? 'meta-pill--warm'
                            : 'meta-pill--cold'
                      }`}
                    >
                      {followUpStatus}
                    </span>
                  </div>

                  <div className="follow-up-card__meta">
                    <span>{formatFollowUpDate(prospect.followUpDate)}</span>
                    <span>{prospect.priority} priority</span>
                    <span>{savedIds.includes(prospect.id) ? 'Saved prospect' : 'Unsaved prospect'}</span>
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
                      Open prospect
                    </button>
                  </div>
                </article>
              )
            })}
          </section>
        ) : (
          <EmptyState
            title="No follow-ups scheduled"
            copy="Use the Manage panel on any prospect to set a follow-up date, then it will appear here in date order."
            icon={CalendarClock}
            actionLabel="Open search"
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
              <h2>RepRoute workspace</h2>
              <p>No account connected yet. Authentication hooks can plug into this area later.</p>
            </div>
          </div>

          <div className="settings-stack">
            <button
              type="button"
              className="setting-row"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              <div>
                <strong>Appearance</strong>
                <p>Switch between dark and light route views.</p>
              </div>
              <span className="meta-pill">{theme === 'dark' ? 'Dark mode' : 'Light mode'}</span>
            </button>
          </div>
        </section>

        <section className="panel section-panel">
          <div className="section-heading">
            <div>
              <div className="eyebrow eyebrow--tight">Google Places</div>
              <h2>Connection test</h2>
            </div>
            <span className="meta-pill">{googleMapsApiKey ? 'API key detected' : 'API key missing'}</span>
          </div>

          <p className="section-copy">
            Run a real test search for <code>equipment rental Austin TX</code> to confirm live results are working.
          </p>

          <button
            type="button"
            className="button"
            onClick={handleTestGooglePlacesConnection}
            disabled={connectionTest.status === 'running'}
          >
            Test Google Places Connection
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
              <p>Results returned: {connectionTest.resultsCount}</p>
            ) : null}
            {connectionTest.details ? <p>Error details: {connectionTest.details}</p> : null}
          </div>
        </section>

        <section ref={crmExportSectionRef} className="panel section-panel">
          <div className="section-heading">
            <div>
              <div className="eyebrow eyebrow--tight">CRM Export</div>
              <h2>CRM Export</h2>
            </div>
            <span className="meta-pill">{crmExportPreview.records.length} rows</span>
          </div>

          <p className="section-copy">
            Keep everything local for now. RepRoute maps your fields into CRM-friendly CSV headers
            so direct API integrations can plug into the same export profiles later.
          </p>

          <div className="field-group">
            <span className="field-label">Export format</span>
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
            <span className="field-label">Export scope</span>
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
                <div className="eyebrow eyebrow--tight">Preview</div>
                <h3>{crmExportPreview.profile.label}</h3>
              </div>
              <span className="meta-pill">{crmExportPreview.records.length} records</span>
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
                            {value || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No export data for this scope"
                copy="Search and save real prospects, add them to today’s route, or schedule follow-ups before exporting to your CRM."
                icon={Download}
              />
            )}
          </div>

          <div className="inline-summary">
            <span>Future direct integrations planned: {futureCrmApiTargets.join(', ')}</span>
          </div>

          <button
            type="button"
            className="button"
            onClick={handleDownloadCrmExport}
            disabled={crmExportPreview.records.length === 0}
          >
            <Download size={16} />
            Download {crmExportPreview.profile.label}
          </button>
        </section>

        <section ref={backupSectionRef} className="panel section-panel">
          <div className="section-heading">
            <div>
              <div className="eyebrow eyebrow--tight">Data Backup</div>
              <h2>Data Backup</h2>
            </div>
          </div>

          <p className="section-copy">
            Export a JSON snapshot of your local RepRoute data, or preview a backup before replacing what is stored on this device.
          </p>

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
              Export JSON
            </button>
            <button type="button" className="button button--ghost" onClick={openImportPicker}>
              <Upload size={16} />
              Import JSON
            </button>
          </div>

          {backupMessage ? (
            <div className={`status-banner status-banner--${backupMessage.type}`}>
              <p>{backupMessage.text}</p>
            </div>
          ) : null}

          <div className="backup-summary-grid">
            <div className="backup-summary-card">
              <span className="field-label">Real prospects</span>
              <strong>{currentBackupSummary.liveProspects}</strong>
            </div>
            <div className="backup-summary-card">
              <span className="field-label">Saved prospects</span>
              <strong>{currentBackupSummary.saved}</strong>
            </div>
            <div className="backup-summary-card">
              <span className="field-label">Route stops</span>
              <strong>{currentBackupSummary.route}</strong>
            </div>
            <div className="backup-summary-card">
              <span className="field-label">Notes</span>
              <strong>{currentBackupSummary.notes}</strong>
            </div>
            <div className="backup-summary-card">
              <span className="field-label">Priority edits</span>
              <strong>{currentBackupSummary.priorities}</strong>
            </div>
            <div className="backup-summary-card">
              <span className="field-label">Follow-ups</span>
              <strong>{currentBackupSummary.followUps}</strong>
            </div>
          </div>

          {importPreview && importPreviewSummary ? (
            <div className="backup-preview">
              <div className="backup-preview__header">
                <div>
                  <div className="eyebrow eyebrow--tight">Import preview</div>
                  <h3>{importPreview.fileName}</h3>
                  <p>{formatBackupTimestamp(importPreview.exportedAt)}</p>
                </div>
                <span className="meta-pill">Ready to replace</span>
              </div>

              <div className="backup-summary-grid">
                <div className="backup-summary-card">
                  <span className="field-label">Real prospects</span>
                  <strong>{importPreviewSummary.liveProspects}</strong>
                </div>
                <div className="backup-summary-card">
                  <span className="field-label">Saved prospects</span>
                  <strong>{importPreviewSummary.saved}</strong>
                </div>
                <div className="backup-summary-card">
                  <span className="field-label">Route stops</span>
                  <strong>{importPreviewSummary.route}</strong>
                </div>
                <div className="backup-summary-card">
                  <span className="field-label">Notes</span>
                  <strong>{importPreviewSummary.notes}</strong>
                </div>
                <div className="backup-summary-card">
                  <span className="field-label">Priority edits</span>
                  <strong>{importPreviewSummary.priorities}</strong>
                </div>
                <div className="backup-summary-card">
                  <span className="field-label">Follow-ups</span>
                  <strong>{importPreviewSummary.followUps}</strong>
                </div>
              </div>

              <div className="backup-warning">
                <AlertTriangle size={18} />
                <p>Confirming this import will replace the current RepRoute local data on this device.</p>
              </div>

              <div className="backup-actions">
                <button type="button" className="button" onClick={confirmImport}>
                  Replace local data
                </button>
                <button type="button" className="button button--ghost" onClick={cancelImportPreview}>
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <section className="panel section-panel">
          <div className="section-heading">
            <div>
              <div className="eyebrow eyebrow--tight">Storage status</div>
              <h2>Local-first MVP</h2>
            </div>
          </div>

          <div className="saved-summary">
            <div className="saved-summary__block">
              <Star size={18} />
              <div>
                <strong>Saved locally</strong>
                <p>Real prospects, saved prospects, route stops, notes, priorities, and dates live in local storage only.</p>
              </div>
            </div>
            <div className="saved-summary__block">
              <Route size={18} />
              <div>
                <strong>Live search only</strong>
                <p>RepRoute now depends on Google Places for real business search and no longer includes mock fallback data.</p>
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
              <Route size={18} />
            </div>
            <div>
              <p className="brand-lockup__name">RepRoute</p>
              <p className="brand-lockup__copy">Outside sales route planner</p>
            </div>
          </div>

          <div className="app-header__actions">
            <button
              type="button"
              className="icon-button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle color theme"
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
                aria-label="Open profile menu"
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
                    Settings
                  </button>
                  <button type="button" className="account-menu__item" onClick={() => openSettingsPanel('crm')}>
                    <Download size={16} />
                    Export CRM Data
                  </button>
                  <button
                    type="button"
                    className="account-menu__item"
                    onClick={() => openSettingsPanel('backup')}
                  >
                    <Upload size={16} />
                    Backup Data
                  </button>
                  <button type="button" className="account-menu__item" onClick={handlePlaceholderSignIn}>
                    <UserRound size={16} />
                    Sign In
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <section className="screen-intro">
          <div className="eyebrow">Live Google Places</div>
          <h2>{displayMeta.title}</h2>
          <p>{displayMeta.subtitle}</p>
        </section>

        {(['dashboard', 'map', 'search', 'saved'] as View[]).includes(activeView) ? (
          <section className="travel-mode-toolbar">
            <span className="field-label">Travel mode</span>
            <div className="chip-row">
              {(['driving', 'walking'] as TravelMode[]).map((mode) => (
                <button
                  type="button"
                  key={mode}
                  className={`chip ${travelMode === mode ? 'chip--active' : ''}`}
                  onClick={() => setTravelMode(mode)}
                >
                  {mode === 'driving' ? 'Driving' : 'Walking'}
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

        <nav className="bottom-nav" aria-label="Primary">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = activeView === item.id

            return (
              <button
                key={item.id}
                type="button"
                className={`bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}
                onClick={() => setActiveView(item.id)}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </main>
    </div>
  )
}

export default App
