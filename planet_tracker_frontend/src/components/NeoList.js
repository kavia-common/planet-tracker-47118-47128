import React, { useEffect, useMemo, useState, useRef } from 'react';
import { getNeoImage } from '../services/nasaImages';
import ImageModal from './ImageModal';
import { useNotify } from './NotificationProvider';

// Utility: safe number parse
function toNum(v) {
  if (v === '' || v === null || v === undefined) return undefined;
  const n = Number(v);
  return Number.isNaN(n) ? undefined : n;
}

// PUBLIC_INTERFACE
export default function NeoList({ data, loading, error, onRefresh, refreshing }) {
  /** Renders NEO list panel with loading, error, image thumbnails, and advanced client-side filters. */

  // Local cache of images keyed by NEO id to avoid refetching on re-renders.
  const [imageMap, setImageMap] = useState({});
  const [modal, setModal] = useState({ open: false, title: '', imageUrl: '', credit: '', description: '' });
  const notify = useNotify();

  // Search state with debounce
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Filters state (UI inputs)
  const [filtersUI, setFiltersUI] = useState({
    hazardous: 'all', // 'all' | 'yes' | 'no'
    magMin: '',
    magMax: '',
    diaMinKm: '',
    diaMaxKm: '',
    distUnit: 'km', // 'km' | 'ld'
    distMin: '',
    distMax: '',
    velMin: '',
    velMax: '',
  });

  // Debounced "applied" filters to avoid frequent recompute while typing
  const [appliedFilters, setAppliedFilters] = useState(filtersUI);
  const debounceTimer = useRef(null);

  // Debounce input value ~300ms for search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Generate a stable list of IDs and names to track image fetches.
  const neoList = useMemo(() => data?.items || [], [data]);
  const neoKeys = useMemo(() => neoList.map((item) => ({ id: item.id, name: item.name })), [neoList]);

  // Reset image cache when the incoming dataset size changes (to re-hydrate thumbnails on refresh/date change)
  useEffect(() => {
    setImageMap({});
  }, [neoKeys.length]);

  // Debounce applying filters by ~250ms
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setAppliedFilters(filtersUI);
    }, 250);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [filtersUI]);

  // Fetch thumbnails in a non-blocking way
  useEffect(() => {
    let cancelled = false;

    async function fetchForItem(id, name) {
      if (imageMap[id]?.status === 'done' || imageMap[id]?.status === 'loading') return;
      setImageMap((prev) => ({ ...prev, [id]: { status: 'loading' } }));
      const res = await getNeoImage(name);
      if (cancelled) return;

      if (res.ok && res.item) {
        setImageMap((prev) => ({
          ...prev,
          [id]: { status: 'done', ...res.item }
        }));
        if (res.item?.credit === 'NASA' || (res.item?.description || '').includes('Generic')) {
          notify.info(`Showing a generic image for "${name}". Add a NASA API key for richer imagery.`);
        }
      } else {
        setImageMap((prev) => ({
          ...prev,
          [id]: { status: 'error' }
        }));
        notify.warning?.(`No image found for "${name}".`);
      }
    }

    for (const { id, name } of neoKeys) {
      fetchForItem(id, name);
    }

    return () => { cancelled = true; };
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

  // Convert km <-> LD helpers (approx 384400 km per Lunar Distance)
  const KM_PER_LD = 384400;

  function passesFilters(n) {
    const f = appliedFilters;

    // Hazard filter
    if (f.hazardous === 'yes' && !n.is_potentially_hazardous) return false;
    if (f.hazardous === 'no' && n.is_potentially_hazardous) return false;

    // Absolute magnitude H
    const h = toNum(n.absolute_magnitude_h ?? n.h ?? undefined); // support both potential fields
    const magMin = toNum(f.magMin);
    const magMax = toNum(f.magMax);
    if (magMin !== undefined && h !== undefined && h < magMin) return false;
    if (magMax !== undefined && h !== undefined && h > magMax) return false;
    // If H is missing in the dataset and mag bounds are set, keep it (we cannot evaluate), do not exclude.

    // Estimated diameter (km)
    const dia = toNum(n.estimated_diameter_km ?? n.diameter_km ?? undefined);
    const dMin = toNum(f.diaMinKm);
    const dMax = toNum(f.diaMaxKm);
    if (dMin !== undefined && dia !== undefined && dia < dMin) return false;
    if (dMax !== undefined && dia !== undefined && dia > dMax) return false;

    // Close-approach distance (km or LD)
    const missKm = toNum(n.miss_distance_km);
    const distMin = toNum(f.distMin);
    const distMax = toNum(f.distMax);
    if (distMin !== undefined && missKm !== undefined) {
      const boundKm = f.distUnit === 'ld' ? distMin * KM_PER_LD : distMin;
      if (missKm < boundKm) return false;
    }
    if (distMax !== undefined && missKm !== undefined) {
      const boundKm = f.distUnit === 'ld' ? distMax * KM_PER_LD : distMax;
      if (missKm > boundKm) return false;
    }

    // Relative velocity (km/s)
    const vel = toNum(n.relative_velocity_km_s);
    const vMin = toNum(f.velMin);
    const vMax = toNum(f.velMax);
    if (vMin !== undefined && vel !== undefined && vel < vMin) return false;
    if (vMax !== undefined && vel !== undefined && vel > vMax) return false;

    return true;
  }

  // Combine search + filters (non-blocking memoized)
  const filteredNeos = useMemo(() => {
    const byText = !debouncedSearch
      ? neoList
      : neoList.filter((n) => (n.name || '').toLowerCase().includes(debouncedSearch));
    if (!byText.length) return [];
    return byText.filter(passesFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [neoList, debouncedSearch, appliedFilters]);

  // Active filter chips (excluding 'all' and empty values)
  const activeChips = useMemo(() => {
    const chips = [];
    if (appliedFilters.hazardous !== 'all') {
      chips.push({ key: 'hazardous', label: appliedFilters.hazardous === 'yes' ? 'Hazardous: Yes' : 'Hazardous: No' });
    }
    if (appliedFilters.magMin !== '') chips.push({ key: 'magMin', label: `H ≥ ${appliedFilters.magMin}` });
    if (appliedFilters.magMax !== '') chips.push({ key: 'magMax', label: `H ≤ ${appliedFilters.magMax}` });
    if (appliedFilters.diaMinKm !== '') chips.push({ key: 'diaMinKm', label: `Dia ≥ ${appliedFilters.diaMinKm} km` });
    if (appliedFilters.diaMaxKm !== '') chips.push({ key: 'diaMaxKm', label: `Dia ≤ ${appliedFilters.diaMaxKm} km` });
    if (appliedFilters.distMin !== '')
      chips.push({ key: 'distMin', label: `Dist ≥ ${appliedFilters.distMin} ${appliedFilters.distUnit.toUpperCase()}` });
    if (appliedFilters.distMax !== '')
      chips.push({ key: 'distMax', label: `Dist ≤ ${appliedFilters.distMax} ${appliedFilters.distUnit.toUpperCase()}` });
    if (appliedFilters.velMin !== '') chips.push({ key: 'velMin', label: `Vel ≥ ${appliedFilters.velMin} km/s` });
    if (appliedFilters.velMax !== '') chips.push({ key: 'velMax', label: `Vel ≤ ${appliedFilters.velMax} km/s` });
    return chips;
  }, [appliedFilters]);

  // Clear/reset filters
  const resetFilters = () => {
    setFiltersUI({
      hazardous: 'all',
      magMin: '',
      magMax: '',
      diaMinKm: '',
      diaMaxKm: '',
      distUnit: 'km',
      distMin: '',
      distMax: '',
      velMin: '',
      velMax: '',
    });
  };

  // Remove a single chip
  const removeChip = (key) => {
    setFiltersUI((f) => {
      const next = { ...f };
      if (key === 'hazardous') next.hazardous = 'all';
      else next[key] = '';
      return next;
    });
  };

  // UI helpers
  const chipCount = activeChips.length;

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="row" style={{ gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="panel-title">Near-Earth Objects</div>
          {/* Search input in header for discoverability */}
          <div className="row" role="search" aria-label="Filter NEOs by name" style={{ marginLeft: 8, flexWrap: 'wrap' }}>
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
              style={{ minWidth: 220 }}
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
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
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

      {/* Compact filter toolbar */}
      <div className="panel-body" aria-label="NEO filters">
        <div className="filter-toolbar" role="group" aria-label="Filter NEOs" style={{ marginBottom: 10 }}>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {/* Hazardous select */}
            <div className="filter-field">
              <label htmlFor="f-hazard" className="small">Hazardous</label>
              <select
                id="f-hazard"
                className="input"
                value={filtersUI.hazardous}
                onChange={(e) => setFiltersUI((f) => ({ ...f, hazardous: e.target.value }))}
                aria-label="Filter by potentially hazardous"
              >
                <option value="all">All</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            {/* Absolute Magnitude H */}
            <div className="filter-field">
              <label className="small" htmlFor="f-hmin">H min</label>
              <input
                id="f-hmin"
                className="input"
                type="number"
                step="0.1"
                placeholder="min"
                value={filtersUI.magMin}
                onChange={(e) => setFiltersUI((f) => ({ ...f, magMin: e.target.value }))}
                aria-label="Min absolute magnitude H"
                style={{ width: 90 }}
              />
            </div>
            <div className="filter-field">
              <label className="small" htmlFor="f-hmax">H max</label>
              <input
                id="f-hmax"
                className="input"
                type="number"
                step="0.1"
                placeholder="max"
                value={filtersUI.magMax}
                onChange={(e) => setFiltersUI((f) => ({ ...f, magMax: e.target.value }))}
                aria-label="Max absolute magnitude H"
                style={{ width: 90 }}
              />
            </div>

            {/* Estimated diameter (km) */}
            <div className="filter-field">
              <label className="small" htmlFor="f-dmin">Dia km min</label>
              <input
                id="f-dmin"
                className="input"
                type="number"
                step="0.01"
                placeholder="min"
                value={filtersUI.diaMinKm}
                onChange={(e) => setFiltersUI((f) => ({ ...f, diaMinKm: e.target.value }))}
                aria-label="Min estimated diameter in kilometers"
                style={{ width: 110 }}
              />
            </div>
            <div className="filter-field">
              <label className="small" htmlFor="f-dmax">Dia km max</label>
              <input
                id="f-dmax"
                className="input"
                type="number"
                step="0.01"
                placeholder="max"
                value={filtersUI.diaMaxKm}
                onChange={(e) => setFiltersUI((f) => ({ ...f, diaMaxKm: e.target.value }))}
                aria-label="Max estimated diameter in kilometers"
                style={{ width: 110 }}
              />
            </div>

            {/* Distance unit toggle + range */}
            <div className="filter-field">
              <label className="small" htmlFor="f-distunit">Distance</label>
              <div className="row" style={{ gap: 6 }}>
                <select
                  id="f-distunit"
                  className="input"
                  value={filtersUI.distUnit}
                  onChange={(e) => setFiltersUI((f) => ({ ...f, distUnit: e.target.value }))}
                  aria-label="Distance unit"
                >
                  <option value="km">km</option>
                  <option value="ld">LD</option>
                </select>
                <input
                  className="input"
                  type="number"
                  step="1"
                  placeholder="min"
                  value={filtersUI.distMin}
                  onChange={(e) => setFiltersUI((f) => ({ ...f, distMin: e.target.value }))}
                  aria-label={`Min miss distance in ${filtersUI.distUnit.toUpperCase()}`}
                  style={{ width: 90 }}
                />
                <input
                  className="input"
                  type="number"
                  step="1"
                  placeholder="max"
                  value={filtersUI.distMax}
                  onChange={(e) => setFiltersUI((f) => ({ ...f, distMax: e.target.value }))}
                  aria-label={`Max miss distance in ${filtersUI.distUnit.toUpperCase()}`}
                  style={{ width: 90 }}
                />
              </div>
            </div>

            {/* Velocity (km/s) */}
            <div className="filter-field">
              <label className="small" htmlFor="f-vmin">Vel km/s min</label>
              <input
                id="f-vmin"
                className="input"
                type="number"
                step="0.1"
                placeholder="min"
                value={filtersUI.velMin}
                onChange={(e) => setFiltersUI((f) => ({ ...f, velMin: e.target.value }))}
                aria-label="Min relative velocity in km per second"
                style={{ width: 120 }}
              />
            </div>
            <div className="filter-field">
              <label className="small" htmlFor="f-vmax">Vel km/s max</label>
              <input
                id="f-vmax"
                className="input"
                type="number"
                step="0.1"
                placeholder="max"
                value={filtersUI.velMax}
                onChange={(e) => setFiltersUI((f) => ({ ...f, velMax: e.target.value }))}
                aria-label="Max relative velocity in km per second"
                style={{ width: 120 }}
              />
            </div>

            <div className="spacer" />

            <button
              className="btn"
              onClick={resetFilters}
              aria-label="Clear all filters"
              title="Clear filters"
            >
              Reset filters
            </button>
          </div>

          {/* Active chips */}
          {chipCount > 0 && (
            <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: 'wrap' }} aria-label="Active filters">
              <span className="small" aria-live="polite">{chipCount} active filter{chipCount > 1 ? 's' : ''}</span>
              {activeChips.map((c) => (
                <button
                  key={c.key}
                  className="chip"
                  onClick={() => removeChip(c.key)}
                  aria-label={`Remove filter ${c.label}`}
                  title="Remove filter"
                >
                  {c.label} ✕
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results */}
        {loading && <div className="loading">Loading NEOs…</div>}
        {error && <div className="error">Failed to load NEOs: {error.message}</div>}
        {!loading && !error && (
          <>
            {neoList?.length ? (
              <>
                {(debouncedSearch || chipCount > 0) && filteredNeos.length === 0 ? (
                  <div className="loading" role="status" aria-live="polite">
                    No NEOs match the current search/filter criteria.
                    <div className="row" style={{ marginTop: 8 }}>
                      {debouncedSearch && (
                        <button className="btn" onClick={onClearSearch} aria-label="Reset search">Clear search</button>
                      )}
                      {chipCount > 0 && (
                        <button className="btn" onClick={resetFilters} aria-label="Reset filters" style={{ marginLeft: 8 }}>
                          Clear filters
                        </button>
                      )}
                    </div>
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
                    {(debouncedSearch || chipCount > 0 ? filteredNeos : neoList).map((item) => {
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
