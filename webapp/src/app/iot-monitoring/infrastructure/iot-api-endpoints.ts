import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { Incident } from '../domain/model/incident.entity';
import { Reader } from '../domain/model/reader.entity';
import { TelemetrySample } from '../domain/model/telemetry-sample.entity';
import { IncidentAssembler, ReaderAssembler, TelemetryAssembler } from './iot.assemblers';
import { IncidentResource, ReaderResource, TelemetryResource } from './iot.resources';

@Injectable({ providedIn: 'root' })
export class ReadersApiEndpoint extends BaseApiEndpoint<Reader, ReaderResource> {
  constructor() {
    super(inject(HttpClient), 'readers', new ReaderAssembler());
  }
}

@Injectable({ providedIn: 'root' })
export class TelemetryApiEndpoint extends BaseApiEndpoint<TelemetrySample, TelemetryResource> {
  constructor() {
    super(inject(HttpClient), 'telemetry', new TelemetryAssembler());
  }
}

@Injectable({ providedIn: 'root' })
export class IncidentsApiEndpoint extends BaseApiEndpoint<Incident, IncidentResource> {
  constructor() {
    super(inject(HttpClient), 'incidents', new IncidentAssembler());
  }
}
