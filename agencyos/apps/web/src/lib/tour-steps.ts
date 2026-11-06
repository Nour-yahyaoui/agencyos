/**
 * Content for the guided product tour.
 *
 * Steps reference `[data-tour]` attributes rendered by the sidebar, the bottom bar
 * and the top bar. The tour engine resolves steps lazily — a step whose target is
 * not mounted or not visible (e.g. sidebar-only destinations on a phone, or the
 * Team page for non-managers) is silently skipped, so one definition serves every
 * role and screen size.
 */
export interface TourStep {
  /** Value of the `data-tour` attribute to highlight. */
  target: string;
  title: string;
  body: string;
}

export const AGENCY_TOUR: TourStep[] = [
  {
    target: 'nav-dashboard',
    title: 'Your command center',
    body: 'Metrics, delivery health and everything waiting on you across every client — the first place to look each morning.',
  },
  {
    target: 'nav-clients',
    title: 'Clients and contacts',
    body: 'Every relationship in one place: notes, onboarding checklists, contacts and who owns the account.',
  },
  {
    target: 'nav-team',
    title: 'Team and roles',
    body: 'Invite members, set roles (owner, manager, developer) and control who can see finance data.',
  },
  {
    target: 'nav-projects',
    title: 'Projects and milestones',
    body: 'Budgets, due dates and milestone tracking per project, from proposal to handover.',
  },
  {
    target: 'nav-tasks',
    title: 'My tasks',
    body: 'A kanban of everything assigned to you — drag cards between columns, filter by client and priority.',
  },
  {
    target: 'nav-documents',
    title: 'Documents',
    body: 'Proposals, contracts and deliverables — uploaded once, shared with the client automatically.',
  },
  {
    target: 'nav-support',
    title: 'Support inbox',
    body: 'Client tickets with priorities and statuses, so nothing gets lost in email.',
  },
  {
    target: 'nav-assistant',
    title: 'AI assistant',
    body: 'Draft, summarize and ask questions about your work. Reports honestly when no AI provider is configured.',
  },
  {
    target: 'nav-billing',
    title: 'Billing',
    body: 'Invoices, payment tracking and Stripe-backed checkout when configured — plus overdue nudges.',
  },
  {
    target: 'nav-analytics',
    title: 'Analytics',
    body: 'Revenue, utilization and delivery trends across the whole agency, updated live.',
  },
  {
    target: 'notifications',
    title: 'Notifications',
    body: 'Deadline reminders, mentions and payment events — the bell badges when something needs you.',
  },
  {
    target: 'nav-settings',
    title: 'Settings',
    body: 'Workspace details, member management, integrations and notification preferences.',
  },
];

export const CLIENT_TOUR: TourStep[] = [
  {
    target: 'nav-portal',
    title: 'Your overview',
    body: 'Project status, recent activity and anything that needs your attention — all in one place.',
  },
  {
    target: 'nav-projects',
    title: 'Your projects',
    body: 'Milestones, progress and upcoming deliveries for the work we are delivering for you.',
  },
  {
    target: 'nav-documents',
    title: 'Your documents',
    body: 'Contracts, reports and shared files — always the latest version, timestamped.',
  },
  {
    target: 'nav-support',
    title: 'Support',
    body: 'Stuck on something? Open a ticket and our team will get back to you. Track status right here.',
  },
  {
    target: 'nav-billing',
    title: 'Invoices',
    body: 'Download invoices, see what is outstanding and pay online when payment is configured.',
  },
  {
    target: 'notifications',
    title: 'Notifications',
    body: 'Updates on your projects and support requests. The bell badges when something changes.',
  },
];
