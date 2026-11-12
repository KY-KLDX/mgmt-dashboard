import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Fill-the-screen helpers for the Executive Overview.
 *
 * useFillHeight: when the screen is wide and tall enough, returns the height the page body can
 * take without scrolling; otherwise null, and the page keeps its natural height and scrolls.
 *
 * useFitCount: inside a box whose height is set by the layout, shows as many whole items
 * (elements marked data-fit) as fit, never fewer than `min`. Re-measures when the box resizes.
 */
export function useFillHeight(minHeight: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  useEffect(() => {
    const measure = () => {
      const el = ref.current;
      const main = document.getElementById('main');
      if (!el) return;
      const top = el.getBoundingClientRect().top + (main?.scrollTop ?? 0);
      const available = Math.floor(window.innerHeight - top - 24);
      setHeight(window.innerWidth >= 1280 && available >= minHeight ? available : null);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [minHeight]);
  return { ref, height };
}

export function useFitCount(enabled: boolean, total: number, min: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(enabled ? total : min);

  useEffect(() => setCount(enabled ? total : Math.min(min, total)), [enabled, total, min]);

  useLayoutEffect(() => {
    const box = ref.current;
    if (!enabled || !box) return;
    const limit = box.getBoundingClientRect().bottom + 1;
    let fit = 0;
    box.querySelectorAll('[data-fit]').forEach((el) => { if (el.getBoundingClientRect().bottom <= limit) fit++; });
    const next = Math.min(total, Math.max(min, fit));
    if (next !== count) setCount(next);
  });

  useEffect(() => {
    const box = ref.current;
    if (!enabled || !box) return;
    // When the box changes size, show everything again and let the layout effect trim it.
    const ro = new ResizeObserver(() => setCount(total));
    ro.observe(box);
    return () => ro.disconnect();
  }, [enabled, total]);

  return { ref, count };
}
