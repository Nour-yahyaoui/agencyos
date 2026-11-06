import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium',
    'transition-[background-color,color,transform] duration-fast ease-out focus-ring',
    'active:scale-[.98] motion-reduce:active:scale-100',
    'disabled:pointer-events-none disabled:opacity-55',
    '[&_svg]:size-4 [&_svg]:shrink-0',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'bg-accent text-accent-contrast hover:bg-accent-hover',
        destructive: 'bg-danger text-destructive-foreground hover:bg-danger/90',
        outline: 'border border-border-strong bg-surface text-ink hover:bg-sunken',
        secondary: 'bg-sunken text-ink hover:bg-border/60',
        ghost: 'text-ink-muted hover:bg-sunken hover:text-ink',
        link: 'text-accent underline-offset-4 hover:underline',
      },
      // 44px touch targets on phones, 36px from `sm` up where a pointer is precise.
      size: {
        default: 'h-11 px-4 sm:h-9',
        sm: 'h-9 px-3 text-xs sm:h-8',
        lg: 'h-11 px-6',
        icon: 'h-11 w-11 sm:h-9 sm:w-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

/**
 * `loading` swaps the label for a spinner without changing the button's width, so the row
 * doesn't jump while a request is in flight.
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    if (asChild) {
      return (
        <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
          {children}
        </Comp>
      );
    }
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }), 'relative')}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Loader2 className="animate-spin" aria-hidden />}
        {children}
      </Comp>
    );
  },
);
Button.displayName = 'Button';
export { Button, buttonVariants };
