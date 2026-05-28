import { uiText } from '../constants/uiText'

export type CrmExportFormat =
  | 'generic'
  | 'hubspot'
  | 'salesforce'
  | 'zoho'
  | 'pipedrive'
  | 'wpcrm'

export type CrmExportScope = 'saved' | 'route' | 'followups' | 'all'

export type CrmExportRecord = {
  businessName: string
  contactName: string
  contactTitle: string
  phone: string
  contactEmail: string
  website: string
  address: string
  city: string
  state: string
  zip: string
  industry: string
  priority: string
  notes: string
  visitNotes: string
  visitCompleted: string
  visitCompletedDateTime: string
  followUpDate: string
  followUpTime: string
  followUpNotes: string
  followUpCompleted: string
  followUpRouteStatus: string
  lastContactedDate: string
  routeOutcomeTag: string
  googlePlaceId: string
  editedByRepRouteUser: string
  source: string
  businessCardCaptured: string
  businessCardCapturedAt: string
  businessCardImageIncluded: string
}

type CrmExportColumnKey = keyof CrmExportRecord

export type CrmExportProfile = {
  id: CrmExportFormat
  label: string
  fileStem: string
  futureApiTarget: string
  fieldOrder: readonly CrmExportColumnKey[]
  columnMap: Record<CrmExportColumnKey, string>
}

const CRM_EXPORT_FIELD_ORDER = [
  'businessName',
  'contactName',
  'contactTitle',
  'phone',
  'contactEmail',
  'website',
  'address',
  'city',
  'state',
  'zip',
  'industry',
  'priority',
  'notes',
  'visitNotes',
  'visitCompleted',
  'visitCompletedDateTime',
  'followUpDate',
  'followUpTime',
  'followUpNotes',
  'followUpCompleted',
  'followUpRouteStatus',
  'lastContactedDate',
  'routeOutcomeTag',
  'googlePlaceId',
  'editedByRepRouteUser',
  'source',
  'businessCardCaptured',
  'businessCardCapturedAt',
  'businessCardImageIncluded',
] as const satisfies readonly CrmExportColumnKey[]

const WPCRM_EXPORT_FIELD_ORDER = [
  'businessName',
  'contactName',
  'contactTitle',
  'phone',
  'contactEmail',
  'website',
  'address',
  'city',
  'state',
  'zip',
  'industry',
  'priority',
  'routeOutcomeTag',
  'visitNotes',
  'followUpDate',
  'followUpNotes',
  'source',
] as const satisfies readonly CrmExportColumnKey[]

const CRM_EXPORT_PROFILES: Record<CrmExportFormat, CrmExportProfile> = {
  generic: {
    id: 'generic',
    label: uiText.crmExport.formats.generic,
    fileStem: 'reproute-generic',
    futureApiTarget: uiText.crmExport.futureTargets.generic,
    fieldOrder: CRM_EXPORT_FIELD_ORDER,
    columnMap: {
      businessName: 'Business Name',
      contactName: 'Contact Name',
      contactTitle: 'Contact Title',
      phone: 'Phone',
      contactEmail: 'Contact Email',
      website: 'Website',
      address: 'Address',
      city: 'City',
      state: 'State',
      zip: 'Zip',
      industry: 'Industry/Category',
      priority: 'Priority',
      notes: 'Notes',
      visitNotes: 'Visit Notes',
      visitCompleted: 'Visit Completed',
      visitCompletedDateTime: 'Visit Completed Date/Time',
      followUpDate: 'Follow-Up Date',
      followUpTime: 'Follow-Up Time',
      followUpNotes: 'Follow-Up Notes',
      followUpCompleted: 'Follow-Up Completed',
      followUpRouteStatus: 'Follow-Up Route Status',
      lastContactedDate: 'Last Contacted Date',
      routeOutcomeTag: 'Route Outcome Tag',
      googlePlaceId: 'Place ID',
      editedByRepRouteUser: 'Edited By RepRoute User',
      source: 'Source',
      businessCardCaptured: 'Business Card Captured',
      businessCardCapturedAt: 'Business Card Captured At',
      businessCardImageIncluded: 'Business Card Image Included',
    },
  },
  hubspot: {
    id: 'hubspot',
    label: uiText.crmExport.formats.hubspot,
    fileStem: 'reproute-hubspot',
    futureApiTarget: uiText.crmExport.futureTargets.hubspot,
    fieldOrder: CRM_EXPORT_FIELD_ORDER,
    columnMap: {
      businessName: 'Company name',
      contactName: 'Contact name',
      contactTitle: 'Job title',
      phone: 'Phone number',
      contactEmail: 'Email',
      website: 'Website URL',
      address: 'Street address',
      city: 'City',
      state: 'State/Region',
      zip: 'Postal code',
      industry: 'Industry',
      priority: 'Lead status',
      notes: 'Notes',
      visitNotes: 'RepRoute visit notes',
      visitCompleted: 'RepRoute visit completed',
      visitCompletedDateTime: 'RepRoute visit completed at',
      followUpDate: 'Next activity date',
      followUpTime: 'RepRoute follow-up time',
      followUpNotes: 'RepRoute follow-up notes',
      followUpCompleted: 'RepRoute follow-up completed',
      followUpRouteStatus: 'RepRoute follow-up route status',
      lastContactedDate: 'Last contacted',
      routeOutcomeTag: 'RepRoute route outcome',
      googlePlaceId: 'RepRoute Place ID',
      editedByRepRouteUser: 'RepRoute edited by',
      source: 'Lead source',
      businessCardCaptured: 'RepRoute business card captured',
      businessCardCapturedAt: 'RepRoute business card captured at',
      businessCardImageIncluded: 'RepRoute business card image included',
    },
  },
  salesforce: {
    id: 'salesforce',
    label: uiText.crmExport.formats.salesforce,
    fileStem: 'reproute-salesforce',
    futureApiTarget: uiText.crmExport.futureTargets.salesforce,
    fieldOrder: CRM_EXPORT_FIELD_ORDER,
    columnMap: {
      businessName: 'Account Name',
      contactName: 'Contact Name',
      contactTitle: 'Title',
      phone: 'Phone',
      contactEmail: 'Email',
      website: 'Website',
      address: 'Billing Street',
      city: 'Billing City',
      state: 'Billing State/Province',
      zip: 'Billing Postal Code',
      industry: 'Industry',
      priority: 'Rating',
      notes: 'Description',
      visitNotes: 'Visit_Notes__c',
      visitCompleted: 'Visit_Completed__c',
      visitCompletedDateTime: 'Visit_Completed_At__c',
      followUpDate: 'Follow_Up_Date__c',
      followUpTime: 'Follow_Up_Time__c',
      followUpNotes: 'Follow_Up_Notes__c',
      followUpCompleted: 'Follow_Up_Completed__c',
      followUpRouteStatus: 'Follow_Up_Route_Status__c',
      lastContactedDate: 'Last_Contacted_Date__c',
      routeOutcomeTag: 'Route_Outcome__c',
      googlePlaceId: 'Place_ID__c',
      editedByRepRouteUser: 'Edited_By_RepRoute_User__c',
      source: 'LeadSource',
      businessCardCaptured: 'Business_Card_Captured__c',
      businessCardCapturedAt: 'Business_Card_Captured_At__c',
      businessCardImageIncluded: 'Business_Card_Image_Included__c',
    },
  },
  zoho: {
    id: 'zoho',
    label: uiText.crmExport.formats.zoho,
    fileStem: 'reproute-zoho',
    futureApiTarget: uiText.crmExport.futureTargets.zoho,
    fieldOrder: CRM_EXPORT_FIELD_ORDER,
    columnMap: {
      businessName: 'Account Name',
      contactName: 'Contact Name',
      contactTitle: 'Title',
      phone: 'Phone',
      contactEmail: 'Email',
      website: 'Website',
      address: 'Billing Street',
      city: 'Billing City',
      state: 'Billing State',
      zip: 'Billing Code',
      industry: 'Industry',
      priority: 'Rating',
      notes: 'Description',
      visitNotes: 'Visit Notes',
      visitCompleted: 'Visit Completed',
      visitCompletedDateTime: 'Visit Completed Date/Time',
      followUpDate: 'Follow Up Date',
      followUpTime: 'Follow Up Time',
      followUpNotes: 'Follow Up Notes',
      followUpCompleted: 'Follow Up Completed',
      followUpRouteStatus: 'Follow Up Route Status',
      lastContactedDate: 'Last Contacted Date',
      routeOutcomeTag: 'Route Outcome',
      googlePlaceId: 'Place ID',
      editedByRepRouteUser: 'Edited By RepRoute User',
      source: 'Lead Source',
      businessCardCaptured: 'Business Card Captured',
      businessCardCapturedAt: 'Business Card Captured At',
      businessCardImageIncluded: 'Business Card Image Included',
    },
  },
  pipedrive: {
    id: 'pipedrive',
    label: uiText.crmExport.formats.pipedrive,
    fileStem: 'reproute-pipedrive',
    futureApiTarget: uiText.crmExport.futureTargets.pipedrive,
    fieldOrder: CRM_EXPORT_FIELD_ORDER,
    columnMap: {
      businessName: 'Organization name',
      contactName: 'Person name',
      contactTitle: 'Title',
      phone: 'Phone',
      contactEmail: 'Email',
      website: 'Website',
      address: 'Address',
      city: 'City',
      state: 'State',
      zip: 'Postal code',
      industry: 'Category',
      priority: 'Label',
      notes: 'Notes',
      visitNotes: 'Visit notes',
      visitCompleted: 'Visit completed',
      visitCompletedDateTime: 'Visit completed at',
      followUpDate: 'Follow-up date',
      followUpTime: 'Follow-up time',
      followUpNotes: 'Follow-up notes',
      followUpCompleted: 'Follow-up completed',
      followUpRouteStatus: 'Follow-up route status',
      lastContactedDate: 'Last contacted date',
      routeOutcomeTag: 'Route outcome',
      googlePlaceId: 'Place ID',
      editedByRepRouteUser: 'Edited by RepRoute user',
      source: 'Source',
      businessCardCaptured: 'Business card captured',
      businessCardCapturedAt: 'Business card captured at',
      businessCardImageIncluded: 'Business card image included',
    },
  },
  wpcrm: {
    id: 'wpcrm',
    label: uiText.crmExport.formats.wpcrm,
    fileStem: 'reproute-wpcrm',
    futureApiTarget: uiText.crmExport.futureTargets.wpcrm,
    fieldOrder: WPCRM_EXPORT_FIELD_ORDER,
    columnMap: {
      businessName: 'Company Name',
      contactName: 'Contact Name',
      contactTitle: 'Contact Title',
      phone: 'Phone',
      contactEmail: 'Email',
      website: 'Website',
      address: 'Street Address',
      city: 'City',
      state: 'State',
      zip: 'ZIP',
      industry: 'Industry',
      priority: 'Priority',
      notes: '',
      visitNotes: 'Visit Notes',
      visitCompleted: '',
      visitCompletedDateTime: '',
      followUpDate: 'Follow-Up Date',
      followUpTime: '',
      followUpNotes: 'Follow-Up Notes',
      followUpCompleted: '',
      followUpRouteStatus: '',
      lastContactedDate: '',
      routeOutcomeTag: 'Visit Outcome',
      googlePlaceId: '',
      editedByRepRouteUser: '',
      source: 'Source',
      businessCardCaptured: '',
      businessCardCapturedAt: '',
      businessCardImageIncluded: '',
    },
  },
}

const FUTURE_CRM_API_TARGETS = [
  'HubSpot',
  'Salesforce',
  'Zoho',
  'Pipedrive',
  'WPCRM',
  'Microsoft Dynamics',
  'Monday CRM',
] as const

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
  const columns = profile.fieldOrder.map((key) => profile.columnMap[key])
  const rows = records.map((record) => profile.fieldOrder.map((key) => record[key]))

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
  contactTitle?: string
  contactEmail?: string
  editedByRepRouteUser?: boolean
  followUpDate?: string
  followUpTime?: string
  followUpNotes?: string
  followUpCompleted?: boolean
  followUpRouteStatus?: string
  googlePlaceId?: string
  lastContactedDate?: string
  notes: string
  phone: string
  priority: string
  routeOutcomeTag?: string
  visitCompleted?: boolean
  visitCompletedDateTime?: string
  visitNotes?: string
  website: string
  businessCardCapturedAt?: string
}) {
  const parts = parseAddressParts(input.address)
  const phone = input.phone === 'Phone unavailable' ? '' : input.phone
  const website = input.website === 'Website unavailable' ? '' : input.website

  return {
    businessName: input.businessName,
    contactName: input.contactName?.trim() ?? '',
    contactTitle: input.contactTitle?.trim() ?? '',
    phone,
    contactEmail: input.contactEmail?.trim() ?? '',
    website,
    address: parts.address,
    city: parts.city,
    state: parts.state,
    zip: parts.zip,
    industry: input.category,
    priority: input.priority,
    notes: input.notes,
    visitNotes: input.visitNotes?.trim() ?? '',
    visitCompleted: input.visitCompleted ? 'Yes' : '',
    visitCompletedDateTime: input.visitCompletedDateTime ?? '',
    followUpDate: input.followUpDate ?? '',
    followUpTime: input.followUpTime ?? '',
    followUpNotes: input.followUpNotes?.trim() ?? '',
    followUpCompleted: input.followUpCompleted ? 'Yes' : '',
    followUpRouteStatus: input.followUpRouteStatus ?? '',
    lastContactedDate: input.lastContactedDate ?? '',
    routeOutcomeTag: input.routeOutcomeTag ?? '',
    googlePlaceId: input.googlePlaceId ?? '',
    editedByRepRouteUser: input.editedByRepRouteUser ? 'RepRoute user' : '',
    source: 'RepRoute',
    businessCardCaptured: input.businessCardCapturedAt ? 'Yes' : '',
    businessCardCapturedAt: input.businessCardCapturedAt ?? '',
    businessCardImageIncluded: input.businessCardCapturedAt ? 'Yes (stored in RepRoute backup)' : '',
  } satisfies CrmExportRecord
}
