export enum UserRole {
  STUDENT = 'STUDENT',
  ADMIN = 'ADMIN'
}

export abstract class User {
  constructor(
    public id: string,
    public full_name: string,
    public email: string,
    public role: UserRole,
    public student_id?: string,
    public avatarUrl?: string,
    public createdAt: Date = new Date()
  ) { }

  getProfile() {
    return {
      id: this.id,
      name: this.full_name,
      email: this.email,
      role: this.role,
      avatarUrl: this.avatarUrl,
    };
  }

  abstract getDashboardUrl(): string;
}

export class Student extends User {
  constructor(
    id: string,
    full_name: string,
    email: string,
    student_id?: string,
    avatarUrl?: string,
    public totalDocumentsUploaded: number = 0,
    public totalQuizzesTaken: number = 0,
    public lastActive: Date = new Date()
  ) {
    super(id, full_name, email, UserRole.STUDENT, student_id, avatarUrl);
  }

  getDashboardUrl(): string {
    return '/';
  }

  getSummaryStats() {
    return {
      documents: this.totalDocumentsUploaded,
      quizzes: this.totalQuizzesTaken
    };
  }
}

export class Admin extends User {
  constructor(
    id: string,
    full_name: string,
    email: string,
    avatarUrl?: string,
    public permissions: string[] = ['ALL']
  ) {
    super(id, full_name, email, UserRole.ADMIN, undefined, avatarUrl);
  }

  getDashboardUrl(): string {
    return '/admin';
  }

  hasPermission(permission: string): boolean {
    return this.permissions.includes('ALL') || this.permissions.includes(permission);
  }
}
