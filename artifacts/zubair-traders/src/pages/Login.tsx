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
    <div className="relative min-h-screen w-full flex items-center justify-center px-4 overflow-hidden select-none">
      
      {/* BACKGROUND IMAGE & SHADE OVERLAY */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none z-0"
        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&w=1920&q=80')` }}
      >
        {/* Dark Tint Overlay to ensure readability */}
        <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />
      </div>

      {/* LOGIN CARD */}
      <div className="relative z-10 w-full max-w-md bg-white/90 backdrop-blur-md border border-white/50 p-8 rounded-2xl shadow-2xl">
        <div className="text-center mb-6">
          <img
            src="/gemini-svg.svg"
            alt="Logo"
            className="h-16 w-16 mx-auto mb-3 object-contain drop-shadow-sm"
          />
          <h2 className="text-2xl font-black tracking-tight text-slate-950">
            Account Sign In
          </h2>
          <p className="text-xs font-semibold text-slate-600 mt-1">
            Enter credentials to access Zubair Traders
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-600 font-medium">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Username
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm font-medium text-slate-900 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md active:scale-95 disabled:opacity-50 transition"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Sign In'}
          </button>
        </form>
      </div>

    </div>
  );
}