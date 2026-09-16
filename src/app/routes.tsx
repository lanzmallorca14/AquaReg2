import { createBrowserRouter, Navigate } from "react-router-dom";

// =====================================================
// LAYOUTS
// =====================================================
import InspectorLayout from "./components/inspectorlayout";
import { AdminLayout } from "./components/adminlayout";

// =====================================================
// PUBLIC PAGES
// =====================================================
import Homepage from "./app/heropage";
import LoginPage from "./login";
import Recovery from "./RecoveryPage";
import RegisterPage from "./register";
import NotFound from "./notfound";

// =====================================================
// PUBLIC VERIFICATION
// =====================================================
import VerifyPermit from "./app/pages/VerifyPermit";

// =====================================================
// HOME / REGISTRATION
// =====================================================
import AquaRegNewRegistration from "./app/pages/home/NewRegistration";
import RenewalPage from "./app/pages/home/renewal";

// =====================================================
// ADMIN PAGES
// =====================================================
import About from "./app/pages/admin/about_us";
import Dashboard from "./app/pages/admin/Dashboard";
import AuditQueuePage from "./app/pages/admin/AuditQueuePage";
import PermitGeneration from "./app/pages/admin/PermitGeneration";
import AquaRegAnalytics from "./app/pages/admin/Analytics";
import RecordsPage from "./app/pages/admin/records";
import AccountsPage from "./app/pages/admin/accounts";

// =====================================================
// QR PERMIT VERIFICATION
// =====================================================
// IMPORTANT:
// Keep this as qr_permit.tsx.
// QR scanned URLs use /verify-permit/:token.
import QrPermit from "./app/pages/admin/qr_permit";

// =====================================================
// INSPECTOR PAGES
// =====================================================
import InspectorDashboard from "./app/pages/inspector/inspectordashboard";
import InspectionCOI from "./app/pages/inspector/InspectionCOI";
import InspectionRecords from "./app/pages/inspector/tally";

// =====================================================
// ROUTER
// =====================================================
export const router = createBrowserRouter([
  // ===================================================
  // PUBLIC ROUTES
  // ===================================================

  // Homepage
  {
    path: "/",
    element: <Homepage />,
  },

  // About
  {
    path: "/about_us",
    element: <About />,
  },

  // Login
  {
    path: "/login",
    element: <LoginPage />,
  },

  // Password Recovery
  {
    path: "/RecoveryPage",
    element: <Recovery />,
  },

  // Registration
  {
    path: "/register",
    element: <RegisterPage />,
  },

  // New Registration
  {
    path: "/new-registration",
    element: <AquaRegNewRegistration />,
  },

  // ===================================================
  // PUBLIC PERMIT VERIFICATION
  // ===================================================

  // Manual verification page
  //
  // Example:
  // https://your-domain.com/verify-permit
  //
  // Opens:
  // VerifyPermit.tsx
  {
    path: "/verify-permit",
    element: <VerifyPermit />,
  },

  // QR verification page
  //
  // Example QR URL:
  // https://your-domain.com/verify-permit/ABC123
  //
  // Opens:
  // qr_permit.tsx
  //
  // DO NOT CHANGE THIS ROUTE.
  {
    path: "/verify-permit/:token",
    element: <QrPermit />,
  },

  // ===================================================
  // ADMIN PORTAL
  // ===================================================
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      // -----------------------------------------------
      // Dashboard
      // /admin
      // -----------------------------------------------
      {
        index: true,
        element: <Dashboard />,
      },

      // -----------------------------------------------
      // Audit Queue
      // /admin/audit-queue
      // -----------------------------------------------
      {
        path: "audit-queue",
        element: <AuditQueuePage />,
      },

      // -----------------------------------------------
      // Reports / Analytics
      // /admin/reports
      // -----------------------------------------------
      {
        path: "reports",
        element: <AquaRegAnalytics />,
      },

      // -----------------------------------------------
      // Records
      // /admin/records
      // -----------------------------------------------
      {
        path: "records",
        element: <RecordsPage />,
      },

      // -----------------------------------------------
      // Accounts
      // /admin/accounts
      // -----------------------------------------------
      {
        path: "accounts",
        element: <AccountsPage />,
      },

      // -----------------------------------------------
      // Renewal
      // /admin/renewal
      // -----------------------------------------------
      {
        path: "renewal",
        element: <RenewalPage />,
      },

      // =================================================
      // COI PORTAL
      // =================================================

      // /admin/coi-portal
      {
        path: "coi-portal",
        element: <InspectionCOI />,
      },

      // /admin/coi-portal/:vesselId
      {
        path: "coi-portal/:vesselId",
        element: <InspectionCOI />,
      },

      // =================================================
      // PERMIT PORTAL
      // =================================================

      // /admin/permits
      {
        path: "permits",
        element: <PermitGeneration />,
      },

      // /admin/permit-portal
      {
        path: "permit-portal",
        element: <PermitGeneration />,
      },

      // /admin/permit-portal/:vesselId
      {
        path: "permit-portal/:vesselId",
        element: <PermitGeneration />,
      },

      // =================================================
      // FINALIZE REGISTRY
      // =================================================
      // Redirect old route to Permit Generation
      //
      // /admin/finalize-registry
      //        ↓
      // /admin/permits
      {
        path: "finalize-registry",
        element: (
          <Navigate
            to="/admin/permits"
            replace
          />
        ),
      },
    ],
  },

  // ===================================================
  // INSPECTOR PORTAL
  // ===================================================
  {
    path: "/inspector",
    element: <InspectorLayout />,
    children: [
      // -----------------------------------------------
      // Inspector Dashboard
      // /inspector
      // -----------------------------------------------
      {
        index: true,
        element: <InspectorDashboard />,
      },

      // -----------------------------------------------
      // Inspection Records
      // /inspector/records
      // -----------------------------------------------
      {
        path: "records",
        element: <InspectionRecords />,
      },

      // -----------------------------------------------
      // Inspection
      // /inspector/inspection
      // -----------------------------------------------
      {
        path: "inspection",
        element: <InspectionCOI />,
      },

      // -----------------------------------------------
      // Inspection with Vessel ID
      // /inspector/inspection/:vesselId
      // -----------------------------------------------
      {
        path: "inspection/:vesselId",
        element: <InspectionCOI />,
      },
    ],
  },

  // ===================================================
  // 404 NOT FOUND
  // ===================================================
  {
    path: "*",
    element: <NotFound />,
  },
]);