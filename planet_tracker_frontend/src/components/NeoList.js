import React, { useEffect, useMemo, useState } from 'react';
import { getNeoImage } from '../services/nasaImages';
import ImageModal from './ImageModal';

// PUBLIC_INTERFACE
export default function NeoList({ data, loading, error }) {
  /** Renders NEO list panel with loading and error states and image thumbnails. */

  // Local cache of images keyed by NEO id to avoid refetching on re-renders.
  const [imageMap, setImageMap] = useState({});
  const [modal, setModal] = useState({ open: false, title: '', imageUrl: '', credit: '', description: '' });

  // Generate a stable list of IDs and names to track image fetches.
  const neoKeys = useMemo(() => {
    return (data?.items || []).map((item) => ({ id: item.id, name: item.name }));
  }, [data]);

  useEffect(() => {
    let cancelled = false;

    async function fetchForItem(id, name) {
      // Skip if we already have a result or currently loading
      if (imageMap[id]?.status === 'done' || imageMap[id]?.status === 'loading') return;

      // Mark as loading non-blocking
      setImageMap((prev) => ({ ...prev, [id]: { status: 'loading' } }));

      const res = await getNeoImage(name);
      if (cancelled) return;

      if (res.ok && res.item) {
        setImageMap((prev) => ({
          ...prev,
          [id]: { status: 'done', ...res.item }
        }));
      } else {
        setImageMap((prev) => ({
          ...prev,
          [id]: { status: 'error' }
        }));
      }
    }

    // Fire-and-forget per row; do not await all to avoid blocking render.
    for (const { id, name } of neoKeys) {
      fetchForItem(id, name);
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [neoKeys.length]); // re-run if the number of items changes

  const openModal = (id, fallbackTitle) => {
    const img = imageMap[id];
    setModal({
      open: true,
      title: img?.title || fallbackTitle || 'Near-Earth Object',
      imageUrl: img?.imageUrl,
      credit: img?.credit,
      description: img?.description
    });
  };

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
                  <div className="cell-muted">Img</div>
                  <div>Name</div>
                  <div className="cell-muted">Velocity (km/s)</div>
                  <div className="cell-muted">Miss Dist (km)</div>
                  <div className="cell-muted">Hazard</div>
                </div>
                {data.items.map((item) => {
                  const img = imageMap[item.id];
                  return (
                    <div
                      className={`list-row ${item.is_potentially_hazardous ? 'hazard' : ''}`}
                      key={item.id}
                      role="listitem"
                      onClick={() => openModal(item.id, item.name)}
                      style={{ cursor: 'pointer' }}
                      title="Click to view image"
                    >
                      <div className="neo-thumb" onClick={(e) => { e.stopPropagation(); openModal(item.id, item.name); }}>
                        {img?.status === 'loading' && <div className="placeholder">…</div>}
                        {img?.status === 'done' && img?.thumbnailUrl && (
                          <img src={img.thumbnailUrl} alt={`${item.name} thumbnail`} loading="lazy" />
                        )}
                        {(!img || img?.status === 'error') && (
                          <div className="placeholder">🛰️</div>
                        )}
                      </div>
                      <div>
                        <div>{item.name}</div>
                        <div className="small">{item.close_approach_date}</div>
                      </div>
                      <div>{Number(item.relative_velocity_km_s).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                      <div>{Number(item.miss_distance_km).toLocaleString()}</div>
                      <div>{item.is_potentially_hazardous ? 'Yes' : 'No'}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="loading">No NEOs found for selected date.</div>
            )}
          </>
        )}
      </div>

      <ImageModal
        open={modal.open}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        title={modal.title}
        imageUrl={modal.imageUrl}
        credit={modal.credit}
        description={modal.description}
      />
    </div>
  );
}
