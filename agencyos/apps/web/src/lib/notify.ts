import { toast } from 'sonner';

type Options = { description?: string; id?: string; action?: { label: string; onClick: () => void } };

/**
 * One place for feedback rules, so every screen behaves the same:
 * confirmations vanish in 4s, errors stay for 8s, and repeating the same message replaces the
 * existing toast instead of stacking duplicates.
 */
export const notify = {
  success: (message: string, options: Options = {}) => toast.success(message, { duration: 4000, ...options }),
  info: (message: string, options: Options = {}) => toast.info(message, { duration: 4000, ...options }),
  warning: (message: string, options: Options = {}) => toast.warning(message, { duration: 6000, ...options }),
  error: (message: string, options: Options = {}) => toast.error(message, { duration: 8000, ...options }),
  /** Reversible actions get Undo rather than a confirmation dialog. */
  undo: (message: string, onUndo: () => void, options: Omit<Options, 'action'> = {}) =>
    toast(message, { duration: 6000, ...options, action: { label: 'Undo', onClick: onUndo } }),
  promise: <T,>(promise: Promise<T>, messages: { loading: string; success: string; error: string }, id?: string) =>
    toast.promise(promise, { ...messages, id }),
};
