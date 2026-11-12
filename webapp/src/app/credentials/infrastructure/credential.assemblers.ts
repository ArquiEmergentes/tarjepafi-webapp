import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { Credential } from '../domain/model/credential.entity';
import { CredentialPermission } from '../domain/model/credential-permission.entity';
import { CredentialStatusChange } from '../domain/model/credential-status-change.entity';
import { CredentialPermissionResource, CredentialResource, CredentialStatusChangeResource } from './credential.resource';

export class CredentialAssembler implements BaseAssembler<Credential, CredentialResource> {
  toEntityFromResource(r: CredentialResource): Credential {
    return new Credential({ ...r, cardHolderId: r.cardHolderId ?? null, lastUsedAt: r.lastUsedAt ?? null });
  }

  toResourceFromEntity(e: Credential): CredentialResource {
    return { ...e.toProps() };
  }
}

export class CredentialStatusChangeAssembler implements BaseAssembler<CredentialStatusChange, CredentialStatusChangeResource> {
  toEntityFromResource(r: CredentialStatusChangeResource): CredentialStatusChange {
    return new CredentialStatusChange(r);
  }

  toResourceFromEntity(e: CredentialStatusChange): CredentialStatusChangeResource {
    return { ...e.toProps() };
  }
}

export class CredentialPermissionAssembler implements BaseAssembler<CredentialPermission, CredentialPermissionResource> {
  toEntityFromResource(r: CredentialPermissionResource): CredentialPermission {
    return new CredentialPermission(r);
  }

  toResourceFromEntity(e: CredentialPermission): CredentialPermissionResource {
    return { ...e.toProps() };
  }
}
