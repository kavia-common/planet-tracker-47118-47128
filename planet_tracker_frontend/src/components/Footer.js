import React from 'react';

// PUBLIC_INTERFACE
export default function Footer() {
  /** Simple footer credits. */
  return (
    <footer className="footer" role="contentinfo">
      <div style={{maxWidth: 1200, margin: '0 auto'}}>
        <span className="small">Data served from backend preview on port 3001.</span>
        <span className="small" style={{ float: 'right' }}>
          Built with React • Ocean Professional
        </span>
      </div>
    </footer>
  );
}
