import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Bookmark, Compass, LogOut, Map, MapPin, Menu, Moon, Route, Sun, User, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from './ui/sheet';
import { Skeleton } from './ui/skeleton';
import { useAuthUser } from '../lib/useAuthUser';
import { supabase } from '../lib/supabase/client';
import { cn } from '../lib/utils';

const NAV_LINKS = [
  { to: '/', label: 'Home', icon: Map },
  { to: '/map', label: 'Map', icon: MapPin },
  { to: '/saved-places', label: 'Saved', icon: Bookmark },
  { to: '/adventures', label: 'Adventures', icon: Route },
];

function getInitials(user: { email?: string; user_metadata?: Record<string, unknown> }): string {
  const name = (user.user_metadata?.full_name as string) || user.email || 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length > 1) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthUser();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip">
      {/* Decorative page background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-grid [mask-image:linear-gradient(to_bottom,black,transparent_60%)] opacity-60" />
        <div className="absolute -top-32 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -left-40 top-1/3 h-96 w-96 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="absolute -right-40 top-2/3 h-96 w-96 rounded-full bg-violet-400/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="group flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-600 text-primary-foreground shadow-lg shadow-primary/25 transition-transform duration-300 group-hover:scale-105">
              <Compass className="size-5" />
            </span>
            <span className="font-heading text-lg font-bold tracking-tight">Venture</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )
                }
              >
                <link.icon className="size-4" />
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />

            {loading ? (
              <Skeleton className="hidden h-9 w-20 md:block" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Account menu"
                  className="hidden size-9 cursor-pointer items-center justify-center rounded-full outline-none transition-opacity hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/50 md:flex"
                >
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">{getInitials(user)}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel className="truncate">
                    {(user.user_metadata?.full_name as string) || user.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => navigate('/profile')}>
                    <User />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={handleSignOut} className="text-destructive focus:text-destructive">
                    <LogOut />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm" className="hidden rounded-full px-4 md:inline-flex">
                <Link to="/login">Sign in</Link>
              </Button>
            )}

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 md:hidden"
                  aria-label="Open menu"
                >
                  {mobileOpen ? <X /> : <Menu />}
                </button>
              </SheetTrigger>
              <SheetContent side="right" showCloseButton={false} className="w-72 gap-0 p-0">
                <SheetTitle className="px-5 pt-5 text-base font-semibold">Menu</SheetTitle>
                <nav className="flex flex-col gap-1 p-3">
                  {NAV_LINKS.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.to === '/'}
                      onClick={() => setMobileOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )
                      }
                    >
                      <link.icon className="size-4" />
                      {link.label}
                    </NavLink>
                  ))}
                </nav>
                <div className="mt-auto flex flex-col gap-2 border-t p-4">
                  {user ? (
                    <>
                      <div className="flex items-center gap-2.5">
                        <Avatar>
                          <AvatarFallback className="bg-primary/10 text-primary">{getInitials(user)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {(user.user_metadata?.full_name as string) || user.email}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <Button variant="outline" className="rounded-full" onClick={() => { setMobileOpen(false); navigate('/profile'); }}>
                        <User /> Profile
                      </Button>
                      <Button variant="ghost" className="rounded-full text-destructive" onClick={handleSignOut}>
                        <LogOut /> Sign out
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button asChild className="rounded-full">
                        <Link to="/login" onClick={() => setMobileOpen(false)}>Sign in</Link>
                      </Button>
                      <Button asChild variant="outline" className="rounded-full">
                        <Link to="/signup" onClick={() => setMobileOpen(false)}>Create account</Link>
                      </Button>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-20 border-t border-border/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <p className="flex items-center gap-1.5">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
              <MapPin className="size-3.5" />
            </span>
            Venture — explore &amp; save amazing places
          </p>
          <p>© {new Date().getFullYear()} Venture</p>
        </div>
      </footer>
    </div>
  );
}
