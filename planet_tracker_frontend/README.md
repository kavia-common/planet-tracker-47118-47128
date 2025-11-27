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

## Features
- Ocean Professional theme with subtle gradients and shadows
- Date selector to query data
- Loading and error states
- Panels for NEOs and Planet positions
