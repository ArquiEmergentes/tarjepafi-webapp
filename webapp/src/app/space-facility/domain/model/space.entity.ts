export type SpaceType =
  | 'CLASSROOM' | 'CAMPUS_ENTRANCE' | 'CAMPUS_EXIT' | 'RESTRICTED_AREA'
  | 'LABORATORY' | 'LIBRARY' | 'MEETING_ROOM' | 'STUDY_CUBICLE';
export type SpaceStatus = 'AVAILABLE' | 'MAINTENANCE';
export type AccessPolicy = 'OPEN' | 'RESTRICTED';
export type HolderRole = 'STUDENT' | 'TEACHER' | 'STAFF';

export interface SpaceProps {
  id: string;
  code: string;
  name: string;
  type: SpaceType;
  building: string;
  floor: number;
  capacity: number;
  status: SpaceStatus;
  accessPolicy: AccessPolicy;
  allowedRoles: HolderRole[];
}

export class Space {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly type: SpaceType;
  readonly building: string;
  readonly floor: number;
  readonly capacity: number;
  readonly status: SpaceStatus;
  readonly accessPolicy: AccessPolicy;
  readonly allowedRoles: HolderRole[];

  constructor(props: SpaceProps) {
    this.id = props.id;
    this.code = props.code;
    this.name = props.name;
    this.type = props.type;
    this.building = props.building;
    this.floor = props.floor;
    this.capacity = props.capacity;
    this.status = props.status;
    this.accessPolicy = props.accessPolicy;
    this.allowedRoles = props.allowedRoles;
  }

  isInMaintenance(): boolean {
    return this.status === 'MAINTENANCE';
  }

  allowsRole(role: HolderRole): boolean {
    return this.allowedRoles.includes(role);
  }

  toProps(): SpaceProps {
    return { ...this, allowedRoles: [...this.allowedRoles] };
  }
}
