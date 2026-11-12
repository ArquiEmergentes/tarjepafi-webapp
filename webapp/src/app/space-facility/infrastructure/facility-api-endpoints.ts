import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseApiEndpoint, BaseResource } from '../../shared/infrastructure/base-api-endpoint';
import { BaseAssembler } from '../../shared/infrastructure/base-assembler';
import { AccessDecision, AccessRecord, AccessType, DenialReason } from '../domain/model/access-record.entity';
import { WorkShift, WorkShiftStatus } from '../domain/model/work-shift.entity';

export interface AccessRecordResource extends BaseResource {
  tapEventId: string;
  cardUid: string;
  credentialId: string | null;
  cardHolderId: string | null;
  spaceId: string;
  readerId: string;
  accessType: AccessType;
  decision: AccessDecision;
  denialReason: DenialReason;
  attemptedAt: string;
}

export interface WorkShiftResource extends BaseResource {
  cardHolderId: string;
  date: string;
  entryAt: string;
  exitAt: string | null;
  workedMinutes: number | null;
  status: WorkShiftStatus;
}

export class AccessRecordAssembler implements BaseAssembler<AccessRecord, AccessRecordResource> {
  toEntityFromResource(r: AccessRecordResource): AccessRecord {
    return new AccessRecord({ ...r, credentialId: r.credentialId ?? null, cardHolderId: r.cardHolderId ?? null });
  }
  toResourceFromEntity(e: AccessRecord): AccessRecordResource {
    return { ...e.toProps() };
  }
}

export class WorkShiftAssembler implements BaseAssembler<WorkShift, WorkShiftResource> {
  toEntityFromResource(r: WorkShiftResource): WorkShift {
    return new WorkShift({ ...r, exitAt: r.exitAt ?? null, workedMinutes: r.workedMinutes ?? null });
  }
  toResourceFromEntity(e: WorkShift): WorkShiftResource {
    return { ...e.toProps() };
  }
}

@Injectable({ providedIn: 'root' })
export class AccessRecordsApiEndpoint extends BaseApiEndpoint<AccessRecord, AccessRecordResource> {
  constructor() {
    super(inject(HttpClient), 'accessRecords', new AccessRecordAssembler());
  }
}

@Injectable({ providedIn: 'root' })
export class WorkShiftsApiEndpoint extends BaseApiEndpoint<WorkShift, WorkShiftResource> {
  constructor() {
    super(inject(HttpClient), 'workShifts', new WorkShiftAssembler());
  }
}
