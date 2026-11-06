import Link from 'next/link';
import { ArrowRight, BarChart3, CreditCard, FolderKanban, ShieldCheck, Sparkles, Users } from 'lucide-react';
export default function Landing() {
  const features = [
    { icon: Users, title: 'Client operations', text: 'Profiles, contacts, onboarding checklists, and account ownership in one place.' },
    { icon: FolderKanban, title: 'Delivery control', text: 'Kanban boards, dependencies, milestones, and overdue detection across projects.' },
    { icon: CreditCard, title: 'Finance', text: 'Invoices, Stripe test payments, subscriptions, and revenue analytics.' },
    { icon: ShieldCheck, title: 'Secure portals', text: 'Organization-scoped access with role-based permissions for teams and clients.' },
    { icon: Sparkles, title: 'AI assistant', text: 'Grounded project summaries and risk analysis when OpenAI is configured.' },
    { icon: BarChart3, title: 'Live analytics', text: 'Database-backed dashboards for workload, completion, and outstanding revenue.' },
  ];
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_hsl(243_75%_95%),_transparent_60%)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5"><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-white">A</div><span className="text-lg font-semibold">AgencyOS</span></div><div className="flex items-center gap-2"><Link href="/login" className="rounded-md px-4 py-2 text-sm font-medium hover:bg-muted">Sign in</Link><Link href="/register" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">Get started</Link></div></header>
      <main className="mx-auto max-w-6xl px-6 pb-20 pt-14 text-center">
        <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Full-stack engineering showcase · Next.js + NestJS + PostgreSQL</div>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">Run your agency from <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">one operating system</span></h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">AgencyOS centralizes client relationships, project delivery, team collaboration, financial operations, and analytics for software and digital agencies.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3"><Link href="/register" className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-medium text-white shadow-sm hover:bg-primary/90">Create your workspace <ArrowRight className="h-4 w-4" /></Link><Link href="/login" className="inline-flex items-center gap-2 rounded-md border bg-card px-6 py-3 font-medium hover:bg-muted">Explore the demo</Link></div>
        <div className="mt-16 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-3">{features.map((f) => <div key={f.title} className="rounded-lg border bg-card p-5 shadow-card"><f.icon className="mb-3 h-6 w-6 text-primary" /><h3 className="font-semibold">{f.title}</h3><p className="mt-1 text-sm text-muted-foreground">{f.text}</p></div>)}</div>
      </main>
    </div>
  );
}
