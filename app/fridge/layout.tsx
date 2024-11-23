import { WithWiringDiagram } from '@/components/wiremap/wrapper'

export default function FridgeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <WithWiringDiagram mainContextPercent={0.65}>
      {children}
    </WithWiringDiagram>
  )
}
