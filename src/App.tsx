import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { Navbar } from "./components/Navbar";
import Index from "./pages/Index";
import Purchase from "./pages/Purchase";
import Rent from "./pages/Rent";
import ListProperty from "./pages/ListProperty";
import Auth from "./pages/Auth";
import InvestmentAnalytics from "./pages/InvestmentAnalytics";
import AdminDashboard from "./pages/AdminDashboard";
import AgentPortal from "./pages/AgentPortal";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/purchase" element={<Purchase />} />
            <Route path="/rent" element={<Rent />} />
            <Route path="/list-property" element={<ListProperty />} />
            <Route path="/investment-analytics" element={<InvestmentAnalytics />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/agent-portal" element={<AgentPortal />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
