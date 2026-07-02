import { z } from 'zod';

export let operationSchema = z.object({
  operationId: z.string().describe('Unique identifier of the operation'),
  projectId: z.string().describe('Project the operation belongs to'),
  branchId: z.string().optional().describe('Branch associated with the operation'),
  endpointId: z.string().optional().describe('Endpoint associated with the operation'),
  action: z.string().describe('Type of operation'),
  status: z.string().describe('Operation status'),
  createdAt: z.string().describe('Timestamp when the operation was created'),
  updatedAt: z.string().describe('Timestamp when the operation was last updated'),
  totalDurationMs: z
    .number()
    .optional()
    .describe('Total duration of the operation in milliseconds')
});

export let branchSchema = z.object({
  branchId: z.string().describe('Unique identifier of the branch'),
  projectId: z.string().describe('Project the branch belongs to'),
  name: z.string().describe('Name of the branch'),
  parentId: z.string().optional().describe('ID of the parent branch'),
  parentLsn: z.string().optional().describe('Parent branch LSN'),
  parentTimestamp: z
    .string()
    .optional()
    .describe('Timestamp of the parent branch point-in-time'),
  default: z.boolean().optional().describe('Whether this is the default branch'),
  protected: z.boolean().optional().describe('Whether the branch is protected'),
  currentState: z.string().optional().describe('Current state of the branch'),
  pendingState: z.string().optional().describe('Pending state of the branch'),
  createdAt: z.string().describe('Timestamp when the branch was created'),
  updatedAt: z.string().describe('Timestamp when the branch was last updated'),
  expiresAt: z.string().optional().describe('Timestamp when the branch expires')
});

export let databaseSchema = z.object({
  databaseId: z.number().describe('Numeric identifier of the database'),
  branchId: z.string().describe('Branch the database belongs to'),
  name: z.string().describe('Name of the database'),
  ownerName: z.string().describe('Role that owns the database'),
  createdAt: z.string().describe('Timestamp when the database was created'),
  updatedAt: z.string().describe('Timestamp when the database was last updated')
});

export let endpointSchema = z.object({
  endpointId: z.string().describe('Unique identifier of the compute endpoint'),
  projectId: z.string().describe('Project the endpoint belongs to'),
  branchId: z.string().describe('Branch the endpoint is connected to'),
  name: z.string().optional().describe('Optional endpoint name'),
  type: z.string().describe('Endpoint type: read_write or read_only'),
  host: z.string().optional().describe('Hostname for connecting to the endpoint'),
  currentState: z.string().optional().describe('Current state of the endpoint'),
  pendingState: z.string().optional().describe('Pending state of the endpoint'),
  regionId: z.string().optional().describe('Region where the endpoint runs'),
  autoscalingLimitMinCu: z
    .number()
    .optional()
    .describe('Minimum compute units for autoscaling'),
  autoscalingLimitMaxCu: z
    .number()
    .optional()
    .describe('Maximum compute units for autoscaling'),
  suspendTimeoutSeconds: z
    .number()
    .optional()
    .describe('Seconds of inactivity before the endpoint is suspended'),
  disabled: z.boolean().optional().describe('Whether connections are disabled'),
  passwordlessAccess: z
    .boolean()
    .optional()
    .describe('Whether passwordless access is enabled'),
  createdAt: z.string().describe('Timestamp when the endpoint was created'),
  updatedAt: z.string().describe('Timestamp when the endpoint was last updated')
});

export let roleSchema = z.object({
  branchId: z.string().describe('Branch the role belongs to'),
  name: z.string().describe('Name of the role'),
  protected: z.boolean().optional().describe('Whether the role is protected from deletion'),
  authenticationMethod: z.string().optional().describe('Configured authentication method'),
  createdAt: z.string().describe('Timestamp when the role was created'),
  updatedAt: z.string().describe('Timestamp when the role was last updated')
});

export let snapshotSchema = z.object({
  snapshotId: z.string().describe('Unique identifier of the snapshot'),
  name: z.string().describe('Snapshot name'),
  lsn: z.string().optional().describe('Snapshot Log Sequence Number'),
  timestamp: z.string().optional().describe('Snapshot timestamp'),
  sourceBranchId: z.string().optional().describe('Branch the snapshot was created from'),
  createdAt: z.string().describe('Timestamp when the snapshot was created'),
  expiresAt: z.string().optional().describe('Timestamp when the snapshot expires'),
  manual: z.boolean().optional().describe('Whether this is a manual snapshot'),
  fullSize: z.number().optional().describe('Full logical size in bytes'),
  diffSize: z.number().optional().describe('Incremental storage size in bytes')
});

export let mapOperation = (op: any) => ({
  operationId: op.id,
  projectId: op.project_id,
  branchId: op.branch_id,
  endpointId: op.endpoint_id,
  action: op.action,
  status: op.status,
  createdAt: op.created_at,
  updatedAt: op.updated_at,
  totalDurationMs: op.total_duration_ms
});

export let mapBranch = (b: any) => ({
  branchId: b.id,
  projectId: b.project_id,
  name: b.name,
  parentId: b.parent_id,
  parentLsn: b.parent_lsn,
  parentTimestamp: b.parent_timestamp,
  default: b.default ?? b.primary,
  protected: b.protected,
  currentState: b.current_state,
  pendingState: b.pending_state,
  createdAt: b.created_at,
  updatedAt: b.updated_at,
  expiresAt: b.expires_at
});

export let mapDatabase = (d: any) => ({
  databaseId: d.id,
  branchId: d.branch_id,
  name: d.name,
  ownerName: d.owner_name,
  createdAt: d.created_at,
  updatedAt: d.updated_at
});

export let mapEndpoint = (e: any) => ({
  endpointId: e.id,
  projectId: e.project_id,
  branchId: e.branch_id,
  name: e.name,
  type: e.type,
  host: e.host,
  currentState: e.current_state,
  pendingState: e.pending_state,
  regionId: e.region_id,
  autoscalingLimitMinCu: e.autoscaling_limit_min_cu,
  autoscalingLimitMaxCu: e.autoscaling_limit_max_cu,
  suspendTimeoutSeconds: e.suspend_timeout_seconds,
  disabled: e.disabled,
  passwordlessAccess: e.passwordless_access,
  createdAt: e.created_at,
  updatedAt: e.updated_at
});

export let mapRole = (r: any) => ({
  branchId: r.branch_id,
  name: r.name,
  protected: r.protected,
  authenticationMethod: r.authentication_method,
  createdAt: r.created_at,
  updatedAt: r.updated_at
});

export let mapSnapshot = (s: any) => ({
  snapshotId: s.id,
  name: s.name,
  lsn: s.lsn,
  timestamp: s.timestamp,
  sourceBranchId: s.source_branch_id,
  createdAt: s.created_at,
  expiresAt: s.expires_at,
  manual: s.manual,
  fullSize: s.full_size,
  diffSize: s.diff_size
});
