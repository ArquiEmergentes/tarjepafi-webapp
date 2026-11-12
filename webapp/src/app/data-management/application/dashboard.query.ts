import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AttendanceOverview, DayAttendance } from '../../academic-attendance/application/attendance-overview.service';
import { CredentialsStore } from '../../credentials/application/credentials.store';
import { CredentialStatus } from '../../credentials/domain/model/credential.entity';
import { ReadersStore } from '../../iot-monitoring/application/readers.store';
import { TapEventsQuery } from '../../iot-monitoring/application/tap-events.query';
import { CardTapEvent } from '../../iot-monitoring/domain/model/card-tap-event.entity';
import { Reader, ReaderStatus } from '../../iot-monitoring/domain/model/reader.entity';
import { AccessRecordsQuery } from '../../space-facility/application/access-records.query';
import { SpaceCatalog } from '../../space-facility/application/space-catalog.service';
import { SimulatedClock } from '../../shared/application/simulated-clock.service';
import { LocalDateTime } from '../../shared/domain/date-time';

export interface DashboardSnapshot {
  date: string;
  now: LocalDateTime;
  attendance: DayAttendance;
  access: { granted: number; denied: number };
  readers: { byStatus: Record<ReaderStatus, number>; total: number; offline: Reader[]; byId: ReadonlyMap<string, Reader> };
  credentials: { byStatus: Record<CredentialStatus, number>; total: number };
  tapsByHour: { hour: string; count: number }[];
  tapsToday: number;
  recent: CardTapEvent[];
}

const RECENT_SIZE = 8;

/**
 * Dashboard (A1 · regla 6.F): se calcula en vivo desde las colecciones de cada contexto, leyendo a través
 * de sus servicios de aplicación. Data Management no escribe nada aquí.
 */
@Injectable({ providedIn: 'root' })
export class DashboardQuery {
  private readonly clock = inject(SimulatedClock);
  private readonly attendance = inject(AttendanceOverview);
  private readonly credentials = inject(CredentialsStore);
  private readonly readers = inject(ReadersStore);
  private readonly taps = inject(TapEventsQuery);
  private readonly access = inject(AccessRecordsQuery);
  private readonly spaces = inject(SpaceCatalog);

  async snapshot(): Promise<DashboardSnapshot> {
    const now = this.clock.now();
    const date = this.clock.today();
    const dayStart = `${date}T00:00:00`;

    const [attendance, access, taps] = await Promise.all([
      this.attendance.day(date),
      this.access.between(dayStart, now),
      this.taps.between(dayStart, now),
      this.readers.load(),
      this.credentials.load(),
      firstValueFrom(this.spaces.load()),
    ]);
    if (this.readers.loadError() || this.credentials.loadError()) throw new Error('No se pudo cargar el dashboard');

    const byHour = new Map<string, number>();
    for (const t of taps) byHour.set(t.tappedAt.slice(11, 13), (byHour.get(t.tappedAt.slice(11, 13)) ?? 0) + 1);
    const currentHour = Number(now.slice(11, 13));
    const firstHour = Math.min(7, ...[...byHour.keys()].map(Number));
    const tapsByHour = [];
    for (let h = firstHour; h <= Math.max(currentHour, firstHour); h++) {
      const hour = String(h).padStart(2, '0');
      tapsByHour.push({ hour, count: byHour.get(hour) ?? 0 });
    }

    const granted = access.filter((a) => a.isGranted()).length;
    return {
      date,
      now,
      attendance,
      access: { granted, denied: access.length - granted },
      readers: {
        byStatus: this.readers.countByStatus(),
        total: this.readers.readers().length,
        offline: this.readers.readers().filter((r) => r.status === 'OFFLINE'),
        byId: new Map(this.readers.readers().map((r) => [r.id, r])),
      },
      credentials: { byStatus: this.credentials.countByStatus(), total: this.credentials.total() },
      tapsByHour,
      tapsToday: taps.length,
      recent: taps.slice(0, RECENT_SIZE),
    };
  }
}
