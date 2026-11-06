/** Shared by the server layout (first paint) and the client resize hook (interaction). */
export const SIDEBAR_MIN = 232;
export const SIDEBAR_MAX = 360;
export const SIDEBAR_DEFAULT = 272;
export const SIDEBAR_RAIL = 72;
/** Dragging inside this distance from the left edge snaps shut into the icon rail. */
export const SIDEBAR_SNAP = 180;

export const SIDEBAR_COOKIE = 'agencyos_sidebar';

export interface SidebarState {
  width: number;
  collapsed: boolean;
}

/** Parses the persisted cookie. Anything malformed falls back to the default, never NaN. */
export function parseSidebarCookie(raw: string | undefined): SidebarState {
  if (raw === 'rail') return { width: SIDEBAR_DEFAULT, collapsed: true };
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return { width: SIDEBAR_DEFAULT, collapsed: false };
  return { width: Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Math.round(parsed))), collapsed: false };
}

export function serializeSidebar({ width, collapsed }: SidebarState) {
  return collapsed ? 'rail' : String(Math.round(width));
}
