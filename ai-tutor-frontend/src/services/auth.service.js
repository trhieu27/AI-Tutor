import { Student } from '@/models/User';
const AUTH_BASE = '/api/v1';
class AuthService {
  constructor() {}
  setCookie(name, value, days) {
    const expires = new Date(Date.now() + days * 86400000).toUTCString();
    document.cookie = `${name}=${value};expires=${expires};path=/;SameSite=Lax`;
  }
  deleteCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
  }
  persistUser(rawUser) {
    try {
      localStorage.setItem('user', JSON.stringify(rawUser));
    } catch {}
  }
  static getInstance() {
    if (!AuthService.instance) AuthService.instance = new AuthService();
    return AuthService.instance;
  }
  async login(email, password) {
    const response = await fetch(`${AUTH_BASE}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password
      })
    });
    if (!response.ok) {
      const e = await response.json();
      throw new Error(e.detail || 'Login failed');
    }
    const data = await response.json();
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    this.persistUser(data.user);
    this.setCookie('access_token', data.access_token, 7);
    this.setCookie('refresh_token', data.refresh_token, 7);
    return {
      user: new Student(data.user.id, data.user.full_name, data.user.email, data.user.student_id, data.user.is_pro ?? false),
      accessToken: data.access_token,
      refreshToken: data.refresh_token
    };
  }
  async googleLogin(token) {
    const response = await fetch(`${AUTH_BASE}/google-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token
      })
    });
    if (!response.ok) {
      const e = await response.json();
      throw new Error(e.detail || 'Google login failed');
    }
    const data = await response.json();
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    this.persistUser(data.user);
    this.setCookie('access_token', data.access_token, 7);
    this.setCookie('refresh_token', data.refresh_token, 7);
    return {
      user: new Student(data.user.id, data.user.full_name, data.user.email, data.user.student_id, data.user.is_pro ?? false),
      accessToken: data.access_token,
      refreshToken: data.refresh_token
    };
  }
  async register(name, email, password) {
    const student_id = 'STU' + Math.floor(100000 + Math.random() * 900000).toString();
    const response = await fetch(`${AUTH_BASE}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        student_id,
        full_name: name,
        email,
        password
      })
    });
    if (!response.ok) {
      const e = await response.json();
      throw new Error(e.detail || 'Registration failed');
    }
    const data = await response.json();
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    this.persistUser(data.user);
    this.setCookie('access_token', data.access_token, 7);
    this.setCookie('refresh_token', data.refresh_token, 7);
    return {
      user: new Student(data.user.id, data.user.full_name, data.user.email, data.user.student_id, data.user.is_pro ?? false),
      accessToken: data.access_token,
      refreshToken: data.refresh_token
    };
  }
  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) return null;
      const response = await fetch(`${AUTH_BASE}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refresh_token: refreshToken
        })
      });
      if (!response.ok) {
        this.logout();
        return null;
      }
      const data = await response.json();
      localStorage.setItem('access_token', data.access_token);
      this.setCookie('access_token', data.access_token, 7);
      return data.access_token;
    } catch {
      return null;
    }
  }
  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    this.deleteCookie('access_token');
    this.deleteCookie('refresh_token');
  }
  async forgotPassword(email) {
    const response = await fetch(`${AUTH_BASE}/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email
      })
    });
    if (!response.ok) {
      const e = await response.json();
      throw new Error(e.detail || 'Không thể gửi yêu cầu khôi phục');
    }
  }
  async verifyOtp(email, otp) {
    const response = await fetch(`${AUTH_BASE}/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        otp
      })
    });
    if (!response.ok) {
      const e = await response.json();
      throw new Error(e.detail || 'Mã xác nhận không hợp lệ');
    }
  }
  async resetPassword(email, otp, password) {
    const response = await fetch(`${AUTH_BASE}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        otp,
        new_password: password
      })
    });
    if (!response.ok) {
      const e = await response.json();
      throw new Error(e.detail || 'Không thể đặt lại mật khẩu');
    }
  }
  async getCurrentUser() {
    try {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) return null;
      const response = await fetch(`${AUTH_BASE}/users/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (!response.ok) {
        if (response.status === 401) {
          const newToken = await this.refreshToken();
          if (newToken) return this.getCurrentUser();
        }
        return null;
      }
      const userData = await response.json();
      this.persistUser(userData);
      return new Student(userData.id, userData.full_name, userData.email, userData.student_id, userData.is_pro ?? false);
    } catch {
      return null;
    }
  }
}
export const authService = AuthService.getInstance();