import { IUser, ICourse, ITenant, IEnrollment, IAssessment, ICertificate, ILiveSession, IAuditLog, UserRole } from '../types';

// Robust API Base URL resolution:
// In local development, Vite proxies '/api' to 'http://localhost:5000'
// In production (Cloudflare Pages), VITE_API_URL points to the Render backend (e.g. 'https://unique-e-learning-platform.onrender.com')
const rawApiUrl = import.meta.env.VITE_API_URL?.trim();
const API_BASE = rawApiUrl
  ? rawApiUrl.replace(/\/+$/, '').endsWith('/api')
    ? rawApiUrl.replace(/\/+$/, '')
    : `${rawApiUrl.replace(/\/+$/, '')}/api`
  : '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('edusphere_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers,
  };

  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  // Prevent accidental '/api/api/...' duplication if endpoint already contains '/api'
  const cleanEndpoint = normalizedEndpoint.startsWith('/api/')
    ? normalizedEndpoint.slice(4)
    : normalizedEndpoint === '/api'
      ? ''
      : normalizedEndpoint;

  const url = endpoint.startsWith('http://') || endpoint.startsWith('https://')
    ? endpoint
    : `${API_BASE}${cleanEndpoint}`;

  const res = await fetch(url, {
    ...options,
    headers,
  });

  let data: any;
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    data = { message: text || `HTTP ${res.status}: ${res.statusText}` };
  }

  if (!res.ok) {
    throw new Error(data.message || `API request failed with status ${res.status}`);
  }
  return data as T;
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: IUser }> {
    const res = await request<{ token: string; user: IUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('edusphere_token', res.token);
    return res;
  },
  async register(fullName: string, email: string, password: string, role?: string): Promise<{ token: string; user: IUser }> {
    const res = await request<{ token: string; user: IUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ fullName, email, password, role }),
    });
    localStorage.setItem('edusphere_token', res.token);
    return res;
  },
  async getMe(): Promise<{ user: IUser }> {
    return request('/auth/me');
  },
  async switchRole(newRole: UserRole): Promise<{ token: string; user: IUser }> {
    const res = await request<{ token: string; user: IUser }>('/auth/switch-role', {
      method: 'POST',
      body: JSON.stringify({ newRole }),
    });
    localStorage.setItem('edusphere_token', res.token);
    return res;
  },
  logout() {
    localStorage.removeItem('edusphere_token');
  },

  // Courses
  async getCourses(params?: { category?: string; search?: string; level?: string }): Promise<{ courses: ICourse[] }> {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    if (params?.level) query.append('level', params.level);
    return request(`/courses?${query.toString()}`);
  },
  async getCourse(id: string): Promise<{ course: ICourse; assessmentPreview?: any }> {
    return request(`/courses/${id}`);
  },
  async getMyCourses(): Promise<{ enrollments: IEnrollment[] }> {
    return request('/courses/my-courses');
  },
  async createCourse(courseData: Partial<ICourse>): Promise<{ course: ICourse }> {
    return request('/courses', {
      method: 'POST',
      body: JSON.stringify(courseData),
    });
  },
  async enroll(courseId: string): Promise<{ enrollment: IEnrollment }> {
    return request(`/courses/${courseId}/enroll`, {
      method: 'POST',
    });
  },
  async updateProgress(courseId: string, lessonId: string): Promise<{ enrollment: IEnrollment }> {
    return request(`/courses/${courseId}/progress`, {
      method: 'PATCH',
      body: JSON.stringify({ lessonId }),
    });
  },

  // Assessments & Anti-Cheating
  async getAssessment(id: string): Promise<{ assessment: IAssessment }> {
    return request(`/assessments/${id}`);
  },
  async submitAssessment(id: string, payload: { answers: any[]; proctoringFlags: any[]; startedAt: string }): Promise<{
    submission: any;
    percentageScore: number;
    passed: boolean;
    certificate?: ICertificate;
  }> {
    return request(`/assessments/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  async recordTelemetry(assessmentId: string, eventType: string, details?: string): Promise<any> {
    return request(`/assessments/${assessmentId}/telemetry`, {
      method: 'POST',
      body: JSON.stringify({ eventType, details }),
    });
  },

  // Tenants & Admin
  async getTenants(): Promise<{ tenants: ITenant[] }> {
    return request('/tenants');
  },
  async registerTenant(data: any): Promise<{ tenant: ITenant }> {
    return request('/tenants/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  async updateTenantStatus(id: string, status: string, remarks?: string): Promise<{ tenant: ITenant }> {
    return request(`/tenants/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, remarks }),
    });
  },
  async getAdminMetrics(): Promise<{
    metrics: {
      totalInstitutions: number;
      pendingInstitutions: number;
      totalUsers: number;
      totalCourses: number;
      activeLearners: number;
    };
    allInstitutions?: ITenant[];
    recentInstitutions: ITenant[];
    recentActivities: IAuditLog[];
  }> {
    return request('/admin/metrics');
  },
  async getAdmissions(params?: { institutionId?: string; status?: string }): Promise<{ admissions: any[] }> {
    const query = new URLSearchParams();
    if (params?.institutionId) query.append('institutionId', params.institutionId);
    if (params?.status) query.append('status', params.status);
    return request(`/admin/admissions?${query.toString()}`);
  },
  async updateAdmissionStatus(id: string, status: 'ACCEPTED' | 'REJECTED' | 'PENDING', remarks?: string): Promise<{ admission: any; message: string }> {
    return request(`/admin/admissions/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, remarks }),
    });
  },

  // Live Classrooms
  async getLiveSessions(): Promise<{ sessions: ILiveSession[] }> {
    return request('/live-sessions');
  },
  async joinLiveSession(id: string): Promise<{ session: ILiveSession; token: string; participant: any }> {
    return request(`/live-sessions/${id}/join`, {
      method: 'POST',
    });
  },

  // Certificates
  async getCertificates(): Promise<{ certificates: ICertificate[] }> {
    return request('/certificates');
  },
  async verifyCertificate(code: string): Promise<{ valid: boolean; certificate?: ICertificate; message: string }> {
    return request(`/certificates/verify/${code}`);
  },
};
