import { NavLink, Outlet } from 'react-router-dom'
import Button from '../components/ui/Button'
import { useAuth } from '../lib/auth'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'text-[0.7rem] uppercase tracking-[0.35em] transition duration-150',
    isActive ? 'text-accent' : 'text-muted hover:text-ink'
  ].join(' ')

export default function Layout() {
  const { session, signOut } = useAuth()

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[980px] flex-col px-6 pb-16 pt-12">
        <header className="flex flex-wrap items-center justify-between gap-6">
          <div className="space-y-2">
            <p className="type-eyebrow">Mirror Archive</p>
            <h1 className="type-title text-2xl">Slow style archive</h1>
          </div>
          <nav className="flex flex-wrap items-center gap-6">
            <NavLink to="/" className={navLinkClass}>
              Home
            </NavLink>
            <NavLink to="/new" className={navLinkClass}>
              New
            </NavLink>
            {session ? (
              <Button variant="ghost" size="sm" onClick={() => void signOut()}>
                Logout
              </Button>
            ) : null}
          </nav>
        </header>
        <main className="mt-12 flex-1">
          <Outlet />
        </main>
        <footer className="mt-16 flex flex-wrap items-center justify-between gap-4 text-xs uppercase tracking-[0.25em] text-muted">
          <span>Mirror Archive Studio</span>
          <span>Slow archive for calm outfits</span>
        </footer>
      </div>
    </div>
  )
}
