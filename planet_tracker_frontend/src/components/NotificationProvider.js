import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

/**
 * PUBLIC_INTERFACE
 * NotificationProvider
 * Context provider that exposes a small API to trigger toasts:
 * - notify.success(message[, opts])
 * - notify.info(message[, opts])
 * - notify.error(message[, opts])
 *
 * Accessible and dependency-free. Toasts auto-dismiss after duration and are
 * announced via aria-live. Styles rely on App.css theme tokens.
 */
const NotificationContext = createContext(null);

let idSeq = 0;

/**
 * Toast item shape:
 * { id, type: 'success'|'info'|'error'|'warning', message, duration, createdAt }
 */

export function NotificationProvider({ children, placement = 'top-right', defaultDuration = 3500, max = 5 }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const handle = timersRef.current.get(id);
    if (handle) {
      clearTimeout(handle);
      timersRef.current.delete(id);
    }
  }, []);

  const push = useCallback((type, message, opts = {}) => {
    const id = ++idSeq;
    const duration = typeof opts.duration === 'number' ? opts.duration : defaultDuration;

    setToasts((prev) => {
      const next = [...prev, { id, type, message, duration, createdAt: Date.now() }];
      // keep last "max" items
      if (next.length > max) {
        const overflow = next.length - max;
        for (let i = 0; i < overflow; i++) {
          const removed = next.shift();
          if (removed) {
            const h = timersRef.current.get(removed.id);
            if (h) clearTimeout(h);
            timersRef.current.delete(removed.id);
          }
        }
      }
      return next;
    });

    if (duration > 0) {
      const handle = setTimeout(() => remove(id), duration);
      timersRef.current.set(id, handle);
    }
  }, [defaultDuration, max, remove]);

  // PUBLIC_INTERFACE
  const notify = useMemo(() => ({
    /** Show a success toast. */
    success: (msg, opts) => push('success', msg, opts),
    /** Show an informational toast. */
    info: (msg, opts) => push('info', msg, opts),
    /** Show an error toast. */
    error: (msg, opts) => push('error', msg, opts),
    /** Show a warning toast (internal use). */
    warning: (msg, opts) => push('warning', msg, opts),
  }), [push]);

  return (
    <NotificationContext.Provider value={notify}>
      {children}
      <ToastRegion placement={placement} toasts={toasts} onClose={remove} />
    </NotificationContext.Provider>
  );
}

/**
 * PUBLIC_INTERFACE
 * useNotify
 * Hook to access the notification API.
 */
export function useNotify() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    // Provide a noop fallback to avoid crashes if provider is missing.
    const noop = () => {};
    return {
      success: noop,
      info: noop,
      error: noop,
      warning: noop,
    };
  }
  return ctx;
}

function ToastRegion({ placement, toasts, onClose }) {
  // aria-live="polite" with role="status" for non-error; assertive for error.
  return (
    <div
      className={`toast-region ${placement}`}
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast ${t.type}`}
          role={t.type === 'error' ? 'alert' : 'status'}
        >
          <div className="toast-message">{t.message}</div>
          <button
            className="toast-close"
            onClick={() => onClose(t.id)}
            aria-label="Dismiss notification"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

export default NotificationProvider;
