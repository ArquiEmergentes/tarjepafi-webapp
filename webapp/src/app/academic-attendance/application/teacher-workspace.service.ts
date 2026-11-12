import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { CredentialDirectory } from '../../credentials/application/credential-directory.service';
import { SESSION_PORT } from '../../shared/application/session.port';
import { SimulatedClock } from '../../shared/application/simulated-clock.service';
import { newId } from '../../shared/infrastructure/id-generator';
import { ClassSchedule, Course } from '../domain/model/academic-catalog.entities';
import {
  AttendanceRecord,
  AttendanceStatus,
  EDIT_REASON_MAX_LENGTH,
  EditableAttendanceStatus,
} from '../domain/model/attendance-record.entity';
import { Session } from '../domain/model/session.entity';
import { SessionParticipantsApiEndpoint, SessionsApiEndpoint } from '../infrastructure/academic-api-endpoints';
import { AcademicCatalog } from './academic-catalog.service';
import { AttendanceLedger } from './attendance-ledger.service';
import { SessionClosingService } from './session-closing.service';

export type AttendanceCounts = Record<AttendanceStatus, number> & { unmarked: number; total: number };

export interface SessionSummary {
  session: Session;
  course: Course | undefined;
  schedule: ClassSchedule | undefined;
  teacherRecord: AttendanceRecord | null;
  counts: AttendanceCounts;
}

export interface RosterRow {
  cardHolderId: string;
  fullName: string;
  code: string;
  record: AttendanceRecord | null;
}

export interface SessionDetail extends SessionSummary {
  roster: RosterRow[];
}

export interface MeetingRow {
  session: Session;
  record: AttendanceRecord | null;
}

export type TeacherError = 'NOT_YOUR_SESSION' | 'SESSION_NOT_STARTED' | 'REASON_REQUIRED' | 'NOTHING_TO_CONFIRM' | 'SAVE_FAILED';
export type TeacherResult<T> = { ok: true; value: T } | { ok: false; error: TeacherError };

/** Casos de uso de las vistas del docente (D1–D4) y edición de asistencia (regla 6.E). */
@Injectable({ providedIn: 'root' })
export class TeacherWorkspace {
  private readonly sessionsApi = inject(SessionsApiEndpoint);
  private readonly participantsApi = inject(SessionParticipantsApiEndpoint);
  private readonly catalog = inject(AcademicCatalog);
  private readonly ledger = inject(AttendanceLedger);
  private readonly closing = inject(SessionClosingService);
  private readonly directory = inject(CredentialDirectory);
  private readonly clock = inject(SimulatedClock);
  private readonly sessionPort = inject(SESSION_PORT);

  /** Clases del docente para una fecha (por defecto, hoy según la hora simulada). */
  async sessionsOn(teacherId: string, date = this.clock.today()): Promise<SessionSummary[]> {
    await this.prepare();
    const scheduleIds = this.catalog.schedulesTaughtBy(teacherId).map((s) => s.id);
    if (scheduleIds.length === 0) return [];
    const sessions = await firstValueFrom(this.sessionsApi.getAll({ scheduleId: scheduleIds, date, _sort: 'scheduledStart' }));
    return Promise.all(sessions.map((s) => this.summarize(s, teacherId)));
  }

  async sessionDetail(teacherId: string, sessionId: string): Promise<SessionDetail | null> {
    await this.prepare();
    let session: Session;
    try {
      session = await firstValueFrom(this.sessionsApi.getById(sessionId));
    } catch {
      return null;
    }
    const schedule = this.catalog.scheduleOf(session);
    if (!schedule?.isTaughtBy(teacherId)) return null;

    await this.directory.ensureHolders();
    const records = await this.ledger.recordsOf(session.id);
    const byHolder = new Map(records.filter((r) => r.role === 'STUDENT').map((r) => [r.cardHolderId, r]));
    const enrolled = (await this.catalog.activeEnrollments(schedule.id)).map((e) => e.studentId);
    const ids = [...new Set([...enrolled, ...byHolder.keys()])];
    const holders = this.directory.holdersById();
    const roster = ids
      .map((id) => ({ cardHolderId: id, fullName: holders.get(id)?.fullName ?? id, code: holders.get(id)?.code ?? '—', record: byHolder.get(id) ?? null }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
    return { ...this.summarizeWith(session, teacherId, records, enrolled.length), roster };
  }

  /** Historial del docente en sus clases (US17, US20, US22, US23). */
  async myClassAttendance(teacherId: string): Promise<{ record: AttendanceRecord; session: Session; course: Course | undefined }[]> {
    await this.prepare();
    const records = (await this.ledger.recordsOfHolder(teacherId)).filter((r) => r.role === 'TEACHER');
    const sessions = await this.sessionsByIds(records.map((r) => r.sessionId));
    return records
      .map((record) => ({ record, session: sessions.get(record.sessionId) }))
      .filter((x): x is { record: AttendanceRecord; session: Session } => !!x.session && !x.session.isMeeting())
      .map((x) => ({ ...x, course: this.catalog.courseOf(x.session) }))
      .sort((a, b) => b.session.scheduledStart.localeCompare(a.session.scheduledStart));
  }

  /** Reuniones y capacitaciones a las que fue convocado (US21). */
  async myMeetings(teacherId: string): Promise<MeetingRow[]> {
    await this.prepare();
    const invitations = await firstValueFrom(this.participantsApi.getAll({ cardHolderId: teacherId }));
    const sessions = await this.sessionsByIds(invitations.map((p) => p.sessionId));
    const records = await this.ledger.recordsOfHolder(teacherId);
    return [...sessions.values()]
      .filter((s) => s.isMeeting())
      .map((session) => ({ session, record: records.find((r) => r.sessionId === session.id) ?? null }))
      .sort((a, b) => b.session.scheduledStart.localeCompare(a.session.scheduledStart));
  }

  /** Regla 6.E: solo en sus sesiones IN_PROGRESS o FINISHED, con motivo obligatorio (máx. 255). */
  async editAttendance(
    teacherId: string,
    sessionId: string,
    studentId: string,
    status: EditableAttendanceStatus,
    reason: string,
  ): Promise<TeacherResult<AttendanceRecord>> {
    const check = await this.editableSession(teacherId, sessionId);
    if (!check.ok) return check;
    const trimmed = reason.trim();
    if (!trimmed || trimmed.length > EDIT_REASON_MAX_LENGTH) return { ok: false, error: 'REASON_REQUIRED' };

    const now = this.clock.now();
    const by = this.sessionPort.user()?.id ?? teacherId;
    try {
      const existing = (await this.ledger.recordsOf(sessionId)).find((r) => r.cardHolderId === studentId && r.role === 'STUDENT');
      const saved = existing
        ? await this.ledger.update(existing.edit(status, trimmed, by, now))
        : await this.ledger.create(
            new AttendanceRecord({
              id: newId('att'),
              tapEventId: null,
              sessionId,
              cardHolderId: studentId,
              role: 'STUDENT',
              checkInAt: null,
              checkOutAt: null,
              durationMinutes: null,
              status: 'ABSENT',
              confirmedAt: null,
              source: 'TEACHER_EDIT',
              modifiedBy: null,
              modifiedAt: null,
              editReason: null,
            }).edit(status, trimmed, by, now),
          );
      return { ok: true, value: saved };
    } catch {
      return { ok: false, error: 'SAVE_FAILED' };
    }
  }

  /** El docente confirma los PENDING que quedaron (por ejemplo, si nunca llegó a marcar). */
  async confirmPending(teacherId: string, sessionId: string): Promise<TeacherResult<number>> {
    const check = await this.editableSession(teacherId, sessionId);
    if (!check.ok) return check;
    try {
      const pending = (await this.ledger.recordsOf(sessionId)).filter((r) => r.role === 'STUDENT' && r.isPending());
      if (pending.length === 0) return { ok: false, error: 'NOTHING_TO_CONFIRM' };
      for (const record of pending) await this.ledger.update(record.confirm(this.clock.now(), check.value.punctualUntil()));
      return { ok: true, value: pending.length };
    } catch {
      return { ok: false, error: 'SAVE_FAILED' };
    }
  }

  // ---------- Internos ----------

  /** Antes de leer, se cierran las sesiones vencidas según la hora simulada. */
  private async prepare(): Promise<void> {
    await this.catalog.ensureLoaded();
    await this.closing.closeDue();
  }

  private async editableSession(teacherId: string, sessionId: string): Promise<TeacherResult<Session>> {
    await this.prepare();
    let session: Session;
    try {
      session = await firstValueFrom(this.sessionsApi.getById(sessionId));
    } catch {
      return { ok: false, error: 'SAVE_FAILED' };
    }
    if (!this.catalog.scheduleOf(session)?.isTaughtBy(teacherId)) return { ok: false, error: 'NOT_YOUR_SESSION' };
    if (session.status === 'SCHEDULED') return { ok: false, error: 'SESSION_NOT_STARTED' };
    return { ok: true, value: session };
  }

  private async sessionsByIds(ids: string[]): Promise<Map<string, Session>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return new Map();
    const list = await firstValueFrom(this.sessionsApi.getAll({ id: unique }));
    return new Map(list.map((s) => [s.id, s]));
  }

  private async summarize(session: Session, teacherId: string): Promise<SessionSummary> {
    const records = await this.ledger.recordsOf(session.id);
    const enrolled = session.scheduleId ? (await this.catalog.activeEnrollments(session.scheduleId)).length : 0;
    return this.summarizeWith(session, teacherId, records, enrolled);
  }

  private summarizeWith(session: Session, teacherId: string, records: AttendanceRecord[], enrolled: number): SessionSummary {
    const students = records.filter((r) => r.role === 'STUDENT');
    const counts: AttendanceCounts = { PENDING: 0, PRESENT: 0, LATE: 0, ABSENT: 0, unmarked: 0, total: Math.max(enrolled, students.length) };
    for (const r of students) counts[r.status]++;
    counts.unmarked = Math.max(0, counts.total - students.length);
    return {
      session,
      course: this.catalog.courseOf(session),
      schedule: this.catalog.scheduleOf(session),
      teacherRecord: records.find((r) => r.role === 'TEACHER' && r.cardHolderId === teacherId) ?? null,
      counts,
    };
  }
}
