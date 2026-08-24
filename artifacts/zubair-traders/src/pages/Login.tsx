import React, { useState } from 'react';
import { Lock, User, Loader2, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: () => void;
  // Replace 'any' with your actual supabase client import if configured
  supabaseClient: any;
}

export function Login({ onLoginSuccess, supabaseClient }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Query Supabase for matching user credentials
      const { data, error: dbError } = await supabaseClient
        .from('app_users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

      if (dbError || !data) {
        setError('Invalid username or password.');
      } else {
        onLoginSuccess();
      }
    } catch (err: any) {
      setError('Connection failed. Please check network/Supabase config.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card border border-border p-8 rounded-2xl shadow-xl">
        <div className="text-center mb-6">
          <img
            src="/gemini-svg.svg"
            alt="Logo"
            className="h-16 w-16 mx-auto mb-3 object-contain"
          />
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Account Sign In
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Enter credentials to access Zubair Traders
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Username
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-3 text-muted-foreground" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm font-medium text-foreground outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">
              Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-3 text-muted-foreground" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm font-medium text-foreground outline-none focus:border-primary"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs shadow hover:opacity-90 disabled:opacity-50 transition"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}