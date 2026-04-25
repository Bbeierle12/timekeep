/**
 * useLiveNow — ticking clock anchored to a virtual wall time.
 * Ported from the prototype's `useLiveNow` (used by `CKEmployeeView`).
 *
 * Returns a Date that advances by 1 second on every interval tick. Resets
 * whenever `seed` changes (e.g. when the user switches scenarios).
 */
import { useEffect, useState } from 'react';

export function useLiveNow(seed: Date): Date {
  const [now, setNow] = useState<Date>(seed);

  useEffect(() => {
    setNow(seed);
    const id = window.setInterval(() => {
      setNow((prev) => new Date(prev.getTime() + 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [seed]);

  return now;
}
