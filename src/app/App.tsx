import React from 'react';
import { createBrowserRouter, RouterProvider, Route, createRoutesFromElements, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { supabase } from '../supabaseClient';
import { AquaRegProvider, useAquaAuth } from './components/context/AquaRegCONTEXT';

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/">
      <Route index element={<div>Welcome to AquaReg</div>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  )
);

export default function App() {
  return (
    <AquaRegProvider supabase={supabase}>
      <Toaster richColors position="top-center" />
      <AppContent />
    </AquaRegProvider>
  );
}

function AppContent() {
  const { loading } = useAquaAuth();
  
  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-950 text-white font-sans">
        <div className="flex flex-col items-center gap-4">
           <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
           <div className="font-black uppercase tracking-[0.3em] animate-pulse text-xs">
             Initializing AquaReg...
           </div>
        </div>
      </div>
    );
  }
  
  return <RouterProvider router={router} />;
}