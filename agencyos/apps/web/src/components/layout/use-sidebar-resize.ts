'use client';

import * as React from 'react';
import {
  SIDEBAR_COOKIE,
  SIDEBAR_DEFAULT,
  SIDEBAR_MAX,
  SIDEBAR_MIN,
  SIDEBAR_SNAP,
  serializeSidebar,
  type SidebarState,
} from '@/lib/sidebar';

function persist(state: SidebarState) {
  // A cookie, not just localStorage: the server layout reads it so the first paint is already
  // the right width and the content never jumps sideways after hydration.
  document.cookie = `${SIDEBAR_COOKIE}=${serializeSidebar(state)}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * Pointer + keyboard resizing for the desktop sidebar.
 *
 * During a drag we write `--sidebar-w` straight to the DOM inside a rAF and only commit React
 * state on release, so moving the mouse doesn't re-render the whole app tree per pixel.
 */
export function useSidebarResize(initial: SidebarState) {
  const [width, setWidth] = React.useState(initial.width);
  const [collapsed, setCollapsed] = React.useState(initial.collapsed);
  const [dragging, setDragging] = React.useState(false);

  const widthRef = React.useRef(width);
  const collapsedRef = React.useRef(collapsed);
  const draggingRef = React.useRef(false);
  const frame = React.useRef<number | null>(null);

  widthRef.current = width;
  collapsedRef.current = collapsed;

  const paint = React.useCallback((next: SidebarState) => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      document.documentElement.style.setProperty('--sidebar-w', `${next.collapsed ? 72 : next.width}px`);
    });
  }, []);

  const commit = React.useCallback(
    (next: SidebarState) => {
      setWidth(next.width);
      setCollapsed(next.collapsed);
      widthRef.current = next.width;
      collapsedRef.current = next.collapsed;
      paint(next);
      persist(next);
    },
    [paint],
  );

  const toggle = React.useCallback(() => {
    commit({ width: widthRef.current, collapsed: !collapsedRef.current });
  }, [commit]);

  const reset = React.useCallback(() => commit({ width: SIDEBAR_DEFAULT, collapsed: false }), [commit]);

  const onPointerDown = React.useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    draggingRef.current = true;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }, []);

  const onPointerMove = React.useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!draggingRef.current) return;
      const x = e.clientX;
      if (x < SIDEBAR_SNAP) {
        if (!collapsedRef.current) {
          collapsedRef.current = true;
          setCollapsed(true);
          paint({ width: widthRef.current, collapsed: true });
        }
        return;
      }
      const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, x));
      collapsedRef.current = false;
      widthRef.current = next;
      setCollapsed(false);
      setWidth(next);
      paint({ width: next, collapsed: false });
    },
    [paint],
  );

  const endDrag = React.useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setDragging(false);
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      persist({ width: widthRef.current, collapsed: collapsedRef.current });
    },
    [],
  );

  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      const map: Record<string, () => SidebarState> = {
        ArrowLeft: () => ({ width: Math.max(SIDEBAR_MIN, widthRef.current - 16), collapsed: false }),
        ArrowRight: () => ({ width: Math.min(SIDEBAR_MAX, widthRef.current + 16), collapsed: false }),
        Home: () => ({ width: SIDEBAR_MIN, collapsed: false }),
        End: () => ({ width: SIDEBAR_MAX, collapsed: false }),
        Enter: () => ({ width: widthRef.current, collapsed: !collapsedRef.current }),
      };
      const next = map[e.key];
      if (!next) return;
      e.preventDefault();
      commit(next());
    },
    [commit],
  );

  // ⌘B / Ctrl+B toggles the rail, the shortcut every editor-trained user reaches for.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  React.useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  return {
    width,
    collapsed,
    dragging,
    toggle,
    reset,
    setCollapsed: (value: boolean) => commit({ width: widthRef.current, collapsed: value }),
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onDoubleClick: reset,
      onKeyDown,
    },
  };
}
