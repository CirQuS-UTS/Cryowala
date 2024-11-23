import SideBar from '@/components/sideBar'

export default function FridgeLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <SideBar>
            {children}
        </SideBar>
    )
}