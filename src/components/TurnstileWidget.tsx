import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: Record<string, unknown>,
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

type TurnstileWidgetProps = {
  onVerify: (token: string) => void;
  onExpire: () => void;
  onError: () => void;
  resetSignal?: number;
  className?: string;
};

const TURNSTILE_SCRIPT_ID = "cloudflare-turnstile-script";
const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

const TurnstileWidget = ({
  onVerify,
  onExpire,
  onError,
  resetSignal = 0,
  className,
}: TurnstileWidgetProps) => {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const verifyRef = useRef(onVerify);
  const expireRef = useRef(onExpire);
  const errorRef = useRef(onError);
  const [renderError, setRenderError] = useState<string | null>(null);

  verifyRef.current = onVerify;
  expireRef.current = onExpire;
  errorRef.current = onError;

  useEffect(() => {
    if (!siteKey || !containerRef.current) {
      return;
    }

    let cancelled = false;
    const renderWidget = () => {
      if (cancelled || !containerRef.current || !window.turnstile || widgetIdRef.current) {
        return;
      }

      setRenderError(null);
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: "light",
        callback: (token: string) => {
          verifyRef.current(token);
        },
        "expired-callback": () => {
          expireRef.current();
        },
        "error-callback": () => {
          setRenderError("The security check could not load. Refresh and try again.");
          errorRef.current();
        },
      });
    };

    const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = TURNSTILE_SCRIPT_ID;
      script.src = TURNSTILE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = renderWidget;
      script.onerror = () => {
        setRenderError("The security check could not load. Refresh and try again.");
        errorRef.current();
      };
      document.head.appendChild(script);
    } else if (window.turnstile) {
      renderWidget();
    } else {
      existingScript.addEventListener("load", renderWidget);
      existingScript.addEventListener("error", () => {
        setRenderError("The security check could not load. Refresh and try again.");
        errorRef.current();
      });
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  useEffect(() => {
    if (resetSignal > 0 && widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
  }, [resetSignal]);

  if (!siteKey) {
    return (
      <div className={cn("rounded-2xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive", className)}>
        Security check unavailable. Add `VITE_TURNSTILE_SITE_KEY` to enable protected submissions.
      </div>
    );
  }

  return (
    <div className={className}>
      <div ref={containerRef} />
      {renderError ? (
        <p className="mt-2 text-xs text-destructive">{renderError}</p>
      ) : null}
    </div>
  );
};

export default TurnstileWidget;
