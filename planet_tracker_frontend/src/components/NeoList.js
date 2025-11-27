import React from 'react';

// PUBLIC_INTERFACE
export default function NeoList({ data, loading, error }) {
  /** Renders NEO list panel with loading and error states. */
  return (
    <div className="panel">
      <div className="panel-header">
        <div className="row">
          <div className="panel-title">Near-Earth Objects</div>
        </div>
        <div className="panel-subtitle">
          {data?.pagination ? `Page ${data.pagination.page} • ${data.pagination.total} total` : ''}
        </div>
      </div>
      <div className="panel-body">
        {loading && <div className="loading">Loading NEOs…</div>}
        {error && <div className="error">Failed to load NEOs: {error.message}</div>}
        {!loading && !error && (
          <>
            {data?.items?.length ? (
              <div className="list" role="list">
                <div className="list-row" style={{ fontWeight: 700 }}>
                  <div>Name</div>
                  <div className="cell-muted">Velocity (km/s)</div>
                  <div className="cell-muted">Miss Dist (km)</div>
                  <div className="cell-muted">Hazard</div>
                </div>
                {data.items.map(item => (
                  <div className={`list-row ${item.is_potentially_hazardous ? 'hazard' : ''}`} key={item.id} role="listitem">
                    <div>
                      <div>{item.name}</div>
                      <div className="small">{item.close_approach_date}</div>
                    </div>
                    <div>{Number(item.relative_velocity_km_s).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                    <div>{Number(item.miss_distance_km).toLocaleString()}</div>
                    <div>{item.is_potentially_hazardous ? 'Yes' : 'No'}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="loading">No NEOs found for selected date.</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
