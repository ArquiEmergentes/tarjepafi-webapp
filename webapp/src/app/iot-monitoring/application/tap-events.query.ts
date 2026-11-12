import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { LocalDateTime } from '../../shared/domain/date-time';
import { CardTapEvent } from '../domain/model/card-tap-event.entity';
import { CardTapEventsApiEndpoint } from '../infrastructure/iot-api-endpoints';

/** Consultas de lecturas NFC para el dashboard. */
@Injectable({ providedIn: 'root' })
export class TapEventsQuery {
  private readonly api = inject(CardTapEventsApiEndpoint);

  /** Lecturas de un día hasta la hora indicada (la hora simulada). */
  between(start: LocalDateTime, end: LocalDateTime): Promise<CardTapEvent[]> {
    return firstValueFrom(this.api.getAll({ tappedAt_gte: start, tappedAt_lte: end, _sort: 'tappedAt', _order: 'desc' }));
  }
}
