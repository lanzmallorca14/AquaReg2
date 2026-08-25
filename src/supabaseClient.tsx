import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// Note: Usually VITE_SUPABASE_ANON_KEY and your publishable key are the same thing. 
// Make sure you pass the Anon/Publishable key as the second argument.
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,       // Ensures session is saved to local storage
    autoRefreshToken: true,     // Allows client to automatically refresh expired JWTs
    detectSessionInUrl: true    // Handles OAuth/Magic Link redirect tokens automatically
  }
});