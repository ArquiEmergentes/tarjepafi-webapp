import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TapContext, TapResult } from '../../shared/application/tap-result';
import { datePart, formatDuration } from '../../shared/domain/date-time';
import { newId } from '../../shared/infrastructure/id-generator';
import { AttendanceRecord, AttendanceRole } from '../domain/model/attendance-record.entity';
import { Session } from '../domain/model/session.entity';
import { SessionParticipantsApiEndpoint, SessionsApiEndpoint } from '../infrastructure/academic-api-endpoints';
import { AcademicCatalog } from './academic-catalog.service';
import { AttendanceLedger } from './attendance-ledger.service';
import { SessionClosingService } from './session-closing.service';

const rejected = (messageKey: string, params?: TapResult['params']): TapResult => ({ outcome: 'REJECTED', tone: 'error', messageKey, params });
const attendance = (messageKey: string, params?: TapResult['params'], tone: TapResult['tone'] = 'success'): TapResult => ({
  outcome: 'ATTENDANCE',
  tone,
  messageKey,
  params,
});

/**
 * Casos de uso de Academic Attendance que el simulador NFC invoca (regla 6.D):
 * aula · estudiante (US01, US02, US04), aula · docente (US16–US18, US22, US23, US25) y reuniones (US21).
 */
@Injectable({ providedIn: 'root' })
export class AttendanceTapService {
  private readonly sessionsApi = inject(SessionsApiEndpoint);
  private readonly participantsApi = inject(SessionParticipantsApiEndpoint);
  private readonly catalog = inject(AcademicCatalog);
  private readonly ledger = inject(AttendanceLedger);
  private readonly closing = inject(SessionClosingService);

  /** Lectura en un aula. */
  async classroomTap(ctx: TapContext): Promise<TapResult> {
    await this.catalog.ensureLoaded();
    const sessions = await this.sessionsInSpace(ctx, 'CLASS');
    return ctx.holderRole === 'TEACHER' ? this.teacherInClassroom(ctx, sessions) : this.studentInClassroom(ctx, sessions);
  }

  /**
   * Lectura de un docente en una sala de reuniones. Devuelve null si no hay una reunión en curso
   * (entonces la lectura se trata como un acceso al espacio).
   */
  async meetingTap(ctx: TapContext): Promise<TapResult | null> {
    const meeting = (await this.sessionsInSpace(ctx, 'MEETING')).find((s) => s.isInProgress(ctx.at));
    if (!meeting) return null;
    const participants = await firstValueFrom(this.participantsApi.getAll({ sessionId: meeting.id, cardHolderId: ctx.cardHolderId }));
    if (participants.length === 0) return rejected('tap.notInvited');
    const existing = (await this.ledger.recordsOf(meeting.id)).find((r) => r.cardHolderId === ctx.cardHolderId);
    if (existing) return attendance('tap.alreadyRegistered', undefined, 'info');

    const status = AttendanceRecord.resolveStatus(ctx.at, meeting.punctualUntil());
    await this.ledger.create(this.newRecord(ctx, meeting.id, 'TEACHER', status));
    return attendance(status === 'PRESENT' ? 'tap.meetingRegistered' : 'tap.meetingRegisteredLate', { title: meeting.title });
  }

  // ---------- Aula · estudiante ----------

  private async studentInClassroom(ctx: TapContext, sessions: Session[]): Promise<TapResult> {
    const session = sessions.find((s) => s.isInProgress(ctx.at));
    if (!session?.scheduleId) return rejected('tap.noClassInProgress');
    if (!(await this.catalog.isEnrolled(ctx.cardHolderId, session.scheduleId))) return rejected('tap.notEnrolled');

    const records = await this.ledger.recordsOf(session.id);
    if (records.some((r) => r.cardHolderId === ctx.cardHolderId)) return attendance('tap.alreadyRegistered', undefined, 'info');

    // Si el docente ya marcó, la asistencia se resuelve en el acto; si no, queda PENDING.
    const teacherArrived = records.some((r) => r.role === 'TEACHER' && r.checkInAt !== null);
    const status = teacherArrived ? AttendanceRecord.resolveStatus(ctx.at, session.punctualUntil()) : 'PENDING';
    await this.ledger.create(this.newRecord(ctx, session.id, 'STUDENT', status));
    return attendance('tap.attendanceTaken', { course: this.courseName(session), time: session.timeRange() });
  }

  // ---------- Aula · docente ----------

  private async teacherInClassroom(ctx: TapContext, sessions: Session[]): Promise<TapResult> {
    const own = sessions.filter((s) => this.catalog.scheduleOf(s)?.isTaughtBy(ctx.cardHolderId) && s.isWithinTeacherWindow(ctx.at));
    if (own.length === 0) return rejected('tap.noAssignedClass');

    for (const session of own) {
      const records = await this.ledger.recordsOf(session.id);
      const mine = records.find((r) => r.role === 'TEACHER' && r.cardHolderId === ctx.cardHolderId);
      if (mine?.hasCheckedOut()) return attendance('tap.exitAlreadyRegistered', undefined, 'info'); // 3ª pasada
      if (mine && !session.isFinished()) return this.teacherExit(session, mine, ctx); // 2ª pasada
      if (!mine && session.isInProgress(ctx.at)) return this.teacherArrival(session, records, ctx); // 1ª pasada
    }
    return rejected('tap.noAssignedClass');
  }

  /** 1ª pasada: llegada, sesión IN_PROGRESS y confirmación de los PENDING según su propia hora. */
  private async teacherArrival(session: Session, records: AttendanceRecord[], ctx: TapContext): Promise<TapResult> {
    const status = AttendanceRecord.resolveStatus(ctx.at, session.punctualUntil());
    await this.ledger.create(this.newRecord(ctx, session.id, 'TEACHER', status));
    await this.ledger.saveSession(session.start());

    const pending = records.filter((r) => r.role === 'STUDENT' && r.isPending());
    for (const record of pending) await this.ledger.update(record.confirm(ctx.at, session.punctualUntil()));

    const course = this.catalog.courseOf(session);
    if (pending.length === 0) return attendance('tap.teacherArrivalNoRecords', { course: `${course?.name ?? session.title} – ${course?.subject ?? ''}` });
    return attendance('tap.teacherArrival', { course: `${course?.name ?? session.title} – ${course?.subject ?? ''}`, count: pending.length });
  }

  /** 2ª pasada: salida, duración y sesión FINISHED (los matriculados sin marcación quedan ABSENT). */
  private async teacherExit(session: Session, record: AttendanceRecord, ctx: TapContext): Promise<TapResult> {
    const updated = await this.ledger.update(record.checkOut(ctx.at));
    await this.closing.close(session, ctx.at);
    return attendance('tap.teacherExit', { duration: formatDuration(updated.durationMinutes ?? 0) });
  }

  // ---------- Internos ----------

  private sessionsInSpace(ctx: TapContext, type: Session['type']): Promise<Session[]> {
    return firstValueFrom(this.sessionsApi.getAll({ spaceId: ctx.spaceId, date: datePart(ctx.at), type }));
  }

  private courseName(session: Session): string {
    return this.catalog.courseOf(session)?.name ?? session.title;
  }

  private newRecord(ctx: TapContext, sessionId: string, role: AttendanceRole, status: AttendanceRecord['status']): AttendanceRecord {
    return new AttendanceRecord({
      id: newId('att'),
      tapEventId: ctx.tapEventId,
      sessionId,
      cardHolderId: ctx.cardHolderId,
      role,
      checkInAt: ctx.at,
      checkOutAt: null,
      durationMinutes: null,
      status,
      confirmedAt: status === 'PENDING' ? null : ctx.at,
      source: 'NFC',
      modifiedBy: null,
      modifiedAt: null,
      editReason: null,
    });
  }
}
