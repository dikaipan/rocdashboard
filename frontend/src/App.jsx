import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from "./components/layout/Sidebar";
import Footer from "./components/layout/Footer";
import ErrorBoundary from "./components/common/ErrorBoundary";
import ProtectedRoute from "./components/common/ProtectedRoute";
import LoadingSkeleton from "./components/common/LoadingSkeleton";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import "./styles.css";

// Lazy load pages for code splitting
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Engineers = lazy(() => import("./pages/Engineers"));
const Machines = lazy(() => import("./pages/Machines"));
const StockPart = lazy(() => import("./pages/StockPart"));
const Structure = lazy(() => import("./pages/Structure"));
const Decision = lazy(() => import("./pages/Decision"));
const About = lazy(() => import("./pages/About"));
const Toolbox = lazy(() => import("./pages/Toolbox"));

export default function App(){
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

function AppContent() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <ProtectedRoute>
          <div className="app-root">
            <Sidebar />
            <div className="main-area">
              <main className="content-area">
                <ErrorBoundary>
                  <Suspense fallback={<LoadingSkeleton />}>
                    <Routes>
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/engineers" element={<Engineers />} />
                      <Route path="/machines" element={<Machines />} />
                      <Route path="/stockpart" element={<StockPart />} />
                      <Route path="/structure" element={<Structure />} />
                      <Route path="/decision" element={<Decision />} />
                      <Route path="/toolbox" element={<Toolbox />} />
                      <Route path="/about" element={<About />} />
                      <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                  </Suspense>
                </ErrorBoundary>
              </main>
              <Footer />
            </div>
          </div>
        </ProtectedRoute>
      </ThemeProvider>
    </AuthProvider>
  );
}