'use client';
import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { toast } from 'sonner';
export function useToastMutation<TData, TVars, TContext = unknown>(options: UseMutationOptions<TData, Error, TVars, TContext> & { success?: string; invalidate?: readonly unknown[][] }) {
  const qc = useQueryClient();
  const { success, invalidate, onSuccess, onError, ...rest } = options;
  return useMutation<TData, Error, TVars, TContext>({
    ...rest,
    onSuccess: async (data, vars, onMutateResult, ctx) => { if (success) toast.success(success); if (invalidate) await Promise.all(invalidate.map((key) => qc.invalidateQueries({ queryKey: key }))); await onSuccess?.(data, vars, onMutateResult, ctx); },
    onError: (err, vars, onMutateResult, ctx) => { toast.error(err.message); onError?.(err, vars, onMutateResult, ctx); },
  });
}
