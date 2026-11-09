import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CourseDetailPage } from './pages/CourseDetailPage';
import { AppProvider } from './context/AppContext';
import { api } from './api';

vi.mock('./api', () => ({
  api: {
    getCourse: vi.fn(),
    getMyCourses: vi.fn(),
    getCourseReviews: vi.fn(),
    submitCourseReview: vi.fn(),
    enroll: vi.fn(),
    getMe: vi.fn(),
  },
}));

describe('CourseDetailPage Component', () => {
  const mockCourse = {
    id: 'course-404',
    title: 'Cloud Native Microservices Architecture',
    tagline: 'Kubernetes, gRPC, distributed tracing and event streams',
    category: 'Computer Science',
    level: 'ADVANCED',
    price: 0,
    rating: 4.95,
    ratingCount: 140,
    enrolledCount: 780,
    thumbnailUrl: 'https://images.unsplash.com/cloud.jpg',
    instructorName: 'Martin Fowler',
    institutionName: 'MIT Open Learning',
    modules: [
      {
        id: 'm-1',
        title: 'Module 1: Service Mesh & Ingress Controllers',
        lessons: [
          { id: 'l-1', title: 'Istio Architecture Overview', durationMinutes: 15, isFreePreview: true },
          { id: 'l-2', title: 'Envoy Sidecar Proxies', durationMinutes: 25, isFreePreview: false },
        ],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('edusphere_token', 'mock-token');
    vi.mocked(api.getMe).mockResolvedValue({
      user: {
        id: 'user-1',
        fullName: 'Elena Fisher',
        role: 'STUDENT',
        activeRole: 'STUDENT',
        authorizedRoles: ['STUDENT'],
      } as any,
    });
    vi.mocked(api.getCourse).mockResolvedValue({ course: mockCourse as any });
    vi.mocked(api.getMyCourses).mockResolvedValue({ enrollments: [] as any });
    vi.mocked(api.getCourseReviews).mockResolvedValue({ reviews: [] as any });
  });

  const renderDetail = () => {
    return render(
      <MemoryRouter initialEntries={['/courses/course-404']}>
        <AppProvider>
          <Routes>
            <Route path="/courses/:courseId" element={<CourseDetailPage />} />
          </Routes>
        </AppProvider>
      </MemoryRouter>
    );
  };

  it('renders course syllabus, academic institution seal, and enrollment action', async () => {
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('Cloud Native Microservices Architecture')).toBeInTheDocument();
    });
    expect(screen.getByText('MIT Open Learning')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Enroll Now/i })).toBeInTheDocument();
  });

  it('allows enrolled student to switch tabs to Reviews and submits a course review evaluation', async () => {
    vi.mocked(api.getMyCourses).mockResolvedValue({
      enrollments: [{ courseId: 'course-404' }] as any,
    });

    vi.mocked(api.submitCourseReview).mockResolvedValueOnce({
      review: {
        id: 'rev-101',
        userName: 'Elena Fisher',
        rating: 5,
        comment: 'Outstanding clarity and architecture principles.',
        createdAt: new Date().toISOString(),
      },
    } as any);

    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('Cloud Native Microservices Architecture')).toBeInTheDocument();
    });

    const reviewsTab = screen.getByRole('button', { name: /Reviews/i });
    fireEvent.click(reviewsTab);

    expect(await screen.findByText('Submit Your Course Evaluation')).toBeInTheDocument();

    const commentInput = screen.getByPlaceholderText(/Write feedback regarding lesson quality/i);
    const publishBtn = screen.getByRole('button', { name: /Publish Review/i });

    fireEvent.change(commentInput, { target: { value: 'Outstanding clarity and architecture principles.' } });
    fireEvent.click(publishBtn);

    await waitFor(() => {
      expect(api.submitCourseReview).toHaveBeenCalledWith(
        'course-404',
        5,
        'Outstanding clarity and architecture principles.'
      );
    });
  });
});
