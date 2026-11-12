import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { DataRecord } from '../domain/model/data-record.entity';
import { DataRecordAssembler } from './data-record.assembler';
import { DataRecordResource } from './data-record.resource';

@Injectable({ providedIn: 'root' })
export class DataRecordsApiEndpoint extends BaseApiEndpoint<DataRecord, DataRecordResource> {
  constructor() {
    super(inject(HttpClient), 'dataRecords', new DataRecordAssembler());
  }
}
