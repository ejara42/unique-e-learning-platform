import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { RoleGuard } from './components/RoleGuard';
import { AppProvider } from './context/AppContext';
import { api } from './api';

vi.mock('./api', () => ({
  api: {
    getMe: vi.fn(),
    switchRole: vi.fn(),
  },
}));

describe('RoleGuard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithRole = (user: any, allowedRoles: any[]) => {
    if (user) {
      vi.mocked(api.getMe).mockResolvedValue({ user });
      localStorage.setItem('edusphere_token', 'valid-jwt');
    } else {
      vi.mocked(api.getMe).mockRejectedValue(new Error('Unauthenticated'));
      localStorage.clear();
    }

    return render(
      <MemoryRouter>
        <AppProvider>
          <RoleGuard
            allowedRoles={allowedRoles}
            workspaceName="Faculty Studio Workspace"
            description="Manage curriculum, courseware modules, and assignments."
          >
            <div data-testid="protected-content">Secret Faculty Content</div>
          </RoleGuard>
        </AppProvider>
      </MemoryRouter>
    );
  };

  it('renders unauthenticated sign-in barrier when no user session exists', async () => {
    renderWithRole(null, ['INSTRUCTOR']);

    expect(await screen.findByText('Protected Workspace')).toBeInTheDocument();
    expect(screen.getByText('Faculty Studio Workspace')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In to Account/i })).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('renders access denied screen when user activeRole does not match allowedRoles', async () => {
    const studentUser = {
      id: 'u-1',
      fullName: 'David Copperfield',
      email: 'david@student.edu',
      role: 'STUDENT',
      activeRole: 'STUDENT',
      authorizedRoles: ['STUDENT'],
    };

    renderWithRole(studentUser, ['INSTRUCTOR']);

    expect(await screen.findByText('Access Denied: Insufficient Privileges')).toBeInTheDocument();
    expect(screen.getByText(/David Copperfield/i)).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('renders protected child component when user activeRole matches allowedRoles', async () => {
    const instructorUser = {
      id: 'u-2',
      fullName: 'Prof. Minerva McGonagall',
      email: 'minerva@faculty.edu',
      role: 'INSTRUCTOR',
      activeRole: 'INSTRUCTOR',
      authorizedRoles: ['INSTRUCTOR'],
    };

    renderWithRole(instructorUser, ['INSTRUCTOR', 'PLATFORM_ADMIN']);

    expect(await screen.findByTestId('protected-content')).toBeInTheDocument();
    expect(screen.getByText('Secret Faculty Content')).toBeInTheDocument();
    expect(screen.queryByText('Access Denied: Insufficient Privileges')).not.toBeInTheDocument();
  });

  it('displays switchable role card when user has authorized secondary role', async () => {
    const dualRoleUser = {
      id: 'u-3',
      fullName: 'Dean Thomas',
      email: 'dean@university.edu',
      role: 'STUDENT',
      activeRole: 'STUDENT',
      authorizedRoles: ['STUDENT', 'INSTRUCTOR'],
    };

    renderWithRole(dualRoleUser, ['INSTRUCTOR']);

    expect(await screen.findByText('Authorized Role Detected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Switch Active Role to Faculty Instructor/i })).toBeInTheDocument();
  });
});
