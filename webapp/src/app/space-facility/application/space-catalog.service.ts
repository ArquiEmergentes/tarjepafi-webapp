import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { Space } from '../domain/model/space.entity';
import { SpacesApiEndpoint } from '../infrastructure/spaces-api-endpoint';

/** Catálogo de espacios de solo lectura para otros contextos (que solo guardan el `spaceId`). */
@Injectable({ providedIn: 'root' })
export class SpaceCatalog {
  private readonly api = inject(SpacesApiEndpoint);
  private readonly items = signal<Space[]>([]);

  readonly spaces = this.items.asReadonly();
  readonly byId = computed(() => new Map(this.items().map((s) => [s.id, s])));

  load(): Observable<Space[]> {
    return this.api.getAll({ _sort: 'code' }).pipe(tap((list) => this.items.set(list)));
  }
}
