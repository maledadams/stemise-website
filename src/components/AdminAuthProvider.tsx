import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getActiveSupabaseSession, supabase } from "@/lib/supabase";

const ADMIN_RETURN_TO_KEY = "stemise:admin:return_to";
const DEV_ADMIN_BYPASS = import.meta.env.DEV;

type AdminAuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  rememberReturnPath: (path: string) => void;
  getRememberedReturnPath: () => string;
};

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

export const getRememberedAdminReturnPath = () => {
  if (typeof window === "undefined") return "/";
  return window.sessionStorage.getItem(ADMIN_RETURN_TO_KEY) || "/";
};

const rememberAdminReturnPath = (path: string) => {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(ADMIN_RETURN_TO_KEY, path || "/");
};

export const clearStoredAdminSessionState = () => {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(ADMIN_RETURN_TO_KEY);
};

export const AdminAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(DEV_ADMIN_BYPASS || !supabase);
  const [isAdminLoading, setIsAdminLoading] = useState(false);

  useEffect(() => {
    if (DEV_ADMIN_BYPASS) {
      setSession({} as Session);
      setIsAdmin(true);
      setIsAuthReady(true);
      setIsAdminLoading(false);
      return;
    }

    if (!supabase) {
      setIsAuthReady(true);
      return;
    }

    let cancelled = false;

    const bootstrapSession = async () => {
      try {
        await supabase.auth.initialize();
        const nextSession = await getActiveSupabaseSession();
        if (!cancelled) {
          setSession(nextSession);
        }
      } catch {
        if (!cancelled) {
          setSession(null);
        }
      } finally {
        if (!cancelled) {
          setIsAuthReady(true);
        }
      }
    };

    void bootstrapSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "SIGNED_OUT") {
        clearStoredAdminSessionState();
      }

      if (!cancelled) {
        setSession(nextSession ?? null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (DEV_ADMIN_BYPASS) {
      setIsAdmin(true);
      setIsAdminLoading(false);
      return;
    }

    if (!supabase || !isAuthReady) {
      return;
    }

    if (!session) {
      setIsAdmin(false);
      setIsAdminLoading(false);
      return;
    }

    let cancelled = false;

    const verifyAdminAccess = async () => {
      setIsAdminLoading(true);

      try {
        const { data: nextIsAdmin, error } = await supabase.rpc("current_user_is_admin");

        if (cancelled) {
          return;
        }

        if (error) {
          setIsAdmin(false);
          return;
        }

        setIsAdmin(Boolean(nextIsAdmin));
      } catch {
        if (!cancelled) {
          setIsAdmin(false);
        }
      } finally {
        if (!cancelled) {
          setIsAdminLoading(false);
        }
      }
    };

    void verifyAdminAccess();

    return () => {
      cancelled = true;
    };
  }, [isAuthReady, session]);

  const resolvedSession = DEV_ADMIN_BYPASS ? ({} as Session) : session;
  const resolvedIsAdmin = DEV_ADMIN_BYPASS ? true : isAdmin;
  const isLoading = DEV_ADMIN_BYPASS ? false : !isAuthReady || isAdminLoading;

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      session: resolvedSession,
      isLoading,
      isAdmin: resolvedIsAdmin,
      isAuthenticated: DEV_ADMIN_BYPASS || Boolean(resolvedSession && resolvedIsAdmin),
      rememberReturnPath: rememberAdminReturnPath,
      getRememberedReturnPath: getRememberedAdminReturnPath,
    }),
    [isLoading, resolvedIsAdmin, resolvedSession],
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
