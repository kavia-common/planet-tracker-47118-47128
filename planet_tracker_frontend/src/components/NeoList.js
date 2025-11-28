import React, { useEffect, useMemo, useState } from 'react';
import { getNeoImage } from '../services/nasaImages';
import ImageModal from './ImageModal';

// PUBLIC_INTERFACE
export default function NeoList({ data, loading, error, onRefresh, refreshing }) {
  /** Renders NEO list panel with loading and error states and image thumbnails. */

  // Local cache of images keyed by NEO id to avoid refetching on re-renders.
  const [imageMap, setImageMap] = useState({});
  const [modal, setModal] = useState({ open: false, title: '', imageUrl: '', credit: '', description: '' });

  // Search state with debounce
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce input value ~300ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Generate a stable list of IDs and names to track image fetches.
  const neoList = useMemo(() => data?.items || [], [data]);
  const neoKeys = useMemo(() => {
    return neoList.map((item) => ({ id: item.id, name: item.name }));
  }, [neoList]);

  // Reset image cache when the incoming dataset changes (to re-hydrate thumbnails on refresh/date change)
  useEffect(() => {
    setImageMap({});
  }, [neoKeys.length]);

  // Client-side filter by name/designation (case-insensitive, substring)
  const filteredNeos = useMemo(() => {
    if (!debouncedSearch) return neoList;
    return neoList.filter((n) => (n.name || '').toLowerCase().includes(debouncedSearch));
  }, [neoList, debouncedSearch]);

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
  }, [neoKeys.length, imageMap]);

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

  const onClearSearch = () => setSearch('');

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="row" style={{ gap: 12, alignItems: 'center' }}>
          <div className="panel-title">Near-Earth Objects</div>
          {/* Search input in header for discoverability */}
          <div className="row" role="search" aria-label="Filter NEOs by name" style={{ marginLeft: 8 }}>
            <label htmlFor="neo-search" className="small" style={{ position: 'absolute', left: -9999, top: 'auto' }}>
              Search NEOs
            </label>
            <input
              id="neo-search"
              type="search"
              className="input"
              placeholder="Search name/designation…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search NEOs by name or designation"
              style={{ minWidth: 200 }}
            />
            {search && (
              <button
                className="btn"
                onClick={onClearSearch}
                aria-label="Clear search"
                title="Clear"
                style={{ paddingInline: 10 }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <div className="panel-subtitle">
            {data?.pagination ? `Page ${data.pagination.page} • ${data.pagination.total} total` : ''}
          </div>
          <div className="spacer" />
          <button
            className="btn primary"
            onClick={() => onRefresh?.()}
            disabled={!!refreshing}
            aria-busy={!!refreshing}
            aria-label="Refresh NEOs"
            title="Refresh NEOs"
            style={{ padding: '6px 10px' }}
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>
      <div className="panel-body">
        {loading && <div className="loading">Loading NEOs…</div>}
        {error && <div className="error">Failed to load NEOs: {error.message}</div>}
        {!loading && !error && (
          <>
            {neoList?.length ? (
              <>
                {/* No-results state when filter active and empty */}
                {debouncedSearch && !filteredNeos.length ? (
                  <div className="loading" role="status" aria-live="polite">
                    No NEOs match “{search}”.{' '}
                    <button className="btn" onClick={onClearSearch} aria-label="Reset search">Reset</button>
                  </div>
                ) : (
                  <div className="list" role="list">
                    <div className="list-row" style={{ fontWeight: 700 }}>
                      <div className="cell-muted">Img</div>
                      <div>Name</div>
                      <div className="cell-muted">Velocity (km/s)</div>
                      <div className="cell-muted">Miss Dist (km)</div>
                      <div className="cell-muted">Hazard</div>
                    </div>
                    {(debouncedSearch ? filteredNeos : neoList).map((item) => {
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
                )}
              </>
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
