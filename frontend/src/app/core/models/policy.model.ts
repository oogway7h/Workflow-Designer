export interface FormField {
  name: string;
  type: string;
  required?: boolean;
  columns?: string[]; // for type='grid': column header names
}

export interface ActivityNode {
  uuid: string;
  name?: string;
  description: string;
  state: string;
  x: number;
  y: number;
  laneId: string;
  assigneeId?: string;
  formSchemaJson?: any;
}

export interface Transition {
  sourceActivityId: string;
  targetActivityId: string;
  condition?: string;
}

export interface LaneModel {
  id: string;
  name: string;
  x: number;
  width: number;
}

export interface Policy {
  uuid: string;
  name?: string;
  description: string;
  state: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
  managerId: string;
  ownerId: string;
  activityNodes: ActivityNode[];
  transitions: Transition[];
  lanes?: LaneModel[];
  visibility?: string; // "PRIVATE" | "SHARED"
  collaboratorIds?: string[];
}

export interface CreatePolicyRequest {
  name?: string;
  description: string;
  managerId: string;
  ownerId: string;
  activityNodes: ActivityNode[];
  transitions: Transition[];
  lanes?: LaneModel[];
  visibility?: string;
  collaboratorIds?: string[];
}

export interface UpdatePolicyRequest {
  description: string;
  ownerId?: string;
  visibility?: string;
  collaboratorIds?: string[];
}

export interface UpdatePolicyStateRequest {
  state: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
}

export interface UpdatePolicyDiagramRequest {
  activityNodes: ActivityNode[];
  transitions: Transition[];
  lanes?: LaneModel[];
}
