import * as React from 'react';
import { cn } from '@/lib/utils';


/**
 * Literal class strings so Tailwind can see them at build time. Below the given breakpoint the
 * nth column is dropped, which is how a wide table keeps its 2-3 key fields on a phone instead
 * of shrinking every column into unreadability.
 */
const COLUMN_CLASSES: Record<'sm' | 'md' | 'lg', string[]> = {
  sm: [
    'max-sm:[&_:is(th,td):nth-child(1)]:hidden', 'max-sm:[&_:is(th,td):nth-child(2)]:hidden',
    'max-sm:[&_:is(th,td):nth-child(3)]:hidden', 'max-sm:[&_:is(th,td):nth-child(4)]:hidden',
    'max-sm:[&_:is(th,td):nth-child(5)]:hidden', 'max-sm:[&_:is(th,td):nth-child(6)]:hidden',
    'max-sm:[&_:is(th,td):nth-child(7)]:hidden', 'max-sm:[&_:is(th,td):nth-child(8)]:hidden',
  ],
  md: [
    'max-md:[&_:is(th,td):nth-child(1)]:hidden', 'max-md:[&_:is(th,td):nth-child(2)]:hidden',
    'max-md:[&_:is(th,td):nth-child(3)]:hidden', 'max-md:[&_:is(th,td):nth-child(4)]:hidden',
    'max-md:[&_:is(th,td):nth-child(5)]:hidden', 'max-md:[&_:is(th,td):nth-child(6)]:hidden',
    'max-md:[&_:is(th,td):nth-child(7)]:hidden', 'max-md:[&_:is(th,td):nth-child(8)]:hidden',
  ],
  lg: [
    'max-lg:[&_:is(th,td):nth-child(1)]:hidden', 'max-lg:[&_:is(th,td):nth-child(2)]:hidden',
    'max-lg:[&_:is(th,td):nth-child(3)]:hidden', 'max-lg:[&_:is(th,td):nth-child(4)]:hidden',
    'max-lg:[&_:is(th,td):nth-child(5)]:hidden', 'max-lg:[&_:is(th,td):nth-child(6)]:hidden',
    'max-lg:[&_:is(th,td):nth-child(7)]:hidden', 'max-lg:[&_:is(th,td):nth-child(8)]:hidden',
  ],
};

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  /** 1-based column indices to drop below each breakpoint. */
  hideBelow?: { sm?: number[]; md?: number[]; lg?: number[] };
}

/**
 * Enterprise table defaults: sticky header, 40px rows, tabular figures, sentence-case heads.
 * The wrapper scrolls horizontally with a visible affordance rather than breaking the layout.
 */
const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, hideBelow, ...props }, ref) => {
    const hidden = (['sm', 'md', 'lg'] as const).flatMap((bp) =>
      (hideBelow?.[bp] ?? []).map((n) => COLUMN_CLASSES[bp][n - 1]).filter(Boolean),
    );
    return (
      <div className="relative w-full overflow-x-auto scrollbar-thin">
        <table ref={ref} className={cn('w-full caption-bottom text-sm', hidden, className)} {...props} />
      </div>
    );
  },
);
Table.displayName = 'Table';

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn('sticky top-0 z-10 bg-sunken/80 backdrop-blur [&_tr]:border-b', className)} {...props} />
  ),
);
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />,
);
TableBody.displayName = 'TableBody';

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn('border-b border-border transition-colors duration-fast hover:bg-sunken/60 data-[state=selected]:bg-accent-soft', className)}
      {...props}
    />
  ),
);
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn('h-10 whitespace-nowrap px-3 text-start align-middle text-xs font-medium text-ink-muted', className)}
      {...props}
    />
  ),
);
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => <td ref={ref} className={cn('h-12 px-3 py-2 align-middle', className)} {...props} />,
);
TableCell.displayName = 'TableCell';

export { Table, TableHeader, TableBody, TableHead, TableRow, TableCell };
