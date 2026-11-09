import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { App } from './App';
import { AppProvider } from './context/AppContext';
import { api } from './api';

vi.mock('./api', () => ({
  api: {
    getMe: vi.fn(),
    getCourses: vi.fn(),
    getTenants: vi.fn(),
  },
}));

describe('App shell', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.mocked(api.getCourses).mockResolvedValue({ courses: [] });
    vi.mocked(api.getTenants).mockResolvedValue({ tenants: [] });
    vi.mocked(api.getMe).mockResolvedValue({ user: {} as any });
  });

  it('renders the landing page content at the root route', async () => {
    // Pre-resolve lazy module in testing environment to avoid Suspense race
    await import('./pages/LandingPage');

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/']}>
          <AppProvider>
            <App />
          </AppProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByRole('button', { name: /Explore as Learner/i })).toBeInTheDocument();
    expect(screen.getByText(/Accredited Multi-Tenant Academic Platform/i)).toBeInTheDocument();
  });
});
