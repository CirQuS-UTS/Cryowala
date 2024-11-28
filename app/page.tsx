"use client"

import { useFridge } from "@/components/config/context";
import Link from "next/link"
import { PropsWithChildren } from "react";
import largeLogo from "@/public/logo.png";
import Image from "next/image";

const links = [
  { href: "/fridge/configure", label: "Configure Fridge" },
  { href: "/fridge/graph", label: "View Graphs & Analytics" },
  { href: "/calculate/sweep/", label: "Sweep Data" },
];

function Button({ children, className, ...props }: PropsWithChildren<JSX.IntrinsicElements["button"]>) {
  return (
    <button className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ${className}`} {...props}>
      {children}
    </button>
  );
}

export default function Home() {
  const { reset, save } = useFridge();
  const cleanState = () => { reset(); save(); };

  return (
    <main className="flex min-h-screen flex-row flex-wrap items-center justify-between p-24 max-w-4xl mx-auto">
      <Image src={largeLogo} alt="Fridge Logo" />

      {links.map(({ href, label }) => (
        <Button key={href}>
          <Link href={href}>{label}</Link>
        </Button>
      ))}
      <Button onClick={cleanState} style={{ backgroundColor: "#ff6b6b" }}>Reset All Data</Button>
    </main>
  )
}
