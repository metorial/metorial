export interface PaginatedResponse<T> {
  previous?: string;
  next?: string;
  data: T[];
}

export interface Source {
  sourceId: string;
  name: string;
  sourceType: string;
  workspaceId: string;
  configuration: Record<string, any>;
}

export interface Destination {
  destinationId: string;
  name: string;
  destinationType: string;
  workspaceId: string;
  configuration: Record<string, any>;
}

export interface ConnectionSchedule {
  scheduleType: 'manual' | 'cron';
  cronExpression?: string;
}

export interface StreamConfiguration {
  name: string;
  syncMode?:
    | 'full_refresh_overwrite'
    | 'full_refresh_append'
    | 'incremental_append'
    | 'incremental_deduped_history';
  cursorField?: string[];
  primaryKey?: string[][];
  selectedFields?: Array<{ fieldPath: string[] }>;
}

export interface StreamConfigurations {
  streams?: StreamConfiguration[];
}

export interface Connection {
  connectionId: string;
  name: string;
  sourceId: string;
  destinationId: string;
  workspaceId: string;
  status: 'active' | 'inactive' | 'deprecated';
  schedule: ConnectionSchedule;
  dataResidency: 'auto' | 'us' | 'eu';
  configurations?: StreamConfigurations;
  namespaceDefinition?: 'source' | 'destination' | 'custom_format';
  namespaceFormat?: string;
  prefix?: string;
  nonBreakingSchemaUpdatesBehavior?:
    | 'ignore'
    | 'disable_connection'
    | 'propagate_columns'
    | 'propagate_fully';
  createdAt?: number;
}

export interface Job {
  jobId: number;
  status: 'pending' | 'running' | 'incomplete' | 'failed' | 'succeeded' | 'cancelled';
  jobType: 'sync' | 'reset';
  startTime: string;
  connectionId: string;
  lastUpdatedAt?: string;
  duration?: string;
  bytesSynced?: number;
  rowsSynced?: number;
}

export interface Workspace {
  workspaceId: string;
  name: string;
  dataResidency: 'auto' | 'us' | 'eu';
  notifications?: WorkspaceNotifications;
}

export interface NotificationConfig {
  notificationType: 'slack' | 'email';
  slackConfiguration?: {
    webhook: string;
  };
  sendOnSuccess?: boolean;
  sendOnFailure?: boolean;
}

export interface WorkspaceNotifications {
  failure?: NotificationSetting;
  success?: NotificationSetting;
  connectionUpdate?: NotificationSetting;
  connectionUpdateActionRequired?: NotificationSetting;
  syncDisabled?: NotificationSetting;
  syncDisabledWarning?: NotificationSetting;
}

export interface NotificationSetting {
  notificationType?: string[];
  slackNotificationConfiguration?: { webhook: string };
  emailNotificationConfiguration?: { enabled: boolean };
  webhookNotificationConfiguration?: { url: string };
}

export interface Permission {
  permissionId: string;
  permissionType: string;
  userId: string;
  scope: 'workspace' | 'organization' | 'none';
  scopeId: string;
}

export interface StreamProperties {
  streamName: string;
  syncModes: string[];
  defaultCursorField?: string[];
  sourceDefinedCursorField?: boolean;
  sourceDefinedPrimaryKey?: string[][];
  propertyFields?: string[][];
}

export interface Tag {
  tagId: string;
  name: string;
  color: string;
  workspaceId: string;
}
