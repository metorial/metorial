export interface Ticket {
  id: string;
  shortID: string;
  status: 'open' | 'pending' | 'on hold' | 'solved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subject: string;
  requester: {
    email: string;
    name?: string;
  };
  teamID: string;
  assigneeID?: string;
  tags: string[];
  followers: string[];
  ccRecipients?: string[];
  customFields?: Record<string, string>;
  parentTicketID?: string;
  childTicketIDs?: string[];
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  events?: TicketEvent[];
  rating?: TicketRating;
  language?: string;
  spam?: boolean;
  silo?: 'tickets' | 'archive' | 'spam' | 'trash';
}

export interface TicketEvent {
  id: string;
  type: string;
  createdAt: string;
  author?: {
    id?: string;
    type?: string;
    name?: string;
    email?: string;
  };
  message?: {
    text?: string;
    html?: string;
  };
  visibility?: 'public' | 'private';
  attachments?: Attachment[];
}

export interface TicketRating {
  score: 'good' | 'neutral' | 'bad';
  comment?: string;
  ratedAt?: string;
}

export interface Attachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  url?: string;
}

export interface CreateTicketInput {
  subject: string;
  requester: {
    email: string;
    name?: string;
  };
  status?: 'open' | 'pending' | 'on hold' | 'solved' | 'closed';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  teamID?: string;
  assigneeID?: string;
  tags?: string[];
  followers?: string[];
  ccRecipients?: string[];
  customFields?: Record<string, string>;
  transactionID?: string;
}

export interface UpdateTicketInput {
  subject?: string;
  status?: 'open' | 'pending' | 'on hold' | 'solved' | 'closed';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  teamID?: string;
  assigneeID?: string;
  ccRecipients?: string[];
  customFields?: Record<string, string>;
  transactionID?: string;
}

export interface ListTicketsParams {
  status?: string;
  teamID?: string;
  assigneeID?: string;
  tags?: string[];
  requesterEmail?: string;
  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  pageAfter?: string;
  pageBefore?: string;
  limit?: number;
  silo?: 'tickets' | 'archive' | 'spam' | 'trash';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination?: {
    after?: string;
    before?: string;
    hasMore?: boolean;
  };
}

export interface Agent {
  id: string;
  licenseID?: string;
  email: string;
  name: string;
  roles: string[];
  teamIDs: string[];
  status: 'active' | 'invited';
  avatar?: string;
  jobTitle?: string;
  autoassignment?: boolean;
  autoassignmentTeamIDs?: string[];
  signature?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAgentInput {
  email: string;
  name: string;
  roles?: string[];
  teamIDs?: string[];
  autoassignment?: boolean;
  autoassignmentTeamIDs?: string[];
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
  agentIDs?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTeamInput {
  name: string;
  description?: string;
}

export interface Tag {
  id: string;
  name: string;
  teamIDs?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CannedResponse {
  id: string;
  name: string;
  content: string;
  shortcut?: string;
  teamIDs?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomField {
  id: string;
  name: string;
  type: 'single_line' | 'multi_line' | 'url' | 'date';
  editPermission?: 'normal' | 'owner' | 'read_only';
  teamIDs?: string[];
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Rule {
  id: string;
  name: string;
  active?: boolean;
  order?: number;
  triggers?: unknown[];
  actions?: unknown[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Macro {
  id: string;
  name: string;
  visibility?: 'private' | 'shared';
  actions?: unknown[];
  createdAt?: string;
  updatedAt?: string;
}

export interface View {
  id: string;
  name: string;
  visibility?: 'private' | 'shared';
  filters?: unknown;
  createdAt?: string;
  updatedAt?: string;
}

export interface Webhook {
  id: string;
  url: string;
  eventType: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateWebhookInput {
  url: string;
  eventType: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityID?: string;
  authorType?: string;
  authorID?: string;
  changes?: unknown;
  createdAt: string;
}

export interface AuditLogParams {
  action?: string;
  entityType?: string;
  authorType?: string;
  authorID?: string;
  createdFrom?: string;
  createdTo?: string;
  limit?: number;
  pageAfter?: string;
}

export interface Transaction {
  id: string;
  status?: string;
}

export interface ReportParams {
  from: string;
  to: string;
  agentIDs?: string[];
  teamIDs?: string[];
  tags?: string[];
  priority?: string;
  includeSpam?: boolean;
}
