import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Bell, Bookmark, LogOut, Map, MapPin, Menu, Moon, Route, Sun, User, Users, X } from 'lucide-react';
import EdelweissMark from './brand/EdelweissMark';
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
import NotificationsSheet from './NotificationsSheet';
import { useNotifications } from './NotificationsProvider';
import { useAuthUser } from '../lib/useAuthUser';
import { supabase } from '../lib/supabase/client';
import { cn } from '../lib/utils';

const NAV_LINKS = [
  { to: '/', label: 'Home', icon: Map },
  { to: '/map', label: 'Map', icon: MapPin },
  { to: '/saved-places', label: 'Saved', icon: Bookmark },
  { to: '/adventures', label: 'Adventures', icon: Route },
  { to: '/friends', label: 'Friends', icon: Users },
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
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // Logged-out visitors only get the marketing-relevant links (Home + Map);
  // the full app chrome is reserved for signed-in users.
  const navLinks = !loading && user ? NAV_LINKS : NAV_LINKS.filter((l) => l.to === '/' || l.to === '/map');

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip">
      {/* Decorative page background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-meadow [mask-image:linear-gradient(to_bottom,black,transparent_60%)] opacity-40" />
      </div>

      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="group flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/20 ring-1 ring-primary/20 transition-transform duration-300 group-hover:scale-105">
              <EdelweissMark className="size-5" />
            </span>
            <span className="font-heading text-lg font-bold lowercase tracking-wide">Venture</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
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
            {user && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="relative rounded-full"
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                onClick={() => setNotifOpen(true)}
              >
                <Bell className="size-5" />
                {unreadCount > 0 && (
                  <span
                    aria-hidden
                    className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            )}

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
              <>
                <Button asChild size="sm" variant="ghost" className="hidden rounded-full px-4 md:inline-flex">
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm" className="hidden rounded-full px-4 md:inline-flex">
                  <Link to="/signup">Create account</Link>
                </Button>
              </>
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
                  {navLinks.map((link) => (
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
            <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary">
              <EdelweissMark className="size-4" />
            </span>
            Venture — explore &amp; save amazing places
          </p>
          <p>© {new Date().getFullYear()} Venture</p>
        </div>
      </footer>

      <NotificationsSheet open={notifOpen} onOpenChange={setNotifOpen} />
    </div>
  );
}
