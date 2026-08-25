import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { router } from "./app/routes"; 
import { AquaRegProvider } from "./app/components/context/AquaRegCONTEXT";
import { supabase } from './supabaseClient'; 
// @ts-ignore: allow CSS side-effect import without explicit type declarations
import "./styles/index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AquaRegProvider supabase={supabase}>
      <Toaster richColors position="top-center" />
      <RouterProvider router={router} />
    </AquaRegProvider>
  </React.StrictMode>
);