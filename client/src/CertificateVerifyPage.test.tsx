import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CertificateVerifyPage } from './pages/CertificateVerifyPage';
import { AppProvider } from './context/AppContext';
import { api } from './api';

vi.mock('./api', () => ({
  api: {
    verifyCertificate: vi.fn(),
    getMe: vi.fn(),
  },
}));

describe('CertificateVerifyPage', () => {
  const testId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const testCertificateNumber = `EDU-TEST-${testId}`;
  const testLearnerName = `Test Learner ${testId}`;
  const mockValidCertificate = {
    id: `cert-${testId}`,
    certificateNumber: testCertificateNumber,
    studentName: testLearnerName,
    learnerName: testLearnerName,
    courseTitle: `Test Course ${testId}`,
    institutionName: `Test Institution ${testId}`,
    issueDate: '2026-03-15T00:00:00Z',
    verificationHash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getMe).mockResolvedValue({ user: {} as any });
  });

  const renderVerifyPage = () => {
    return render(
      <MemoryRouter initialEntries={['/verify-certificate']}>
        <AppProvider>
          <CertificateVerifyPage />
        </AppProvider>
      </MemoryRouter>
    );
  };

  it('renders credential verification portal with clean input field and no demo codes', () => {
    renderVerifyPage();

    expect(screen.getByText('Academic Diploma Verification')).toBeInTheDocument();
    expect(screen.getByText(/Public Cryptographic Credential Ledger/i)).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/Enter unique Certificate Code/i);
    expect(input).toBeInTheDocument();
    expect((input as HTMLInputElement).value).toBe('');

    // Confirms demo codes are not hardcoded
    expect(screen.queryByText(/EDU-2026-X89K-4921/i)).not.toBeInTheDocument();
  });

  it('verifies a valid certificate code and renders authentic diploma details', async () => {
    vi.mocked(api.verifyCertificate).mockResolvedValueOnce({
      valid: true,
      message: 'Official diploma authenticated successfully.',
      certificate: mockValidCertificate as any,
    });

    renderVerifyPage();

    const input = screen.getByPlaceholderText(/Enter unique Certificate Code/i);
    const verifyBtn = screen.getByRole('button', { name: /Verify Credential/i });

    fireEvent.change(input, { target: { value: testCertificateNumber } });
    fireEvent.click(verifyBtn);

    expect(await screen.findByText(/Verified Official Credential • Cryptographically Authenticated/i)).toBeInTheDocument();
    expect(screen.getByText(testLearnerName)).toBeInTheDocument();
    expect(screen.getByText(`Test Course ${testId}`)).toBeInTheDocument();
    expect(screen.getByText(testCertificateNumber)).toBeInTheDocument();
  });

  it('displays verification failure alert when invalid certificate code is queried', async () => {
    vi.mocked(api.verifyCertificate).mockResolvedValueOnce({
      valid: false,
      message: 'Certificate ID could not be located in the national registry ledger.',
      certificate: null as any,
    });

    renderVerifyPage();

    const input = screen.getByPlaceholderText(/Enter unique Certificate Code/i);
    const verifyBtn = screen.getByRole('button', { name: /Verify Credential/i });

    fireEvent.change(input, { target: { value: 'FAKE-NONEXISTENT-CODE' } });
    fireEvent.click(verifyBtn);

    expect(await screen.findByText('Credential Verification Failed')).toBeInTheDocument();
    expect(
      screen.getByText('Certificate ID could not be located in the national registry ledger.')
    ).toBeInTheDocument();
  });
});
