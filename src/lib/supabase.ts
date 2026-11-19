import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Never silently connect a preview build to the live Production database.
// Each deployment must explicitly supply its project URL and publishable key.
export type BiddWorldMode = 'preview' | 'test' | 'live';
const requestedMode = (import.meta.env.VITE_BIDDWORLD_MODE || 'preview').trim().toLowerCase();
export const appMode: BiddWorldMode =
  requestedMode === 'test' || requestedMode === 'live' ? requestedMode : 'preview';

const projectUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const publishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ''
).trim();

const PRODUCTION_PROJECT_REF = 'hbqatszyzqobgtauyuzy';
let projectRef = '';
try {
  projectRef = projectUrl ? new URL(projectUrl).hostname.split('.')[0] : '';
} catch {
  projectRef = '';
}

export const configurationError = !projectUrl || !publishableKey
  ? 'Supabase is not configured. Add the URL and public publishable key for the selected environment.'
  : !projectUrl.startsWith('https://') || !projectUrl.includes('.supabase.co')
    ? 'The Supabase URL is invalid. Use the HTTPS project URL from Supabase settings.'
    : appMode === 'test' && projectRef === PRODUCTION_PROJECT_REF
      ? 'Safety block: Test Mode cannot connect to BiddWorld-Production. Configure a separate test Supabase project.'
      : appMode === 'live' && projectRef !== PRODUCTION_PROJECT_REF
        ? 'Safety block: Live Mode must use the approved BiddWorld-Production project.'
        : '';

export const configured = !configurationError;

export const supabase: SupabaseClient | null = configured
  ? createClient(projectUrl, publishableKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;
