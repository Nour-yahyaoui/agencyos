import type { Config } from 'tailwindcss';

/**
 * Every colour here resolves to a CSS variable defined in `src/app/globals.css`.
 * Components use semantic names (`bg-surface`, `text-muted`, `border-border`) so a theme
 * change never touches a component. The legacy shadcn-style names are kept as aliases so
 * existing pages keep working while they are migrated.
 */
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Semantic surface + text scale
        bg: token('bg'),
        surface: token('surface'),
        raised: token('raised'),
        sunken: token('sunken'),
        border: token('border'),
        'border-strong': token('border-strong'),
        input: token('border-strong'),
        ring: token('accent'),
        ink: { DEFAULT: token('text'), muted: token('text-muted'), faint: token('text-faint') },

        // Brand + status
        accent: { DEFAULT: token('accent'), hover: token('accent-hover'), contrast: token('accent-contrast'), soft: token('accent-soft') },
        success: token('success'),
        warning: token('warning'),
        danger: token('danger'),
        info: token('info'),

        // Navigation rail
        rail: { DEFAULT: token('rail'), text: token('rail-text'), muted: token('rail-muted'), border: token('rail-border') },

        // Aliases for the pre-existing class names
        background: token('bg'),
        foreground: token('text'),
        card: { DEFAULT: token('surface'), foreground: token('text') },
        primary: { DEFAULT: token('accent'), foreground: token('accent-contrast') },
        secondary: { DEFAULT: token('sunken'), foreground: token('text') },
        muted: { DEFAULT: token('sunken'), foreground: token('text-muted') },
        destructive: { DEFAULT: token('danger'), foreground: token('danger-contrast') },
        sidebar: { DEFAULT: token('rail'), foreground: token('rail-text') },
      },
      borderRadius: {
        xs: 'var(--r-xs)',
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        xl: 'var(--r-lg)',
        '2xl': 'var(--r-lg)',
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.625rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['2rem', { lineHeight: '2.375rem' }],
      },
      boxShadow: {
        1: 'var(--shadow-1)',
        2: 'var(--shadow-2)',
        3: 'var(--shadow-3)',
        card: 'var(--shadow-1)',
        pop: 'var(--shadow-3)',
      },
      transitionTimingFunction: { out: 'var(--ease-out)', in: 'var(--ease-in)' },
      transitionDuration: { fast: '120ms', base: '200ms', slow: '320ms' },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'rise-in': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        'fade-in': 'fade-in var(--dur-base) var(--ease-out)',
        'rise-in': 'rise-in var(--dur-slow) var(--ease-out)',
      },
      zIndex: { sticky: '10', dropdown: '20', overlay: '30', modal: '40', toast: '50' },
    },
  },
  plugins: [],
};
export default config;
