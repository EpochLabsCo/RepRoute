/**
 * Future user-owned record shapes for Supabase Postgres + Storage.
 * The local MVP continues to use `localStorage` / IndexedDB; these types document
 * the planned multi-tenant schema and sync payloads.
 *
 * TODO(sync): Create Supabase tables + RLS policies keyed on `auth.uid()`
 * TODO(sync): Map `App.tsx` STORAGE_KEYS / prospectRecords / followUpEntries to these rows
 */

/** ISO-8601 timestamps for server columns (`created_at`, `updated_at`). */
export type SyncTimestamps = {
  createdAt: string
  updatedAt: string
}

/** RepRoute prospect catalog row owned by `user_id`. */
export type UserOwnedProspect = {
  id: string
  userId: string
  googlePlaceId: string
  businessName: string
  address: string
  category: string
  phone: string
  website: string
  city: string
  priority: string
  notes: string
  isSaved: boolean
} & SyncTimestamps

/** Ordered route membership for a user’s daily route. */
export type UserOwnedRouteStop = {
  id: string
  userId: string
  prospectId: string
  sortOrder: number
  routeCompleted: boolean
  visitCompletedAt: string | null
  visitOutcome: string | null
} & SyncTimestamps

/** Follow-up schedule + completion state. */
export type UserOwnedFollowUp = {
  id: string
  userId: string
  prospectId: string
  followUpDate: string
  followUpTime: string
  notes: string
  completed: boolean
  completedAt: string | null
  routeStatus: string | null
} & SyncTimestamps

/** Visit notes captured in the field (may duplicate prospect visit fields during migration). */
export type UserOwnedVisitNote = {
  id: string
  userId: string
  prospectId: string
  body: string
  capturedAt: string
} & SyncTimestamps

/**
 * Business card binary stored in Supabase Storage; metadata row in Postgres.
 * TODO(sync): Bucket `business-cards` with path `{userId}/{prospectId}.jpg`
 */
export type UserOwnedBusinessCardImage = {
  id: string
  userId: string
  prospectId: string
  storagePath: string
  mimeType: string
  capturedAt: string
} & SyncTimestamps

/** Audit log / snapshot metadata for CRM CSV exports initiated by the user. */
export type UserOwnedCrmExport = {
  id: string
  userId: string
  format: string
  scope: string
  recordCount: number
  exportedAt: string
} & SyncTimestamps

/**
 * Full-user payload for bidirectional sync.
 * TODO(sync): Implement `pullUserData(userId)` / `pushUserData(snapshot)` via Supabase RPC or edge function
 */
export type UserDataSyncPayload = {
  userId: string
  prospects: UserOwnedProspect[]
  routeStops: UserOwnedRouteStop[]
  followUps: UserOwnedFollowUp[]
  visitNotes: UserOwnedVisitNote[]
  businessCardImages: UserOwnedBusinessCardImage[]
  crmExports: UserOwnedCrmExport[]
}
