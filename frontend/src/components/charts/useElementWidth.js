import { useEffect, useRef, useState } from "react";

/** Tracks an element's rendered width so SVG charts can lay out at 1:1 scale. */
export default function useElementWidth(initial = 600) {
  const ref = useRef(null);
  const [width, setWidth] = useState(initial);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setWidth(el.getBoundingClientRect().width || initial);
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [initial]);

  return [ref, width];
}
