import { BaseResource } from '../../shared/infrastructure/base-api-endpoint';
import { UserRole, UserStatus } from '../domain/model/user.entity';

export interface UserResource extends BaseResource {
  email: string;
  /** Texto plano: solo para la demo con json-server. Nunca sale de la capa de infraestructura. */
  password?: string;
  role: UserRole;
  status: UserStatus;
  cardHolderId: string | null;
  fullName: string;
  createdAt: string;
  updatedAt: string;
}
