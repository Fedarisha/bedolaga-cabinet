import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  ReactNode,
  PointerEvent,
  TouchEvent,
} from 'react';

import { CheckIcon, XIcon, ExclamationIcon, InfoIcon } from '@/components/icons';

interface ToastOptions {
  type?: 'success' | 'error' | 'info' | 'warning';
  message: string;
  title?: string;
  icon?: ReactNode;
  duration?: number;
  onClick?: () => void;
}

interface Toast extends ToastOptions {
  id: number;
}

interface ToastContextType {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

const MAX_VISIBLE = 3;

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (options: ToastOptions) => {
      const id = Date.now() + Math.random();
      const toast: Toast = { id, duration: 5000, type: 'info', ...options };

      setToasts((prev) => {
        const next = [...prev, toast];
        // Evict oldest toasts beyond the limit
        if (next.length > MAX_VISIBLE) {
          const evicted = next.slice(0, next.length - MAX_VISIBLE);
          for (const old of evicted) {
            const timer = timersRef.current.get(old.id);
            if (timer) {
              clearTimeout(timer);
              timersRef.current.delete(old.id);
            }
          }
          return next.slice(-MAX_VISIBLE);
        }
        return next;
      });

      const timer = setTimeout(() => {
        removeToast(id);
      }, toast.duration);

      timersRef.current.set(id, timer);
    },
    [removeToast],
  );

  // Cleanup all timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast region — safe area aware, adaptive width. role+aria-live lets
          screen readers announce arriving toasts without stealing focus. */}
      <div
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        className="pointer-events-none fixed left-4 right-4 top-[calc(1rem+env(safe-area-inset-top,0px))] z-[100] flex flex-col gap-3 sm:left-auto sm:right-[calc(1rem+env(safe-area-inset-right,0px))]"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const dragXRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);
  const swipeHandledRef = useRef(false);

  const setDrag = (value: number) => {
    const clamped = Math.max(-160, Math.min(160, value));
    dragXRef.current = clamped;
    setDragX(clamped);
  };

  const handleClick = () => {
    if (swipeHandledRef.current) {
      swipeHandledRef.current = false;
      return;
    }
    toast.onClick?.();
    onClose();
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch') return;
    startXRef.current = event.clientX;
    dragXRef.current = 0;
    pointerIdRef.current = event.pointerId;
    setIsDragging(true);
    setDragX(0);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDragging || pointerIdRef.current !== event.pointerId) return;
    setDrag(event.clientX - startXRef.current);
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDragging || pointerIdRef.current !== event.pointerId) return;
    const shouldDismiss = Math.abs(dragXRef.current) > 72;
    setIsDragging(false);
    pointerIdRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (shouldDismiss) {
      swipeHandledRef.current = true;
      onClose();
      return;
    }

    setDrag(0);
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    startXRef.current = touch.clientX;
    dragXRef.current = 0;
    setIsDragging(true);
    setDragX(0);
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const touch = event.touches[0];
    if (!touch) return;
    setDrag(touch.clientX - startXRef.current);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    const shouldDismiss = Math.abs(dragXRef.current) > 72;
    setIsDragging(false);

    if (shouldDismiss) {
      swipeHandledRef.current = true;
      onClose();
      return;
    }

    setDrag(0);
  };

  // Semantic carries through the icon box + a full tinted border. No side
  // stripe (was a 4px border-l accent — impeccable absolute ban) and no
  // background tint flood — the contained icon is enough at this size.
  const typeStyles = {
    success: {
      border: 'border-success-500/40',
      icon: 'text-success-400',
      iconBg: 'bg-success-500/15',
      progress: 'bg-success-500',
    },
    error: {
      border: 'border-error-500/40',
      icon: 'text-error-400',
      iconBg: 'bg-error-500/15',
      progress: 'bg-error-500',
    },
    warning: {
      border: 'border-warning-500/40',
      icon: 'text-warning-400',
      iconBg: 'bg-warning-500/15',
      progress: 'bg-warning-500',
    },
    info: {
      border: 'border-accent-500/40',
      icon: 'text-accent-400',
      iconBg: 'bg-accent-500/15',
      progress: 'bg-accent-500',
    },
  };

  const style = typeStyles[toast.type || 'info'];

  // Errors interrupt the screen reader; everything else announces politely.
  const role = toast.type === 'error' ? 'alert' : 'status';

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const defaultIcons = {
    success: <CheckIcon className="h-5 w-5" />,
    error: <XIcon className="h-5 w-5" />,
    warning: <ExclamationIcon className="h-5 w-5" />,
    info: <InfoIcon className="h-5 w-5" />,
  };

  return (
    <div
      role={role}
      tabIndex={0}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{
        transform: dragX ? `translateX(${dragX}px)` : undefined,
        opacity: dragX ? Math.max(0.55, 1 - Math.abs(dragX) / 220) : undefined,
        transition: isDragging ? 'none' : undefined,
        touchAction: 'pan-y',
      }}
      onKeyDown={handleKeyDown}
      className={`pointer-events-auto w-full cursor-pointer overflow-hidden rounded-2xl border bg-dark-900 shadow-xl shadow-black/30 backdrop-blur-xl ${style.border} animate-slide-in-right transition-transform duration-200 hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950 active:scale-[0.99] sm:max-w-sm`}
    >
      <div className="relative p-4">
        <button
          type="button"
          aria-label="Close notification"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          className="absolute right-2 top-2 hidden rounded-lg p-1.5 text-dark-500 transition-colors hover:bg-dark-800 hover:text-dark-200 sm:block"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex gap-3">
          {/* Icon — carries the semantic by itself; the border is a soft echo */}
          <div
            aria-hidden="true"
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${style.iconBg} ${style.icon}`}
          >
            {toast.icon || defaultIcons[toast.type || 'info']}
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1 pt-0.5">
            {toast.title && (
              <p className="mb-0.5 text-sm font-semibold text-dark-100">{toast.title}</p>
            )}
            <p className="text-sm leading-relaxed text-dark-300">{toast.message}</p>
          </div>
        </div>

        {/* Progress bar — visual countdown until auto-dismiss. scaleX animates
            on the compositor, no layout reflow. aria-hidden because the visual
            timer doesn't carry meaning beyond the toast lifetime. */}
        <div aria-hidden="true" className="absolute bottom-0 left-0 right-0 h-0.5 bg-dark-800/50">
          <div
            className={`h-full w-full ${style.progress} opacity-70`}
            style={{
              animation: `shrink ${toast.duration}ms linear forwards`,
              transformOrigin: 'left',
            }}
          />
        </div>
      </div>
    </div>
  );
}
