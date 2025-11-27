//
// API service for Planet Tracker frontend
//
// Provides typed fetchers for backend endpoints with a single base URL and
// standardized error handling.
//

// PUBLIC_INTERFACE
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://vscode-internal-21337-qa.qa01.cloud.kavia.ai:3001';

// PUBLIC_INTERFACE
export async function apiGet(path, params = {}) {
  /** Perform GET request with query params and JSON response parsing. */
  const url = new URL(path, API_BASE_URL);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.append(k, v);
  });

  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json' }
  });

  if (!res.ok) {
    let detail = '';
    try {
      const data = await res.json();
      detail = data?.message || JSON.stringify(data);
    } catch (e) {
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
