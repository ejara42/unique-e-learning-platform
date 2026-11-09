import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LearnerDashboard } from './pages/LearnerDashboard';
import { AppProvider } from './context/AppContext';
import { api } from './api';

vi.mock('./api', () => ({
  api: {
    getMyCourses: vi.fn(),
    getLiveSessions: vi.fn(),
    getCertificates: vi.fn(),
    getCourses: vi.fn(),
    getMe: vi.fn(),
  },
}));

describe('LearnerDashboard Page', () => {
  const mockEnrollments = [
    {
      id: 'enr-101',
      courseId: 'c-1',
      status: 'ACTIVE',
      progressPercentage: 45,
      course: {
        id: 'c-1',
        title: 'Quantum Computing Fundamentals',
        category: 'Physics',
        institutionName: 'Caltech Institute of Technology',
        thumbnailUrl: 'https://images.unsplash.com/quantum.jpg',
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getMe).mockResolvedValue({
      user: {
        id: 'user-7',
        fullName: 'Alexander Wright',
        role: 'STUDENT',
        activeRole: 'STUDENT',
        authorizedRoles: ['STUDENT'],
      } as any,
    });
    vi.mocked(api.getMyCourses).mockResolvedValue({ enrollments: mockEnrollments as any });
    vi.mocked(api.getLiveSessions).mockResolvedValue({ sessions: [] as any });
    vi.mocked(api.getCertificates).mockResolvedValue({ certificates: [] as any });
    vi.mocked(api.getCourses).mockResolvedValue({ courses: [] as any });
  });

  const renderDashboard = () => {
    return render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppProvider>
          <LearnerDashboard />
        </AppProvider>
      </MemoryRouter>
    );
  };

  it('renders learner greeting and metric summary cards', async () => {
    renderDashboard();

    expect(await screen.findByText('Learner Workspace')).toBeInTheDocument();
    expect(screen.getByText(/Track courseware progress, join scheduled live lectures/i)).toBeInTheDocument();
    expect(screen.getByText('Enrolled Courses')).toBeInTheDocument();
    expect(screen.getByText('Completed Curricula')).toBeInTheDocument();
  });

  it('renders active enrolled courses from API', async () => {
    renderDashboard();

    expect(await screen.findByText('Quantum Computing Fundamentals')).toBeInTheDocument();
    expect(screen.getByText('Caltech Institute of Technology')).toBeInTheDocument();
    expect(screen.getByText(/45% completed/i)).toBeInTheDocument();
  });

  it('renders clean empty state when learner has zero enrollments', async () => {
    vi.mocked(api.getMyCourses).mockResolvedValueOnce({ enrollments: [] });

    renderDashboard();

    expect(await screen.findByText('No active enrollments found')).toBeInTheDocument();
    expect(
      screen.getByText(/Browse our multi-tier course catalog to register/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Browse Catalog/i })).toBeInTheDocument();
  });
});
