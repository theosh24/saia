import { useState, useCallback } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SolanaWalletProvider from '@/components/wallet/SolanaWalletProvider';
import LoadingScreen from '@/components/ui/LoadingScreen';
import AppLayout from '@/components/layout/AppLayout';
import Index from "./pages/Index";
import Registry from "./pages/Registry";
import IssueId from "./pages/IssueId";
import Agents from "./pages/Agents";
import AgentDetail from "./pages/AgentDetail";
import Chat from "./pages/Chat";
import Reputation from "./pages/Reputation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [loaded, setLoaded] = useState(false);
  const handleLoadComplete = useCallback(() => setLoaded(true), []);

  return (
    <QueryClientProvider client={queryClient}>
      <SolanaWalletProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <LoadingScreen onComplete={handleLoadComplete} />
          {loaded && (
            <BrowserRouter>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Index />} />
                  <Route path="/registry" element={<Registry />} />
                  <Route path="/issue-id" element={<IssueId />} />
                  <Route path="/agents" element={<Agents />} />
                  <Route path="/agents/:slug" element={<AgentDetail />} />
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/reputation" element={<Reputation />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          )}
        </TooltipProvider>
      </SolanaWalletProvider>
    </QueryClientProvider>
  );
};

export default App;
