'use client';

import * as React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ThemeChoice = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'agencyos.theme';

/** Kept in sync with the inline script in `app/layout.tsx` that runs before first paint. */
export function resolveTheme(choice: ThemeChoice): 'light' | 'dark' {
  if (choice === 'system') {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return choice;
}

function apply(choice: ThemeChoice) {
  const resolved = resolveTheme(choice);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
}

const ThemeContext = React.createContext<{ choice: ThemeChoice; setChoice: (c: ThemeChoice) => void } | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [choice, setChoiceState] = React.useState<ThemeChoice>('system');

  React.useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as ThemeChoice | null) ?? 'system';
    setChoiceState(saved);
    apply(saved);
  }, []);

  // Follow the OS only while the user has chosen "System".
  React.useEffect(() => {
    if (choice !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => apply('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [choice]);

  const setChoice = React.useCallback((next: ThemeChoice) => {
    setChoiceState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode: the choice still applies for this session */
    }
    apply(next);
  }, []);

  return <ThemeContext.Provider value={{ choice, setChoice }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

const OPTIONS: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

/**
 * A three-way segmented control rather than a binary switch: "System" is a real choice, and
 * hiding it is how apps end up fighting the OS. Rendered as a radiogroup so arrow keys work.
 */
export function ThemeToggle({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { choice, setChoice } = useTheme();
  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn('inline-flex items-center gap-0.5 rounded-sm border border-border bg-sunken p-0.5', className)}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const selected = choice === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            title={label}
            onClick={() => setChoice(value)}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-xs px-2 text-xs font-medium transition-colors duration-fast',
              selected ? 'bg-surface text-ink shadow-1' : 'text-ink-muted hover:text-ink',
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            <span className={compact ? 'sr-only' : undefined}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
