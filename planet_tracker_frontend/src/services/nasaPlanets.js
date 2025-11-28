//
// NASA Images helper focused on planet queries.
// Reuses the NASA Images search strategy similar to NEOs, but biases the query
// toward "planet <Name>" to reduce false positives (e.g., "Mercury" vs element).
//

const NASA_IMAGES_SEARCH_URL = 'https://images-api.nasa.gov/search';
const NASA_APOD_URL = 'https://api.nasa.gov/planetary/apod';

// PUBLIC_INTERFACE
export const NASA_API_KEY = process.env.REACT_APP_NASA_API_KEY || '';

/**
 * PUBLIC_INTERFACE
 * getPlanetImage
 * Fetch a representative image for a given planet name using the NASA Images API.
 *
 * It never throws; it returns a normalized object so UI can handle gracefully.
 *
 * @param {string} planetName - Name like 'Mercury','Venus','Earth','Mars','Jupiter','Saturn','Uranus','Neptune'
 * @returns {Promise<{ ok: boolean, item?: { title: string, description?: string, thumbnailUrl: string, imageUrl: string, credit?: string } }>}
 */
export async function getPlanetImage(planetName) {
  /** Fetch best-effort image for a planet name with fallbacks. */
  const name = (planetName || '').trim();
  if (!name) return { ok: false, error: 'empty' };

  // Try a few targeted queries to increase relevance.
  const queries = [
    `${name} planet`,
    `planet ${name}`,
    `${name} world`,
  ];

  for (const q of queries) {
    const res = await searchNasaImages(q);
    if (res.ok && res.item) return res;
  }

  // As a last resort try APOD fallback for a pleasant generic image.
  const apod = await fetchApodFallback();
  if (apod.ok) return apod;

  return { ok: false, error: 'no_results' };
}

/**
 * Search NASA Images and return normalized first result if found.
 * Internal utility: prefer items with clear thumbnails.
 */
async function searchNasaImages(query) {
  try {
    const params = new URLSearchParams({
      q: query,
      media_type: 'image',
      page: '1',
    });

    const res = await fetch(`${NASA_IMAGES_SEARCH_URL}?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return { ok: false, error: `http_${res.status}` };

    const data = await res.json();
    const items = data?.collection?.items || [];
    if (!items.length) return { ok: false, error: 'no_items' };

    // Prefer items whose data keywords include 'planet' or the planet name to improve relevance.
    const lowered = query.toLowerCase();
    const pick =
      items.find((i) => {
        const info = i?.data?.[0];
        const keywords = (info?.keywords || []).map((k) => (k || '').toLowerCase());
        const title = (info?.title || '').toLowerCase();
        return (
          keywords.includes('planet') ||
          title.includes('planet') ||
          title.includes(lowered.split(' ')[0])
        );
      }) ||
      items.find((i) => Array.isArray(i.links) && i.links.length && Array.isArray(i.data) && i.data.length) ||
      items[0];

    const link = pick?.links?.[0];
    const info = pick?.data?.[0];
    const thumb = link?.href;
    if (!thumb) return { ok: false, error: 'no_thumbnail' };

    const title = info?.title || query;
    const photographer =
      (info?.photographer || info?.secondary_creator || info?.center || '').toString() || undefined;

    // Heuristic upscale where possible, otherwise reuse thumbnail.
    const large = thumb.replace('~thumb.jpg', '~orig.jpg');
    const imageUrl = large === thumb ? thumb : large;

    return {
      ok: true,
      item: {
        title,
        description: info?.description,
        thumbnailUrl: thumb,
        imageUrl,
        credit: photographer,
      },
    };
  } catch {
    return { ok: false, error: 'network' };
  }
}

/**
 * Generic APOD fallback, similar to nasaImages.js.
 */
async function fetchApodFallback() {
  try {
    if (!NASA_API_KEY) {
      return {
        ok: true,
        item: {
          title: 'Planet',
          description: 'Generic planetary image. Add REACT_APP_NASA_API_KEY for enhanced imagery.',
          thumbnailUrl:
            'https://upload.wikimedia.org/wikipedia/commons/c/cb/The_Blue_Marble_%28remastered%29.jpg',
          imageUrl:
            'https://upload.wikimedia.org/wikipedia/commons/c/cb/The_Blue_Marble_%28remastered%29.jpg',
          credit: 'NASA / NOAA',
        },
      };
    }
    const res = await fetch(`${NASA_APOD_URL}?api_key=${encodeURIComponent(NASA_API_KEY)}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return { ok: false, error: `apod_http_${res.status}` };
    const data = await res.json();
    if (data?.media_type !== 'image' || !data?.url) return { ok: false, error: 'apod_not_image' };
    return {
      ok: true,
      item: {
        title: data.title || 'Astronomy Picture of the Day',
        description: data.explanation,
        thumbnailUrl: data.url,
        imageUrl: data.hdurl || data.url,
        credit: data.copyright || 'NASA APOD',
      },
    };
  } catch {
    return { ok: false, error: 'apod_error' };
  }
}
