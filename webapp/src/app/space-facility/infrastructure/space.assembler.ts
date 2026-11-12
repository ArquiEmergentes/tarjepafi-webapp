import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { Space } from '../domain/model/space.entity';
import { SpaceResource } from './space.resource';

export class SpaceAssembler implements BaseAssembler<Space, SpaceResource> {
  toEntityFromResource(r: SpaceResource): Space {
    return new Space({ ...r, allowedRoles: r.allowedRoles ?? [] });
  }

  toResourceFromEntity(e: Space): SpaceResource {
    return { ...e.toProps() };
  }
}
