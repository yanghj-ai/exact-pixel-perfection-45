import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import Routine from "./pages/Routine";
import RoutineTimer from "./pages/RoutineTimer";
import Pokedex from "./pages/Pokedex";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { getProfile } from "./lib/storage";

const queryClient = new QueryClient();

function RootRedirect() {
  const profile = getProfile();
  return profile.onboardingComplete ? <Navigate to="/home" replace /> : <Onboarding />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/home" element={<Home />} />
          <Route path="/routine" element={<Routine />} />
          <Route path="/timer" element={<RoutineTimer />} />
          <Route path="/pokedex" element={<Pokedex />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
