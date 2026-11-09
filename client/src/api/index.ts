import { IUser, ICourse, ITenant, IEnrollment, IAssessment, ICertificate, ILiveSession, IAuditLog, UserRole } from '../types';

export class ApiError extends Error {
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

function getRequestTimeoutMs() {
  return 20000;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers,
  };

  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const cleanEndpoint = normalizedEndpoint.startsWith('/api/')
    ? normalizedEndpoint.slice(4)
    : normalizedEndpoint === '/api'
      ? ''
      : normalizedEndpoint;

  const url = endpoint.startsWith('http://') || endpoint.startsWith('https://')
    ? endpoint
    : `${API_BASE}${cleanEndpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), getRequestTimeoutMs());

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    let data: any;
    const contentType = res.headers.get('content-type');
    try {
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        data = { message: text || `HTTP ${res.status}: ${res.statusText}` };
      }
    } catch {
      throw new ApiError('The server returned an invalid JSON response.', res.status, 'INVALID_JSON', res.status >= 500 || res.status === 408);
    }

    if (res.status === 401) {
      localStorage.removeItem('edusphere_token');
      throw new ApiError(data?.message || 'Your session has expired. Please sign in again.', 401, 'UNAUTHORIZED', false);
    }

    if (res.status === 403) {
      throw new ApiError(data?.message || 'You are not authorized to access this resource.', 403, 'FORBIDDEN', false);
    }

    if (!res.ok) {
      const message = data?.message || data?.error || `API request failed with status ${res.status}`;
      const code = data?.code || (data?.error === 'VALIDATION_ERROR' ? 'VALIDATION_ERROR' : 'HTTP_ERROR');
      throw new ApiError(
        message,
        res.status,
        code,
        res.status >= 500 || res.status === 429 || res.status === 408,
        data?.details
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('The request timed out. Please try again.', 408, 'TIMEOUT', false);
    }

    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new ApiError(error.message || 'A network error occurred while contacting the server.', 0, 'NETWORK_ERROR', true);
    }

    throw new ApiError('A network error occurred while contacting the server.', 0, 'NETWORK_ERROR', true);
  } finally {
    clearTimeout(timeoutId);
  }
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

  // Payments (Stripe Checkout)
  async createCheckoutSession(courseId: string, successUrl?: string, cancelUrl?: string): Promise<{
    message: string;
    session: {
      sessionId: string;
      paymentUrl: string;
      amount: number;
      currency: string;
      status: string;
    };
  }> {
    return request('/payments/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ courseId, successUrl, cancelUrl }),
    });
  },

  // Storage & Persistent Cloudflare R2 Uploads
  async getPresignedUpload(params: {
    fileName: string;
    fileType: string;
    fileSize: number;
    category: 'COURSE_MATERIAL' | 'IMAGE' | 'VIDEO_SOURCE' | 'VERIFICATION_DOC';
    isPublic?: boolean;
  }): Promise<{
    message: string;
    assetId: string;
    uploadUrl: string;
    downloadUrl: string;
    key: string;
    headers?: Record<string, string>;
  }> {
    return request('/storage/presigned-upload', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },
  async confirmUpload(assetId: string): Promise<{ message: string; asset: any }> {
    return request('/storage/confirm-upload', {
      method: 'POST',
      body: JSON.stringify({ assetId }),
    });
  },
  async uploadFile(
    file: File,
    category: 'COURSE_MATERIAL' | 'IMAGE' | 'VIDEO_SOURCE' | 'VERIFICATION_DOC' = 'COURSE_MATERIAL',
    isPublic: boolean = false
  ): Promise<{ assetId: string; fileUrl: string }> {
    const presigned = await this.getPresignedUpload({
      fileName: file.name,
      fileType: file.type || 'application/octet-stream',
      fileSize: file.size,
      category,
      isPublic,
    });

    const putRes = await fetch(presigned.uploadUrl, {
      method: 'PUT',
      headers: presigned.headers || { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    });

    if (!putRes.ok) {
      throw new Error(`Direct storage upload failed with HTTP status ${putRes.status}`);
    }

    const confirmed = await this.confirmUpload(presigned.assetId);
    return {
      assetId: presigned.assetId,
      fileUrl: confirmed.asset?.fileUrl || presigned.downloadUrl || presigned.uploadUrl.split('?')[0],
    };
  },

  // Password Recovery & Security Tokens
  async forgotPassword(email: string): Promise<{ message: string }> {
    return request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  },
  async verifyEmail(token: string): Promise<{ message: string }> {
    return request('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  // Course Reviews & Ratings (WEB-10)
  async getCourseReviews(courseId: string): Promise<{ reviews: any[] }> {
    return request(`/courses/${courseId}/reviews`);
  },
  async submitCourseReview(courseId: string, rating: number, comment: string): Promise<{ message: string; review: any }> {
    return request(`/courses/${courseId}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment }),
    });
  },

  // Course Announcements (LRN-07)
  async getCourseAnnouncements(courseId: string): Promise<{ announcements: any[] }> {
    return request(`/courses/${courseId}/announcements`);
  },
  async postCourseAnnouncement(courseId: string, title: string, content: string): Promise<{ message: string; announcement: any }> {
    return request(`/courses/${courseId}/announcements`, {
      method: 'POST',
      body: JSON.stringify({ title, content }),
    });
  },

  // Support & Help Desk (WEB-02, ADM-04)
  async submitSupportTicket(data: {
    fullName: string;
    email: string;
    category?: string;
    subject: string;
    message: string;
  }): Promise<{ message: string; ticket: any }> {
    return request('/support/ticket', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
