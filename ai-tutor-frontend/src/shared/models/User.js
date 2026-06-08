export const UserRole = Object.freeze({
  STUDENT: 'STUDENT',
  ADMIN: 'ADMIN',
});
export class User {
  constructor(id, full_name, email, role, isPro = false, student_id = null, createdAt = new Date()) {
    this.id = id;
    this.full_name = full_name;
    this.email = email;
    this.role = role;
    this.isPro = isPro;
    this.student_id = student_id;
    this.createdAt = createdAt;
  }
  get is_pro() {
    return this.isPro;
  }
  get isProUser() {
    return this.isPro;
  }
  getProfile() {
    return {
      id: this.id,
      name: this.full_name,
      email: this.email,
      role: this.role
    };
  }
}
export class Student extends User {
  constructor(id, full_name, email, student_id, isProUser = false, totalDocumentsUploaded = 0, totalQuizzesTaken = 0, lastActive = new Date()) {
    super(id, full_name, email, UserRole.STUDENT, isProUser, student_id);
    this.totalDocumentsUploaded = totalDocumentsUploaded;
    this.totalQuizzesTaken = totalQuizzesTaken;
    this.lastActive = lastActive;
  }
  get is_pro() {
    return this.isPro;
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
  constructor(id, full_name, email, permissions = ['ALL']) {
    super(id, full_name, email, UserRole.ADMIN, false, null);
    this.permissions = permissions;
  }
  getDashboardUrl() {
    return '/admin';
  }
  hasPermission(permission) {
    return this.permissions.includes('ALL') || this.permissions.includes(permission);
  }
}