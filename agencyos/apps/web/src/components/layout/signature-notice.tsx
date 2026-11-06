'use client';

import * as React from 'react';
import { X } from 'lucide-react';

const SEEN_KEY = 'agencyos.signature.seen';
const VISIBLE_MS = 3000;
const EXIT_MS = 200;

/**
 * First-visit maker's mark.
 *
 * Shown once per browser, for three seconds, with a real close button. It is a polite status
 * message rather than an alert so a screen reader is not interrupted mid-page, it never takes
 * focus, and hovering or focusing it pauses the timer so nobody has to chase the X.
 * The live region stays mounted so the announcement fires when the notice appears.
 */
export function SignatureNotice() {
  const [ready, setReady] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [closing, setClosing] = React.useState(false);
  const [paused, setPaused] = React.useState(false);
  const remaining = React.useRef(VISIBLE_MS);
  const startedAt = React.useRef<number | null>(null);

  React.useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(SEEN_KEY) === '1';
    } catch {
      /* storage blocked: show it this session rather than never */
    }
    setReady(true);
    if (!seen) setOpen(true);
  }, []);

  const dismiss = React.useCallback(() => {
    setClosing(true);
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* ignore */
    }
    window.setTimeout(() => setOpen(false), EXIT_MS);
  }, []);

  React.useEffect(() => {
    if (!open || closing || paused) return;
    startedAt.current = Date.now();
    const timer = window.setTimeout(dismiss, remaining.current);
    return () => {
      window.clearTimeout(timer);
      if (startedAt.current !== null) {
        remaining.current = Math.max(400, remaining.current - (Date.now() - startedAt.current));
      }
    };
  }, [open, closing, paused, dismiss]);

  if (!ready) return null;

  return (
    <div
      aria-live="polite"
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-toast flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      {open && (
        <div
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
          className={[
            'pointer-events-auto flex items-center gap-3 rounded-md border border-border bg-raised py-2.5 pe-2 ps-4 shadow-3',
            'transition-[opacity,transform] duration-base ease-out motion-safe:animate-rise-in',
            closing ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100',
          ].join(' ')}
        >
          <span aria-hidden className="h-6 w-0.5 shrink-0 rounded-full bg-accent" />
          <p className="text-sm text-ink">
            App made by{' '}
            <a
              href="https://github.com/nour-yahyaoui"
              target="_blank"
              rel="noreferrer noopener"
              className="font-semibold text-accent underline-offset-4 hover:underline"
            >
              Nour Yahyaoui
            </a>
          </p>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-ink-muted transition-colors duration-fast hover:bg-sunken hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
