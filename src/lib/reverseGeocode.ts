/** Resolves a short city/area label from coordinates (Google Geocoding API). */
export async function resolveAreaLabelFromCoordinates(
  lat: number,
  lng: number,
  apiKey: string,
): Promise<string | null> {
  const trimmedKey = apiKey.trim()

  if (!trimmedKey) {
    return null
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${encodeURIComponent(trimmedKey)}`,
    )
    const data = (await response.json()) as {
      status?: string
      results?: Array<{
        formatted_address?: string
        address_components?: Array<{ long_name: string; short_name: string; types: string[] }>
      }>
    }

    if (data.status !== 'OK' || !data.results?.[0]) {
      return null
    }

    const components = data.results[0].address_components ?? []
    const locality =
      components.find((component) => component.types.includes('locality'))?.long_name ??
      components.find((component) => component.types.includes('postal_town'))?.long_name
    const region = components.find((component) =>
      component.types.includes('administrative_area_level_1'),
    )?.short_name

    if (locality && region) {
      return `${locality}, ${region}`
    }

    const formatted = data.results[0].formatted_address?.trim()

    if (!formatted) {
      return null
    }

    const shortened = formatted.split(',').slice(0, 2).join(',').trim()
    return shortened || formatted
  } catch {
    return null
  }
}
