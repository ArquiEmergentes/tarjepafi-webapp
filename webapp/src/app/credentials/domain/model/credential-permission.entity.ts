import { HolderRole } from './card-holder.entity';

export type PermissionEffect = 'ALLOW' | 'DENY';

export interface CredentialPermissionProps {
  id: string;
  credentialId: string;
  spaceId: string;
  effect: PermissionEffect;
}

/** Excepción de acceso de una tarjeta concreta a un espacio (US14). */
export class CredentialPermission {
  readonly id: string;
  readonly credentialId: string;
  readonly spaceId: string;
  readonly effect: PermissionEffect;

  constructor(props: CredentialPermissionProps) {
    this.id = props.id;
    this.credentialId = props.credentialId;
    this.spaceId = props.spaceId;
    this.effect = props.effect;
  }

  allows(): boolean {
    return this.effect === 'ALLOW';
  }

  withEffect(effect: PermissionEffect): CredentialPermission {
    return new CredentialPermission({ ...this.toProps(), effect });
  }

  toProps(): CredentialPermissionProps {
    return { ...this };
  }
}

export type AccessBasis = 'EXCEPTION' | 'ROLE';

export interface AccessResolution {
  allowed: boolean;
  basis: AccessBasis;
}

/**
 * Regla de permisos (6.B · US14): primero la excepción de la tarjeta para ese espacio;
 * si no existe, se usan los roles permitidos del espacio.
 */
export function resolveAccess(
  exception: CredentialPermission | undefined,
  allowedRoles: readonly HolderRole[],
  holderRole: HolderRole | null,
): AccessResolution {
  if (exception) return { allowed: exception.allows(), basis: 'EXCEPTION' };
  return { allowed: holderRole !== null && allowedRoles.includes(holderRole), basis: 'ROLE' };
}
