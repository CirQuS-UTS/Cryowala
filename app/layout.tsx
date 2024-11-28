import type { Metadata } from 'next'
import { FridgeProvider } from '@/components/config/context'
import './globals.css'
import NavBar from "@/components/navbar";
import { PythonRuntimeProvider } from '@/lib/pythonrt';
import { FeatureFlagProvider } from '@/components/config/featureFlagContext';

import '@mantine/core/styles.css';
import { ColorSchemeScript, MantineProvider as BaseMantineProvider } from '@mantine/core';
import { PropsWithChildren } from 'react';

export const metadata: Metadata = {
  title: 'Cryowala',
  description: 'Cryowala is a modelling tool for simulating heat and noise propagation in cryogenic wiring used in dilution refrigerators. It is still under-development, and uses an open-source python backend.',
}

function MantineProvider({ children }: PropsWithChildren) {
  return (
    <BaseMantineProvider forceColorScheme='light'>
      {children}
    </BaseMantineProvider>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <ColorSchemeScript defaultColorScheme='light' />
      </head>
      <body>
        <WrapWithProviders providers={[PythonRuntimeProvider, FeatureFlagProvider, FridgeProvider, MantineProvider]}>
          <NavBar />
          {children}
        </WrapWithProviders>
      </body>
    </html>
  )
}

interface WrapWithProvidersProps {
  providers: React.ComponentType<PropsWithChildren>[]
}
function WrapWithProviders({ children, providers }: PropsWithChildren<WrapWithProvidersProps>) {
  return providers.toReversed().reduce((acc, Provider) => <Provider>{acc}</Provider>, children)
}