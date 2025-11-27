import React from 'react';

// PUBLIC_INTERFACE
export default function PlanetList({ data, loading, error }) {
  /** Renders Planet positions list panel with loading and error states. */
  return (
    <div className="panel">
      <div className="panel-header">
        <div className="row">
          <div className="panel-title">Planetary Positions</div>
        </div>
        <div className="panel-subtitle">
          {data?.items?.length ? `${data.items.length} bodies` : ''}
        </div>
      </div>
      <div className="panel-body">
        {loading && <div className="loading">Loading planetary positions…</div>}
        {error && <div className="error">Failed to load planets: {error.message}</div>}
        {!loading && !error && (
          <>
            {data?.items?.length ? (
              <div className="list" role="list">
                <div className="list-row" style={{ fontWeight: 700 }}>
                  <div>Name</div>
                  <div className="cell-muted">RA (h)</div>
                  <div className="cell-muted">Dec (°)</div>
                  <div className="cell-muted">Distance (AU)</div>
                </div>
                {data.items.map((p) => (
                  <div className="list-row" key={p.name} role="listitem">
                    <div>{p.name}</div>
                    <div>{Number(p.right_ascension).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                    <div>{Number(p.declination).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                    <div>{Number(p.distance_au).toLocaleString(undefined, { maximumFractionDigits: 3 })}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="loading">No planet data for selected date.</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
