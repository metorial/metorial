export interface PaginationParams {
  limit?: number;
  nextToken?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextToken?: string;
}

export interface Workspace {
  workspaceId: string;
  handle: string;
  identityId: string;
  state: string;
  desiredState: string;
  instanceType: string;
  dbVolumeSizeBytes?: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  versionId: number;
  hive?: string;
  databaseName?: string;
  host?: string;
}

export interface Connection {
  connectionId: string;
  handle: string;
  plugin: string;
  type: string;
  identityId?: string;
  tenantId?: string;
  workspaceId?: string;
  parentId?: string;
  config?: Record<string, unknown>;
  credentialSource?: string;
  state?: string;
  createdAt: string;
  updatedAt: string;
  versionId: number;
}

export interface Organization {
  orgId: string;
  handle: string;
  displayName?: string;
  avatarUrl?: string;
  url?: string;
  createdAt: string;
  updatedAt: string;
  versionId: number;
}

export interface OrgMember {
  userId: string;
  orgId: string;
  role: string;
  status: string;
  displayName?: string;
  handle?: string;
  createdAt: string;
  updatedAt: string;
  versionId: number;
}

export interface Pipeline {
  pipelineId: string;
  workspaceId: string;
  title: string;
  pipeline: string;
  frequency?: PipelineFrequency;
  args?: Record<string, unknown>;
  tags?: Record<string, string>;
  desiredState?: string;
  state?: string;
  lastProcessId?: string;
  createdAt: string;
  updatedAt: string;
  versionId: number;
}

export interface PipelineFrequency {
  type: string;
  schedule?: string;
}

export interface Process {
  processId: string;
  identityId?: string;
  workspaceId?: string;
  pipelineId?: string;
  type: string;
  state: string;
  createdAt: string;
  updatedAt: string;
}

export interface Snapshot {
  snapshotId: string;
  workspaceId: string;
  identityId?: string;
  state: string;
  visibility: string;
  dashboardName?: string;
  dashboardTitle?: string;
  schemaVersion?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Actor {
  id: string;
  handle: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  versionId?: number;
}

export interface Datatank {
  datatankId: string;
  workspaceId: string;
  handle: string;
  desiredState?: string;
  state?: string;
  createdAt: string;
  updatedAt: string;
  versionId: number;
}

export interface DatatankTable {
  datatankTableId: string;
  datatankId: string;
  name: string;
  type: string;
  description?: string;
  sourceSchema?: string;
  sourceTable?: string;
  frequency?: Record<string, unknown>;
  state?: string;
  freshness?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  versionId: number;
}

export interface QueryResult {
  items: Record<string, unknown>[];
  columns?: QueryColumn[];
}

export interface QueryColumn {
  name: string;
  dataType: string;
}
