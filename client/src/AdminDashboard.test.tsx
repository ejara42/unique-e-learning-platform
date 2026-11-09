import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AdminDashboard } from './pages/AdminDashboard';
import { AppProvider } from './context/AppContext';
import { api } from './api';

vi.mock('./api', () => ({
  api: {
    getAdminMetrics: vi.fn(),
    getTenants: vi.fn(),
    getAdmissions: vi.fn(),
    updateAdmissionStatus: vi.fn(),
    updateTenantStatus: vi.fn(),
    getMe: vi.fn(),
  },
}));

describe('AdminDashboard Page', () => {
  const mockMetrics = {
    totalInstitutions: 5,
    pendingInstitutions: 1,
    verifiedInstitutions: 4,
    totalUsers: 120,
    totalCourses: 15,
    activeLearners: 98,
  };

  const mockTenants = [
    {
      id: 't-101',
      name: 'Global Institute of Artificial Intelligence',
      slug: 'giai',
      type: 'UNIVERSITY',
      status: 'PENDING_VERIFICATION',
      contactEmail: 'contact@giai.edu',
      domains: ['giai.edu'],
      verificationDocuments: ['license.pdf'],
    },
    {
      id: 't-102',
      name: 'Metropolitan Academy of Sciences',
      slug: 'metro-sci',
      type: 'COLLEGE',
      status: 'VERIFIED',
      contactEmail: 'info@metro-sci.org',
      domains: ['metro-sci.org'],
      verificationDocuments: ['accreditation.pdf'],
    },
  ];

  const mockAdmissions = [
    {
      id: 'adm-501',
      studentName: 'Kaelen Miller',
      studentEmail: 'kmiller@example.com',
      institutionName: 'Global Institute of Artificial Intelligence',
      programOrCourse: 'Reinforcement Learning Specialization',
      qualifications: 'B.S. in Computer Science',
      status: 'PENDING',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getAdminMetrics).mockResolvedValue({
      metrics: mockMetrics as any,
      allInstitutions: mockTenants as any,
      recentInstitutions: mockTenants as any,
      recentActivities: [] as any,
    });
    vi.mocked(api.getAdmissions).mockResolvedValue({
      admissions: mockAdmissions as any,
    });
    vi.mocked(api.getMe).mockResolvedValue({
      user: {
        id: 'admin-1',
        fullName: 'Super Administrator',
        role: 'PLATFORM_ADMIN',
        activeRole: 'PLATFORM_ADMIN',
        authorizedRoles: ['PLATFORM_ADMIN'],
      } as any,
    });
  });

  const renderDashboard = () => {
    return render(
      <MemoryRouter initialEntries={['/admin']}>
        <AppProvider>
          <AdminDashboard />
        </AppProvider>
      </MemoryRouter>
    );
  };

  it('renders admin metrics overview and live institution list from API', async () => {
    renderDashboard();

    expect(await screen.findByText('Global Institute of Artificial Intelligence')).toBeInTheDocument();
    expect(screen.getByText('Metropolitan Academy of Sciences')).toBeInTheDocument();
    expect(screen.getByText('Institution & Governance Console')).toBeInTheDocument();
    expect(screen.getByText('Ministry Accredited Control Plane')).toBeInTheDocument();
  });

  it('approves pending institution accreditation and triggers api.updateTenantStatus', async () => {
    vi.mocked(api.updateTenantStatus).mockResolvedValueOnce({ success: true } as any);

    renderDashboard();

    expect(await screen.findByText('Global Institute of Artificial Intelligence')).toBeInTheDocument();

    const acceptBtn = screen.getByTitle('Accept institution and grant license');
    fireEvent.click(acceptBtn);

    await waitFor(() => {
      expect(api.updateTenantStatus).toHaveBeenCalledWith(
        't-101',
        'VERIFIED',
        'Accreditation dossier approved by Platform Superadmin'
      );
    });
  });

  it('switches to Admissions tab and processes student admission acceptance', async () => {
    vi.mocked(api.updateAdmissionStatus).mockResolvedValueOnce({ success: true } as any);

    renderDashboard();

    // Click Student Admissions tab
    const admissionsTab = await screen.findByRole('button', { name: /Student Admissions/i });
    fireEvent.click(admissionsTab);

    expect(await screen.findByText('Kaelen Miller')).toBeInTheDocument();
    expect(screen.getByText('Reinforcement Learning Specialization')).toBeInTheDocument();

    const acceptStudentBtn = screen.getByRole('button', { name: /Accept/i });
    fireEvent.click(acceptStudentBtn);

    await waitFor(() => {
      expect(api.updateAdmissionStatus).toHaveBeenCalledWith('adm-501', 'ACCEPTED');
    });
  });

  it('renders clean empty state illustration when no admissions exist in queue', async () => {
    vi.mocked(api.getAdmissions).mockResolvedValueOnce({ admissions: [] });

    renderDashboard();

    const admissionsTab = await screen.findByRole('button', { name: /Student Admissions/i });
    fireEvent.click(admissionsTab);

    expect(await screen.findByText('No Admissions in Queue')).toBeInTheDocument();
    expect(
      screen.getByText('There are currently no pending student applications across institutional programs.')
    ).toBeInTheDocument();
  });
});
