import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SimulatedClock } from '../../shared/application/simulated-clock.service';
import { LocalDateTime } from '../../shared/domain/date-time';
import { newId } from '../../shared/infrastructure/id-generator';
import { DataRecord, DataType, SourceContext } from '../domain/model/data-record.entity';
import { DataRecordsApiEndpoint } from '../infrastructure/data-records-api-endpoint';

export interface RecordFactInput {
  sourceContext: SourceContext;
  dataType: DataType;
  subjectId: string;
  payload: Record<string, unknown>;
  eventId?: string;
  occurredAt?: LocalDateTime;
}

/**
 * Puerta de entrada de Data Management: los demás contextos registran sus hechos aquí
 * en lugar de escribir directamente en la colección `dataRecords`.
 */
@Injectable({ providedIn: 'root' })
export class DataRecorder {
  private readonly api = inject(DataRecordsApiEndpoint);
  private readonly clock = inject(SimulatedClock);

  record(input: RecordFactInput): Observable<DataRecord> {
    const now = this.clock.now();
    return this.api.create(
      new DataRecord({
        id: newId('dr'),
        eventId: input.eventId ?? newId('evt'),
        sourceContext: input.sourceContext,
        dataType: input.dataType,
        subjectId: input.subjectId,
        occurredAt: input.occurredAt ?? now,
        recordedAt: now,
        payload: input.payload,
      }),
    );
  }
}
