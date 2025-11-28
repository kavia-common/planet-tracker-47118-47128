//
// NASA Images service for fetching thumbnails and larger media for NEOs.
//
// This module provides a small client for NASA Image and Video Library:
// https://images-api.nasa.gov/search?q=<query>&media_type=image
//
// It attempts to find a relevant image for a given NEO name/designation.
// It never throws to the caller; instead it returns a normalized object with
// status flags so the UI does not block core data rendering.
//

const NASA_IMAGES_SEARCH_URL = 'https://images-api.nasa.gov/search';
const NASA_APOD_URL = 'https://api.nasa.gov/planetary/apod';

// Read API key from environment if provided (build-time).
// PUBLIC_INTERFACE
export const NASA_API_KEY = process.env.REACT_APP_NASA_API_KEY || '';

/**
 * PUBLIC_INTERFACE
 * searchNasaImages
 * Search NASA Images for a given query and return a normalized first result if found.
 *
 * @param {string} query - The NEO name or designation.
 * @returns {Promise<{ ok: boolean, loading: false, error?: string, item?: {
 *  title: string,
 *  description?: string,
 *  thumbnailUrl: string,
 *  imageUrl: string,
 *  credit?: string
 * }}>}
 */
export async function searchNasaImages(query) {
  /** Performs a search on NASA Images API and returns first match with thumbnail and large image. */
  if (!query || !query.trim()) {
    return { ok: false, loading: false, error: 'empty_query' };
  }

  try {
    const params = new URLSearchParams({
      q: query,
      media_type: 'image',
      page: '1'
    });

    const res = await fetch(`${NASA_IMAGES_SEARCH_URL}?${params.toString()}`, {
      headers: { Accept: 'application/json' }
    });
    // NASA Images does not require an API key, APOD does.

    if (!res.ok) {
      return { ok: false, loading: false, error: `http_${res.status}` };
    }
    const data = await res.json();
    const items = data?.collection?.items || [];

    if (!items.length) {
      // No result, fall back to APOD
      const apod = await fetchApodFallback();
      if (apod.ok) {
        return { ok: true, loading: false, item: apod.item };
      }
      return { ok: false, loading: false, error: 'no_results' };
    }

    // Pick first item with links and data
    const first = items.find((i) => Array.isArray(i.links) && i.links.length && Array.isArray(i.data) && i.data.length) || items[0];

    const link = first?.links?.[0];
    const info = first?.data?.[0];

    // Thumbnail is given by links[0].href (often 1024 or thumbnail); the large href requires querying the assets endpoint.
    // However, many link hrefs are adequate for a slightly larger preview. We'll use provided link as thumbnail and image for simplicity.
    const thumb = link?.href;
    const title = info?.title || query;
    const photographer = (info?.photographer || info?.secondary_creator || info?.center || '').toString() || undefined;

    if (thumb) {
      // Try to infer larger size where possible (some thumbs have ~thumb.jpg path). If not, reuse thumb.
      const large = thumb.replace('~thumb.jpg', '~orig.jpg');
      const imageUrl = large === thumb ? thumb : large;

      return {
        ok: true,
        loading: false,
        item: {
          title,
          description: info?.description,
          thumbnailUrl: thumb,
          imageUrl,
          credit: photographer
        }
      };
    }

    // If no link thumbnail, fallback to APOD
    const apod = await fetchApodFallback();
    if (apod.ok) {
      return { ok: true, loading: false, item: apod.item };
    }

    return { ok: false, loading: false, error: 'no_thumbnail' };
  } catch (e) {
    // Do not block rendering; return a failure with fallback attempt.
    try {
      const apod = await fetchApodFallback();
      if (apod.ok) {
        return { ok: true, loading: false, item: apod.item };
      }
    } catch (_ignored) {
      // ignore
    }
    return { ok: false, loading: false, error: 'network_error' };
  }
}

/**
 * Attempt to fetch APOD (Astronomy Picture of the Day) as a general fallback.
 * Requires NASA_API_KEY; if missing, returns a static placeholder.
 */
async function fetchApodFallback() {
  try {
    // Use APOD only if we have a key. If not, return a static placeholder entry.
    if (!NASA_API_KEY) {
      return {
        ok: true,
        item: {
          title: 'Near-Earth Object',
          description: 'Generic representation. Set REACT_APP_NASA_API_KEY for enhanced imagery.',
          thumbnailUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9b/Asteroid_Bennu_-_PIA22570.jpg',
          imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9b/Asteroid_Bennu_-_PIA22570.jpg',
          credit: 'NASA'
        }
      };
    }
    const res = await fetch(`${NASA_APOD_URL}?api_key=${encodeURIComponent(NASA_API_KEY)}`, {
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) {
      return { ok: false, error: `apod_http_${res.status}` };
    }
    const data = await res.json();
    if (data?.media_type !== 'image' || !data?.url) {
      return { ok: false, error: 'apod_not_image' };
    }
    const title = data.title || 'Astronomy Picture of the Day';
    return {
      ok: true,
      item: {
        title,
        description: data.explanation,
        thumbnailUrl: data.url,
        imageUrl: data.hdurl || data.url,
        credit: data.copyright || 'NASA APOD'
      }
    };
  } catch (e) {
    return { ok: false, error: 'apod_error' };
  }
}

/**
 * PUBLIC_INTERFACE
 * getNeoImage
 * Convenience function that tries the exact name, then a simplified designation.
 */
export async function getNeoImage(nameOrDesignation) {
  /** Returns image result for given NEO string using searchNasaImages with mild normalization. */
  const query = (nameOrDesignation || '').trim();
  if (!query) {
    return { ok: false, loading: false, error: 'empty' };
  }

  // Try the query as-is
  const primary = await searchNasaImages(query);
  if (primary.ok) return primary;

  // Try a simplified version removing parentheses or extra tokens e.g., "2015 AB (Apollo)"
  const simplified = query.replace(/[()]/g, '').split(/\s+/).slice(0, 2).join(' ');
  if (simplified && simplified !== query) {
    const second = await searchNasaImages(simplified);
    if (second.ok) return second;
  }

  return primary;
}
