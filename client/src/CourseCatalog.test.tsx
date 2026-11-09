import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CourseCatalog } from './components/catalog/CourseCatalog';
import { AppProvider } from './context/AppContext';
import { api } from './api';

vi.mock('./api', () => ({
  api: {
    getCourses: vi.fn(),
    getMe: vi.fn(),
  },
}));

describe('CourseCatalog Component', () => {
  let queryClient: QueryClient;

  const mockCourses = [
    {
      id: 'c-101',
      title: 'Advanced Deep Learning & Neural Systems',
      tagline: 'Comprehensive study of transformer architectures and optimization',
      category: 'Computer Science',
      level: 'ADVANCED',
      price: 49.99,
      enrolledCount: 1850,
      rating: 4.9,
      ratingCount: 340,
      thumbnailUrl: 'https://images.unsplash.com/ml.jpg',
      instructorName: 'Dr. Andrew Ng',
      institutionName: 'Stanford Engineering',
      createdAt: '2026-01-15T00:00:00Z',
    },
    {
      id: 'c-102',
      title: 'Organic Chemistry & Bioengineering Mechanisms',
      tagline: 'Synthesis pathways, reaction energetics and stereochemistry',
      category: 'Chemistry',
      level: 'INTERMEDIATE',
      price: 0,
      enrolledCount: 920,
      rating: 4.7,
      ratingCount: 110,
      thumbnailUrl: 'https://images.unsplash.com/chem.jpg',
      instructorName: 'Dr. Carolyn Bertozzi',
      institutionName: 'UC Berkeley',
      createdAt: '2026-02-10T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
    vi.mocked(api.getMe).mockResolvedValue({ user: {} as any });
  });

  const renderCatalog = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/courses']}>
          <AppProvider>
            <CourseCatalog />
          </AppProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  it('renders course cards correctly when API returns catalog data', async () => {
    vi.mocked(api.getCourses).mockResolvedValueOnce({ courses: mockCourses as any });

    renderCatalog();

    expect(await screen.findByText('Advanced Deep Learning & Neural Systems')).toBeInTheDocument();
    expect(screen.getByText('Organic Chemistry & Bioengineering Mechanisms')).toBeInTheDocument();
    expect(screen.getByText('Stanford Engineering')).toBeInTheDocument();
    expect(screen.getByText('UC Berkeley')).toBeInTheDocument();
  });

  it('filters courses dynamically when search query is entered', async () => {
    vi.mocked(api.getCourses).mockResolvedValueOnce({ courses: mockCourses as any });

    renderCatalog();

    expect(await screen.findByText('Advanced Deep Learning & Neural Systems')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Search by topic, instructor, keywords, or university/i);
    fireEvent.change(searchInput, { target: { value: 'Neural' } });

    expect(screen.getByText('Advanced Deep Learning & Neural Systems')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('Organic Chemistry & Bioengineering Mechanisms')).not.toBeInTheDocument();
    });
  });

  it('renders structured empty state when search finds zero matches and resets on button click', async () => {
    vi.mocked(api.getCourses).mockResolvedValueOnce({ courses: mockCourses as any });

    renderCatalog();

    expect(await screen.findByText('Advanced Deep Learning & Neural Systems')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/Search by topic, instructor, keywords, or university/i);
    fireEvent.change(searchInput, { target: { value: 'Nonexistent Quantum Flux Subject' } });

    expect(await screen.findByText('No matching courses found')).toBeInTheDocument();
    expect(screen.getByText(/We couldn't find any courses matching your specific search/i)).toBeInTheDocument();

    const resetBtn = screen.getByRole('button', { name: /Reset All Filters/i });
    fireEvent.click(resetBtn);

    expect(await screen.findByText('Advanced Deep Learning & Neural Systems')).toBeInTheDocument();
    expect(screen.getByText('Organic Chemistry & Bioengineering Mechanisms')).toBeInTheDocument();
  });

  it('handles API error state gracefully with retry button', async () => {
    vi.mocked(api.getCourses).mockRejectedValueOnce(new Error('Network failure connecting to catalog service'));

    renderCatalog();

    expect(await screen.findByText('Failed to Load Catalog')).toBeInTheDocument();
    expect(screen.getByText('Network failure connecting to catalog service')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry Connection/i })).toBeInTheDocument();
  });
});
