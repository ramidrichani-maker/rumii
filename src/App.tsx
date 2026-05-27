import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { Navbar } from "./components/Navbar";
import Index from "./pages/Index";
import Purchase from "./pages/Purchase";
import ChangePassword from "./pages/ChangePassword";
import Rent from "./pages/Rent";
import ListProperty from "./pages/ListProperty";
import Auth from "./pages/Auth";
import InvestmentAnalytics from "./pages/InvestmentAnalytics";
import AdminDashboard from "./pages/AdminDashboard";
import AgentPortal from "./pages/AgentPortal";
import AgencyPortal from "./pages/AgencyPortal";
import ClientDashboard from "./pages/ClientDashboard";
import Favorites from "./pages/Favorites";
import Profile from "./pages/Profile";
import MyListings from "./pages/MyListings";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import ChatAssistant from "./pages/ChatAssistant";
import RequestPhotography from "./pages/RequestPhotography";
import TermsOfService from "./pages/TermsOfService";
import NewHomes from "./pages/NewHomes";
import PropertyDetail from "./pages/PropertyDetail";
import AgentEnquiry from "./pages/AgentEnquiry";
import FindAgents from "./pages/FindAgents";
import Messages from "./pages/Messages";
import AgentValuation from "./pages/AgentValuation";
import SupportPortal from "./pages/SupportPortal";
import MyOracle from "./pages/MyOracle";
import AccountSettings from "./pages/AccountSettings";
import { FloatingChatWidget } from "./components/FloatingChatWidget";
import { SupportReviewWidget } from "./components/SupportReviewWidget";

const queryClient = new QueryClient();

const RouteProgress = () => {
  const location = useLocation();
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    setIsActive(true);
    const timeout = setTimeout(() => setIsActive(false), 450);
    return () => clearTimeout(timeout);
  }, [location.pathname]);

  return (
    <div className="h-0.5 w-full overflow-hidden">
      <div
        className={`h-full bg-gradient-to-r from-primary via-primary/70 to-primary/20 transition-transform duration-500 ease-out origin-left ${
          isActive ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0"
        }`}
      />
    </div>
  );
};

const AppRoutes = () => {
  const location = useLocation();

  return (
    <div className="relative">
      <div key={location.pathname} className="animate-fade-in">
        <Routes location={location}>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/purchase" element={<Purchase />} />
          <Route path="/rent" element={<Rent />} />
          <Route path="/list-property" element={<ListProperty />} />
          <Route path="/my-listings" element={<MyListings />} />
          <Route path="/investment-analytics" element={<InvestmentAnalytics />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/agent-portal" element={<AgentPortal />} />
          <Route path="/agency-portal" element={<AgencyPortal />} />
          <Route path="/my-viewings" element={<ClientDashboard />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/chat" element={<ChatAssistant />} />
          <Route path="/request-photography" element={<RequestPhotography />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/new-homes" element={<NewHomes />} />
          <Route path="/property/:id" element={<PropertyDetail />} />
          <Route path="/property/:id/enquiry" element={<AgentEnquiry />} />
          <Route path="/find-agents" element={<FindAgents />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/agent-valuation" element={<AgentValuation />} />
          <Route path="/support-portal" element={<SupportPortal />} />
          <Route path="/my-rumi" element={<MyOracle />} />
          <Route path="/account-settings" element={<AccountSettings />} />
          <Route path="/change-password" element={<ChangePassword />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Navbar />
          <RouteProgress />
          <FloatingChatWidget />
          <AppRoutes />
          <SupportReviewWidget />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
