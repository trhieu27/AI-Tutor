import { User, Student } from '@/models/User';
import { API_BASE_URL } from '@/constants/config';

class AuthService {
  private static instance: AuthService;
  private readonly baseUrl = process.env.NEXT_PUBLIC_API_URL || API_BASE_URL;

  private constructor() { }

  private setCookie(name: string, value: string, days: number) {
    if (typeof document === 'undefined') return;
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  }

  private deleteCookie(name: string) {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public async login(email: string, password: string): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const data = await response.json();

      // Save tokens to localStorage and cookies
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Cookies for middleware (7 days)
        this.setCookie('access_token', data.access_token, 7);
        this.setCookie('refresh_token', data.refresh_token, 7);
      }

      return {
        user: new Student(data.user.id, data.user.full_name, data.user.email, data.user.student_id),
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
      };
    } catch (error) {
      console.error('Backend login error:', error);
      throw error;
    }
  }

  public async googleLogin(token: string): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/google-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Google login failed');
      }

      const data = await response.json();

      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.user));

        this.setCookie('access_token', data.access_token, 7);
        this.setCookie('refresh_token', data.refresh_token, 7);
      }

      return {
        user: new Student(data.user.id, data.user.full_name, data.user.email, data.user.student_id),
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
      };
    } catch (error) {
      console.error('Backend Google login error:', error);
      throw error;
    }
  }

  public async register(name: string, email: string, password: string): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    try {
      const student_id = "STU" + Math.floor(100000 + Math.random() * 900000).toString();

      const response = await fetch(`${this.baseUrl}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          student_id: student_id,
          full_name: name,
          email,
          password
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Registration failed');
      }

      const data = await response.json();

      // Save tokens
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.user));

        this.setCookie('access_token', data.access_token, 7);
        this.setCookie('refresh_token', data.refresh_token, 7);
      }

      return {
        user: new Student(data.user.id, data.user.full_name, data.user.email, data.user.student_id),
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
      };
    } catch (error) {
      console.error('Backend register error:', error);
      throw error;
    }
  }

  public async refreshToken(): Promise<string | null> {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) return null;

      const response = await fetch(`${this.baseUrl}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        this.logout();
        return null;
      }

      const data = await response.json();
      localStorage.setItem('access_token', data.access_token);
      this.setCookie('access_token', data.access_token, 7);
      return data.access_token;
    } catch (error) {
      console.error('Refresh token error:', error);
      return null;
    }
  }

  public logout(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      this.deleteCookie('access_token');
      this.deleteCookie('refresh_token');
    }
  }

  public async forgotPassword(email: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Không thể gửi yêu cầu khôi phục');
    }
  }

  public async verifyOtp(email: string, otp: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Mã xác nhận không hợp lệ');
    }
  }

  public async resetPassword(email: string, otp: string, password: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, new_password: password }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Không thể đặt lại mật khẩu');
    }
  }

  public async getCurrentUser(): Promise<User | null> {
    try {
      if (typeof window === 'undefined') return null;
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) return null;

      const response = await fetch(`${this.baseUrl}/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          const newToken = await this.refreshToken();
          if (newToken) return this.getCurrentUser();
        }
        return null;
      }

      const userData = await response.json();
      const user = new Student(
        userData.id,
        userData.full_name,
        userData.email,
        userData.student_id,
        userData.avatarUrl
      );

      localStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }
}

export const authService = AuthService.getInstance();
