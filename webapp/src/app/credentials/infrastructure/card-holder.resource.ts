import { BaseResource } from '../../shared/infrastructure/base-api-endpoint';
import { EnrollmentStatus, HolderRole } from '../domain/model/card-holder.entity';

export interface CardHolderResource extends BaseResource {
  code: string;
  fullName: string;
  email: string;
  role: HolderRole;
  program: string;
  enrollmentStatus: EnrollmentStatus | null;
}
