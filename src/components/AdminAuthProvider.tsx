import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getActiveSupabaseSession, supabase } from "@/lib/supabase";

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
  const [isLoading, setIsLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    let syncRunId = 0;

    const syncSession = async (nextSession: Session | null) => {
      const runId = ++syncRunId;

      if (!nextSession) {
        if (!cancelled) {
          setSession(null);
          setIsAdmin(false);
          setIsLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setSession(nextSession);
        setIsLoading(true);
      }

      try {
        const { data: nextIsAdmin, error } = await supabase.rpc("current_user_is_admin");
        if (cancelled || runId !== syncRunId) {
          return;
        }

        if (error) {
          setSession(nextSession);
          setIsAdmin(false);
          setIsLoading(false);
          return;
        }

        setSession(nextSession);
        setIsAdmin(Boolean(nextIsAdmin));
        setIsLoading(false);
      } catch {
        if (!cancelled && runId === syncRunId) {
          setSession(nextSession);
          setIsAdmin(false);
          setIsLoading(false);
        }
      }
    };

    const bootstrapSession = async () => {
      setIsLoading(true);

      try {
        const nextSession = await getActiveSupabaseSession();
        await syncSession(nextSession);
      } catch {
        if (!cancelled) {
          setSession(null);
          setIsAdmin(false);
          setIsLoading(false);
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

      void Promise.resolve().then(() => syncSession(nextSession ?? null));
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
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
