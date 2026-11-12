import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { ClassSchedule, Course, Enrollment } from '../domain/model/academic-catalog.entities';
import { AttendanceRecord } from '../domain/model/attendance-record.entity';
import { Session, SessionParticipant } from '../domain/model/session.entity';
import {
  AttendanceRecordResource,
  ClassScheduleResource,
  CourseResource,
  EnrollmentResource,
  SessionParticipantResource,
  SessionResource,
} from './academic.resources';

export class CourseAssembler implements BaseAssembler<Course, CourseResource> {
  toEntityFromResource(r: CourseResource): Course {
    return new Course(r);
  }
  toResourceFromEntity(e: Course): CourseResource {
    return { ...e.toProps() };
  }
}

export class ClassScheduleAssembler implements BaseAssembler<ClassSchedule, ClassScheduleResource> {
  toEntityFromResource(r: ClassScheduleResource): ClassSchedule {
    return new ClassSchedule(r);
  }
  toResourceFromEntity(e: ClassSchedule): ClassScheduleResource {
    return { ...e.toProps() };
  }
}

export class EnrollmentAssembler implements BaseAssembler<Enrollment, EnrollmentResource> {
  toEntityFromResource(r: EnrollmentResource): Enrollment {
    return new Enrollment(r);
  }
  toResourceFromEntity(e: Enrollment): EnrollmentResource {
    return { ...e.toProps() };
  }
}

export class SessionAssembler implements BaseAssembler<Session, SessionResource> {
  toEntityFromResource(r: SessionResource): Session {
    return new Session({ ...r, scheduleId: r.scheduleId ?? null });
  }
  toResourceFromEntity(e: Session): SessionResource {
    return { ...e.toProps() };
  }
}

export class SessionParticipantAssembler implements BaseAssembler<SessionParticipant, SessionParticipantResource> {
  toEntityFromResource(r: SessionParticipantResource): SessionParticipant {
    return new SessionParticipant(r);
  }
  toResourceFromEntity(e: SessionParticipant): SessionParticipantResource {
    return { ...e.toProps() };
  }
}

export class AttendanceRecordAssembler implements BaseAssembler<AttendanceRecord, AttendanceRecordResource> {
  toEntityFromResource(r: AttendanceRecordResource): AttendanceRecord {
    return new AttendanceRecord({
      ...r,
      tapEventId: r.tapEventId ?? null,
      checkInAt: r.checkInAt ?? null,
      checkOutAt: r.checkOutAt ?? null,
      durationMinutes: r.durationMinutes ?? null,
      confirmedAt: r.confirmedAt ?? null,
      modifiedBy: r.modifiedBy ?? null,
      modifiedAt: r.modifiedAt ?? null,
      editReason: r.editReason ?? null,
    });
  }
  toResourceFromEntity(e: AttendanceRecord): AttendanceRecordResource {
    return { ...e.toProps() };
  }
}
