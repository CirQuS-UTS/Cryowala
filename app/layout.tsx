import type { Metadata } from 'next'
import { FridgeProvider } from '@/components/config/context'
import './globals.css'
import NavBar from "@/components/navbar";
import { PythonRuntimeProvider } from '@/lib/pythonrt';
import { FeatureFlagProvider } from '@/components/config/featureFlagContext';

export const metadata: Metadata = {
  title: 'Create Next App',
  description: 'Generated by create next app',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <PythonRuntimeProvider>
          <FeatureFlagProvider>
            <FridgeProvider>
              <NavBar />
              {children}
            </FridgeProvider>
          </FeatureFlagProvider>
        </PythonRuntimeProvider>
      </body>
    </html>
  )
}
