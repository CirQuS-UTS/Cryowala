"use client";

import { FC, RefObject, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

export interface Dimensions {
    width: number,
    height: number,
}

export type ResizableComponent = FC<Dimensions>;

function useDimensions(target: RefObject<HTMLDivElement>, aspectRatio: number = 16 / 9, initialWidth: number = 500) {
  const [width, setWidth] = useState(initialWidth);
  const height = useMemo(() => width / aspectRatio, [width, aspectRatio]);
  
  const updateDimensions = useMemo(() => () => {
    if (target?.current)
      setWidth(target.current.clientWidth);
  }, [target]);

  useEffect(() => {
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [updateDimensions]);

  useLayoutEffect(() => {
    updateDimensions();
  }, [updateDimensions]);

  return [width, height];
}

type ResizeableProps = {
    child: ResizableComponent,
    aspectRatio?: number,
}
const Resizeable: FC<ResizeableProps> = ({ child, aspectRatio = 16 / 9 }: ResizeableProps) => {
    const divRef = useRef<HTMLDivElement>(null);
    const [width, height] = useDimensions(divRef, aspectRatio);
  
    return (
      <div className="flex flex-col h-full w-full" ref={divRef}>
        {child({ width, height })}
      </div>
    )
};

export default Resizeable;
