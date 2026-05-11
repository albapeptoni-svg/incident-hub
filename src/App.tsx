import OCRPartes from "./pages/OCRPartes.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppThemeProvider } from "@/components/theme-provider";
import { MainLayout } from "@/layouts/MainLayout";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Login from "./pages/Login.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import PartesList from "./pages/PartesList.tsx";
import ParteDetail from "./pages/ParteDetail.tsx";
import Cola from "./pages/Cola.tsx";
import Historial from "./pages/Historial.tsx";
import Admin from "./pages/Admin.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <HashRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />

              <Route
                element={
                  <ProtectedRoute allowedRoles={["admin", "tecnico"]}>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route
                  path="/ocr"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "tecnico"]}>
                      <OCRPartes />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/partes"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "tecnico"]}>
                      <PartesList />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/partes/:id"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "tecnico"]}>
                      <ParteDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/cola"
                  element={
                    <ProtectedRoute allowedRoles={["admin", "tecnico"]}>
                      <Cola />
                    </ProtectedRoute>
                  }
                />
                <Route path="/historial" element={<Historial />} />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <Admin />
                    </ProtectedRoute>
                  }
                />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </HashRouter>
        </AuthProvider>
      </TooltipProvider>
    </AppThemeProvider>
  </QueryClientProvider>
);

export default App;
