import { LocalDateTime, isAfter } from '../../../shared/domain/date-time';
import { CardHolder } from './card-holder.entity';
import { Credential } from './credential.entity';

export interface EnrollmentVerificationPlan {
  deadlinePassed: boolean;
  /** Tarjetas ACTIVE de estudiantes con matrícula PENDING. */
  toDeactivate: Credential[];
  /** Resto de tarjetas ACTIVE de estudiantes evaluadas, que no cambian. */
  unchanged: Credential[];
}

/**
 * Verificación de matrículas (US15). Si la fecha actual (o simulada) supera la fecha límite,
 * se desactivan las tarjetas activas de estudiantes con matrícula pendiente. Las demás no cambian.
 */
export function planEnrollmentVerification(
  credentials: readonly Credential[],
  holdersById: ReadonlyMap<string, CardHolder>,
  now: LocalDateTime,
  deadline: LocalDateTime,
): EnrollmentVerificationPlan {
  const evaluated = credentials.filter((c) => {
    const holder = c.cardHolderId ? holdersById.get(c.cardHolderId) : undefined;
    return c.isActive() && holder?.isStudent() === true;
  });
  const deadlinePassed = isAfter(now, deadline);
  if (!deadlinePassed) return { deadlinePassed, toDeactivate: [], unchanged: evaluated };

  const toDeactivate = evaluated.filter((c) => holdersById.get(c.cardHolderId ?? '')?.hasPendingEnrollment());
  return { deadlinePassed, toDeactivate, unchanged: evaluated.filter((c) => !toDeactivate.includes(c)) };
}
