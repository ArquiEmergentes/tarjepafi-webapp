import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { DataRecord } from '../domain/model/data-record.entity';
import { DataRecordResource } from './data-record.resource';

export class DataRecordAssembler implements BaseAssembler<DataRecord, DataRecordResource> {
  toEntityFromResource(r: DataRecordResource): DataRecord {
    return new DataRecord({ ...r, payload: r.payload ?? {} });
  }

  toResourceFromEntity(e: DataRecord): DataRecordResource {
    return { ...e.toProps() };
  }
}
