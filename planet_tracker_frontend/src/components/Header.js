import React from 'react';

// PUBLIC_INTERFACE
export default function Header({ date, onDateChange, theme, onToggleTheme }) {
  /** Header with brand, date control, and theme toggle. */
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
