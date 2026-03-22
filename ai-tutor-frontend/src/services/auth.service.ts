import { User, Student } from '@/models/User';

class AuthService {
  private static instance: AuthService;
  private readonly baseUrl = 'http://localhost:8000/api/auth';

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public async login(email: string, password: string): Promise<{ user: User; token: string }> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (email && password) {
          resolve({
            user: new Student('1', 'Demo User', email),
            token: 'demo_token_123',
          });
        } else {
          reject(new Error('Login failed'));
        }
      }, 1000);
    });
  }

  public async register(name: string, email: string, password: string): Promise<{ user: User; token: string }> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (name && email && password) {
          resolve({
            user: new Student('2', name, email),
            token: 'demo_token_456',
          });
        } else {
          reject(new Error('Registration failed'));
        }
      }, 1000);
    });
  }

  public logout(): void {
    // Implement any backend logout logic here if needed
  }
}

export const authService = AuthService.getInstance();
