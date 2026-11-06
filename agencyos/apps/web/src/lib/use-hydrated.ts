'use client';

import * as React from 'react';

/**
 * False on the server and the first client paint, true once React has attached its handlers.
 * Submit buttons use it so a click can never trigger a native form submit before hydration.
 */
export function useHydrated() {
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => setHydrated(true), []);
  return hydrated;
}
