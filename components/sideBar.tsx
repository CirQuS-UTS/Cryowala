"use client";

import React, { createContext, FC, PropsWithChildren, ReactNode, useContext, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { NavBarHeight } from '@/components/navbar';

type SideBarToggleButtonProps = {
  isOpen: boolean,
  onClick: () => void,
}
function SideBarToggleButton({ isOpen, onClick }: SideBarToggleButtonProps) {
  const baseClasses = "bg-white w-[35px] h-[5px] my-[6px] rounded-full transition duration-400";
  const withOpenStyles = (className: string) => [baseClasses, isOpen ? className : ""].join(" ");

  return (
    <button
      className="flex flex-row bottom-5 left-5 w-16 h-16 justify-center items-center absolute bg-black opacity-80 rounded-full z-10"
      onClick={onClick}
    >
      <div className="inline-block">
        <div className={withOpenStyles("transform -rotate-45  translate-y-[11px]")} />
        <div className={withOpenStyles("opacity-0")} />
        <div className={withOpenStyles("transform  rotate-45 -translate-y-[11px]")} />
      </div>
    </button>
  )
}

type SideBarContextType = {
  ref: React.RefObject<HTMLDivElement>,
}
export const SideBarContext = createContext<SideBarContextType | null>(null);

export function SideBarContent({ children }: PropsWithChildren) {
  const context = useContext(SideBarContext);

  if (!context?.ref?.current) {
    return null;
  }

  return createPortal(children, context.ref.current);
}

// eslint-disable-next-line max-lines-per-function
export default function SideBar({ children }: PropsWithChildren): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="flex flex-row">
      <SideBarContext.Provider value={{ ref }}>
        <SideBarToggleButton isOpen={isOpen} onClick={() => setIsOpen(!isOpen)} />

        <div style={{
          width: isOpen ? "30%" : "0%",
          transition: "width 0.4s",
          height: `calc(100vh - ${NavBarHeight}px)`,
        }}>
          <div ref={ref} className="h-full w-full overflow-auto">
            {/* SideBarContent is rendered here via a portal */}
          </div>
        </div>

        <div style={{
          width: isOpen ? "70%" : "100%",
          transition: "width 0.4s",
          height: `calc(100vh - ${NavBarHeight}px)`,
        }}>
          {/* Main content is rendered here */}
          {children}
        </div>

      </SideBarContext.Provider>
    </div>
  )
}