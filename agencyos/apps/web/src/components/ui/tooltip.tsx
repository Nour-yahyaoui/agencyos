'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

export const TooltipProvider = TooltipPrimitive.Provider;

/**
 * Rail labels. Opens on hover *and* keyboard focus, with a 300ms delay so sweeping the pointer
 * down the rail doesn't fire ten tooltips.
 */
export function Tooltip({
  content,
  children,
  side = 'right',
  disabled,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  disabled?: boolean;
}) {
  if (disabled) return <>{children}</>;
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={8}
          className={cn(
            'z-toast rounded-sm border border-border bg-raised px-2.5 py-1.5 text-xs font-medium text-ink shadow-2',
            'motion-safe:animate-fade-in',
          )}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-[rgb(var(--raised))]" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
