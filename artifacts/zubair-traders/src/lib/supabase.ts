import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wwjbsgyavygrlgbifynp.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_3zTEu4ZwQqv4cFlpOtB5EQ_IyP9RRpF
';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);