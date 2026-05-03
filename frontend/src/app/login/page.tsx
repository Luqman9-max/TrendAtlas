'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmail, signUpWithEmail, signInWithGitHub } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
        setSuccess('Account created! Check your email to confirm, then sign in.');
        setIsSignUp(false);
      } else {
        await signInWithEmail(email, password);
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGitHub = async () => {
    setError(null);
    try {
      await signInWithGitHub();
    } catch (err: any) {
      setError(err.message || 'GitHub sign-in failed');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 pb-24 md:pb-0">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold gradient-text mb-2">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-text-muted text-sm">
            {isSignUp ? 'Join TrendAtlas to save and track trends' : 'Sign in to access your watchlist'}
          </p>
        </div>

        <div className="glass-card p-6">
          {/* GitHub OAuth */}
          <button
            onClick={handleGitHub}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-hover border border-border rounded-lg text-sm font-medium hover:border-text-dim transition-all mb-4"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            Continue with GitHub
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-text-dim">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-sm text-foreground placeholder:text-text-dim focus:outline-none focus:border-accent/50 transition-all"
            />
            <input
              type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
              className="w-full px-4 py-2.5 bg-surface border border-border rounded-lg text-sm text-foreground placeholder:text-text-dim focus:outline-none focus:border-accent/50 transition-all"
            />
            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 bg-accent text-background font-medium rounded-lg text-sm hover:bg-accent-hover disabled:opacity-50 transition-all"
            >
              {loading ? '...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          {error && <p className="mt-3 text-xs text-danger text-center">{error}</p>}
          {success && <p className="mt-3 text-xs text-success text-center">{success}</p>}

          <p className="mt-4 text-center text-xs text-text-dim">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button onClick={() => { setIsSignUp(!isSignUp); setError(null); setSuccess(null); }} className="text-accent hover:text-accent-hover">
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
