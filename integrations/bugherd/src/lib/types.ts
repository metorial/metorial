export interface BugherdOrganization {
  id: number;
  name: string;
}

export interface BugherdUser {
  id: number;
  email: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface BugherdProject {
  id: number;
  name: string;
  devurl: string;
  is_active: boolean;
  is_public: boolean;
  has_custom_columns: boolean;
  guests_see_guests: boolean;
  created_at?: string;
  updated_at?: string;
  members?: BugherdUser[];
  guests?: BugherdUser[];
}

export interface BugherdTask {
  id: number;
  local_task_id: number;
  project_id: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  deleted_at: string | null;
  title: string | null;
  description: string;
  priority_id: number;
  status_id: number | null;
  status: string;
  site: string | null;
  url: string | null;
  tag_names: string[];
  external_id: string | null;
  requester_email: string | null;
  attachments: string[];
  screenshot_url: string | null;
  secret_link: string | null;
  admin_link: string | null;
  assigned_to: BugherdUser | null;
  requester: BugherdUser | null;
}

export interface BugherdComment {
  id: number;
  task_id: number;
  user_id: number;
  user: BugherdUser;
  text: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export interface BugherdAttachment {
  id: number;
  file_name: string;
  url: string;
  created_at: string;
  updated_at: string;
}

export interface BugherdColumn {
  id: number;
  name: string;
  position: number;
  sortorder: string | null;
}

export interface BugherdWebhook {
  id: number;
  project_id: number | null;
  target_url: string;
  event: string;
}

export interface BugherdMeta {
  count: number;
}

export interface TaskFilters {
  updatedSince?: string;
  createdSince?: string;
  status?: string;
  priority?: string;
  tag?: string;
  assignedToId?: number;
  externalId?: string;
  page?: number;
}

export interface CreateTaskParams {
  description: string;
  priority?: string;
  status?: string;
  requesterEmail?: string;
  requesterId?: number;
  assignedToId?: number;
  assignedToEmail?: string;
  tagNames?: string[];
  externalId?: string;
}

export interface UpdateTaskParams {
  description?: string;
  priority?: string;
  status?: string;
  assignedToId?: number | null;
  assignedToEmail?: string;
  unassignUser?: number;
  tagNames?: string[];
  externalId?: string;
  updaterEmail?: string;
}

export interface CreateProjectParams {
  name: string;
  devurl: string;
  isActive?: boolean;
  isPublic?: boolean;
  guestsSeeGuests?: boolean;
}

export interface UpdateProjectParams {
  name?: string;
  devurl?: string;
  isActive?: boolean;
  isPublic?: boolean;
  permission?: 'guests_see_guests' | 'guests_see_self';
}

export interface CreateCommentParams {
  text: string;
  userId?: number;
  email?: string;
  isPrivate?: boolean;
}
