import SideBar from '@/components/sideBar'
import { WithPythonRuntime } from '@/lib/pythonrt'

export default function FridgeLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className={'h-[90vh]'}>
            <WithPythonRuntime>
                <SideBar>
                    {children}
                </SideBar>
            </WithPythonRuntime>
        </div>
    )
}