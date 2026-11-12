import { BaseResource } from '../../shared/infrastructure/base-api-endpoint';
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

export interface IncidentResource extends BaseResource {
  readerId: string;
  type: IncidentType;
  detectedAt: string;
  description: string;
  resolvedAt: string | null;
}
