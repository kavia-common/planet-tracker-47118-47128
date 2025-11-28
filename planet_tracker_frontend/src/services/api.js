//
//
// API service for Planet Tracker frontend
//
// Provides typed fetchers for backend endpoints with a single base URL and
// standardized error handling with robust preview defaults.
//
//

/**
 * PUBLIC_INTERFACE
 * API_BASE_URL
 * Environment-driven configuration to avoid host mismatches:
 * - Prefer REACT_APP_API_BASE_URL when provided via .env at build time.
 * - Otherwise, construct a backend URL at the same protocol/hostname on port 3001,
 *   which matches our preview convention (frontend 3000, backend 3001).
 * - This avoids accidentally calling the frontend origin (/api routes do not exist there).
 */
export const API_BASE_URL = (() => {
  // Helper to strip trailing slashes
  const stripTrailingSlash = (u) => (u || '').replace(/\/+$/, '');

  // Prefer explicit env var if present
  const envUrl = process.env.REACT_APP_API_BASE_URL;
  if (envUrl) {
    try {
      const parsed = new URL(envUrl);
      return stripTrailingSlash(parsed.origin + parsed.pathname.replace(/\/+$/, ''));
    } catch {
      // If it's not a full URL, assume it's a base like https://host:port
      return stripTrailingSlash(envUrl);
    }
  }

  // Derive from browser location when available
  if (typeof window !== 'undefined' && window.location) {
    try {
      const { protocol, hostname } = window.location;
      // Always target port 3001 explicitly for the backend in preview.
      const url = `${protocol}//${hostname}:3001`;
      return stripTrailingSlash(url);
    } catch {
      // fall through
    }
  }

  // Final fallback for non-browser contexts
  return '';
})();

/**
 * Join a base URL and path safely without duplicating or missing slashes.
 */
function joinUrl(base, path) {
  const b = (base || '').replace(/\/+$/, '');
  const p = (path || '').replace(/^\/+/, '');
  if (!b) return `/${p}`;
  return `${b}/${p}`;
}

// PUBLIC_INTERFACE
export async function apiGet(path, params = {}) {
  /** Perform GET request with query params and JSON response parsing. */
  // Ensure absolute URL to avoid hitting the frontend origin by mistake
  const absolute = joinUrl(API_BASE_URL, path);
  const url = new URL(absolute);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.append(k, v);
  });

  let res;
  try {
    res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      // Include credentials if your backend requires them; disabled by default
      // credentials: 'include',
    });
  } catch (e) {
    // Network error (CORS, DNS, connection refused, etc.)
    const err = new Error(`Network error while requesting ${url.toString()}: ${e.message}`);
    err.cause = e;
    throw err;
  }

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
