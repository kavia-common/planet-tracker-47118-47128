import React, { useEffect, useMemo, useRef, useState } from 'react';
import NeoList from '../components/NeoList';
import PlanetList from '../components/PlanetList';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { fetchNeos, fetchPlanets } from '../services/api';

// PUBLIC_INTERFACE
export default function Home() {
  /** Home dashboard showing NEO and Planet panels. */
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [theme, setTheme] = useState('light');
  const [date, setDate] = useState(todayIso);

  // NEO state
  const [neos, setNeos] = useState(null);
  const [neosLoading, setNeosLoading] = useState(false);
  const [neosError, setNeosError] = useState(null);

  // Planet state
  const [planets, setPlanets] = useState(null);
  const [planetsLoading, setPlanetsLoading] = useState(false);
  const [planetsError, setPlanetsError] = useState(null);

  // debouncing guard for refresh
  const refreshLockRef = useRef(false);
  const headerRefreshTimer = useRef(null);

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Core loaders exposed so both date change and refresh can call them.
  const loadNeos = async (currentDate) => {
    setNeosLoading(true);
    setNeosError(null);
    try {
      const data = await fetchNeos({ date: currentDate, page: 1, per_page: 10 });
      setNeos(data);
    } catch (e) {
      setNeosError(e);
    } finally {
      setNeosLoading(false);
    }
  };

  const loadPlanets = async (currentDate) => {
    setPlanetsLoading(true);
    setPlanetsError(null);
    try {
      const data = await fetchPlanets({ date: currentDate });
      setPlanets(data);
    } catch (e) {
      setPlanetsError(e);
    } finally {
      setPlanetsLoading(false);
    }
  };

  // Fetch data when date changes
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (cancelled) return;
      await Promise.all([loadNeos(date), loadPlanets(date)]);
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  // PUBLIC_INTERFACE
  const handleGlobalRefresh = () => {
    /** Trigger both loaders again without changing the date (debounced). */
    if (refreshLockRef.current || neosLoading || planetsLoading) return;
    refreshLockRef.current = true;
    // invoke loads; they handle their own loading/error states reused by UI
    Promise.all([loadNeos(date), loadPlanets(date)]).finally(() => {
      // light debounce of ~500ms to avoid rapid spamming
      headerRefreshTimer.current = setTimeout(() => {
        refreshLockRef.current = false;
      }, 500);
    });
  };

  useEffect(() => {
    return () => {
      if (headerRefreshTimer.current) {
        clearTimeout(headerRefreshTimer.current);
      }
    };
  }, []);

  return (
    <div className="app">
      <Header
        date={date}
        onDateChange={setDate}
        theme={theme}
        onToggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
        onRefresh={handleGlobalRefresh}
        refreshing={neosLoading || planetsLoading}
      />
      <main className="main" role="main">
        <section aria-label="Near-earth objects">
          <NeoList
            data={neos}
            loading={neosLoading}
            error={neosError}
            onRefresh={() => loadNeos(date)}
            refreshing={neosLoading}
          />
        </section>
        <aside aria-label="Planetary positions">
          <PlanetList
            data={planets}
            loading={planetsLoading}
            error={planetsError}
            onRefresh={() => loadPlanets(date)}
            refreshing={planetsLoading}
          />
        </aside>
      </main>
      <Footer />
    </div>
  );
}
