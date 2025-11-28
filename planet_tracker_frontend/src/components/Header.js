import React from 'react';
import { useNotify } from './NotificationProvider';

// PUBLIC_INTERFACE
export default function Header({ date, onDateChange, theme, onToggleTheme, onRefresh, refreshing }) {
  /** Header with brand, date control, refresh, theme toggle, and a manual notification trigger. */
  const notify = useNotify();

  const triggerTestToasts = () => {
    // Fire a sequence of toasts to validate visually
    notify.success?.('Success: Data loaded successfully!');
    setTimeout(() => notify.info?.('Info: Using preview backend at :3001'), 400);
    setTimeout(() => notify.error?.('Error: Example failure message.'), 800);
  };

  return (
    <header className="header" role="banner">
      <div className="header-inner">
        <div className="brand" aria-label="Planet Tracker">
          <div className="brand-badge" />
          <div>
            Planet Tracker
            <div className="small">Ocean Professional</div>
          </div>
        </div>
        <div className="spacer" />
        <div className="header-controls">
          <input
            type="date"
            className="input"
            aria-label="Select date"
            value={date}
            onChange={(e) => onDateChange?.(e.target.value)}
          />
          <button
            className="btn"
            onClick={triggerTestToasts}
            aria-label="Notify"
            title="Show test notification"
            style={{ padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            🔔 Notify
          </button>
          <button
            className="btn primary"
            onClick={() => onRefresh?.()}
            disabled={!!refreshing}
            aria-busy={!!refreshing}
            aria-label="Refresh latest data"
            title="Refresh data"
            style={{ padding: '8px 12px' }}
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button
            className="btn secondary"
            onClick={() => onToggleTheme?.()}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title="Toggle theme"
          >
            {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
          </button>
        </div>
      </div>
    </header>
  );
}
