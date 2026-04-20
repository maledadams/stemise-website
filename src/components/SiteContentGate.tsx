import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasWarmSiteContent, useAllSiteContentQuery } from "@/lib/site-content";
import { isSupabaseConfigured } from "@/lib/supabase";

const LOCAL_DEV_EDIT_MODE = import.meta.env.DEV;

const SiteContentGate = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const warmContentExists = useMemo(() => hasWarmSiteContent(), []);
  const isAdminRoute = location.pathname.startsWith("/admin");
  const shouldGate = !LOCAL_DEV_EDIT_MODE && isSupabaseConfigured && !warmContentExists && !isAdminRoute;
  const { isLoading, isFetching, error, refetch } = useAllSiteContentQuery();

  if (!shouldGate) {
    return <>{children}</>;
  }

  if (isLoading || isFetching) {
    return (
      <div className="min-h-screen bg-background">
        <main className="flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-xl rounded-[2rem] border-2 border-foreground bg-white px-8 py-10 text-center">
            <div className="inline-flex rounded-full border-2 border-foreground bg-[#fff4a8] px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-foreground">
              STEMise
            </div>
            <h1 className="mt-6 text-4xl font-semibold text-foreground">Loading live site content.</h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Pulling the latest content from Supabase so visitors do not see stale or empty data.
            </p>
            <div className="mt-8 inline-flex items-center gap-3 rounded-full border-2 border-foreground bg-secondary px-5 py-3 text-sm font-medium text-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading content...
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <main className="flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-xl rounded-[2rem] border-2 border-foreground bg-white px-8 py-10 text-center">
            <div className="inline-flex rounded-full border-2 border-foreground bg-[#fff4a8] px-5 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-foreground">
              STEMise
            </div>
            <h1 className="mt-6 text-4xl font-semibold text-foreground">We could not load the live content yet.</h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              This page is waiting for the latest Supabase JSON. Retry the request instead of showing an empty page.
            </p>
            <Button type="button" onClick={() => void refetch()} className="mt-8">
              <RefreshCcw className="h-4 w-4" />
              Retry loading
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return <>{children}</>;
};

export default SiteContentGate;
