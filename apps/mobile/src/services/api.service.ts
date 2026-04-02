import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';

/**
 * API Service - Central API client for all backend communication
 *
 * Features:
 * - Automatic JWT token management
 * - Request/response interceptors
 * - Error handling
 * - Type-safe API calls
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

class ApiService {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - Add auth token
    this.client.interceptors.request.use(
      async (config) => {
        if (!this.accessToken) {
          this.accessToken = await SecureStore.getItemAsync('accessToken');
        }

        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - Handle errors and token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Token expired - try to refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = await SecureStore.getItemAsync('refreshToken');
            if (refreshToken) {
              const response = await this.client.post('/auth/refresh', {
                refreshToken,
              });

              const { token } = response.data;
              await this.setTokens(token, refreshToken);

              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed - logout
            await this.clearTokens();
            throw refreshError;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Token management
  async setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
  }

  async clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    const { accessToken, refreshToken, user } = response.data;
    await this.setTokens(accessToken, refreshToken);
    return { user, accessToken, refreshToken };
  }

  async loginWithPin(pin: string) {
    const response = await this.client.post('/auth/login-pin', { pin });
    const { accessToken, refreshToken, user } = response.data;
    await this.setTokens(accessToken, refreshToken);
    return { user, accessToken, refreshToken };
  }

  async register(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    const response = await this.client.post('/auth/register', data);
    const { token, refreshToken, user } = response.data;
    await this.setTokens(token, refreshToken);
    return { user, token, refreshToken };
  }

  async logout() {
    try {
      await this.client.post('/auth/logout');
    } finally {
      await this.clearTokens();
    }
  }

  async getCurrentUser() {
    const response = await this.client.get('/me');
    return response.data;
  }

  // Buildings endpoints
  async getBuildings(params?: { search?: string; page?: number; pageSize?: number }) {
    const response = await this.client.get('/buildings', { params });
    return response.data;
  }

  async getBuilding(id: string) {
    const response = await this.client.get(`/buildings/${id}`);
    return response.data;
  }

  async getBuildingPhotos(buildingId: string, params?: {
    folderId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
  }) {
    const response = await this.client.get(`/buildings/${buildingId}/photos`, { params });
    return response.data;
  }

  async getBuildingMaintenanceEvents(buildingId: string) {
    const response = await this.client.get(`/buildings/${buildingId}/maintenance-events`);
    return response.data;
  }

  async getBuildingHealthStats(buildingId: string, params?: {
    metricType?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const response = await this.client.get(`/buildings/${buildingId}/health-stats`, { params });
    return response.data;
  }

  // Projects endpoints
  async getProjects(params?: { buildingId?: string; status?: string }) {
    const response = await this.client.get('/projects', { params });
    return response.data;
  }

  async getProject(id: string) {
    const response = await this.client.get(`/projects/${id}`);
    return response.data;
  }

  async getFolders(projectId: string) {
    const response = await this.client.get(`/projects/${projectId}/folders`);
    return response.data;
  }

  async createFolder(projectId: string, name: string) {
    const response = await this.client.post(`/projects/${projectId}/folders`, { name });
    return response.data;
  }

  // Photos endpoints
  async getPresignedUploadUrl(data: {
    buildingId: string;
    projectId: string;
    folderId?: string;
    filename: string;
    contentType: string;
  }) {
    const response = await this.client.post('/photos/presign-upload', data);
    return response.data; // { uploadUrl, key, photoId }
  }

  async completeUpload(data: {
    photoId: string;
    geoLat?: number;
    geoLng?: number;
    capturedAt?: string;
    exifJson?: any;
  }) {
    const response = await this.client.post('/photos/complete-upload', data);
    return response.data;
  }

  async getPhoto(id: string) {
    const response = await this.client.get(`/photos/${id}`);
    return response.data;
  }

  async updatePhoto(id: string, data: {
    folderId?: string;
    tags?: string[];
  }) {
    const response = await this.client.patch(`/photos/${id}`, data);
    return response.data;
  }

  async deletePhoto(id: string) {
    await this.client.delete(`/photos/${id}`);
  }

  async addPhotoNote(photoId: string, content: string) {
    const response = await this.client.post(`/photos/${photoId}/notes`, { content });
    return response.data;
  }

  async getPhotoTasks(photoId: string) {
    const response = await this.client.get(`/photos/${photoId}/tasks`);
    return response.data;
  }

  async createPhotoTask(photoId: string, data: {
    title: string;
    description?: string;
    assigneeId?: string;
    dueDate?: string;
  }) {
    const response = await this.client.post(`/photos/${photoId}/tasks`, data);
    return response.data;
  }

  async updateTask(taskId: string, data: {
    title?: string;
    description?: string;
    status?: string;
    assigneeId?: string;
    dueDate?: string;
  }) {
    const response = await this.client.patch(`/tasks/${taskId}`, data);
    return response.data;
  }

  // Search endpoints
  async searchPhotos(params: {
    query?: string;
    buildingId?: string;
    projectId?: string;
    folderId?: string;
    tags?: string[];
    categories?: string[];
    minSeverity?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
  }) {
    const response = await this.client.post('/search', params);
    return response.data;
  }

  async getTags() {
    const response = await this.client.get('/search/tags');
    return response.data;
  }

  async getCategories() {
    const response = await this.client.get('/search/categories');
    return response.data;
  }

  // Share links
  async createShareLink(data: {
    scope: 'building' | 'project' | 'folder';
    scopeId: string;
    title?: string;
    description?: string;
    password?: string;
    expiresAt?: string;
  }) {
    const response = await this.client.post('/share/links', data);
    return response.data;
  }

  async getShareLinks() {
    const response = await this.client.get('/share/links');
    return response.data;
  }

  // Reports
  async generateReport(data: {
    type: 'Building' | 'Project' | 'Folder';
    entityId: string;
    dateFrom?: string;
    dateTo?: string;
    includeAI?: boolean;
    includeMaintenanceEvents?: boolean;
    includeHealthStats?: boolean;
  }) {
    const response = await this.client.post('/reports/generate', data);
    return response.data; // { jobId }
  }

  async getReportStatus(jobId: string) {
    const response = await this.client.get(`/reports/${jobId}/status`);
    return response.data;
  }

  async getReports() {
    const response = await this.client.get('/reports');
    return response.data;
  }

  // Features
  async getFeatures() {
    const response = await this.client.get('/features');
    return response.data;
  }

  // Company
  async getCompanyInfo() {
    const response = await this.client.get('/company/info');
    return response.data;
  }

  async getCompanyStats() {
    const response = await this.client.get('/company/stats');
    return response.data;
  }

  async getPricing() {
    const response = await this.client.get('/company/pricing');
    return response.data;
  }
}

export default new ApiService();
