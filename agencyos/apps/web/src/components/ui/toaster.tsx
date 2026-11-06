'use client';

import * as React from 'react';
import { Toaster as Sonner } from 'sonner';
import { useTheme } from '@/components/theme/theme';

function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [query]);
  return matches;
}

/**
 * Toasts restyled with the project tokens — no saturated fills, no default library look.
 *
 * Position follows the device: bottom-right on desktop, top-center on phones so a toast never
 * lands on the bottom navigation or the thumb. Errors stay up twice as long as confirmations.
 */
export function Toaster() {
  const { choice } = useTheme();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [systemDark, setSystemDark] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () => setSystemDark(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const theme = choice === 'system' ? (systemDark ? 'dark' : 'light') : choice;

  return (
    <Sonner
      theme={theme}
      position={isMobile ? 'top-center' : 'bottom-right'}
      offset={isMobile ? 12 : 20}
      mobileOffset={12}
      visibleToasts={3}
      closeButton
      expand={false}
      duration={4000}
      toastOptions={{
        duration: 4000,
        classNames: {
          toast:
            'group flex items-start gap-3 rounded-md border border-border bg-raised px-4 py-3 text-ink shadow-2 w-full',
          title: 'text-sm font-medium leading-5',
          description: 'text-sm leading-5 text-ink-muted',
          icon: 'mt-0.5 shrink-0',
          content: 'min-w-0 flex-1',
          actionButton:
            '!rounded-sm !bg-accent !text-accent-contrast h-8 px-3 text-sm font-medium hover:!bg-accent-hover',
          cancelButton: '!rounded-sm !bg-transparent !text-ink-muted h-8 px-3 text-sm hover:!text-ink',
          closeButton:
            '!absolute !end-2 !top-2 !translate-x-0 !translate-y-0 !border-border !bg-raised !text-ink-muted hover:!bg-sunken hover:!text-ink',
          // Only the status icon takes the semantic colour; the message stays readable ink.
          success: '[&_[data-icon]]:!text-success',
          error: '[&_[data-icon]]:!text-danger',
          warning: '[&_[data-icon]]:!text-warning',
          info: '[&_[data-icon]]:!text-info',
        },
      }}
    />
  );
}
