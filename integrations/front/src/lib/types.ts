export interface FrontPaginatedResponse<T> {
  _pagination: {
    next?: string;
  };
  _links: {
    self: string;
  };
  _results: T[];
}

export interface FrontConversation {
  id: string;
  subject: string;
  status: string;
  assignee?: FrontTeammate;
  recipient?: FrontRecipient;
  tags: FrontTag[];
  links: FrontLink[];
  created_at: number;
  waiting_since?: number;
  is_private: boolean;
  scheduled_reminders: FrontReminder[];
  metadata?: Record<string, any>;
  _links: Record<string, string>;
}

export interface FrontMessage {
  id: string;
  type: string;
  is_inbound: boolean;
  draft_mode?: string;
  error_type?: string;
  version?: string;
  created_at: number;
  subject: string;
  blurb: string;
  author?: FrontTeammate;
  recipients: FrontRecipient[];
  body: string;
  text?: string;
  metadata?: Record<string, any>;
  _links: Record<string, string>;
}

export interface FrontContact {
  id: string;
  name?: string;
  description?: string;
  avatar_url?: string;
  is_spammer: boolean;
  links: string[];
  handles: FrontHandle[];
  groups: FrontGroup[];
  custom_fields: Record<string, string>;
  is_private: boolean;
  _links: Record<string, string>;
}

export interface FrontAccount {
  id: string;
  name?: string;
  description?: string;
  logo_url?: string;
  domains: string[];
  external_id?: string;
  custom_fields: Record<string, string>;
  created_at: number;
  updated_at: number;
  _links: Record<string, string>;
}

export interface FrontTeammate {
  id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  is_admin: boolean;
  is_available: boolean;
  is_blocked: boolean;
  custom_fields: Record<string, string>;
  _links: Record<string, string>;
}

export interface FrontTag {
  id: string;
  name: string;
  description?: string;
  highlight?: string;
  is_private: boolean;
  created_at?: number;
  updated_at?: number;
  _links: Record<string, string>;
}

export interface FrontInbox {
  id: string;
  name: string;
  is_private: boolean;
  is_public: boolean;
  custom_fields?: Record<string, string>;
  _links: Record<string, string>;
}

export interface FrontChannel {
  id: string;
  address: string;
  type: string;
  name?: string;
  send_as?: string;
  is_private: boolean;
  _links: Record<string, string>;
}

export interface FrontComment {
  id: string;
  author: FrontTeammate;
  body: string;
  posted_at: number;
  _links: Record<string, string>;
}

export interface FrontTeam {
  id: string;
  name: string;
  inboxes: FrontInbox[];
  members: FrontTeammate[];
  _links: Record<string, string>;
}

export interface FrontLink {
  id: string;
  name?: string;
  type?: string;
  external_url: string;
  custom_fields?: Record<string, string>;
  _links: Record<string, string>;
}

export interface FrontRecipient {
  handle: string;
  role: string;
  _links?: Record<string, string>;
}

export interface FrontHandle {
  handle: string;
  source: string;
}

export interface FrontGroup {
  id: string;
  name: string;
  is_private: boolean;
  _links: Record<string, string>;
}

export interface FrontReminder {
  created_at: number;
  scheduled_at: number;
  _links: Record<string, string>;
}

export interface FrontEvent {
  id: string;
  type: string;
  emitted_at: number;
  source: {
    _meta: { type: string };
    data?: any;
    _links?: Record<string, string>;
  };
  target?: {
    _meta: { type: string };
    data?: any;
    _links?: Record<string, string>;
  };
  conversation: {
    id: string;
    subject?: string;
    status?: string;
    _links?: Record<string, string>;
    [key: string]: any;
  };
  _links: Record<string, string>;
}

export interface FrontRule {
  id: string;
  name: string;
  actions: string[];
  is_private: boolean;
  _links: Record<string, string>;
}

export interface FrontMessageTemplate {
  id: string;
  name: string;
  subject?: string;
  body: string;
  is_available_for_all_inboxes: boolean;
  _links: Record<string, string>;
}

export interface FrontKnowledgeBase {
  id: string;
  name: string;
  status: string;
  type: string;
  _links: Record<string, string>;
}

export interface FrontKnowledgeBaseArticle {
  id: string;
  name: string;
  status: string;
  subject?: string;
  body?: string;
  locale?: string;
  created_at: number;
  updated_at: number;
  _links: Record<string, string>;
}

export interface FrontKnowledgeBaseCategory {
  id: string;
  name: string;
  description?: string;
  locale?: string;
  _links: Record<string, string>;
}

export interface FrontAnalyticsExport {
  id: string;
  status: string;
  progress: number;
  url?: string;
  filename?: string;
  size?: number;
  created_at: number;
  _links: Record<string, string>;
}

export interface FrontShift {
  id: string;
  name: string;
  color: string;
  timezone: string;
  times: {
    day: string;
    start: string;
    end: string;
  }[];
  _links: Record<string, string>;
}

export interface FrontSignature {
  id: string;
  name: string;
  body: string;
  sender_info?: string;
  is_visible_for_all_teammate_channels: boolean;
  is_default: boolean;
  _links: Record<string, string>;
}
