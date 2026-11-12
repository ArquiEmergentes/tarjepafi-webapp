import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseApiEndpoint } from '../../shared/infrastructure/base-api-endpoint';
import { Credential } from '../domain/model/credential.entity';
import { CredentialPermission } from '../domain/model/credential-permission.entity';
import { CredentialStatusChange } from '../domain/model/credential-status-change.entity';
import { CredentialAssembler, CredentialPermissionAssembler, CredentialStatusChangeAssembler } from './credential.assemblers';
import { CredentialPermissionResource, CredentialResource, CredentialStatusChangeResource } from './credential.resource';

@Injectable({ providedIn: 'root' })
export class CredentialsApiEndpoint extends BaseApiEndpoint<Credential, CredentialResource> {
  constructor() {
    super(inject(HttpClient), 'credentials', new CredentialAssembler());
  }
}

@Injectable({ providedIn: 'root' })
export class CredentialStatusHistoryApiEndpoint extends BaseApiEndpoint<CredentialStatusChange, CredentialStatusChangeResource> {
  constructor() {
    super(inject(HttpClient), 'credentialStatusHistory', new CredentialStatusChangeAssembler());
  }
}

@Injectable({ providedIn: 'root' })
export class CredentialPermissionsApiEndpoint extends BaseApiEndpoint<CredentialPermission, CredentialPermissionResource> {
  constructor() {
    super(inject(HttpClient), 'credentialPermissions', new CredentialPermissionAssembler());
  }
}
