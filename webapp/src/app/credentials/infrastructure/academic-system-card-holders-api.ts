import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { CardHolder } from '../domain/model/card-holder.entity';
import { CardHolderAssembler } from './card-holder.assembler';
import { CardHolderResource } from './card-holder.resource';

/**
 * Titulares y estado de matrícula. Hoy se leen de json-server; con una alianza con la UPC
 * vendrían del Sistema Académico. Solo hay que reemplazar este servicio, no el dominio ni las vistas.
 */
@Injectable({ providedIn: 'root' })
export class AcademicSystemCardHoldersApi extends BaseApiEndpoint<CardHolder, CardHolderResource> {
  constructor() {
    super(inject(HttpClient), 'cardHolders', new CardHolderAssembler());
  }

  findByCode(code: string): Observable<CardHolder | null> {
    return this.getAll({ code: code.trim().toUpperCase() }).pipe(map((found) => found[0] ?? null));
  }
}
