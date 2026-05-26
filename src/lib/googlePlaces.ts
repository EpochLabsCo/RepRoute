const GOOGLE_PLACES_TEXT_SEARCH_ENDPOINT = 'https://places.googleapis.com/v1/places:searchText'
const GOOGLE_PLACES_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.types',
].join(',')

export type GooglePlacesSearchParams = {
  apiKey: string
  keyword: string
  location: string
  maxResultCount?: number
}

export type GooglePlacesApiPlace = {
  id?: string
  displayName?: {
    text?: string
  }
  formattedAddress?: string
  location?: {
    latitude?: number
    longitude?: number
  }
  rating?: number
  nationalPhoneNumber?: string
  websiteUri?: string
  types?: string[]
}

export type GooglePlacesSearchResult =
  | {
      ok: true
      places: GooglePlacesApiPlace[]
      query: string
    }
  | {
      ok: false
      error: string
      details: unknown
      query: string
      status: number | null
    }

export async function searchGooglePlaces({
  apiKey,
  keyword,
  location,
  maxResultCount = 10,
}: GooglePlacesSearchParams): Promise<GooglePlacesSearchResult> {
  const trimmedKey = apiKey.trim()
  const query = `${keyword.trim()} ${location.trim()}`.trim()

  console.info('[RepRoute] VITE_GOOGLE_MAPS_API_KEY detected:', trimmedKey.length > 0)
  console.info(
    '[RepRoute] Google Places endpoint/search method:',
    `POST ${GOOGLE_PLACES_TEXT_SEARCH_ENDPOINT}`,
  )

  if (!trimmedKey) {
    const details = {
      error: {
        code: 'missing_api_key',
        message: 'Google Maps API key missing',
      },
    }

    console.error('[RepRoute] Google Places full API error response:', details)

    return {
      ok: false,
      error: 'Google Maps API key missing',
      details,
      query,
      status: null,
    }
  }

  try {
    const response = await fetch(GOOGLE_PLACES_TEXT_SEARCH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': trimmedKey,
        'X-Goog-FieldMask': GOOGLE_PLACES_FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery: query,
        pageSize: maxResultCount,
      }),
    })

    const data = (await response.json().catch(() => null)) as
      | {
          places?: GooglePlacesApiPlace[]
          error?: {
            message?: string
            status?: string
            details?: unknown
          }
        }
      | null

    if (!response.ok) {
      const details = {
        status: response.status,
        statusText: response.statusText,
        body: data,
      }

      console.error('[RepRoute] Google Places full API error response:', details)

      return {
        ok: false,
        error: data?.error?.message ?? `Google Places request failed (${response.status})`,
        details,
        query,
        status: response.status,
      }
    }

    const places = Array.isArray(data?.places) ? data.places : []

    console.info('[RepRoute] Google Places live results returned:', places.length)

    return {
      ok: true,
      places,
      query,
    }
  } catch (error) {
    console.error('[RepRoute] Google Places full API error response:', error)

    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown Google Places error',
      details: error,
      query,
      status: null,
    }
  }
}
