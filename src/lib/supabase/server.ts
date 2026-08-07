// Server-side Supabase utilities for Netlify Functions
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createClient() {
  const url = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !serviceKey) throw new Error('Server Supabase env vars missing');
  return createSupabaseClient(url, serviceKey);
}
