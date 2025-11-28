# Planet Tracker Frontend (React)

Ocean Professional themed dashboard to visualize Near-Earth Objects and Planetary Positions powered by the backend API.

## Run

- Backend preview is expected at port 3001 (already running in the workspace).
- Frontend runs on port 3000.

Install and start:
```bash
npm install
npm start
```

## Backend API base URL

The app determines the backend URL in this order:
1. REACT_APP_API_BASE_URL (build-time `.env`)
2. window.__PLANET_TRACKER_API_BASE_URL__ (runtime injection by proxy/container)
3. <meta name="planet-tracker-api-base" content="https://..."> (runtime injection)
4. window.location.origin with port swap :3000 -> :3001 (workspace preview)
5. window.location.origin (same-origin reverse proxy)

Example `.env`:
```
REACT_APP_API_BASE_URL=https://your-backend-host:3001
```

Alternatively you can inject a meta tag into index.html at runtime:
```
<meta name="planet-tracker-api-base" content="https://your-backend-host:3001" />
```

If using a reverse proxy that serves both apps on the same origin, you can omit the env var/meta.

## Troubleshooting “Failed to fetch”

- Ensure backend is reachable at the computed base URL; open /api/health in a browser:
  - e.g., https://localhost:3001/api/health
- For local dev with ports 3000/3001, CORS is already enabled on the backend for /api/* and /docs* with origins "*".
- If you see network/CORS errors, set REACT_APP_API_BASE_URL to the exact backend URL including protocol and port.

## Optional NASA API key

To improve image fallbacks (APOD) for NEO thumbnails and planets, set:
```
REACT_APP_NASA_API_KEY=your_nasa_api_key_here
```
NASA Images search endpoint does not require a key, but APOD fallback does. If not provided, a generic NASA image will be used as a fallback.

## Features
- Ocean Professional theme with subtle gradients and shadows
- Date selector to query data
- Loading and error states and clearer error messages for network/CORS issues
- Panels for NEOs and Planet positions
- NEO thumbnails with click-to-enlarge modal and graceful fallbacks
