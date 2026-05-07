export enum UserRole {
  STUDENT = 'STUDENT',
  ADMIN = 'ADMIN'
}

export abstract class User {
  constructor(
    public id,
    public full_name,
    public email,
    public role: UserRole,
    public isPro = false,
    public student_id = null,
    public createdAt = new Date()
  ) { }

  getProfile() {
    return {
      id: this.id,
      name: this.full_name,
      email: this.email,
      role: this.role,
    };
  }

  abstract getDashboardUrl(): string;
}

export class Student extends User {
  constructor(
    id,
    full_name,
    email,
    student_id,
    public isPro_flag = false,
    public totalDocumentsUploaded = 0,
    public totalQuizzesTaken = 0,
    public lastActive = new Date()
  ) {
    super(id, full_name, email, UserRole.STUDENT, isPro_flag, student_id);
  }

  getDashboardUrl() {
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
    id,
    full_name,
    email,
    public permissions = ['ALL']
  ) {
    super(id, full_name, email, UserRole.ADMIN, false, null);
  }

  getDashboardUrl() {
    return '/admin';
  }

  hasPermission(permission) {
    return this.permissions.includes('ALL') || this.permissions.includes(permission);
  }
}
