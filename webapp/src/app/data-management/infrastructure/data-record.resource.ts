import { BaseResource } from '../../shared/infrastructure/base-api-endpoint';
import { DataType, SourceContext } from '../domain/model/data-record.entity';

export interface DataRecordResource extends BaseResource {
  eventId: string;
  sourceContext: SourceContext;
  dataType: DataType;
  subjectId: string;
  occurredAt: string;
  recordedAt: string;
  payload: Record<string, unknown>;
}
