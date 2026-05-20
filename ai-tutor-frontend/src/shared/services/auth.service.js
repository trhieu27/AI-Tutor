import { Admin, Student } from '@/shared/models/User';

const AUTH_BASE = '/api/v1';

function createUserInstance(userData) {
  if (!userData) return null;
  if (userData.role === 'ADMIN') {
    return new Admin(userData.id, userData.full_name, userData.email);
  }
  return new Student(userData.id, userData.full_name, userData.email, userData.student_id, userData.is_pro ?? false);
}

async function safeJson(res, fallback = null) {
  try {
    const text = await res.text();
    if (!text || !text.trim()) return fallback;
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

class AuthService {
  constructor() {}
  _refreshPromise = null;
  _lastRefreshErrorStatus = null;

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
      const e = await safeJson(response, {});
      throw new Error(e.detail || 'Login failed');
    }
    const data = await safeJson(response, {});
    this._refreshPromise = null;
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    this.persistUser(data.user);
    this.setCookie('access_token', data.access_token, 7);
    this.setCookie('refresh_token', data.refresh_token, 7);
    return {
      user: createUserInstance(data.user),
      accessToken: data.access_token,
      refreshToken: data.refresh_token
    };
  }
  async adminLogin(email, password) {
    const response = await fetch(`${AUTH_BASE}/admin-login`, {
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
      const e = await safeJson(response, {});
      throw new Error(e.detail || 'Admin login failed');
    }
    const data = await safeJson(response, {});
    this._refreshPromise = null;
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    this.persistUser(data.user);
    this.setCookie('access_token', data.access_token, 7);
    this.setCookie('refresh_token', data.refresh_token, 7);
    return {
      user: createUserInstance(data.user),
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
      const e = await safeJson(response, {});
      throw new Error(e.detail || 'Google login failed');
    }
    const data = await safeJson(response, {});
    this._refreshPromise = null;
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    this.persistUser(data.user);
    this.setCookie('access_token', data.access_token, 7);
    this.setCookie('refresh_token', data.refresh_token, 7);
    return {
      user: createUserInstance(data.user),
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
      const e = await safeJson(response, {});
      throw new Error(e.detail || 'Registration failed');
    }
    const data = await safeJson(response, {});
    this._refreshPromise = null;
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    this.persistUser(data.user);
    this.setCookie('access_token', data.access_token, 7);
    this.setCookie('refresh_token', data.refresh_token, 7);
    return {
      user: createUserInstance(data.user),
      accessToken: data.access_token,
      refreshToken: data.refresh_token
    };
  }
  async refreshToken() {
    if (this._refreshPromise) return this._refreshPromise;

    this._refreshPromise = (async () => {
      this._lastRefreshErrorStatus = null;
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
        this._lastRefreshErrorStatus = response.status;
        return null;
      }

      const data = await safeJson(response, {});
      if (!data.access_token) return null;
      localStorage.setItem('access_token', data.access_token);
      this.setCookie('access_token', data.access_token, 7);
      return data.access_token;
    })();

    try {
      return await this._refreshPromise;
    } catch {
      this._lastRefreshErrorStatus = 0;
      return null;
    } finally {
      this._refreshPromise = null;
    }
  }
  shouldLogoutAfterRefreshFailure() {
    return this._lastRefreshErrorStatus === null ||
      this._lastRefreshErrorStatus === 400 ||
      this._lastRefreshErrorStatus === 401 ||
      this._lastRefreshErrorStatus === 403;
  }
  _presenceController = null;
  async updatePresence(state = 'online', options = {}) {
    try {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) return null;
      // Abort any in-flight presence call to prevent pile-up
      if (this._presenceController) {
        this._presenceController.abort();
      }
      const controller = new AbortController();
      this._presenceController = controller;
      // Auto-abort after 8s to avoid hanging requests
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(`${AUTH_BASE}/users/presence`, {
        method: 'POST',
        keepalive: Boolean(options.keepalive),
        signal: options.keepalive ? undefined : controller.signal,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ state })
      });
      clearTimeout(timeoutId);
      this._presenceController = null;
      if (!response.ok) return null;
      return safeJson(response, null);
    } catch {
      this._presenceController = null;
      return null;
    }
  }
  logout() {
    this._refreshPromise = null;
    this._lastRefreshErrorStatus = null;
    this.updatePresence('offline', { keepalive: true });
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
      const e = await safeJson(response, {});
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
      const e = await safeJson(response, {});
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
      const e = await safeJson(response, {});
      throw new Error(e.detail || 'Không thể đặt lại mật khẩu');
    }
  }
  async getCurrentUser(shouldRetry = true) {
    try {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) return null;
      const response = await fetch(`${AUTH_BASE}/users/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (!response.ok) {
        if (response.status === 401 && shouldRetry) {
          const newToken = await this.refreshToken();
          if (newToken) return this.getCurrentUser(false);
        }
        return null;
      }
      const userData = await safeJson(response);
      if (!userData) return null;
      this.persistUser(userData);
      return createUserInstance(userData);
    } catch {
      return null;
    }
  }
}
export const authService = AuthService.getInstance();
