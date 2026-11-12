export type ReaderMode = 'ATTENDANCE' | 'ACCESS_CONTROL';

export interface ReaderConfiguration {
  readerMode: ReaderMode;
  /** Segundos entre envíos de datos. */
  communicationInterval: number;
  /** Segundos entre heartbeats. */
  heartbeatInterval: number;
  firmwareVersion: string;
}

export type ConfigurationError =
  | 'MODE_REQUIRED'
  | 'COMMUNICATION_INTERVAL_INVALID'
  | 'HEARTBEAT_INTERVAL_INVALID'
  | 'HEARTBEAT_LOWER_THAN_COMMUNICATION'
  | 'FIRMWARE_FORMAT';

const FIRMWARE_PATTERN = /^\d+\.\d+\.\d+$/;

/**
 * Regla 6.C · configuración: intervalos mayores que 0, heartbeat ≥ comunicación
 * y firmware con formato x.y.z. Devuelve la lista de errores (vacía si es válida).
 */
export function validateConfiguration(config: Partial<ReaderConfiguration>): ConfigurationError[] {
  const errors: ConfigurationError[] = [];
  const comm = Number(config.communicationInterval);
  const heartbeat = Number(config.heartbeatInterval);
  if (!config.readerMode) errors.push('MODE_REQUIRED');
  if (!Number.isInteger(comm) || comm <= 0) errors.push('COMMUNICATION_INTERVAL_INVALID');
  if (!Number.isInteger(heartbeat) || heartbeat <= 0) errors.push('HEARTBEAT_INTERVAL_INVALID');
  if (comm > 0 && heartbeat > 0 && heartbeat < comm) errors.push('HEARTBEAT_LOWER_THAN_COMMUNICATION');
  if (!FIRMWARE_PATTERN.test((config.firmwareVersion ?? '').trim())) errors.push('FIRMWARE_FORMAT');
  return errors;
}
