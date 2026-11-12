import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { Space } from '../domain/model/space.entity';
import { SpaceAssembler } from './space.assembler';
import { SpaceResource } from './space.resource';

@Injectable({ providedIn: 'root' })
export class SpacesApiEndpoint extends BaseApiEndpoint<Space, SpaceResource> {
  constructor() {
    super(inject(HttpClient), 'spaces', new SpaceAssembler());
  }
}
