import { Routes, Route, Navigate } from "react-router-dom";
import { ToastProvider } from "./components/shared/Toast";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AppShell } from "./components/layout/AppShell";
import { Landing } from "./pages/Landing";
import { Dashboard } from "./pages/Dashboard";
import { Proposals } from "./pages/Proposals";
import { Connections } from "./pages/Connections";
import { AuditLog } from "./pages/AuditLog";
import { Settings } from "./pages/Settings";
import { Onboarding } from "./pages/Onboarding";

export function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="proposals" element={<Proposals />} />
          <Route path="connections" element={<Connections />} />
          <Route path="audit" element={<AuditLog />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  );
}
