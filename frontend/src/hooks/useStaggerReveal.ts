import { useEffect, useRef, useState } from 'react';

export function useStaggerReveal<T extends HTMLElement>(count: number) {
  const nodes = useRef<(T | null)[]>([]);
  const [visible, setVisible] = useState<boolean[]>(() => Array(count).fill(false));

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setVisible(Array(count).fill(true));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const index = nodes.current.indexOf(entry.target as T);
          if (index === -1) return;
          setVisible((current) => {
            if (current[index]) return current;
            const next = [...current];
            next[index] = true;
            return next;
          });
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.2 },
    );

    nodes.current.forEach((node) => { if (node) observer.observe(node); });

    return () => observer.disconnect();
  }, [count]);

  const setRef = (index: number) => (node: T | null) => {
    nodes.current[index] = node;
  };

  return { setRef, visible };
}
