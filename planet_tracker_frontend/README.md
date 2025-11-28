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

Optionally configure backend URL:
Create `.env` and set:
```
REACT_APP_API_BASE_URL=https://your-backend-host:3001
```
If not set, it defaults to the preview URL used in this workspace.

Optional NASA API key:
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
