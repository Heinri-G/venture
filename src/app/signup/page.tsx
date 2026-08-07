import Link from 'next/link';
import { signup } from '@/app/auth/actions';
import { MapPin, UserPlus } from 'lucide-react';

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ message: string }>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2 relative min-h-screen map-container bg-gradient-to-br from-teal-400 via-emerald-500 to-green-600">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1506905925206-38d5db305b38?q=80&w=2940&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay opacity-40"></div>
      
      <div className="z-10 flex flex-col items-center justify-center mb-8 animate-fade-in">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4 text-emerald-600">
          <MapPin size={32} strokeWidth={2.5} />
        </div>
        <h1 className="text-4xl font-bold text-white tracking-tight">Join Venture</h1>
        <p className="text-white/80 mt-2 text-center">Start exploring the world.</p>
      </div>

      <form className="animate-slide-up flex-1 flex flex-col w-full justify-center gap-2 text-foreground z-10">
        <div className="glass rounded-3xl p-6 shadow-xl flex flex-col gap-4 border border-white/20">
          <h2 className="text-2xl font-semibold mb-2">Create an account</h2>
          
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground/80" htmlFor="name">
              Full Name
            </label>
            <input
              className="rounded-xl px-4 py-3 bg-white/50 border border-white/40 placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-base"
              name="name"
              placeholder="Jane Doe"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground/80" htmlFor="email">
              Email
            </label>
            <input
              className="rounded-xl px-4 py-3 bg-white/50 border border-white/40 placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-base"
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
              className="rounded-xl px-4 py-3 bg-white/50 border border-white/40 placeholder-foreground/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-base"
              type="password"
              name="password"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {resolvedSearchParams?.message && (
            <p className="mt-2 p-3 bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl text-center text-sm font-medium">
              {resolvedSearchParams.message}
            </p>
          )}

          <button
            formAction={signup}
            className="mt-4 bg-emerald-600 text-white rounded-xl px-4 py-3 text-lg font-semibold hover:bg-emerald-700 transition-base flex items-center justify-center gap-2 shadow-md shadow-emerald-500/30"
          >
            Sign Up <UserPlus size={20} />
          </button>
          
          <div className="mt-4 text-center text-sm text-foreground/70">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-emerald-700 hover:underline transition-base">
              Sign in
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
