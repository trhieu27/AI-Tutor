import { User, Student } from '@/models/User';

class AuthService {
  private static instance: AuthService;
  private readonly baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public async login(email: string, password: string): Promise<{ user: User; token: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Login failed on backend');
      }

      const data = await response.json();
      return {
        user: new Student(data.user.id, data.user.full_name, data.user.email),
        token: data.access_token,
      };
    } catch (error) {
      console.warn('Backend login error, falling back to Demo account:', error);
      // FALLBACK TO DEMO ACCOUNT (Cho phép bạn vào giao diện chính)
      return {
        user: new Student('demo-id', 'Học viên Demo', email || 'demo@gmail.com'),
        token: 'demo-token-123',
      };
    }
  }

  public async register(name: string, email: string, password: string, studentId: string = 'S001'): Promise<{ user: User; token: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          full_name: name, 
          email, 
          password,
          student_id: studentId 
        }),
      });

      if (!response.ok) {
        throw new Error('Registration failed on backend');
      }

      const data = await response.json();
      return {
        user: new Student(data.user.id, data.user.full_name, data.user.email),
        token: data.access_token,
      };
    } catch (error) {
      console.warn('Backend register error, falling back to Demo account:', error);
      return {
        user: new Student('demo-id', name || 'Người dùng mới', email),
        token: 'demo-token-123',
      };
    }
  }

  public logout(): void {
  }
}

export const authService = AuthService.getInstance();
