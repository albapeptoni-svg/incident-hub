import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes } from 'react-router-dom';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppThemeProvider } from "@/components/theme-provider";
import { MainLayout } from "@/layouts/MainLayout";
import { AuthProvider } from "./hooks/useAuth";

import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Login from "./pages/Login.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import PartesList from "./pages/PartesList.tsx";
import ParteDetail from "./pages/ParteDetail.tsx";
import Revision from "./pages/Revision.tsx";
import Cola from "./pages/Cola.tsx";
import Historial from "./pages/Historial.tsx";
import Admin from "./pages/Admin.tsx";

// 👇 NUEVO IMPORT
import OCRPartes from "./pages/OCRPartes.tsx";

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

              <Route element={<MainLayout />}>

                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/partes" element={<PartesList />} />
                <Route path="/partes/:id" element={<ParteDetail />} />
                <Route path="/revision" element={<Revision />} />
                <Route path="/cola" element={<Cola />} />
                <Route path="/historial" element={<Historial />} />
                <Route path="/admin" element={<Admin />} />

                {/* 👇 NUEVA RUTA OCR */}
                <Route path="/ocr" element={<OCRPartes />} />

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