import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SESSION_REFRESH_WINDOW_SECONDS = 90;

const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const isSupabaseConfigured = supabaseConfigured;

const shouldRefreshSession = (session: Session) => {
  if (!session.expires_at) {
    return false;
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  return session.expires_at - nowInSeconds <= SESSION_REFRESH_WINDOW_SECONDS;
};

export const getActiveSupabaseSession = async (): Promise<Session | null> => {
  if (!supabase) {
    return null;
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  if (!session) {
    return null;
  }

  if (!shouldRefreshSession(session)) {
    return session;
  }

  const {
    data: refreshedData,
    error: refreshError,
  } = await supabase.auth.refreshSession();

  if (refreshError) {
    throw refreshError;
  }

  return refreshedData.session;
};

export const ensureActiveSupabaseSession = async (): Promise<Session> => {
  const session = await getActiveSupabaseSession();

  if (!session?.access_token) {
    throw new Error('Your admin session expired. Open the latest magic link and sign in again.');
  }

  return session;
};
