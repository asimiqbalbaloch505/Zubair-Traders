import { createClient } from '@supabase/supabase-js';

// Replace these placeholders directly with your exact Supabase credentials to test:
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wwjbsgyavygrlgbifynp.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ACTUAL_ANON_KEY_HERE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);