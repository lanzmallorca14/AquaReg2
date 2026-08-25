import React from 'react';
import { createBrowserRouter, Navigate } from "react-router-dom";

// --- LAYOUTS ---
import InspectorLayout from "./components/inspectorlayout";
import { AdminLayout } from "./components/adminlayout";

// --- PAGES ---
import Homepage from "../app/heropage"; 
import LoginPage from "./login"; 
import Recovery from "./RecoveryPage";
import RegisterPage from "./register"; 
import NotFound from "./notfound";
import VerifyPermit from "./pages/VerifyPermit";
import AquaRegNewRegistration from "./pages/home/NewRegistration"; 
import RenewalPage from "../app/pages/home/renewal"; // Ensure this path is correct

// --- ADMIN PAGES ---
import About from "../app/pages/admin/about_us";
import Dashboard from "./pages/admin/Dashboard"; 
import AuditQueuePage from "./pages/admin/AuditQueuePage"; 
import PermitGeneration from "./pages/admin/PermitGeneration"; 
import AquaRegAnalytics from "./pages/admin/Analytics"; 
import RecordsPage from "./pages/admin/records";
import AccountsPage from "./pages/admin/accounts";

// --- INSPECTOR PAGES ---
import InspectorDashboard from "./pages/inspector/inspectordashboard"; 
import InspectionCOI from "./pages/inspector/InspectionCOI"; 
import InspectionRecords from "./pages/inspector/tally";

export const router = createBrowserRouter([
  { path: "/", element: <Homepage /> },
  { path: "/about_us", element: <About /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/RecoveryPage", element: <Recovery/> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/verify-permit", element: <VerifyPermit /> },
  { path: "/new-registration", element: <AquaRegNewRegistration /> },

  // --- ADMIN PANEL ---
  {
    path: "/admin",
    element: <AdminLayout />, 
    children: [
      { index: true, element: <Dashboard /> },
      { path: "audit-queue", element: <AuditQueuePage /> },
      { path: "reports", element: <AquaRegAnalytics /> },
      { path: "records", element: <RecordsPage /> },
      { path: "accounts", element: <AccountsPage /> },
      
      // RENEWAL HUB PATH
      { path: "renewal", element: <RenewalPage /> }, 
      
      { path: "coi-portal/:vesselId", element: <InspectionCOI /> }, 
      { path: "coi-portal", element: <InspectionCOI /> }, 
      { path: "permits", element: <PermitGeneration /> }, 
      { path: "permit-portal/:vesselId", element: <PermitGeneration /> }, 
      { path: "permit-portal", element: <PermitGeneration /> }, 
      { path: "finalize-registry", element: <Navigate to="/admin/permits" replace /> },
    ],
  },

  // --- INSPECTOR PORTAL ---
  {
    path: "/inspector",
    element: <InspectorLayout />, 
    children: [
      { index: true, element: <InspectorDashboard /> },
      { path: "records", element: <InspectionRecords /> },
      { path: "inspection/:vesselId", element: <InspectionCOI /> }, 
      { path: "inspection", element: <InspectionCOI /> }, 
    ],
  },

  { path: "*", element: <NotFound /> },
]);