"use client";

import { ReactNode, useEffect, useState, createContext, useContext, useLayoutEffect } from "react";
import WiringDiagram from "@/components/wiremap/map";
import { useDimensions as useDimensions2 } from "@/components/useDimensions";
export type Dimensions = { width: number, height: number };
const dimensionsContext = createContext<Dimensions>({ width: 0, height: 0 });

export function useDimensions(): Dimensions {
  const dimensions = useContext(dimensionsContext);
  return dimensions;
}

export function DimensionsProvider({ children, dimensions }: { children: ReactNode, dimensions: Dimensions }) {
  return (
    <dimensionsContext.Provider value={dimensions}>
      {children}
    </dimensionsContext.Provider>
  );
}


function ScrollablePane({ children, dimensions }: { children: ReactNode, dimensions: Dimensions }) {
  return (
    <div style={{ width: dimensions.width, height: dimensions.height, overflowY: "auto" }}>
      <DimensionsProvider dimensions={dimensions}>
        {children}
      </DimensionsProvider>
    </div>
  );
}

// eslint-disable-next-line max-lines-per-function
export function WithWiringDiagram({ children, mainContextPercent }: { children: ReactNode, mainContextPercent: number }) {
  const [screenDimensions, setScreenDimensions] = useState({ width: 0, height: 0 });
  const updateDimensions = () => {
    const navBar = document.getElementById("navbar");
    const navBarOffset = navBar == null ? 0 : navBar.offsetHeight;
    setScreenDimensions({ width: document.documentElement.clientWidth, height: document.documentElement.clientHeight - navBarOffset });
  }

  useEffect(() => {
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useLayoutEffect(() => {
    updateDimensions();
  }, []);

  return (
    <div className="flex flex-row items-center justify-center w-full h-full">
      <ScrollablePane dimensions={{ width: screenDimensions.width * mainContextPercent, height: screenDimensions.height }}>
        {children}
      </ScrollablePane>
      <ScrollablePane dimensions={{ width: screenDimensions.width * (1 - mainContextPercent), height: screenDimensions.height }}>
        <WiringDiagram />
      </ScrollablePane>
    </div>
  );
}