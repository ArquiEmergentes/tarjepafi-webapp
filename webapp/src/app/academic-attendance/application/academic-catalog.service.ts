import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom, forkJoin } from 'rxjs';
import { ClassSchedule, Course, Enrollment } from '../domain/model/academic-catalog.entities';
import { Session } from '../domain/model/session.entity';
import {
  AcademicSystemCoursesApi,
  AcademicSystemEnrollmentsApi,
  AcademicSystemSchedulesApi,
} from '../infrastructure/academic-api-endpoints';

/** Cursos y horarios (datos del Sistema Académico simulado), cacheados para la sesión de la app. */
@Injectable({ providedIn: 'root' })
export class AcademicCatalog {
  private readonly coursesApi = inject(AcademicSystemCoursesApi);
  private readonly schedulesApi = inject(AcademicSystemSchedulesApi);
  private readonly enrollmentsApi = inject(AcademicSystemEnrollmentsApi);

  private readonly courseList = signal<Course[]>([]);
  private readonly scheduleList = signal<ClassSchedule[]>([]);

  readonly courses = computed(() => new Map(this.courseList().map((c) => [c.id, c])));
  readonly schedules = computed(() => new Map(this.scheduleList().map((s) => [s.id, s])));

  async ensureLoaded(): Promise<void> {
    if (this.courseList().length > 0 && this.scheduleList().length > 0) return;
    const { courses, schedules } = await firstValueFrom(
      forkJoin({ courses: this.coursesApi.getAll(), schedules: this.schedulesApi.getAll() }),
    );
    this.courseList.set(courses);
    this.scheduleList.set(schedules);
  }

  scheduleOf(session: Session): ClassSchedule | undefined {
    return session.scheduleId ? this.schedules().get(session.scheduleId) : undefined;
  }

  courseOf(session: Session): Course | undefined {
    const schedule = this.scheduleOf(session);
    return schedule ? this.courses().get(schedule.courseId) : undefined;
  }

  schedulesTaughtBy(teacherId: string): ClassSchedule[] {
    return this.scheduleList().filter((s) => s.isTaughtBy(teacherId));
  }

  async activeEnrollments(scheduleId: string): Promise<Enrollment[]> {
    const list = await firstValueFrom(this.enrollmentsApi.getAll({ scheduleId }));
    return list.filter((e) => e.isActive());
  }

  async isEnrolled(studentId: string, scheduleId: string): Promise<boolean> {
    const list = await firstValueFrom(this.enrollmentsApi.getAll({ scheduleId, studentId }));
    return list.some((e) => e.isActive());
  }
}
