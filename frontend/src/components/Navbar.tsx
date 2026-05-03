'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { signOut } from '@/lib/auth';

const navLinks = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/analytics', label: 'Analytics', icon: '📈' },
  { href: '/compare', label: 'Compare', icon: '⚖️' },
  { href: '/watchlist', label: 'Watchlist', icon: '⭐' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <>
      {/* Desktop Nav */}
      <nav className="hidden md:flex items-center justify-between px-6 py-4 border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold gradient-text">TrendAtlas</span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-accent-muted text-accent border border-accent/30">BETA</span>
        </Link>

        <div className="flex items-center gap-1">
          {navLinks.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                pathname === href
                  ? 'bg-accent-muted text-accent'
                  : 'text-text-muted hover:text-foreground hover:bg-surface-hover'
              }`}
            >
              <span className="mr-1.5">{icon}</span>
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-text-dim">
            <span className="w-2 h-2 rounded-full bg-success pulse-dot"></span>
            Live
          </div>
          {!loading && (
            user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted truncate max-w-[120px]">
                  {user.email?.split('@')[0]}
                </span>
                <button
                  onClick={handleSignOut}
                  className="px-3 py-1.5 text-xs text-text-muted hover:text-foreground bg-surface-hover border border-border rounded-lg transition-all"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-4 py-1.5 text-xs font-medium text-accent bg-accent-muted border border-accent/30 rounded-lg hover:bg-accent/20 transition-all"
              >
                Sign In
              </Link>
            )
          )}
        </div>
      </nav>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-md border-t border-border px-2 py-2">
        <div className="flex justify-around">
          {navLinks.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
                pathname === href ? 'text-accent' : 'text-text-muted'
              }`}
            >
              <span className="text-lg">{icon}</span>
              {label}
            </Link>
          ))}
          {!loading && !user && (
            <Link href="/login" className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs text-text-muted">
              <span className="text-lg">👤</span>
              Sign In
            </Link>
          )}
        </div>
      </nav>

      {/* Mobile top header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-surface/80 backdrop-blur-md sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-bold gradient-text">TrendAtlas</span>
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-accent-muted text-accent border border-accent/30">BETA</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-text-dim">
            <span className="w-2 h-2 rounded-full bg-success pulse-dot"></span>
            Live
          </span>
          {!loading && user && (
            <button onClick={handleSignOut} className="text-xs text-text-muted px-2 py-1 bg-surface-hover rounded-md border border-border">
              Sign Out
            </button>
          )}
        </div>
      </div>
    </>
  );
}
