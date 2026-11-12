import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DataRecorder } from '../../data-management/application/data-recorder.service';
import { AttendanceRecord } from '../domain/model/attendance-record.entity';
import { Session } from '../domain/model/session.entity';
import { AttendanceRecordsApiEndpoint, SessionsApiEndpoint } from '../infrastructure/academic-api-endpoints';

/** Persistencia de asistencias y sesiones. Cada cambio de asistencia deja un `dataRecord` ATTENDANCE. */
@Injectable({ providedIn: 'root' })
export class AttendanceLedger {
  private readonly recordsApi = inject(AttendanceRecordsApiEndpoint);
  private readonly sessionsApi = inject(SessionsApiEndpoint);
  private readonly recorder = inject(DataRecorder);

  recordsOf(sessionId: string): Promise<AttendanceRecord[]> {
    return firstValueFrom(this.recordsApi.getAll({ sessionId }));
  }

  recordsOfHolder(cardHolderId: string): Promise<AttendanceRecord[]> {
    return firstValueFrom(this.recordsApi.getAll({ cardHolderId }));
  }

  async create(record: AttendanceRecord): Promise<AttendanceRecord> {
    const saved = await firstValueFrom(this.recordsApi.create(record));
    await this.fact(saved);
    return saved;
  }

  async update(record: AttendanceRecord): Promise<AttendanceRecord> {
    const saved = await firstValueFrom(this.recordsApi.update(record));
    await this.fact(saved);
    return saved;
  }

  saveSession(session: Session): Promise<Session> {
    return firstValueFrom(this.sessionsApi.update(session));
  }

  private async fact(record: AttendanceRecord): Promise<void> {
    await firstValueFrom(
      this.recorder.record({
        sourceContext: 'ACADEMIC_ATTENDANCE',
        dataType: 'ATTENDANCE',
        subjectId: record.id,
        eventId: record.tapEventId ?? undefined,
        payload: { sessionId: record.sessionId, role: record.role, status: record.status, source: record.source },
      }),
    );
  }
}
