import React from 'react';

/**
 * PUBLIC_INTERFACE
 * ImageModal
 * Accessible modal to display a larger image preview with title and credit.
 */
export default function ImageModal({ open, onClose, title, imageUrl, credit, description }) {
  /** Renders a modal when open is true. */
  if (!open) return null;

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Image preview'}
      onClick={handleBackdrop}
    >
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-title">{title || 'Image preview'}</div>
          <button className="btn" aria-label="Close image modal" onClick={() => onClose?.()}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          {imageUrl ? (
            <img src={imageUrl} alt={title || 'Large preview'} />
          ) : (
            <div className="loading">No image available.</div>
          )}
          {(credit || description) && (
            <div className="modal-caption">
              {credit ? <span>Credit: {credit}</span> : null}
              {credit && description ? <span> • </span> : null}
              {description ? <span>{description}</span> : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
