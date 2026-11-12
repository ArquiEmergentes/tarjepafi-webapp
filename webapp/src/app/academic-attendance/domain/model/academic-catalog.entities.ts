/** Datos académicos (simulados; vendrían del Sistema Académico de la UPC). */

export interface CourseProps {
  id: string;
  code: string;
  name: string;
  subject: string;
}

export class Course {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly subject: string;

  constructor(props: CourseProps) {
    this.id = props.id;
    this.code = props.code;
    this.name = props.name;
    this.subject = props.subject;
  }

  toProps(): CourseProps {
    return { ...this };
  }
}

export interface ClassScheduleProps {
  id: string;
  courseId: string;
  section: string;
  /** cardHolderId del docente asignado. */
  teacherId: string;
  spaceId: string;
  /** 1 = lunes … 7 = domingo */
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  term: string;
}

export class ClassSchedule {
  readonly id: string;
  readonly courseId: string;
  readonly section: string;
  readonly teacherId: string;
  readonly spaceId: string;
  readonly dayOfWeek: number;
  readonly startTime: string;
  readonly endTime: string;
  readonly term: string;

  constructor(props: ClassScheduleProps) {
    this.id = props.id;
    this.courseId = props.courseId;
    this.section = props.section;
    this.teacherId = props.teacherId;
    this.spaceId = props.spaceId;
    this.dayOfWeek = props.dayOfWeek;
    this.startTime = props.startTime;
    this.endTime = props.endTime;
    this.term = props.term;
  }

  isTaughtBy(cardHolderId: string): boolean {
    return this.teacherId === cardHolderId;
  }

  toProps(): ClassScheduleProps {
    return { ...this };
  }
}

export type EnrollmentStatus = 'ACTIVE' | 'WITHDRAWN';

export interface EnrollmentProps {
  id: string;
  studentId: string;
  scheduleId: string;
  term: string;
  status: EnrollmentStatus;
}

export class Enrollment {
  readonly id: string;
  readonly studentId: string;
  readonly scheduleId: string;
  readonly term: string;
  readonly status: EnrollmentStatus;

  constructor(props: EnrollmentProps) {
    this.id = props.id;
    this.studentId = props.studentId;
    this.scheduleId = props.scheduleId;
    this.term = props.term;
    this.status = props.status;
  }

  isActive(): boolean {
    return this.status === 'ACTIVE';
  }

  toProps(): EnrollmentProps {
    return { ...this };
  }
}
