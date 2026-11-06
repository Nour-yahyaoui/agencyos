'use client';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useEffect, useState } from 'react';
export function SearchInput({ value, onChange, placeholder = 'Search…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);
  useEffect(() => { const t = setTimeout(() => { if (local !== value) onChange(local); }, 300); return () => clearTimeout(t); }, [local, value, onChange]);
  return <div className="relative w-full sm:w-72"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={local} onChange={(e) => setLocal(e.target.value)} placeholder={placeholder} className="pl-8" aria-label="Search" /></div>;
}
