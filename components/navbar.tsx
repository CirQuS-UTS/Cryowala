"use client";

import Link from "next/link";
import { usePathname } from 'next/navigation'

const links = [
    { href: "/", label: "Home" },
    { href: "/fridge/configure/", label: "Configure Fridge" },
    { href: "/fridge/graph/", label: "View Graphs & Analytics" },
    { href: "/calculate/sweep/", label: "Sweep Data" },
];

interface NavButtonProps {
    href: string;
    label: string;
    active: boolean;
}
function NavButton({ href, label, active }: NavButtonProps) {
    const classes = "text-center block py-2 px-4";
    const activeClasses = active ?
        "bg-gray-100 text-gray-700" :
        "bg-gray-700 text-gray-100 hover:bg-gray-900";
    return (
        <li className="float-left">
            <Link href={href} className={[classes, activeClasses].join(" ")}>
                {label}
            </Link>
        </li>
    );
}

export const NavBarHeight = 40; // Measured in pixels
export default function NavBar() {
    const pathname = usePathname()
    return (
        <div id="navbar">
            <ul className="m-0 p-0 text-gray-100 bg-gray-700 list-none overflow-hidden border-b-2 border-gray-900" style={{ height: NavBarHeight }}>
                {links.map(({ href, label }) => (
                    <NavButton key={href}
                        href={href}
                        label={label}
                        active={pathname === href}
                    />
                ))}
            </ul>
        </div>
    )
}