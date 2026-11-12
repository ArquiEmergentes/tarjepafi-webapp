import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { User } from '../domain/model/user.entity';
import { UserResource } from './user.resource';

export class UserAssembler implements BaseAssembler<User, UserResource> {
  toEntityFromResource(r: UserResource): User {
    return new User({
      id: r.id,
      email: r.email,
      role: r.role,
      status: r.status,
      cardHolderId: r.cardHolderId ?? null,
      fullName: r.fullName,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    });
  }

  toResourceFromEntity(e: User): UserResource {
    return { ...e.toProps() };
  }
}
