export interface EngageUser {
  id: string;
  uid: string;
  uid_updateable: boolean;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  number: string | null;
  is_account: boolean;
  archived: boolean;
  created_at: string;
  last_interaction: string | null;
  devices: Array<{ token: string; platform: string }>;
  lists: Array<{ id: string; subscribed: boolean }>;
  segments: Array<{ id: string; suppressed: boolean }>;
  accounts: Array<{ id: string; role: string | null }>;
  meta: Record<string, string | number | boolean>;
  member_count: number | null;
  stats: Record<string, unknown>;
}

export interface EngageList {
  id: string;
  title: string;
  description: string | null;
  subscriber_count: number;
  broadcast_count: number;
  double_optin: boolean;
  redirect_url: string | null;
  created_at: string;
}

export interface CreateUserParams {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  number?: string;
  is_account?: boolean;
  created_at?: string;
  device_token?: string;
  device_platform?: string;
  lists?: string[];
  accounts?: Array<{ id: string; role?: string }>;
  meta?: Record<string, string | number | boolean>;
}

export interface UpdateUserParams {
  first_name?: string;
  last_name?: string;
  email?: string;
  number?: string;
  is_account?: boolean;
  device_token?: string;
  device_platform?: string;
  created_at?: string;
  meta?: Record<string, string | number | boolean>;
}

export interface TrackEventParams {
  event: string;
  value?: string | number | boolean;
  properties?: Record<string, string | number | boolean>;
  timestamp?: string;
}

export interface SendEmailParams {
  from: { name?: string; email: string };
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  templateVariables?: Record<string, string>;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  trackClicks?: boolean;
  trackOpens?: boolean;
}

export interface SendSmsParams {
  from: string;
  to: string;
  body: string;
  source: string;
  trackClicks?: boolean;
  channel?: string;
}

export interface CreateListParams {
  title: string;
  description?: string;
  redirectUrl?: string;
  doubleOptin?: boolean;
}

export interface UpdateListParams {
  title?: string;
  description?: string;
  redirectUrl?: string;
  doubleOptin?: boolean;
}

export interface SubscribeToListParams {
  first_name?: string;
  last_name?: string;
  email?: string;
  number?: string;
  created_at?: string;
  meta?: Record<string, string | number | boolean>;
}

export interface PaginatedResponse<T> {
  data: T[];
  next_cursor?: string;
  previous_cursor?: string;
}
