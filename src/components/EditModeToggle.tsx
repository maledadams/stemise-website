import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { PencilRuler, X } from "lucide-react";
import { useAdminAuth } from "@/components/AdminAuthProvider";

const EditModeToggle = () => {
  const location = useLocation();
  const { isAuthenticated, rememberReturnPath, getRememberedReturnPath } = useAdminAuth();

  const isAdminRoute = location.pathname === "/admin";

  useEffect(() => {
    if (!isAdminRoute) {
      rememberReturnPath(`${location.pathname}${location.search}${location.hash}`);
    }
  }, [isAdminRoute, location.hash, location.pathname, location.search, rememberReturnPath]);

  if (!isAuthenticated) {
    return null;
  }

  const destination = isAdminRoute ? getRememberedReturnPath() : "/admin";
  const label = isAdminRoute ? "Exit edit mode" : "Edit mode";
  const Icon = isAdminRoute ? X : PencilRuler;

  return (
    <Link
      to={destination}
      className="fixed bottom-6 right-6 z-[70] inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-white px-5 py-3 text-sm font-semibold text-foreground transition-transform duration-200 hover:-translate-y-0.5"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
};

export default EditModeToggle;
