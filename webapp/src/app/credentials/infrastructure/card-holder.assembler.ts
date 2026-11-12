import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { CardHolder } from '../domain/model/card-holder.entity';
import { CardHolderResource } from './card-holder.resource';

export class CardHolderAssembler implements BaseAssembler<CardHolder, CardHolderResource> {
  toEntityFromResource(r: CardHolderResource): CardHolder {
    return new CardHolder({ ...r, enrollmentStatus: r.enrollmentStatus ?? null });
  }

  toResourceFromEntity(e: CardHolder): CardHolderResource {
    return { ...e.toProps() };
  }
}
