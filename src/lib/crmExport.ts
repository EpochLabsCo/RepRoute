import { uiText } from '../constants/uiText'

export type CrmExportFormat =
  | 'generic'
  | 'hubspot'
  | 'salesforce'
  | 'zoho'
  | 'pipedrive'

export type CrmExportScope = 'saved' | 'route' | 'followups' | 'all'

export type CrmExportRecord = {
  businessName: string
  contactName: string
  phone: string
  website: string
  address: string
  city: string
  state: string
  zip: string
  industry: string
  priority: string
  notes: string
  followUpDate: string
  lastContactedDate: string
  routeOutcomeTag: string
  googlePlaceId: string
  source: string
}

type CrmExportColumnKey = keyof CrmExportRecord

export type CrmExportProfile = {
  id: CrmExportFormat
  label: string
  fileStem: string
  futureApiTarget: string
  columnMap: Record<CrmExportColumnKey, string>
}

const CRM_EXPORT_PROFILES: Record<CrmExportFormat, CrmExportProfile> = {
  generic: {
    id: 'generic',
    label: uiText.crmExport.formats.generic,
    fileStem: 'reproute-generic',
    futureApiTarget: uiText.crmExport.futureTargets.generic,
    columnMap: {
      businessName: 'Business Name',
      contactName: 'Contact Name',
      phone: 'Phone',
      website: 'Website',
      address: 'Address',
      city: 'City',
      state: 'State',
      zip: 'Zip',
      industry: 'Industry/Category',
      priority: 'Priority',
      notes: 'Notes',
      followUpDate: 'Follow-Up Date',
      lastContactedDate: 'Last Contacted Date',
      routeOutcomeTag: 'Route Outcome Tag',
      googlePlaceId: 'Google Place ID',
      source: 'Source',
    },
  },
  hubspot: {
    id: 'hubspot',
    label: uiText.crmExport.formats.hubspot,
    fileStem: 'reproute-hubspot',
    futureApiTarget: uiText.crmExport.futureTargets.hubspot,
    columnMap: {
      businessName: 'Company name',
      contactName: 'Contact name',
      phone: 'Phone number',
      website: 'Website URL',
      address: 'Street address',
      city: 'City',
      state: 'State/Region',
      zip: 'Postal code',
      industry: 'Industry',
      priority: 'Lead status',
      notes: 'Notes',
      followUpDate: 'Next activity date',
      lastContactedDate: 'Last contacted',
      routeOutcomeTag: 'RepRoute route outcome',
      googlePlaceId: 'RepRoute Google Place ID',
      source: 'Lead source',
    },
  },
  salesforce: {
    id: 'salesforce',
    label: uiText.crmExport.formats.salesforce,
    fileStem: 'reproute-salesforce',
    futureApiTarget: uiText.crmExport.futureTargets.salesforce,
    columnMap: {
      businessName: 'Account Name',
      contactName: 'Contact Name',
      phone: 'Phone',
      website: 'Website',
      address: 'Billing Street',
      city: 'Billing City',
      state: 'Billing State/Province',
      zip: 'Billing Postal Code',
      industry: 'Industry',
      priority: 'Rating',
      notes: 'Description',
      followUpDate: 'Follow_Up_Date__c',
      lastContactedDate: 'Last_Contacted_Date__c',
      routeOutcomeTag: 'Route_Outcome__c',
      googlePlaceId: 'Google_Place_ID__c',
      source: 'LeadSource',
    },
  },
  zoho: {
    id: 'zoho',
    label: uiText.crmExport.formats.zoho,
    fileStem: 'reproute-zoho',
    futureApiTarget: uiText.crmExport.futureTargets.zoho,
    columnMap: {
      businessName: 'Account Name',
      contactName: 'Contact Name',
      phone: 'Phone',
      website: 'Website',
      address: 'Billing Street',
      city: 'Billing City',
      state: 'Billing State',
      zip: 'Billing Code',
      industry: 'Industry',
      priority: 'Rating',
      notes: 'Description',
      followUpDate: 'Follow Up Date',
      lastContactedDate: 'Last Contacted Date',
      routeOutcomeTag: 'Route Outcome',
      googlePlaceId: 'Google Place ID',
      source: 'Lead Source',
    },
  },
  pipedrive: {
    id: 'pipedrive',
    label: uiText.crmExport.formats.pipedrive,
    fileStem: 'reproute-pipedrive',
    futureApiTarget: uiText.crmExport.futureTargets.pipedrive,
    columnMap: {
      businessName: 'Organization name',
      contactName: 'Person name',
      phone: 'Phone',
      website: 'Website',
      address: 'Address',
      city: 'City',
      state: 'State',
      zip: 'Postal code',
      industry: 'Category',
      priority: 'Label',
      notes: 'Notes',
      followUpDate: 'Follow-up date',
      lastContactedDate: 'Last contacted date',
      routeOutcomeTag: 'Route outcome',
      googlePlaceId: 'Google Place ID',
      source: 'Source',
    },
  },
}

const FUTURE_CRM_API_TARGETS = [
  'HubSpot',
  'Salesforce',
  'Zoho',
  'Pipedrive',
  'Microsoft Dynamics',
  'Monday CRM',
] as const

const CRM_EXPORT_FIELD_ORDER: CrmExportColumnKey[] = [
  'businessName',
  'contactName',
  'phone',
  'website',
  'address',
  'city',
  'state',
  'zip',
  'industry',
  'priority',
  'notes',
  'followUpDate',
  'lastContactedDate',
  'routeOutcomeTag',
  'googlePlaceId',
  'source',
]

function parseAddressParts(address: string) {
  const cleaned = address.replace(/\s+/g, ' ').trim()
  const usaMatch = cleaned.match(/^(.*?),\s*([^,]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)(?:,\s*USA)?$/i)

  if (usaMatch) {
    return {
      address: usaMatch[1].trim(),
      city: usaMatch[2].trim(),
      state: usaMatch[3].trim().toUpperCase(),
      zip: usaMatch[4].trim(),
    }
  }

  const parts = cleaned
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  if (parts.length >= 3) {
    const stateZip = parts[2].match(/^([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/i)

    return {
      address: parts[0] ?? cleaned,
      city: parts[1] ?? '',
      state: stateZip?.[1]?.toUpperCase() ?? '',
      zip: stateZip?.[2] ?? '',
    }
  }

  return {
    address: cleaned,
    city: '',
    state: '',
    zip: '',
  }
}

function escapeCsvValue(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }

  return value
}

export function getCrmExportProfile(format: CrmExportFormat) {
  return CRM_EXPORT_PROFILES[format]
}

export function getCrmExportFormats() {
  return Object.values(CRM_EXPORT_PROFILES)
}

export function getCrmExportScopes() {
  return [
    { id: 'saved', label: uiText.crmExport.scopes.saved },
    { id: 'route', label: uiText.crmExport.scopes.route },
    { id: 'followups', label: uiText.crmExport.scopes.followups },
    { id: 'all', label: uiText.crmExport.scopes.all },
  ] as const
}

export function getFutureCrmApiTargets() {
  return [...FUTURE_CRM_API_TARGETS]
}

export function buildCrmExportRows(
  records: CrmExportRecord[],
  format: CrmExportFormat,
) {
  const profile = getCrmExportProfile(format)
  const columns = CRM_EXPORT_FIELD_ORDER.map((key) => profile.columnMap[key])
  const rows = records.map((record) =>
    CRM_EXPORT_FIELD_ORDER.map((key) => record[key]),
  )

  return {
    profile,
    columns,
    rows,
  }
}

export function buildCsvContent(columns: string[], rows: string[][]) {
  const header = columns.map((value) => escapeCsvValue(value)).join(',')
  const body = rows
    .map((row) => row.map((value) => escapeCsvValue(value)).join(','))
    .join('\n')

  return body ? `${header}\n${body}` : `${header}\n`
}

export function buildCrmExportRecord(input: {
  address: string
  businessName: string
  category: string
  contactName?: string
  followUpDate?: string
  googlePlaceId?: string
  lastContactedDate?: string
  notes: string
  phone: string
  priority: string
  routeOutcomeTag?: string
  website: string
}) {
  const parts = parseAddressParts(input.address)
  const phone = input.phone === 'Phone unavailable' ? '' : input.phone
  const website = input.website === 'Website unavailable' ? '' : input.website

  return {
    businessName: input.businessName,
    contactName: input.contactName?.trim() ?? '',
    phone,
    website,
    address: parts.address,
    city: parts.city,
    state: parts.state,
    zip: parts.zip,
    industry: input.category,
    priority: input.priority,
    notes: input.notes,
    followUpDate: input.followUpDate ?? '',
    lastContactedDate: input.lastContactedDate ?? '',
    routeOutcomeTag: input.routeOutcomeTag ?? '',
    googlePlaceId: input.googlePlaceId ?? '',
    source: 'RepRoute',
  } satisfies CrmExportRecord
}
