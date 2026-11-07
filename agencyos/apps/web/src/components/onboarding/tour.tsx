'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AGENCY_TOUR, CLIENT_TOUR, type TourStep } from '@/lib/tour-steps';
import { useAuth } from '@/lib/providers';

/**
 * Guided product tour.
 *
 * - Auto-starts once per browser (tracked in localStorage); replay any time from the
 *   compass button in the top bar.
 * - Steps whose `[data-tour]` target is missing or not visible (hidden sidebar,
 *   non-management routes) are skipped automatically.
 * - Esc skips the tour; ←/→ move between steps; the overlay backdrop skips too.
 * - Honors prefers-reduced-motion.
 */

const STORAGE_KEY = 'agencyos.tour.v1';
const CARD_W = 360;
const CARD_ESTIMATED_H = 220;
const PAD = 8;
const GAP = 14;

interface TourContextValue {
  startTour: () => void;
  endTour: () => void;
  active: boolean;
}

const TourContext = React.createContext<TourContextValue | null>(null);

export function useTour() {
  const ctx = React.useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used inside <TourProvider>');
  return ctx;
}

type Rect = { top: number; left: number; width: number; height: number; bottom: number; right: number };

function readRect(target: string): Rect | null {
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width <= 1 || r.height <= 1) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom, right: r.right };
}

function sameRect(a: Rect | null, b: Rect) {
  if (!a) return false;
  return (
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

function resolveAvailable(steps: TourStep[]): TourStep[] {
  return steps.filter((step) => {
    const r = readRect(step.target);
    if (!r) return false;
    return r.bottom > 0 && r.right > 0 && r.top < window.innerHeight && r.left < window.innerWidth;
  });
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { isClient } = useAuth();
  const pathname = usePathname();
  const [queue, setQueue] = React.useState<TourStep[] | null>(null);
  const [index, setIndex] = React.useState(0);
  const [rect, setRect] = React.useState<Rect | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const [reduced, setReduced] = React.useState(false);
  const active = queue !== null;

  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const startTour = React.useCallback(() => {
    const steps = isClient ? CLIENT_TOUR : AGENCY_TOUR;
    const available = resolveAvailable(steps);
    if (available.length === 0) return;
    setQueue(available);
    setIndex(0);
  }, [isClient]);

  const endTour = React.useCallback(() => {
    setQueue(null);
    setRect(null);
    setIndex(0);
    try {
      window.localStorage.setItem(STORAGE_KEY, 'done');
    } catch {
      /* private mode — the tour will simply offer itself again next visit */
    }
  }, []);

  // Auto-start once per browser. The shell may still be loading when the delay fires,
  // so retry until targets exist in the DOM — otherwise the tour could silently never show.
  const startedRef = React.useRef(false);
  React.useEffect(() => {
    if (startedRef.current) return;
    let cancelled = false;
    let attempts = 0;
    const tryStart = () => {
      if (cancelled || startedRef.current) return;
      try {
        if (window.localStorage.getItem(STORAGE_KEY)) {
          startedRef.current = true;
          return;
        }
      } catch {
        startedRef.current = true;
        return;
      }
      attempts += 1;
      const steps = isClient ? CLIENT_TOUR : AGENCY_TOUR;
      const available = resolveAvailable(steps);
      if (available.length > 0) {
        startedRef.current = true;
        setQueue(available);
        setIndex(0);
      } else if (attempts < 30) {
        window.setTimeout(tryStart, 500);
      }
    };
    const t = window.setTimeout(tryStart, 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [isClient, pathname]);

  const step = active ? queue[index] : null;

  // Scroll the target into view when the step changes.
  React.useEffect(() => {
    if (!step) return;
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    el?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center', inline: 'nearest' });
  }, [step]);

  // Track the target's rect every frame while active. If it vanishes (route change,
  // layout shift), advance past that step instead of stranding the overlay.
  React.useEffect(() => {
    if (!step) return;
    let raf = 0;
    let missingSince = 0;
    const tick = () => {
      const next = readRect(step.target);
      if (next) {
        missingSince = 0;
        setRect((prev) => (sameRect(prev, next) ? prev : next));
      } else {
        if (!missingSince) missingSince = performance.now();
        else if (performance.now() - missingSince > 450) {
          setIndex((i) => (queue && i + 1 < queue.length ? i + 1 : queue?.length ?? 0));
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [step, queue]);

  // If the queue is exhausted (last step lost), close.
  React.useEffect(() => {
    if (active && queue && index >= queue.length) endTour();
  }, [active, queue, index, endTour]);

  const next = React.useCallback(() => {
    setIndex((i) => {
      if (!queue) return i;
      if (i + 1 >= queue.length) {
        window.setTimeout(endTour, 0);
        return i;
      }
      return i + 1;
    });
  }, [queue, endTour]);
  const back = React.useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  // Keyboard: Esc = skip, ←/→ = navigate.
  React.useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        endTour();
      } else if (e.key === 'ArrowRight') {
        e.stopPropagation();
        next();
      } else if (e.key === 'ArrowLeft') {
        e.stopPropagation();
        back();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [active, endTour, next, back]);

  const total = queue?.length ?? 0;
  const value = React.useMemo(() => ({ startTour, endTour, active }), [startTour, endTour, active]);

  return (
    <TourContext.Provider value={value}>
      {children}
      {mounted && active && step && (
        <TourOverlay
          step={step}
          index={index}
          total={total}
          rect={rect}
          reduced={reduced}
          onNext={next}
          onBack={back}
          onSkip={endTour}
        />
      )}
    </TourContext.Provider>
  );
}

function TourOverlay({
  step,
  index,
  total,
  rect,
  reduced,
  onNext,
  onBack,
  onSkip,
}: {
  step: TourStep;
  index: number;
  total: number;
  rect: Rect | null;
  reduced: boolean;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const nextRef = React.useRef<HTMLButtonElement>(null);
  const titleId = React.useId();
  const bodyId = React.useId();

  // Focus the primary action on every step change; roving back to the card on mounts.
  React.useEffect(() => {
    nextRef.current?.focus({ preventScroll: true });
  }, [index]);

  const isLast = index + 1 >= total;

  const placement = React.useMemo(() => {
    if (typeof window === 'undefined') return { mode: 'bottom' as const };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (vw < 640) {
      // Pin above the bottom bar for targets high on screen; pin to the top otherwise.
      const targetIsLow = rect ? rect.top > vh * 0.45 : false;
      return { mode: targetIsLow ? ('top' as const) : ('bottom' as const) };
    }
    if (!rect) return { mode: 'bottom' as const };
    const width = Math.min(CARD_W, vw - 24);
    const below = vh - rect.bottom >= CARD_ESTIMATED_H + GAP || rect.top * 0.6 < vh - rect.bottom;
    const top = below ? rect.bottom + GAP : Math.max(12, rect.top - CARD_ESTIMATED_H - GAP);
    const left = Math.min(Math.max(12, rect.left + rect.width / 2 - width / 2), vw - width - 12);
    return { mode: below ? ('anchored-below' as const) : ('anchored-above' as const), top, left, width };
  }, [rect]);

  const spotlightStyle: React.CSSProperties = rect
    ? {
        top: rect.top - PAD,
        left: rect.left - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
      }
    : { top: '50%', left: '50%', width: 0, height: 0, opacity: 0 };

  const cardClass =
    placement.mode === 'top'
      ? 'fixed left-3 right-3 top-[max(0.75rem,env(safe-area-inset-top))]'
      : placement.mode === 'bottom'
        ? 'fixed left-3 right-3 bottom-[calc(var(--bottom-nav-h)+0.75rem)] lg:left-auto lg:right-6 lg:bottom-6 lg:w-[360px]'
        : 'fixed';
  const cardStyle: React.CSSProperties =
    placement.mode === 'anchored-below' || placement.mode === 'anchored-above'
      ? { top: placement.top, left: placement.left, width: placement.width }
      : {};

  return createPortal(
    <div
      className="fixed inset-0 z-[60]"
      data-tour-motion={reduced ? 'reduced' : 'full'}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
    >
      {/* Click-catcher: tapping anywhere outside the card skips the tour — no dead ends. */}
      <button type="button" className="absolute inset-0 h-full w-full cursor-default" aria-label="Skip tour" onClick={onSkip} />

      {/* Spotlight: a clear window over the target, everything else dimmed. */}
      <div aria-hidden className={cn('tour-spotlight pointer-events-none absolute', !reduced && 'tour-spotlight-enter')} style={spotlightStyle} />

      {/* Card */}
      <div
        ref={cardRef}
        className={cn(
          cardClass,
          'rounded-lg border border-border bg-surface p-4 shadow-pop outline-none focus-visible:ring-2 focus-visible:ring-accent sm:p-5',
          !reduced && 'tour-card-in',
        )}
        style={cardStyle}
        tabIndex={-1}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-accent tabular-nums">
            Step {index + 1} of {total}
          </p>
          {/* The easy-to-hit skip target: 44px tall, always visible. */}
          <button
            type="button"
            onClick={onSkip}
            className="inline-flex h-11 items-center gap-1.5 rounded-md px-4 text-sm font-medium text-ink-muted transition-colors duration-fast hover:bg-sunken hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
          >
            <X className="h-4 w-4" aria-hidden />
            Skip tour
          </button>
        </div>

        <h3 id={titleId} key={`t-${index}`} className={cn('mt-2 text-base font-semibold leading-snug text-ink', !reduced && 'tour-text-in')}>
          {step.title}
        </h3>
        <p id={bodyId} key={`b-${index}`} className={cn('mt-1 text-sm leading-relaxed text-ink-muted', !reduced && 'tour-text-in')}>
          {step.body}
        </p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Previous step"
            className={cn(
              'inline-flex h-11 w-11 items-center justify-center rounded-md text-ink-muted transition-colors duration-fast hover:bg-sunken hover:text-ink focus-visible:ring-2 focus-visible:ring-accent',
              index === 0 && 'invisible',
            )}
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </button>

          <div className="flex items-center gap-1.5" aria-hidden>
            {Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300 ease-out',
                  i === index ? 'w-5 bg-accent' : i < index ? 'w-1.5 bg-accent/50' : 'w-1.5 bg-border-strong',
                )}
              />
            ))}
          </div>

          <button
            ref={nextRef}
            type="button"
            onClick={onNext}
            className="inline-flex h-11 items-center gap-1.5 rounded-md bg-accent px-4 text-sm font-semibold text-accent-contrast transition-colors duration-fast hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            {isLast ? (
              <>
                Done
                <Check className="h-4 w-4" aria-hidden />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4" aria-hidden />
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
