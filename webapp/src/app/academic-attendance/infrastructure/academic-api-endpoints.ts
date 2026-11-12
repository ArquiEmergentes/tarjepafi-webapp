import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { ClassSchedule, Course, Enrollment } from '../domain/model/academic-catalog.entities';
import { AttendanceRecord } from '../domain/model/attendance-record.entity';
import { Session, SessionParticipant } from '../domain/model/session.entity';
import {
  AttendanceRecordAssembler,
  ClassScheduleAssembler,
  CourseAssembler,
  EnrollmentAssembler,
  SessionAssembler,
  SessionParticipantAssembler,
} from './academic.assemblers';
import {
  AttendanceRecordResource,
  ClassScheduleResource,
  CourseResource,
  EnrollmentResource,
  SessionParticipantResource,
  SessionResource,
} from './academic.resources';

// ---------- Sistema Académico (simulado) ----------
// Cursos, horarios y matrículas se leen hoy de json-server. Con una alianza con la UPC vendrían
// del Sistema Académico: solo cambian estos tres endpoints, no el dominio ni las vistas.

@Injectable({ providedIn: 'root' })
export class AcademicSystemCoursesApi extends BaseApiEndpoint<Course, CourseResource> {
  constructor() {
    super(inject(HttpClient), 'courses', new CourseAssembler());
  }
}

@Injectable({ providedIn: 'root' })
export class AcademicSystemSchedulesApi extends BaseApiEndpoint<ClassSchedule, ClassScheduleResource> {
  constructor() {
    super(inject(HttpClient), 'classSchedules', new ClassScheduleAssembler());
  }
}

@Injectable({ providedIn: 'root' })
export class AcademicSystemEnrollmentsApi extends BaseApiEndpoint<Enrollment, EnrollmentResource> {
  constructor() {
    super(inject(HttpClient), 'enrollments', new EnrollmentAssembler());
  }
}

// ---------- Asistencia (propios de TarjePAFI) ----------

@Injectable({ providedIn: 'root' })
export class SessionsApiEndpoint extends BaseApiEndpoint<Session, SessionResource> {
  constructor() {
    super(inject(HttpClient), 'sessions', new SessionAssembler());
  }
}

@Injectable({ providedIn: 'root' })
export class SessionParticipantsApiEndpoint extends BaseApiEndpoint<SessionParticipant, SessionParticipantResource> {
  constructor() {
    super(inject(HttpClient), 'sessionParticipants', new SessionParticipantAssembler());
  }
}

@Injectable({ providedIn: 'root' })
export class AttendanceRecordsApiEndpoint extends BaseApiEndpoint<AttendanceRecord, AttendanceRecordResource> {
  constructor() {
    super(inject(HttpClient), 'attendanceRecords', new AttendanceRecordAssembler());
  }
}
