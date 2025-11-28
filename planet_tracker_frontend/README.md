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

### Backend URL configuration

The app will call the backend API using this priority:
1) REACT_APP_API_BASE_URL from your .env (recommended)
2) Otherwise, it defaults to the same protocol/hostname as the current page with port 3001 (preview convention).

Create `.env` from `.env.example` and set:
```
REACT_APP_API_BASE_URL=https://your-backend-host:3001
```

If you see “Failed to fetch” for NEOs/Planets:
- Ensure the backend is reachable at port 3001 from your browser.
- Check that your .env is set correctly and you restarted the dev server.
- Open the browser devtools Network tab and verify requests target https://<your-host>:3001/api/...

### Optional NASA API key

To improve image fallbacks (APOD) for NEO thumbnails, you may set:
```
REACT_APP_NASA_API_KEY=your_nasa_api_key_here
```
NASA Images search endpoint does not require a key, but APOD fallback does. If not provided, a generic NASA image will be used as a fallback.

## Features
- Ocean Professional theme with subtle gradients and shadows
- Date selector to query data
- Loading and error states
- Panels for NEOs and Planet positions
- NEO thumbnails with click-to-enlarge modal and graceful fallbacks
