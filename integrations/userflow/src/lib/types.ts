export interface UserflowListResponse<T> {
  object: 'list';
  data: T[];
  has_more: boolean;
  url: string;
  next_page_url: string | null;
}

export interface UserflowUser {
  id: string;
  object: 'user';
  attributes: Record<string, unknown>;
  created_at: string;
  groups?: UserflowGroup[] | null;
  memberships?: UserflowMembership[] | null;
}

export interface UserflowGroup {
  id: string;
  object: 'group';
  attributes: Record<string, unknown>;
  created_at: string;
  memberships?: UserflowMembership[] | null;
}

export interface UserflowMembership {
  id: string;
  object: 'group_membership';
  attributes: Record<string, unknown>;
  created_at: string;
  group_id: string;
  group?: UserflowGroup | null;
  user_id?: string;
  user?: UserflowUser | null;
}

export interface UserflowEvent {
  id: string;
  object: 'event';
  name: string;
  user_id: string | null;
  group_id: string | null;
  attributes: Record<string, unknown>;
  created_at: string;
  time: string;
  user?: UserflowUser | null;
  group?: UserflowGroup | null;
}

export interface UserflowEventDefinition {
  id: string;
  object: 'event_definition';
  created_at: string;
  description: string | null;
  display_name: string;
  name: string;
}

export interface UserflowContent {
  id: string;
  object: 'content';
  created_at: string;
  draft_version_id: string | null;
  draft_version?: unknown | null;
  name: string;
  published_version_id: string | null;
  published_version?: unknown | null;
  type: 'flow' | 'checklist' | 'launcher';
}

export interface UserflowContentVersion {
  id: string;
  object: 'content_version';
  content_id: string;
  content?: UserflowContent | null;
  created_at: string;
  [key: string]: unknown;
}

export interface UserflowContentSession {
  id: string;
  object: 'content_session';
  answers?: unknown[] | null;
  completed_at: string | null;
  completed: boolean;
  content_id: string;
  content?: UserflowContent | null;
  created_at: string;
  group_id: string | null;
  group?: UserflowGroup | null;
  is_preview: boolean;
  last_activity_at: string;
  launcher_activated: boolean;
  progress: string;
  user_id: string;
  user?: UserflowUser | null;
  version_id: string;
  version?: UserflowContentVersion | null;
}

export interface UserflowWebhookSubscription {
  id: string;
  object: 'webhook_subscription';
  api_version: string;
  created_at: string;
  secret: string;
  topics: string[];
  url: string;
}

export interface UserflowAccount {
  id: string;
  object: 'account';
  name: string;
  slug: string;
  created_at: string;
  is_2fa_enforced: boolean;
  environments?: unknown[] | null;
}

export interface UserflowMember {
  id: string;
  object: 'member';
  created_at: string;
  email: string;
  name: string;
  permissions: UserflowPermission[];
  [key: string]: unknown;
}

export interface UserflowPermission {
  action: string;
  subject: string;
  subject_id: string;
}

export interface UserflowInvite {
  id: string;
  object: 'invite';
  created_at: string;
  email: string;
  permissions: UserflowPermission[];
  [key: string]: unknown;
}

export interface UserflowDeleteResponse {
  deleted: boolean;
}
