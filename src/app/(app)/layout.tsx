import { redirect } from "next/navigation"
import Link from "next/link"
import { LogOut, Search, Settings } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createServerSupabaseClient } from "@/lib/supabase/server"

function NavLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
        href === "/leads" ? "bg-muted text-foreground" : ""
      )}
    >
      {icon}
      <span>{label}</span>
    </Link>
  )
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  return (
    <div className="min-h-screen bg-background bg-mesh text-foreground">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[260px_1fr]">
        <aside className="glass-panel rounded-xl flex flex-col md:sticky md:top-6 md:h-[calc(100vh-48px)] p-5">
          <div className="mb-6 px-2">
            <div className="text-lg font-bold tracking-tight glow-text flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              FoodLead Engine
            </div>
            <div className="text-xs text-muted-foreground mt-1">Providence Studio Web</div>
          </div>

          <nav className="space-y-1">
            <NavLink href="/leads" label="Lead" icon={<Search className="h-4 w-4" />} />
            <NavLink href="/settings" label="Settings" icon={<Settings className="h-4 w-4" />} />
          </nav>

          <div className="mt-auto pt-6">
            <div className="rounded-lg border border-white/5 bg-white/5 p-3 mb-3">
              <div className="text-xs font-medium text-muted-foreground mb-1">Account</div>
              <div className="truncate text-sm font-medium">{user.email}</div>
            </div>

            <form action="/api/auth/logout" method="post">
              <Button type="submit" variant="outline" className="w-full justify-start border-white/10 bg-transparent hover:bg-white/10 transition-colors">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </form>
          </div>
        </aside>

        <main className="glass-panel rounded-xl p-4 md:p-8 overflow-hidden">{children}</main>
      </div>
    </div>
  )
}
