import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { migrateLocalStorageToCloud } from "@/lib/migration";
import { getProfile } from "./lib/storage";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import Running from "./pages/Running";
import RunningHistory from "./pages/RunningHistory";
import Pokedex from "./pages/Pokedex";
import Settings from "./pages/Settings";
import Party from "./pages/Party";
import Battle from "./pages/Battle";
import Ranking from "./pages/Ranking";
import Shop from "./pages/Shop";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function MigrationHandler({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [migrationDone, setMigrationDone] = useState(false);

  useEffect(() => {
    if (user) {
      migrateLocalStorageToCloud(user).then((didMigrate) => {
        if (didMigrate) {
          toast.success('기존 데이터를 클라우드로 이전했습니다! ☁️');
        }
        setMigrationDone(true);
      });
    } else {
      setMigrationDone(true);
    }
  }, [user]);

  if (!migrationDone && user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">데이터 이전 중...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  const profile = getProfile();

  return (
    <MigrationHandler>
      <Routes>
        <Route path="/" element={profile.onboardingComplete ? <Navigate to="/home" replace /> : <Onboarding />} />
        <Route path="/home" element={<Home />} />
        <Route path="/run" element={<Running />} />
        <Route path="/history" element={<RunningHistory />} />
        <Route path="/pokedex" element={<Pokedex />} />
        <Route path="/party" element={<Party />} />
        <Route path="/battle" element={<Battle />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MigrationHandler>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
