//
//
// API service for Planet Tracker frontend
//
// Provides typed fetchers for backend endpoints with a single base URL and
// standardized error handling plus robust fallbacks and clearer messages.
//
//

/**
 * PUBLIC_INTERFACE
 * getApiBaseUrl
 * Compute the backend base URL using the following precedence:
 * 1) REACT_APP_API_BASE_URL (build-time)
 * 2) window.__PLANET_TRACKER_API_BASE_URL__ (runtime override, if a reverse proxy injects it)
 * 3) window.location.origin with :3000 -> :3001 swap (workspace preview convention)
 * 4) window.location.origin (same-origin reverse proxy)
 */
export const API_BASE_URL = (() => {
  try {
    const envUrl = process.env.REACT_APP_API_BASE_URL;
    if (envUrl) return stripTrailingSlash(envUrl);

    if (typeof window !== 'undefined') {
      // Optional runtime override hook (can be injected by container/proxy)
      const runtime = window.__PLANET_TRACKER_API_BASE_URL__;
      if (runtime && typeof runtime === 'string') {
        return stripTrailingSlash(runtime);
      }

      if (window.location && window.location.origin) {
        const origin = window.location.origin;
        if (origin.includes(':3000')) {
          return stripTrailingSlash(origin.replace(':3000', ':3001'));
        }
        // Same-origin (useful when a reverse proxy fronts both apps)
        return stripTrailingSlash(origin);
      }
    }
  } catch {
    // ignore and fall through
  }
  // Final fallback: relative root
  return '';
})();

/** Remove trailing slash for consistent URL join */
function stripTrailingSlash(u) {
  if (!u) return u;
  return u.endsWith('/') ? u.slice(0, -1) : u;
}

/** Join base and path safely */
function joinUrl(base, path) {
  if (!base) return path; // allow relative requests in proxy setups
  if (!path) return base;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}

/** Map low-level fetch/network errors into cleaner user-facing messages. */
function toFriendlyError(e) {
  // TypeError with message "Failed to fetch" is common for CORS/network failures
  if (e instanceof TypeError && /Failed to fetch/i.test(e.message)) {
    const hint = API_BASE_URL
      ? `Network/CORS error contacting ${API_BASE_URL}.`
      : 'Network error contacting backend (relative URL).';
    const err = new Error(`${hint} Please verify the backend is running and CORS/proxy is configured.`);
    err.cause = e;
    return err;
  }
  return e;
}

// PUBLIC_INTERFACE
export async function apiGet(path, params = {}) {
  /**
   * Perform GET request with query params and JSON response parsing.
   * Adds a lightweight health-check retry if initial request fails due to network/CORS.
   */
  const urlObj = new URL(joinUrl(API_BASE_URL, path), window.location?.origin);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') urlObj.searchParams.append(k, v);
  });

  try {
    const res = await fetch(urlObj.toString(), {
      headers: { Accept: 'application/json' },
      credentials: 'include', // future-friendly; CORS supports "*" origins already in backend
    });

    if (!res.ok) {
      let detail = '';
      try {
        const data = await res.json();
        detail = data?.message || JSON.stringify(data);
      } catch {
        // ignore parse error
      }
      const err = new Error(`Request failed: ${res.status} ${res.statusText}${detail ? ' - ' + detail : ''}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  } catch (e) {
    // If network/CORS error, try a quick health endpoint to produce a clearer error
    try {
      await quickHealthProbe();
    } catch (probeErr) {
      // include probe failure context
      const friendly = toFriendlyError(e);
      friendly.probe = probeErr?.message || 'health probe failed';
      throw friendly;
    }
    // Backend reachable; rethrow friendlier error
    throw toFriendlyError(e);
  }
}

async function quickHealthProbe() {
  const healthUrl = joinUrl(API_BASE_URL, '/api/health');
  const res = await fetch(healthUrl, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

// PUBLIC_INTERFACE
export async function fetchNeos({ date, page, per_page } = {}) {
  /** Fetch NEO list by date with pagination. */
  if (!date) {
    throw new Error('date is required for fetching NEOs (YYYY-MM-DD)');
  }
  return apiGet('/api/neos', { date, page, per_page });
}

// PUBLIC_INTERFACE
export async function fetchPlanets({ date } = {}) {
  /** Fetch planetary positions by date. */
  if (!date) {
    throw new Error('date is required for fetching Planets (YYYY-MM-DD)');
  }
  return apiGet('/api/planets', { date });
}

// PUBLIC_INTERFACE
export async function fetchHealth() {
  /** Fetch basic health check from backend. */
  return apiGet('/api/health');
}
