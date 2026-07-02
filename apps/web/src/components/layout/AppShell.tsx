import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { CommandPalette } from './CommandPalette'
import { Footer } from './Footer'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

const MAX_RECENTS = 5

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [recentPaths, setRecentPaths] = useState<string[]>([])
  const location = useLocation()

  // Só em memória, sem persistência — reseta a cada carregamento de página.
  useEffect(() => {
    setRecentPaths((current) => {
      const withoutCurrent = current.filter((path) => path !== location.pathname)
      return [location.pathname, ...withoutCurrent].slice(0, MAX_RECENTS)
    })
  }, [location.pathname])

  return (
    <div className="flex min-h-svh bg-light-bg dark:bg-dark-bg">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((current) => !current)}
        onOpenSearch={() => setSearchOpen(true)}
        recentPaths={recentPaths}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header onOpenSearch={() => setSearchOpen(true)} />
        <main className="flex-1 px-6 py-8">
          <Outlet />
        </main>
        <Footer />
      </div>
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  )
}
