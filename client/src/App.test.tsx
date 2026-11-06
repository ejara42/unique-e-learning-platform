import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getCourses).mockResolvedValue({ courses: [] });
    vi.mocked(api.getTenants).mockResolvedValue({ tenants: [] });
    vi.mocked(api.getMe).mockResolvedValue({ user: {} as any });
  });

  it('renders the landing page content at the root route', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppProvider>
          <App />
        </AppProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Unified Learning Infrastructure for/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Explore as Learner/i })).toBeInTheDocument();
  });
});
