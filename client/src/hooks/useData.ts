import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../api';
import { useApp } from '../context/AppContext';
import { IUser, IEnrollment, ICertificate } from '../types';

export const queryKeys = {
  auth: ['auth', 'me'],
  courses: ['courses'],
  course: (id: string) => ['courses', id],
  myCourses: ['courses', 'mine'],
  dashboard: ['dashboard'],
  enrollments: ['enrollments'],
  assignments: ['assignments'],
  notifications: ['notifications'],
  certificates: ['certificates'],
};

const isAuthError = (error: unknown) => error instanceof ApiError && (error.status === 401 || error.status === 403);

export function useAuth() {
  const queryClient = useQueryClient();
  const { setCurrentUser, currentUser, setCurrentPage } = useApp();

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      return api.login(email, password);
    },
    onSuccess: (data) => {
      setCurrentUser(data.user);
      if (data.user.activeRole === 'PLATFORM_ADMIN' || data.user.activeRole === 'INSTITUTION_ADMIN') {
        setCurrentPage('admin-dashboard');
      } else if (data.user.activeRole === 'INSTRUCTOR') {
        setCurrentPage('teacher-studio');
      } else {
        setCurrentPage('learner-dashboard');
      }
      queryClient.setQueryData(queryKeys.auth, data.user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async ({ fullName, email, password, role }: { fullName: string; email: string; password: string; role?: string }) => {
      return api.register(fullName, email, password, role);
    },
    onSuccess: (data) => {
      setCurrentUser(data.user);
      if (data.user.activeRole === 'INSTRUCTOR') {
        setCurrentPage('teacher-studio');
      } else {
        setCurrentPage('learner-dashboard');
      }
      queryClient.setQueryData(queryKeys.auth, data.user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      api.logout();
      return true;
    },
    onSuccess: () => {
      setCurrentUser(null);
      setCurrentPage('landing');
      queryClient.removeQueries({ queryKey: queryKeys.auth });
    },
  });

  const switchRoleMutation = useMutation({
    mutationFn: async (role: string) => api.switchRole(role as any),
    onSuccess: (data) => {
      setCurrentUser(data.user);
      if (data.user.activeRole === 'PLATFORM_ADMIN' || data.user.activeRole === 'INSTITUTION_ADMIN') {
        setCurrentPage('admin-dashboard');
      } else if (data.user.activeRole === 'INSTRUCTOR') {
        setCurrentPage('teacher-studio');
      } else {
        setCurrentPage('learner-dashboard');
      }
      queryClient.setQueryData(queryKeys.auth, data.user);
    },
  });

  const sessionQuery = useQuery({
    queryKey: queryKeys.auth,
    queryFn: async (): Promise<IUser | null> => {
      const token = localStorage.getItem('edusphere_token');
      if (!token) return null;
      try {
        const res = await api.getMe();
        return res.user;
      } catch (error) {
        if (isAuthError(error)) {
          api.logout();
          return null;
        }
        throw error;
      }
    },
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status && error.status < 500) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 30_000,
    enabled: true,
  });

  React.useEffect(() => {
    if (sessionQuery.data) {
      setCurrentUser(sessionQuery.data);
    }
  }, [sessionQuery.data, setCurrentUser]);

  return {
    currentUser,
    isSessionLoading: sessionQuery.isLoading,
    loginMutation,
    registerMutation,
    logoutMutation,
    switchRoleMutation,
  };
}

export function useCourses(params?: { category?: string; search?: string; level?: string }) {
  return useQuery({
    queryKey: ['courses', params ?? {}],
    queryFn: async () => {
      const response = await api.getCourses(params);
      return response.courses;
    },
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status && error.status < 500) return false;
      return failureCount < 2;
    },
    staleTime: 60_000,
  });
}

export function useCourse(courseId: string | null) {
  return useQuery({
    queryKey: queryKeys.course(courseId ?? 'missing'),
    queryFn: async () => {
      if (!courseId) throw new Error('Course id is required');
      const response = await api.getCourse(courseId);
      return response.course;
    },
    enabled: Boolean(courseId),
    staleTime: 60_000,
  });
}

export function useDashboardData() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: async () => {
      const [metricsResult, coursesResult, liveSessionsResult, certificatesResult] = await Promise.allSettled([
        api.getAdminMetrics(),
        api.getCourses(),
        api.getLiveSessions(),
        api.getCertificates(),
      ]);

      return {
        metrics: metricsResult.status === 'fulfilled' ? metricsResult.value.metrics : null,
        courses: coursesResult.status === 'fulfilled' ? coursesResult.value.courses : [],
        liveSessions: liveSessionsResult.status === 'fulfilled' ? liveSessionsResult.value.sessions : [],
        certificates: certificatesResult.status === 'fulfilled' ? certificatesResult.value.certificates : [],
      };
    },
    staleTime: 30_000,
    retry: 1,
  });
}

export function useEnrollments() {
  return useQuery({
    queryKey: queryKeys.enrollments,
    queryFn: async (): Promise<IEnrollment[]> => {
      const response = await api.getMyCourses();
      return response.enrollments;
    },
    staleTime: 30_000,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status && error.status < 500) return false;
      return failureCount < 2;
    },
  });
}

export function useAssignments() {
  return useQuery({
    queryKey: queryKeys.assignments,
    queryFn: async () => {
      const response = await api.getMyCourses();
      return response.enrollments ?? [];
    },
    staleTime: 30_000,
    retry: 1,
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: async () => {
      const response = await api.getMyCourses();
      return response.enrollments ?? [];
    },
    staleTime: 15_000,
    retry: 1,
  });
}

export function useCertificates() {
  return useQuery({
    queryKey: queryKeys.certificates,
    queryFn: async (): Promise<ICertificate[]> => {
      const response = await api.getCertificates();
      return response.certificates;
    },
    staleTime: 60_000,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status && error.status < 500) return false;
      return failureCount < 2;
    },
  });
}

export function useInvalidateQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
    },
  };
}
