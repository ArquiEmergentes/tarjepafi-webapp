import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SimulatedClock } from '../../shared/application/simulated-clock.service';
import { newId } from '../../shared/infrastructure/id-generator';
import { AttendanceRecord } from '../domain/model/attendance-record.entity';
import { Session } from '../domain/model/session.entity';
import { SessionParticipantsApiEndpoint, SessionsApiEndpoint } from '../infrastructure/academic-api-endpoints';
import { AcademicCatalog } from './academic-catalog.service';
import { AttendanceLedger } from './attendance-ledger.service';

/**
 * Cierre de sesión (regla 6.D): 15 minutos después del fin, una sesión sin cerrar pasa a FINISHED y se
 * registra ABSENT (source SYSTEM) para cada matriculado o convocado sin marcación. Los PENDING se conservan
 * para que el docente los confirme si nunca llegó.
 */
@Injectable({ providedIn: 'root' })
export class SessionClosingService {
  private readonly sessionsApi = inject(SessionsApiEndpoint);
  private readonly participantsApi = inject(SessionParticipantsApiEndpoint);
  private readonly catalog = inject(AcademicCatalog);
  private readonly ledger = inject(AttendanceLedger);
  private readonly clock = inject(SimulatedClock);
  private running: Promise<number> | null = null;

  /** Cierra las sesiones vencidas según la hora simulada. Devuelve cuántas cerró. */
  closeDue(): Promise<number> {
    this.running ??= this.run().finally(() => (this.running = null));
    return this.running;
  }

  private async run(): Promise<number> {
    const now = this.clock.now();
    const open = await firstValueFrom(this.sessionsApi.getAll({ status_ne: 'FINISHED' }));
    const due = open.filter((s) => s.shouldAutoClose(now));
    if (due.length === 0) return 0;
    await this.catalog.ensureLoaded();
    for (const session of due) await this.close(session);
    return due.length;
  }

  /** Cierra una sesión: ABSENT para quienes no marcaron y estado FINISHED. */
  async close(session: Session, closedAt = session.closesAt()): Promise<void> {
    await this.catalog.ensureLoaded();
    const expected = await this.expectedAttendees(session);
    const records = await this.ledger.recordsOf(session.id);
    const marked = new Set(records.map((r) => r.cardHolderId));
    for (const cardHolderId of expected.filter((id) => !marked.has(id))) {
      await this.ledger.create(
        new AttendanceRecord({
          id: newId('att'),
          tapEventId: null,
          sessionId: session.id,
          cardHolderId,
          role: session.isMeeting() ? 'TEACHER' : 'STUDENT',
          checkInAt: null,
          checkOutAt: null,
          durationMinutes: null,
          status: 'ABSENT',
          confirmedAt: closedAt,
          source: 'SYSTEM',
          modifiedBy: null,
          modifiedAt: null,
          editReason: null,
        }),
      );
    }
    await this.ledger.saveSession(session.finish());
  }

  private async expectedAttendees(session: Session): Promise<string[]> {
    if (session.isMeeting()) {
      const participants = await firstValueFrom(this.participantsApi.getAll({ sessionId: session.id }));
      return participants.map((p) => p.cardHolderId);
    }
    if (!session.scheduleId) return [];
    return (await this.catalog.activeEnrollments(session.scheduleId)).map((e) => e.studentId);
  }
}
