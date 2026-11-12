import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AccessRecord } from '../domain/model/access-record.entity';
import { AccessRecordsApiEndpoint } from '../infrastructure/facility-api-endpoints';

/** Consulta de registros de acceso (A6), del más reciente al más antiguo. */
@Injectable({ providedIn: 'root' })
export class AccessRecordsQuery {
  private readonly api = inject(AccessRecordsApiEndpoint);

  all(): Promise<AccessRecord[]> {
    return firstValueFrom(this.api.getAll({ _sort: 'attemptedAt', _order: 'desc' }));
  }
}
