export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'STAFF';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface UserProps {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  cardHolderId: string | null;
  fullName: string;
  createdAt: string;
  updatedAt: string;
}

export class User {
  readonly id: string;
  readonly email: string;
  readonly role: UserRole;
  readonly status: UserStatus;
  readonly cardHolderId: string | null;
  readonly fullName: string;
  readonly createdAt: string;
  readonly updatedAt: string;

  constructor(props: UserProps) {
    this.id = props.id;
    this.email = props.email;
    this.role = props.role;
    this.status = props.status;
    this.cardHolderId = props.cardHolderId;
    this.fullName = props.fullName;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /** Solo las cuentas ACTIVE pueden iniciar sesión. */
  isEnabled(): boolean {
    return this.status === 'ACTIVE';
  }

  hasRole(...roles: UserRole[]): boolean {
    return roles.includes(this.role);
  }

  toProps(): UserProps {
    return { ...this };
  }
}
