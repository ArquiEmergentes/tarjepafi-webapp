import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Session } from '../domain/model/session.entity';
import { AttendanceRecordsApiEndpoint, SessionsApiEndpoint } from '../infrastructure/academic-api-endpoints';
import { AcademicCatalog } from './academic-catalog.service';
import { SessionClosingService } from './session-closing.service';

export interface SessionAttendance {
  sessionId: string;
  title: string;
  timeRange: string;
  spaceId: string;
  status: Session['status'];
  attended: number;
  absent: number;
  pending: number;
  enrolled: number;
}

export interface DayAttendance {
  /** % de estudiantes presentes o tarde sobre las asistencias ya resueltas; null si no hay. */
  rate: number | null;
  attended: number;
  absent: number;
  pending: number;
  sessions: SessionAttendance[];
}

/** Resumen de asistencia de un día para el dashboard (lectura en vivo de las colecciones de Academic Attendance). */
@Injectable({ providedIn: 'root' })
export class AttendanceOverview {
  private readonly sessionsApi = inject(SessionsApiEndpoint);
  private readonly recordsApi = inject(AttendanceRecordsApiEndpoint);
  private readonly catalog = inject(AcademicCatalog);
  private readonly closing = inject(SessionClosingService);

  async day(date: string): Promise<DayAttendance> {
    await this.catalog.ensureLoaded();
    await this.closing.closeDue();
    const sessions = await firstValueFrom(this.sessionsApi.getAll({ date, type: 'CLASS', _sort: 'scheduledStart' }));
    const ids = sessions.map((s) => s.id);
    const records = ids.length ? await firstValueFrom(this.recordsApi.getAll({ sessionId: ids, role: 'STUDENT' })) : [];

    const rows: SessionAttendance[] = [];
    for (const s of sessions) {
      const mine = records.filter((r) => r.sessionId === s.id);
      const enrolled = s.scheduleId ? (await this.catalog.activeEnrollments(s.scheduleId)).length : mine.length;
      rows.push({
        sessionId: s.id,
        title: this.catalog.courseOf(s)?.name ?? s.title,
        timeRange: s.timeRange(),
        spaceId: s.spaceId,
        status: s.status,
        attended: mine.filter((r) => r.attended()).length,
        absent: mine.filter((r) => r.status === 'ABSENT').length,
        pending: mine.filter((r) => r.isPending()).length,
        enrolled,
      });
    }
    const attended = rows.reduce((n, r) => n + r.attended, 0);
    const absent = rows.reduce((n, r) => n + r.absent, 0);
    const pending = rows.reduce((n, r) => n + r.pending, 0);
    const resolved = attended + absent;
    return { rate: resolved ? Math.round((attended / resolved) * 1000) / 10 : null, attended, absent, pending, sessions: rows };
  }
}
