import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { LogOut, Search, Settings, LayoutGrid, List, Users, Star } from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"
import { createServerSupabaseClient } from "@/lib/supabase/server"

const NAV_ITEMS = [
  { href: "/leads/search",     label: "Ricerca Lead",    icon: Search,      section: "lead" },
  { href: "/leads",            label: "Elenco Lead",     icon: List,        section: "lead" },
  { href: "/leads/board",      label: "Pipeline Board",  icon: LayoutGrid,  section: "lead" },
  { href: "/leads/alta-priorita", label: "Alta Priorità", icon: Star,       section: "lead" },
]

const SYS_ITEMS = [
  { href: "/settings", label: "Impostazioni", icon: Settings },
]

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const initials = (user.email ?? "?").slice(0, 2).toUpperCase()

  return (
    <div className="flex min-h-screen bg-background bg-app-mesh">

      {/* ── SIDEBAR ── */}
      <aside className="sidebar-panel hidden md:flex flex-col w-[240px] shrink-0 min-h-screen sticky top-0">

        {/* Brand */}
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-border shrink-0">
          <Image src="/psw-logo.png" alt="PSW Logo" width={32} height={32} className="shrink-0" />
          <div>
            <div className="text-sm font-bold tracking-tight text-foreground">LeadHub</div>
            <div className="text-[10px] text-muted-foreground">Providence Studio</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">

          <div>
            <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Lead
            </div>
            <ul className="space-y-0.5">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="nav-link group"
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Sistema
            </div>
            <ul className="space-y-0.5">
              {SYS_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="nav-link">
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-border space-y-2 shrink-0">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-xs font-bold">
              {initials}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="truncate text-xs font-medium text-foreground">{user.email}</div>
            </div>
            <ThemeToggle />
          </div>

          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </form>
        </div>
      </aside>

      {/* ── MOBILE TOPBAR ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 sidebar-panel flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Image src="/psw-logo.png" alt="PSW Logo" width={28} height={28} className="shrink-0" />
          <span className="text-sm font-bold">LeadHub</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/leads/search" className="nav-link py-1.5 px-2.5"><Search className="h-4 w-4" /></Link>
          <Link href="/leads/board" className="nav-link py-1.5 px-2.5"><LayoutGrid className="h-4 w-4" /></Link>
          <Link href="/leads" className="nav-link py-1.5 px-2.5"><List className="h-4 w-4" /></Link>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 min-w-0 md:pt-0 pt-14">
        <div className="max-w-[1200px] mx-auto px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>

    </div>
  )
}
