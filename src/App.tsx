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
import ClientDashboard from "./pages/ClientDashboard";
import Favorites from "./pages/Favorites";
import Profile from "./pages/Profile";
import MyListings from "./pages/MyListings";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import ChatAssistant from "./pages/ChatAssistant";
import { FloatingChatWidget } from "./components/FloatingChatWidget";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Navbar />
          <FloatingChatWidget />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/purchase" element={<Purchase />} />
            <Route path="/rent" element={<Rent />} />
            <Route path="/list-property" element={<ListProperty />} />
            <Route path="/my-listings" element={<MyListings />} />
            <Route path="/investment-analytics" element={<InvestmentAnalytics />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/agent-portal" element={<AgentPortal />} />
            <Route path="/my-viewings" element={<ClientDashboard />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/chat" element={<ChatAssistant />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
