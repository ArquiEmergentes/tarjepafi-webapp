import { BaseResource } from '../../shared/infrastructure/base-api-endpoint';
import { CredentialStatus } from '../domain/model/credential.entity';
import { StatusChangeReason } from '../domain/model/credential-status-change.entity';
import { PermissionEffect } from '../domain/model/credential-permission.entity';

export interface CredentialResource extends BaseResource {
  cardUid: string;
  cardHolderId: string | null;
  status: CredentialStatus;
  issuedAt: string;
  statusChangedAt: string;
  lastUsedAt: string | null;
}

export interface CredentialStatusChangeResource extends BaseResource {
  credentialId: string;
  fromStatus: CredentialStatus;
  toStatus: CredentialStatus;
  reason: StatusChangeReason;
  changedBy: string;
  changedAt: string;
  note?: string | null;
}

export interface CredentialPermissionResource extends BaseResource {
  credentialId: string;
  spaceId: string;
  effect: PermissionEffect;
}
