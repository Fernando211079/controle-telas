import { createClient } from '@supabase/supabase-js';
import { createVerdentAuth } from '@verdent/auth-js';

const url = process.env.SUPABASE_URL || window.location.origin;
const key = process.env.SUPABASE_ANON_KEY || 'verdent-baas-proxy';

const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

const auth = createVerdentAuth({ supabase });
window.__INDEMETAL_SUPA__ = { supabase, auth };
