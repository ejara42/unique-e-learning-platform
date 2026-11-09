import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { App } from './App';
import { AppProvider } from './context/AppContext';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      retry: (failureCount, error: unknown) => {
        if (typeof error === 'object' && error && 'status' in error && typeof (error as { status?: number }).status === 'number') {
          const status = (error as { status?: number }).status;
          if (status && status < 500) {
            return false;
          }
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppProvider>
            <App />
            <Toaster
              position="top-right"
              richColors
              closeButton
              theme="system"
              toastOptions={{
                className: 'rounded-2xl font-sans text-sm shadow-elevated border border-slate-200/80 backdrop-blur-md',
              }}
            />
          </AppProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
