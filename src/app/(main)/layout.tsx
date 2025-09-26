import { ReactNode } from 'react'

import Navigation from '@/components/Navigation'

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header>
        <Navigation />
      </header>
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}