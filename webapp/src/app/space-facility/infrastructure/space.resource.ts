import { BaseResource } from '../../shared/infrastructure/base-api-endpoint';
import { AccessPolicy, HolderRole, SpaceStatus, SpaceType } from '../domain/model/space.entity';

export interface SpaceResource extends BaseResource {
  code: string;
  name: string;
  type: SpaceType;
  building: string;
  floor: number;
  capacity: number;
  status: SpaceStatus;
  accessPolicy: AccessPolicy;
  allowedRoles: HolderRole[];
}
