const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

class ApiService {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = API_URL;
  }

  setToken(token: string) {
    this.token = token;
  }

  async login(email: string, password: string) {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (data.accessToken) {
      this.setToken(data.accessToken);
    }
    return data;
  }

  async presignUpload(data: any) {
    const response = await fetch(`${this.baseUrl}/photos/presign-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(data),
    });

    return response.json();
  }

  async completeUpload(data: any) {
    const response = await fetch(`${this.baseUrl}/photos/complete-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(data),
    });

    return response.json();
  }
}

export const api = new ApiService();
