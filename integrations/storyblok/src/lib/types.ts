export interface StoryblokStory {
  id?: number;
  uuid?: string;
  name?: string;
  slug?: string;
  full_slug?: string;
  content?: Record<string, any>;
  position?: number;
  is_startpage?: boolean;
  is_folder?: boolean;
  parent_id?: number;
  published?: boolean;
  first_published_at?: string;
  published_at?: string;
  created_at?: string;
  updated_at?: string;
  sort_by_date?: string;
  tag_list?: string[];
  group_id?: string;
  lang?: string;
  translated_slugs?: Array<{ path: string; name: string; lang: string }>;
  release_id?: number;
  alternates?: Array<{
    id: number;
    name: string;
    slug: string;
    full_slug: string;
    is_folder: boolean;
    parent_id: number;
  }>;
  meta_data?: Record<string, any>;
  path?: string;
  default_root?: string;
  disable_fe_editor?: boolean;
  breadcrumbs?: Array<{
    id: number;
    name: string;
    parent_id: number;
    disable_fe_editor: boolean;
  }>;
  scheduled_dates?: string;
  preview_token?: { token: string; timestamp: string };
}

export interface StoryblokComponent {
  id?: number;
  name?: string;
  display_name?: string;
  schema?: Record<string, any>;
  is_root?: boolean;
  is_nestable?: boolean;
  component_group_uuid?: string;
  created_at?: string;
  updated_at?: string;
  real_name?: string;
  color?: string;
  icon?: string;
  preset_id?: number;
  image?: string;
}

export interface StoryblokAsset {
  id?: number;
  filename?: string;
  space_id?: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
  file?: any;
  asset_folder_id?: number;
  name?: string;
  short_filename?: string;
  content_length?: number;
  content_type?: string;
  alt?: string;
  title?: string;
  copyright?: string;
  focus?: string;
  ext_id?: string;
  source?: string;
  is_private?: boolean;
  internal_tags_list?: Array<{ id: number; name: string }>;
  meta_data?: Record<string, any>;
}

export interface StoryblokDatasource {
  id?: number;
  name?: string;
  slug?: string;
  dimensions?: Array<{ id: number; name: string; entry_value: string }>;
  created_at?: string;
  updated_at?: string;
}

export interface StoryblokDatasourceEntry {
  id?: number;
  name?: string;
  value?: string;
  dimension_value?: string;
  datasource_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface StoryblokCollaborator {
  id?: number;
  user_id?: number;
  firstname?: string;
  lastname?: string;
  alt_email?: string;
  role?: string;
  user?: {
    id?: number;
    email?: string;
    friendly_name?: string;
    avatar?: string;
  };
  role_id?: number;
  space_role_id?: number;
  permissions?: string[];
  allowed_paths?: string[];
}

export interface StoryblokSpaceRole {
  id?: number;
  role?: string;
  subtitle?: string;
  allowed_paths?: string[];
  resolved_allowed_paths?: string[];
  field_permissions?: string[];
  permissions?: string[];
  ext_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StoryblokWorkflow {
  id?: number;
  name?: string;
  content_types?: string[];
  is_default?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface StoryblokWorkflowStage {
  id?: number;
  name?: string;
  color?: string;
  position?: number;
  allow_publish?: boolean;
  is_default?: boolean;
  workflow_id?: number;
  after_publish_stage_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface StoryblokRelease {
  id?: number;
  name?: string;
  release_at?: string;
  released?: boolean;
  created_at?: string;
  updated_at?: string;
  branches_to_deploy?: number[];
  timezone?: string;
}

export interface StoryblokSpace {
  id?: number;
  name?: string;
  domain?: string;
  plan?: string;
  plan_level?: number;
  created_at?: string;
  updated_at?: string;
  owner_id?: number;
  story_published_hook?: string;
  environments?: Array<{ name: string; location: string }>;
  default_root?: string;
  has_pending_tasks?: boolean;
  options?: Record<string, any>;
}

export interface StoryblokTag {
  id?: number;
  name?: string;
  taggings_count?: number;
}

export interface StoryblokActivity {
  id?: number;
  trackable_id?: number;
  trackable_type?: string;
  owner_id?: number;
  owner_type?: string;
  key?: string;
  parameters?: Record<string, any>;
  recipient_id?: number;
  recipient_type?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StoryblokWebhook {
  id?: number;
  name?: string;
  endpoint?: string;
  actions?: string[];
  activated?: boolean;
  secret?: string;
  space_id?: number;
  created_at?: string;
  updated_at?: string;
}
