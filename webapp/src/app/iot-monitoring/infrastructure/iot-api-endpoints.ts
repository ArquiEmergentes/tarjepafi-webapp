import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { CardTapEvent } from '../domain/model/card-tap-event.entity';
import { Incident } from '../domain/model/incident.entity';
import { Reader } from '../domain/model/reader.entity';
import { TelemetrySample } from '../domain/model/telemetry-sample.entity';
import { CardTapEventAssembler, IncidentAssembler, ReaderAssembler, TelemetryAssembler } from './iot.assemblers';
import { CardTapEventResource, IncidentResource, ReaderResource, TelemetryResource } from './iot.resources';

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
export class CardTapEventsApiEndpoint extends BaseApiEndpoint<CardTapEvent, CardTapEventResource> {
  constructor() {
    super(inject(HttpClient), 'cardTapEvents', new CardTapEventAssembler());
  }
}

@Injectable({ providedIn: 'root' })
export class IncidentsApiEndpoint extends BaseApiEndpoint<Incident, IncidentResource> {
  constructor() {
    super(inject(HttpClient), 'incidents', new IncidentAssembler());
  }
}
