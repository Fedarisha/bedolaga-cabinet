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

      {/* Toast Container — safe area aware, adaptive width */}
      <div className="pointer-events-none fixed left-4 right-4 top-[calc(1rem+env(safe-area-inset-top,0px))] z-[100] flex flex-col gap-3 sm:left-auto sm:right-[calc(1rem+env(safe-area-inset-right,0px))]">
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

  const typeStyles = {
    success: {
      border: 'border-l-success-500',
      icon: 'text-success-400',
      iconBg: 'bg-success-500/20',
      progress: 'bg-success-400',
    },
    error: {
      border: 'border-l-error-500',
      icon: 'text-error-400',
      iconBg: 'bg-error-500/20',
      progress: 'bg-error-400',
    },
    warning: {
      border: 'border-l-warning-500',
      icon: 'text-warning-400',
      iconBg: 'bg-warning-500/20',
      progress: 'bg-warning-400',
    },
    info: {
      border: 'border-l-accent-500',
      icon: 'text-accent-400',
      iconBg: 'bg-accent-500/20',
      progress: 'bg-accent-400',
    },
  };

  const style = typeStyles[toast.type || 'info'];

  const defaultIcons = {
    success: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    warning: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    ),
    info: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  };

  return (
    <div
      className={`pointer-events-auto w-full cursor-pointer border border-l-4 border-dark-700 ${style.border} animate-slide-in-right overflow-hidden rounded-2xl bg-dark-900 shadow-2xl shadow-black/50 backdrop-blur-xl transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] sm:max-w-sm`}
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
          {/* Icon */}
          <div
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

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-dark-800/50">
          <div
            className={`h-full w-full ${style.progress} opacity-60`}
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
