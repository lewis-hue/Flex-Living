import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import ReviewsEnhanced from "./pages/ReviewsEnhanced";
import SavedReviews from "./pages/SavedReviews";
import Properties from "./pages/Properties";
import PropertyDetails from "./pages/PropertyDetails";
import NotFound from "./pages/NotFound";
import AnalyticsEnhanced from "./pages/AnalyticsEnhanced";
import Index from "./pages/Index";
import Notifications from "./pages/Notifications";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/properties/:id" element={<PropertyDetails />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/reviews"
              element={
                <ProtectedRoute>
                  <ReviewsEnhanced />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/saved-reviews"
              element={
                <ProtectedRoute>
                  <SavedReviews />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/properties"
              element={
                <ProtectedRoute>
                  <Properties />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/properties/:propertyId"
              element={
                <ProtectedRoute>
                  <PropertyDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/analytics"
              element={
                <ProtectedRoute>
                  <AnalyticsEnhanced />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/notifications"
              element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
