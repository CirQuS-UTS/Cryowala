import { useLayoutEffect, useMemo, useRef, useState } from "react";

export type Dimensions = { width: number, height: number };

export function useDimensions<Element extends HTMLElement>(): [React.RefObject<Element>, Dimensions] {
  const ref = useRef<Element>(null);
  const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 });

  const observer = useMemo(() => new ResizeObserver(([entry]) => {
    setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
  }), []);

  useLayoutEffect(() => {
    if (ref.current == null) return;

    const element = ref.current!;

    observer.observe(element);

    return () => observer.disconnect();
  }, [ref, observer]);

  return [ref, dimensions];
}