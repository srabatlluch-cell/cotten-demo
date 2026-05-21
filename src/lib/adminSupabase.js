import { createClient } from '@supabase/supabase-js'

// Service-role client — only use for admin operations (user creation).
// VITE_SUPABASE_SERVICE_ROLE_KEY must be set in .env.local.
// In production, move user-creation to a server-side Edge Function.
const serviceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

export const adminSupabase = serviceKey
  ? createClient(import.meta.env.VITE_SUPABASE_URL, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null