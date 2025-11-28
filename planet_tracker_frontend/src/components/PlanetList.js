import React, { useEffect, useMemo, useState } from 'react';
import ImageModal from './ImageModal';
import { getPlanetImage } from '../services/nasaPlanets';
import { useNotify } from './NotificationProvider';

// PUBLIC_INTERFACE
export default function PlanetList({ data, loading, error, onRefresh, refreshing }) {
  /** Renders Planet positions list panel with loading and error states and planet thumbnails. */

  // Cache images by planet name
  const [imageMap, setImageMap] = useState({});
  const [modal, setModal] = useState({ open: false, title: '', imageUrl: '', credit: '', description: '' });
  const notify = useNotify();

  const planets = useMemo(() => data?.items || [], [data]);
  const planetNames = useMemo(() => planets.map((p) => p.name), [planets]);

  // Reset images when data set changes (refresh/date change)
  useEffect(() => {
    setImageMap({});
  }, [planetNames.length]);

  useEffect(() => {
    let cancelled = false;

    async function fetchForPlanet(name) {
      if (!name) return;
      if (imageMap[name]?.status === 'done' || imageMap[name]?.status === 'loading') return;

      setImageMap((prev) => ({ ...prev, [name]: { status: 'loading' } }));

      const res = await getPlanetImage(name);
      if (cancelled) return;

      if (res.ok && res.item) {
        setImageMap((prev) => ({
          ...prev,
          [name]: { status: 'done', ...res.item },
        }));
        if ((res.item.credit || '').includes('APOD') || (res.item.description || '').includes('Generic')) {
          notify.info(`Using a generic image for ${name}.`);
        }
      } else {
        setImageMap((prev) => ({
          ...prev,
          [name]: { status: 'error' },
        }));
        notify.warning?.(`No image available for ${name}.`);
      }
    }

    for (const name of planetNames) {
      fetchForPlanet(name);
    }

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planetNames.length, imageMap]);

  const openModal = (name) => {
    const img = imageMap[name];
    setModal({
      open: true,
      title: img?.title || name,
      imageUrl: img?.imageUrl,
      credit: img?.credit,
      description: img?.description,
    });
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="row">
          <div className="panel-title">Planetary Positions</div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <div className="panel-subtitle">
            {data?.items?.length ? `${data.items.length} bodies` : ''}
          </div>
          <div className="spacer" />
          <button
            className="btn primary"
            onClick={() => onRefresh?.()}
            disabled={!!refreshing}
            aria-busy={!!refreshing}
            aria-label="Refresh planets"
            title="Refresh planets"
            style={{ padding: '6px 10px' }}
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>
      <div className="panel-body">
        {loading && <div className="loading">Loading planetary positions…</div>}
        {error && <div className="error">Failed to load planets: {error.message}</div>}
        {!loading && !error && (
          <>
            {planets?.length ? (
              <div className="list" role="list">
                <div className="list-row" style={{ fontWeight: 700 }}>
                  <div className="cell-muted">Img</div>
                  <div>Name</div>
                  <div className="cell-muted">RA (h)</div>
                  <div className="cell-muted">Dec (°)</div>
                  <div className="cell-muted">Distance (AU)</div>
                </div>
                {planets.map((p) => {
                  const img = imageMap[p.name];
                  return (
                    <div
                      className="list-row"
                      key={p.name}
                      role="listitem"
                      onClick={() => openModal(p.name)}
                      style={{ cursor: 'pointer' }}
                      title="Click to view image"
                    >
                      <div
                        className="neo-thumb"
                        onClick={(e) => { e.stopPropagation(); openModal(p.name); }}
                        aria-label={`Open image of ${p.name}`}
                      >
                        {img?.status === 'loading' && <div className="placeholder">…</div>}
                        {img?.status === 'done' && img?.thumbnailUrl && (
                          <img src={img.thumbnailUrl} alt={`${p.name} thumbnail`} loading="lazy" />
                        )}
                        {(!img || img?.status === 'error') && (
                          <div className="placeholder">🪐</div>
                        )}
                      </div>
                      <div>{p.name}</div>
                      <div>{Number(p.right_ascension).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                      <div>{Number(p.declination).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                      <div>{Number(p.distance_au).toLocaleString(undefined, { maximumFractionDigits: 3 })}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="loading">No planet data for selected date.</div>
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
