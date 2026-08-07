import Link from 'next/link';
import { login } from '@/app/auth/actions';
import { MapPin, ArrowRight } from 'lucide-react';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2 relative min-h-screen map-container bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1488646953014-c8bf2803b9b9?q=80&w=2938&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay opacity-40"></div>
      
      <div className="z-10 flex flex-col items-center justify-center mb-8 animate-fade-in">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4 text-primary">
          <MapPin size={32} strokeWidth={2.5} />
        </div>
        <h1 className="text-4xl font-bold text-white tracking-tight">Venture</h1>
        <p className="text-white/80 mt-2 text-center">Your personal travel companion.</p>
      </div>

      <form className="animate-slide-up flex-1 flex flex-col w-full justify-center gap-2 text-foreground z-10">
        <div className="glass rounded-3xl p-6 shadow-xl flex flex-col gap-4 border border-white/20">
          <h2 className="text-2xl font-semibold mb-2">Welcome back</h2>
          
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground/80" htmlFor="email">
              Email
            </label>
            <input
              className="rounded-xl px-4 py-3 bg-white/50 border border-white/40 placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-base"
              name="email"
              placeholder="you@example.com"
              required
              type="email"
            />
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground/80" htmlFor="password">
              Password
            </label>
            <input
              className="rounded-xl px-4 py-3 bg-white/50 border border-white/40 placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-base"
              type="password"
              name="password"
              placeholder="••••••••"
              required
            />
          </div>

          {resolvedSearchParams?.message && (
            <p className="mt-2 p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl text-center text-sm font-medium">
              {resolvedSearchParams.message}
            </p>
          )}

          <button
            formAction={login}
            className="mt-4 bg-primary text-white rounded-xl px-4 py-3 text-lg font-semibold hover:bg-primary-dark transition-base flex items-center justify-center gap-2 shadow-md shadow-primary/30"
          >
            Sign In <ArrowRight size={20} />
          </button>
          
          <div className="mt-4 text-center text-sm text-foreground/70">
            Don't have an account?{' '}
            <Link href="/signup" className="font-semibold text-primary hover:underline transition-base">
              Sign up
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
