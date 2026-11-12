import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthPage } from './pages/AuthPage';
import { AppProvider } from './context/AppContext';
import { api, ApiError } from './api';

vi.mock('./api', () => {
  class MockApiError extends Error {
    status?: number;
    code?: string;
    retryable: boolean;
    details?: Array<{ field: string; message: string }>;
    constructor(
      message: string,
      status?: number,
      code?: string,
      retryable = false,
      details?: Array<{ field: string; message: string }>
    ) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.code = code;
      this.retryable = retryable;
      this.details = details;
    }
  }

  return {
    api: {
      login: vi.fn(),
      register: vi.fn(),
      getMe: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
    },
    ApiError: MockApiError,
  };
});

describe('AuthPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderAuth = (initialMode: 'signin' | 'signup' = 'signin') => {
    return render(
      <MemoryRouter initialEntries={[initialMode === 'signin' ? '/login' : '/register']}>
        <AppProvider>
          <AuthPage initialMode={initialMode} />
        </AppProvider>
      </MemoryRouter>
    );
  };

  it('renders clean authentication form without any demo personas or mock quick-login buttons', () => {
    renderAuth('signin');

    // Asserts that no prototype demo personas or instant switches exist
    expect(screen.queryByText(/Demo Login/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Quick Login/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Switch Persona/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/student@edusphere.com/i)).not.toBeInTheDocument();

    // Verifies production fields exist
    expect(screen.getByPlaceholderText(/e\.g\. yourname@domain\.edu/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/At least 12 characters with upper\/lowercase, number & symbol/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In to Account/i })).toBeInTheDocument();
  });

  it('displays field-level validation errors returned from backend Zod validation', async () => {
    vi.mocked(api.login).mockRejectedValueOnce(
      new ApiError('Validation Error', 400, 'VALIDATION_ERROR', false, [
        { field: 'email', message: 'A valid email address is required' },
        { field: 'password', message: 'Password must be at least 12 characters in length' },
      ])
    );

    renderAuth('signin');

    const emailInput = screen.getByPlaceholderText(/e\.g\. yourname@domain\.edu/i);
    const passwordInput = screen.getByPlaceholderText(/At least 12 characters with upper\/lowercase, number & symbol/i);
    const form = emailInput.closest('form')!;

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'short' } });
    fireEvent.submit(form);

    expect(await screen.findByText('A valid email address is required')).toBeInTheDocument();
    expect(await screen.findByText('Password must be at least 12 characters in length')).toBeInTheDocument();
  });

  it('successfully submits valid sign-in credentials and invokes api.login', async () => {
    vi.mocked(api.login).mockResolvedValueOnce({
      token: 'jwt-valid-token-12345',
      user: {
        id: 'u-101',
        fullName: 'Dr. Sarah Connor',
        email: 'sarah.connor@mit.edu',
        role: 'INSTRUCTOR',
        activeRole: 'INSTRUCTOR',
        authorizedRoles: ['INSTRUCTOR'],
      } as any,
    });

    renderAuth('signin');

    const emailInput = screen.getByPlaceholderText(/e\.g\. yourname@domain\.edu/i);
    const passwordInput = screen.getByPlaceholderText(/At least 12 characters with upper\/lowercase, number & symbol/i);
    const submitBtn = screen.getByRole('button', { name: /Sign In to Account/i });

    fireEvent.change(emailInput, { target: { value: 'sarah.connor@mit.edu' } });
    fireEvent.change(passwordInput, { target: { value: 'SecurePass123!' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.login).toHaveBeenCalledWith('sarah.connor@mit.edu', 'SecurePass123!');
    });
  });

  it('renders sign-up mode cleanly and displays registration field-level errors', async () => {
    vi.mocked(api.register).mockRejectedValueOnce(
      new ApiError('Registration validation failed', 400, 'VALIDATION_ERROR', false, [
        { field: 'fullName', message: 'Name must be at least 2 characters in length' },
      ])
    );

    renderAuth('signup');

    expect(screen.getByPlaceholderText(/Enter your first and last name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Complete Registration & Enter/i })).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText(/Enter your first and last name/i);
    const emailInput = screen.getByPlaceholderText(/e\.g\. yourname@domain\.edu/i);
    const passwordInput = screen.getByPlaceholderText(/At least 12 characters with upper\/lowercase, number & symbol/i);
    const submitBtn = screen.getByRole('button', { name: /Complete Registration & Enter/i });

    fireEvent.change(nameInput, { target: { value: 'A' } });
    fireEvent.change(emailInput, { target: { value: 'jane@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'SecurePass123!' } });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Name must be at least 2 characters in length')).toBeInTheDocument();
  });

  it('provides show/hide password toggle button during registration', () => {
    renderAuth('signup');

    const passwordInput = screen.getByPlaceholderText(/At least 12 characters with upper\/lowercase, number & symbol/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleBtn = screen.getByRole('button', { name: /Show password/i });
    expect(toggleBtn).toBeInTheDocument();

    // Click toggle to reveal password
    fireEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /Hide password/i })).toBeInTheDocument();

    // Click toggle again to conceal password
    fireEvent.click(screen.getByRole('button', { name: /Hide password/i }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('ensures static "Verified" badge is completely absent from the auth header', () => {
    renderAuth('signup');
    // Asserts that no static fake "Verified" badge is rendered next to the form title
    expect(screen.queryByText(/^Verified$/i)).not.toBeInTheDocument();
  });
});
