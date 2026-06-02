import type { FollowUpEntry } from './followUps'
import { normalizeProspectNotes } from './prospectNotes'

export type CompanyContact = {
  id: string
  name: string
  title: string
  phone: string
  email: string
  notes: string
  isPrimary?: boolean
}

export type VisitHistoryEntry = {
  id: string
  completedAt: string
  outcome: string
  note: string
}

export type CatalogProspectRecord = {
  contactName?: string
  contactTitle?: string
  contactEmail?: string
  contactPhone?: string
  contactWebsite?: string
  addressOverride?: string
  locationOverride?: { lat: number; lng: number }
  notes?: string
  priority?: 'Hot' | 'Warm' | 'Cold'
  visitNote?: string
  visitOutcome?: string
  visitCompletedAt?: string
  routeCompleted?: boolean
  lastContactDate?: string
  businessCardCapturedAt?: string
  businessCardMimeType?: string
  businessCardImageDataUrl?: string
  contacts?: CompanyContact[]
  visitHistory?: VisitHistoryEntry[]
  crmExportedAt?: string
  catalogAddedAt?: string
  followUpDate?: string
  followUpTime?: string
  importSource?: 'live-search' | 'food-nearby' | 'catalog-manual'
}

export type CatalogCompany = {
  id: string
  businessName: string
  address: string
  phone: string
  website: string
  category: string
  priority: string
  notes: string
  isSaved: boolean
  isInRoute: boolean
  hasFollowUp: boolean
  hasBusinessCard: boolean
  crmExportedAt: string
  contacts: CompanyContact[]
  visitHistory: VisitHistoryEntry[]
  followUpDate: string
  followUpTime: string
  followUpNotes: string
  visitNote: string
  visitOutcome: string
  visitCompletedAt: string
  lastContactDate: string
  letter: string
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export function getCatalogSortLetter(businessName: string) {
  const trimmed = businessName.trim()
  if (!trimmed) {
    return '#'
  }

  const first = trimmed[0]?.toUpperCase() ?? '#'
  return /[A-Z]/.test(first) ? first : '#'
}

export function createContactId() {
  return `contact-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function createCatalogCompanyId() {
  return `catalog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function buildContactsFromRecord(record: CatalogProspectRecord | undefined): CompanyContact[] {
  const primary: CompanyContact = {
    id: 'primary',
    name: record?.contactName?.trim() ?? '',
    title: record?.contactTitle?.trim() ?? '',
    phone: record?.contactPhone?.trim() ?? '',
    email: record?.contactEmail?.trim() ?? '',
    notes: '',
    isPrimary: true,
  }

  const additional = (record?.contacts ?? []).filter((contact) => contact.id !== 'primary')
  const hasPrimaryData = Boolean(
    primary.name || primary.title || primary.phone || primary.email,
  )

  if (!hasPrimaryData && additional.length === 0) {
    return [primary]
  }

  return [primary, ...additional]
}

export function buildVisitHistoryFromRecord(
  record: CatalogProspectRecord | undefined,
): VisitHistoryEntry[] {
  const stored = record?.visitHistory ?? []
  if (stored.length > 0) {
    return stored
  }

  if (!record?.visitCompletedAt && !record?.routeCompleted && !record?.visitNote) {
    return []
  }

  return [
    {
      id: 'latest-visit',
      completedAt: record?.visitCompletedAt ?? '',
      outcome: record?.visitOutcome ?? '',
      note: record?.visitNote ?? '',
    },
  ]
}

export function buildCatalogCompany({
  prospect,
  record,
  followUp,
  savedIds,
  routeIds,
}: {
  prospect: {
    id: string
    businessName: string
    address: string
    phone: string
    website: string
    category: string
    priority: string
    notes: string
    followUpDate?: string
    followUpTime?: string
    visitNote?: string
    visitOutcome?: string
    visitCompletedAt?: string
    lastContactDate?: string
    businessCardCapturedAt?: string
  }
  record?: CatalogProspectRecord
  followUp?: FollowUpEntry | null
  savedIds: string[]
  routeIds: string[]
}): CatalogCompany {
  const businessName = prospect.businessName.trim() || 'Unnamed company'
  const followUpDate = followUp?.followUpDate ?? record?.followUpDate ?? prospect.followUpDate ?? ''
  const followUpTime = followUp?.followUpTime ?? record?.followUpTime ?? prospect.followUpTime ?? ''

  return {
    id: prospect.id,
    businessName,
    address: record?.addressOverride ?? prospect.address,
    phone: record?.contactPhone ?? prospect.phone,
    website: record?.contactWebsite ?? prospect.website,
    category: prospect.category,
    priority: record?.priority ?? prospect.priority,
    notes: normalizeProspectNotes(record?.notes ?? prospect.notes),
    isSaved: savedIds.includes(prospect.id),
    isInRoute: routeIds.includes(prospect.id),
    hasFollowUp: Boolean(followUpDate),
    hasBusinessCard: Boolean(record?.businessCardCapturedAt ?? prospect.businessCardCapturedAt),
    crmExportedAt: record?.crmExportedAt ?? '',
    contacts: buildContactsFromRecord(record),
    visitHistory: buildVisitHistoryFromRecord(record),
    followUpDate,
    followUpTime,
    followUpNotes: followUp?.notes ?? '',
    visitNote: record?.visitNote ?? prospect.visitNote ?? '',
    visitOutcome: record?.visitOutcome ?? prospect.visitOutcome ?? '',
    visitCompletedAt: record?.visitCompletedAt ?? prospect.visitCompletedAt ?? '',
    lastContactDate: record?.lastContactDate ?? prospect.lastContactDate ?? '',
    letter: getCatalogSortLetter(businessName),
  }
}

export function buildCatalogCompanies(
  savedIds: string[],
  prospectMap: Map<
    string,
    {
      id: string
      businessName: string
      address: string
      phone: string
      website: string
      category: string
      priority: string
      notes: string
      followUpDate?: string
      followUpTime?: string
      visitNote?: string
      visitOutcome?: string
      visitCompletedAt?: string
      lastContactDate?: string
      businessCardCapturedAt?: string
    }
  >,
  prospectRecords: Record<string, CatalogProspectRecord>,
  followUpEntries: Record<string, FollowUpEntry>,
  routeIds: string[],
): CatalogCompany[] {
  return savedIds
    .map((id) => {
      const prospect = prospectMap.get(id)
      if (!prospect) {
        return null
      }

      return buildCatalogCompany({
        prospect,
        record: prospectRecords[id],
        followUp: followUpEntries[id] ?? null,
        savedIds,
        routeIds,
      })
    })
    .filter((company): company is CatalogCompany => Boolean(company))
    .sort((left, right) =>
      left.businessName.localeCompare(right.businessName, undefined, { sensitivity: 'base' }),
    )
}

export function filterCatalogByProspectIds(
  companies: CatalogCompany[],
  prospectIds: Set<string> | null,
) {
  if (!prospectIds || prospectIds.size === 0) {
    return companies
  }

  return companies.filter((company) => prospectIds.has(company.id))
}

export function filterCatalogCompanies(companies: CatalogCompany[], query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return companies
  }

  return companies.filter((company) => {
    const haystack = [
      company.businessName,
      company.address,
      company.phone,
      company.website,
      company.category,
      company.notes,
      ...company.contacts.flatMap((contact) => [
        contact.name,
        contact.title,
        contact.phone,
        contact.email,
        contact.notes,
      ]),
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(normalized)
  })
}

export function groupCatalogByLetter(companies: CatalogCompany[]) {
  const groups = new Map<string, CatalogCompany[]>()

  for (const letter of [...ALPHABET, '#']) {
    groups.set(letter, [])
  }

  for (const company of companies) {
    const bucket = groups.get(company.letter) ?? groups.get('#') ?? []
    bucket.push(company)
    groups.set(company.letter, bucket)
  }

  return [...ALPHABET, '#']
    .map((letter) => ({ letter, companies: groups.get(letter) ?? [] }))
    .filter((group) => group.companies.length > 0)
}

export function getActiveCatalogLetters(companies: CatalogCompany[]) {
  const letters = new Set(companies.map((company) => company.letter))
  return ALPHABET.filter((letter) => letters.has(letter))
}

export function sanitizeCatalogContacts(value: unknown): CompanyContact[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const contacts: CompanyContact[] = []

  for (const entry of value) {
    if (!entry || typeof entry !== 'object') {
      continue
    }

    const record = entry as Record<string, unknown>
    if (typeof record.id !== 'string') {
      continue
    }

    contacts.push({
      id: record.id,
      name: typeof record.name === 'string' ? record.name : '',
      title: typeof record.title === 'string' ? record.title : '',
      phone: typeof record.phone === 'string' ? record.phone : '',
      email: typeof record.email === 'string' ? record.email : '',
      notes: typeof record.notes === 'string' ? record.notes : '',
      isPrimary: record.isPrimary === true,
    })
  }

  return contacts.length > 0 ? contacts : undefined
}

export function sanitizeVisitHistory(value: unknown): VisitHistoryEntry[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const entries: VisitHistoryEntry[] = []

  for (const entry of value) {
    if (!entry || typeof entry !== 'object') {
      continue
    }

    const record = entry as Record<string, unknown>
    if (typeof record.id !== 'string') {
      continue
    }

    entries.push({
      id: record.id,
      completedAt: typeof record.completedAt === 'string' ? record.completedAt : '',
      outcome: typeof record.outcome === 'string' ? record.outcome : '',
      note: typeof record.note === 'string' ? record.note : '',
    })
  }

  return entries.length > 0 ? entries : undefined
}
