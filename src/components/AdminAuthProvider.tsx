import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const ADMIN_SESSION_MAX_AGE_MS = 30 * 60 * 1000;
const ADMIN_SESSION_STARTED_AT_KEY = "stemise:admin:started_at";
const ADMIN_RETURN_TO_KEY = "stemise:admin:return_to";

type AdminAuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  rememberReturnPath: (path: string) => void;
  getRememberedReturnPath: () => string;
};

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

const getStoredSessionStartedAt = () => {
  if (typeof window === "undefined") return null;

  const rawValue = window.localStorage.getItem(ADMIN_SESSION_STARTED_AT_KEY);
  if (!rawValue) return null;

  const timestamp = Number(rawValue);
  return Number.isFinite(timestamp) ? timestamp : null;
};

const storeSessionStartedAt = (timestamp: number) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ADMIN_SESSION_STARTED_AT_KEY, String(timestamp));
};

const clearSessionStartedAt = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ADMIN_SESSION_STARTED_AT_KEY);
};

const isAdminSessionExpired = () => {
  const startedAt = getStoredSessionStartedAt();
  if (!startedAt) return false;

  return Date.now() - startedAt >= ADMIN_SESSION_MAX_AGE_MS;
};

export const getRememberedAdminReturnPath = () => {
  if (typeof window === "undefined") return "/";
  return window.sessionStorage.getItem(ADMIN_RETURN_TO_KEY) || "/";
};

const rememberAdminReturnPath = (path: string) => {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(ADMIN_RETURN_TO_KEY, path || "/");
};

export const AdminAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const syncSession = async (nextSession: Session | null, resetStartedAt = false) => {
      if (!nextSession) {
        clearSessionStartedAt();
        if (!cancelled) {
          setSession(null);
          setIsAdmin(false);
          setIsLoading(false);
        }
        return;
      }

      if (resetStartedAt) {
        storeSessionStartedAt(Date.now());
      } else if (!getStoredSessionStartedAt()) {
        storeSessionStartedAt(Date.now());
      }

      if (isAdminSessionExpired()) {
        await supabase.auth.signOut();
        return;
      }

      const { data: nextIsAdmin, error } = await supabase.rpc("current_user_is_admin");
      if (error) {
        if (!cancelled) {
          setSession(nextSession);
          setIsAdmin(false);
          setIsLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setSession(nextSession);
        setIsAdmin(Boolean(nextIsAdmin));
        setIsLoading(false);
      }
    };

    supabase.auth.getSession().then(async ({ data }) => {
      await syncSession(data.session ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (event === "SIGNED_OUT") {
        clearSessionStartedAt();
      }

      await syncSession(nextSession ?? null, event === "SIGNED_IN");
    });

    const intervalId = window.setInterval(async () => {
      if (!supabase) return;
      if (isAdminSessionExpired()) {
        await supabase.auth.signOut();
      }
    }, 15_000);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.clearInterval(intervalId);
    };
  }, []);

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      session,
      isLoading,
      isAdmin,
      isAuthenticated: Boolean(session && isAdmin),
      rememberReturnPath: rememberAdminReturnPath,
      getRememberedReturnPath: getRememberedAdminReturnPath,
    }),
    [isAdmin, isLoading, session],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);

  if (!context) {
    throw new Error("useAdminAuth must be used inside AdminAuthProvider.");
  }

  return context;
};
