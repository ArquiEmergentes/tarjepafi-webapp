import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { Incident } from '../domain/model/incident.entity';
import { Reader } from '../domain/model/reader.entity';
import { TelemetrySample } from '../domain/model/telemetry-sample.entity';
import { IncidentResource, ReaderResource, TelemetryResource } from './iot.resources';

export class ReaderAssembler implements BaseAssembler<Reader, ReaderResource> {
  toEntityFromResource(r: ReaderResource): Reader {
    return new Reader({ ...r, lastSeenAt: r.lastSeenAt ?? null });
  }

  toResourceFromEntity(e: Reader): ReaderResource {
    return { ...e.toProps() };
  }
}

export class TelemetryAssembler implements BaseAssembler<TelemetrySample, TelemetryResource> {
  toEntityFromResource(r: TelemetryResource): TelemetrySample {
    return new TelemetrySample(r);
  }

  toResourceFromEntity(e: TelemetrySample): TelemetryResource {
    return { ...e.toProps() };
  }
}

export class IncidentAssembler implements BaseAssembler<Incident, IncidentResource> {
  toEntityFromResource(r: IncidentResource): Incident {
    return new Incident({ ...r, resolvedAt: r.resolvedAt ?? null });
  }

  toResourceFromEntity(e: Incident): IncidentResource {
    return { ...e.toProps() };
  }
}
