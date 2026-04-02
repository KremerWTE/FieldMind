const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = API_URL;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('accessToken');
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
    }
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(data: any) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Buildings
  async getBuildings(page = 1) {
    return this.request(`/buildings?page=${page}`);
  }

  async getBuilding(id: string) {
    return this.request(`/buildings/${id}`);
  }

  async getBuildingPhotos(id: string, page = 1) {
    return this.request(`/buildings/${id}/photos?page=${page}`);
  }

  async getBuildingMaintenanceEvents(id: string) {
    return this.request(`/buildings/${id}/maintenance-events`);
  }

  async getBuildingHealthStats(id: string) {
    return this.request(`/buildings/${id}/health-stats`);
  }

  // Projects
  async getProjects() {
    return this.request('/projects');
  }

  async getProject(id: string) {
    return this.request(`/projects/${id}`);
  }

  // Photos
  async getPhotos(filters?: any) {
    const params = new URLSearchParams(filters).toString();
    return this.request(`/photos?${params}`);
  }

  async getPhoto(id: string) {
    return this.request(`/photos/${id}`);
  }

  async presignUpload(data: any) {
    return this.request('/photos/presign-upload', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async completeUpload(data: any) {
    return this.request('/photos/complete-upload', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient();
