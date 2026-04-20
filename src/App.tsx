import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import ScrollToHash from "@/components/ScrollToHash";
import PageLoader from "@/components/PageLoader";
import PageTransition from "@/components/PageTransition";
import ScrollEffects from "@/components/ScrollEffects";
import { AdminAuthProvider } from "@/components/AdminAuthProvider";
import EditModeToggle from "@/components/EditModeToggle";
import SiteContentGate from "@/components/SiteContentGate";

const Index = lazy(() => import("./pages/Index"));
const Events = lazy(() => import("./pages/Events"));
const About = lazy(() => import("./pages/About"));
const GetInvolved = lazy(() => import("./pages/GetInvolved"));
const Courses = lazy(() => import("./pages/Courses"));
const CurriculumAgeGroup = lazy(() => import("./pages/CurriculumAgeGroup"));
const CurriculumDetail = lazy(() => import("./pages/CurriculumDetail"));
const Kits = lazy(() => import("./pages/Kits"));
const Contact = lazy(() => import("./pages/Contact"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AdminAuthProvider>
          <PageLoader />
          <ScrollToHash />
          <ScrollEffects />
          <SiteContentGate>
            <Suspense fallback={<div className="min-h-screen bg-background" />}>
              <PageTransition>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/events" element={<Events />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/get-involved" element={<GetInvolved />} />
                  <Route path="/curriculum" element={<Courses />} />
                  <Route path="/curriculum/age/:ageGroup" element={<CurriculumAgeGroup />} />
                  <Route path="/curriculum/:slug" element={<CurriculumDetail />} />
                  <Route path="/kits" element={<Kits />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/admin" element={<Admin />} />

                  <Route path="/team" element={<Navigate to="/about" replace />} />
                  <Route path="/partners" element={<Navigate to="/get-involved" replace />} />
                  <Route path="/donations" element={<Navigate to="/get-involved" replace />} />
                  <Route path="/courses" element={<Navigate to="/curriculum" replace />} />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </PageTransition>
            </Suspense>
          </SiteContentGate>
          <EditModeToggle />
        </AdminAuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
