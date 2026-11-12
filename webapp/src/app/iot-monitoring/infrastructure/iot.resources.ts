import { TapOutcome } from '../../shared/application/tap-result';
import { BaseResource } from '../../shared/infrastructure/base-api-endpoint';
import { TapSource } from '../domain/model/card-tap-event.entity';
import { IncidentType } from '../domain/model/incident.entity';
import { DeviceType, ReaderStatus } from '../domain/model/reader.entity';
import { ReaderConfiguration } from '../domain/model/reader-configuration';

export interface ReaderResource extends BaseResource {
  name: string;
  deviceType: DeviceType;
  spaceId: string;
  status: ReaderStatus;
  configuration: ReaderConfiguration;
  registeredAt: string;
  lastSeenAt: string | null;
}

export interface TelemetryResource extends BaseResource {
  readerId: string;
  capturedAt: string;
  signalStrength: number;
  uptime: number;
  firmwareVersion: string;
  status: ReaderStatus;
}

export interface CardTapEventResource extends BaseResource {
  readerId: string;
  cardUid: string;
  tappedAt: string;
  outcome: TapOutcome;
  displayMessage: string;
  source: TapSource;
}

export interface IncidentResource extends BaseResource {
  readerId: string;
  type: IncidentType;
  detectedAt: string;
  description: string;
  resolvedAt: string | null;
}
