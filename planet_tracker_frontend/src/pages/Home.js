import React, { useEffect, useMemo, useState } from 'react';
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

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Fetch data when date changes
  useEffect(() => {
    let cancelled = false;

    async function loadNeos() {
      setNeosLoading(true); setNeosError(null);
      try {
        const data = await fetchNeos({ date, page: 1, per_page: 10 });
        if (!cancelled) setNeos(data);
      } catch (e) {
        if (!cancelled) setNeosError(e);
      } finally {
        if (!cancelled) setNeosLoading(false);
      }
    }

    async function loadPlanets() {
      setPlanetsLoading(true); setPlanetsError(null);
      try {
        const data = await fetchPlanets({ date });
        if (!cancelled) setPlanets(data);
      } catch (e) {
        if (!cancelled) setPlanetsError(e);
      } finally {
        if (!cancelled) setPlanetsLoading(false);
      }
    }

    loadNeos();
    loadPlanets();

    return () => { cancelled = true; };
  }, [date]);

  return (
    <div className="app">
      <Header
        date={date}
        onDateChange={setDate}
        theme={theme}
        onToggleTheme={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
      />
      <main className="main" role="main">
        <section aria-label="Near-earth objects">
          <NeoList data={neos} loading={neosLoading} error={neosError} />
        </section>
        <aside aria-label="Planetary positions">
          <PlanetList data={planets} loading={planetsLoading} error={planetsError} />
        </aside>
      </main>
      <Footer />
    </div>
  );
}
