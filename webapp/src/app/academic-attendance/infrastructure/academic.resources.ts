import { BaseResource } from '../../shared/infrastructure/base-api-endpoint';
import { EnrollmentStatus } from '../domain/model/academic-catalog.entities';
import { AttendanceRole, AttendanceSource, AttendanceStatus } from '../domain/model/attendance-record.entity';
import { SessionStatus, SessionType } from '../domain/model/session.entity';

export interface CourseResource extends BaseResource {
  code: string;
  name: string;
  subject: string;
}

export interface ClassScheduleResource extends BaseResource {
  courseId: string;
  section: string;
  teacherId: string;
  spaceId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  term: string;
}

export interface EnrollmentResource extends BaseResource {
  studentId: string;
  scheduleId: string;
  term: string;
  status: EnrollmentStatus;
}

export interface SessionResource extends BaseResource {
  type: SessionType;
  scheduleId: string | null;
  title: string;
  spaceId: string;
  date: string;
  scheduledStart: string;
  scheduledEnd: string;
  toleranceMinutes: number;
  status: SessionStatus;
}

export interface SessionParticipantResource extends BaseResource {
  sessionId: string;
  cardHolderId: string;
}

export interface AttendanceRecordResource extends BaseResource {
  tapEventId: string | null;
  sessionId: string;
  cardHolderId: string;
  role: AttendanceRole;
  checkInAt: string | null;
  checkOutAt: string | null;
  durationMinutes: number | null;
  status: AttendanceStatus;
  confirmedAt: string | null;
  source: AttendanceSource;
  modifiedBy: string | null;
  modifiedAt: string | null;
  editReason: string | null;
}
