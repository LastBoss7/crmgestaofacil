import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useSalesNotifications } from "@/hooks/useSalesNotifications";
import { AnimatePresence, motion } from "framer-motion";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Sales from "./pages/Sales";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import SaleHistory from "./pages/SaleHistory";
import SellerDetails from "./pages/SellerDetails";
import Teams from "./pages/Teams";
import ChatMonitor from "./pages/ChatMonitor";
import TeamDashboard from "./pages/TeamDashboard";
import SalesMonitorPage from "./pages/SalesMonitorPage";
import OperatorStatus from "./pages/OperatorStatus";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import Feedbacks from "./pages/Feedbacks";
import Onboarding from "./pages/Onboarding";
import BandaLargaReport from "./pages/BandaLargaReport";
import Campaigns from "./pages/Campaigns";
import CampaignRankings from "./pages/CampaignRankings";
import Callbacks from "./pages/Callbacks";
import TeamReport from "./pages/TeamReport";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

// Page transition variants
const pageVariants = {
  initial: { opacity: 0, y: 8 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -8 },
};

const pageTransition = {
  type: "tween" as const,
  ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
  duration: 0.25,
};

// Component to initialize notifications
const NotificationsProvider = ({ children }: { children: React.ReactNode }) => {
  useSalesNotifications();
  return <>{children}</>;
};

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

// Animated page wrapper
const AnimatedPage = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial="initial"
    animate="in"
    exit="out"
    variants={pageVariants}
    transition={pageTransition}
  >
    {children}
  </motion.div>
);

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<AnimatedPage><Index /></AnimatedPage>} />
        <Route path="/auth" element={<AnimatedPage><Auth /></AnimatedPage>} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AnimatedPage><Dashboard /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendas"
          element={
            <ProtectedRoute>
              <AnimatedPage><Sales /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/usuarios"
          element={
            <ProtectedRoute>
              <AnimatedPage><Users /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/relatorios"
          element={
            <ProtectedRoute>
              <AnimatedPage><Reports /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/relatorios/banda-larga"
          element={
            <ProtectedRoute>
              <AnimatedPage><BandaLargaReport /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendas/:saleId/historico"
          element={
            <ProtectedRoute>
              <AnimatedPage><SaleHistory /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendedor/:sellerId"
          element={
            <ProtectedRoute>
              <AnimatedPage><SellerDetails /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/equipes"
          element={
            <ProtectedRoute>
              <AnimatedPage><Teams /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/monitor-chats"
          element={
            <ProtectedRoute>
              <AnimatedPage><ChatMonitor /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/minha-equipe"
          element={
            <ProtectedRoute>
              <AnimatedPage><TeamDashboard /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/configuracoes"
          element={
            <ProtectedRoute>
              <AnimatedPage><Settings /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/monitoramento"
          element={
            <ProtectedRoute>
              <AnimatedPage><SalesMonitorPage /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/pausas"
          element={
            <ProtectedRoute>
              <AnimatedPage><OperatorStatus /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/perfil"
          element={
            <ProtectedRoute>
              <AnimatedPage><Profile /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AnimatedPage><AdminDashboard /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/feedbacks"
          element={
            <ProtectedRoute>
              <AnimatedPage><Feedbacks /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <AnimatedPage><Onboarding /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campanhas"
          element={
            <ProtectedRoute>
              <AnimatedPage><Campaigns /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/rankings"
          element={
            <ProtectedRoute>
              <AnimatedPage><CampaignRankings /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/retornos"
          element={
            <ProtectedRoute>
              <AnimatedPage><Callbacks /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route
          path="/relatorio-equipes"
          element={
            <ProtectedRoute>
              <AnimatedPage><TeamReport /></AnimatedPage>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<AnimatedPage><NotFound /></AnimatedPage>} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <NotificationsProvider>
              <AnimatedRoutes />
            </NotificationsProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
