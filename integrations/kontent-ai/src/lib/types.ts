export interface KontentReference {
  id?: string;
  codename?: string;
  external_id?: string;
}

export interface ContentItem {
  id: string;
  name: string;
  codename: string;
  type: KontentReference;
  collection: KontentReference;
  sitemap_locations: KontentReference[];
  external_id?: string;
  last_modified: string;
}

export interface ElementValue {
  element: KontentReference;
  value: any;
  components?: any[];
}

export interface WorkflowReference {
  workflow_identifier: KontentReference;
  step_identifier: KontentReference;
}

export interface LanguageVariant {
  item: KontentReference;
  language: KontentReference;
  elements: ElementValue[];
  workflow: WorkflowReference;
  workflow_step: KontentReference;
  last_modified: string;
}

export interface ContentTypeElement {
  id?: string;
  name: string;
  codename?: string;
  external_id?: string;
  type: string;
  is_required?: boolean;
  is_non_localizable?: boolean;
  guidelines?: string;
  content_group?: KontentReference;
  maximum_text_length?: { applies_to: string; value: number };
  allowed_content_types?: KontentReference[];
  allowed_blocks?: string[];
  item_count_limit?: { value: number; condition: string };
  asset_count_limit?: { value: number; condition: string };
  maximum_file_size?: number;
  allowed_file_types?: string;
  image_width_limit?: { value: number; condition: string };
  image_height_limit?: { value: number; condition: string };
  taxonomy_group?: KontentReference;
  options?: Array<{ name: string; codename?: string; external_id?: string }>;
  mode?: string;
  depends_on?: { element: KontentReference; snippet?: KontentReference };
  validation_regex?: {
    regex: string;
    flags?: string;
    is_active: boolean;
    validation_message?: string;
  };
  [key: string]: any;
}

export interface ContentGroup {
  id?: string;
  name: string;
  codename?: string;
  external_id?: string;
}

export interface ContentType {
  id: string;
  name: string;
  codename: string;
  external_id?: string;
  last_modified: string;
  content_groups?: ContentGroup[];
  elements: ContentTypeElement[];
}

export interface AssetDescription {
  language: KontentReference;
  description: string;
}

export interface FileReference {
  id: string;
  type: string;
}

export interface Asset {
  id: string;
  file_name: string;
  title: string | null;
  size: number;
  type: string;
  url: string;
  image_width: number | null;
  image_height: number | null;
  file_reference: FileReference;
  descriptions: AssetDescription[];
  external_id?: string;
  last_modified: string;
  folder?: KontentReference;
  collection?: KontentReference;
}

export interface TaxonomyTerm {
  id?: string;
  name: string;
  codename?: string;
  external_id?: string;
  terms: TaxonomyTerm[];
}

export interface TaxonomyGroup {
  id: string;
  name: string;
  codename: string;
  external_id?: string;
  last_modified: string;
  terms: TaxonomyTerm[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  codename: string;
  color: string;
  transitions_to: Array<{ step: KontentReference }>;
  role_ids?: string[];
}

export interface Workflow {
  id: string;
  name: string;
  codename: string;
  scopes: Array<{ content_types: KontentReference[]; collections?: KontentReference[] }>;
  steps: WorkflowStep[];
  published_step: any;
  scheduled_step?: any;
  archived_step: any;
}

export interface Language {
  id: string;
  name: string;
  codename: string;
  external_id?: string;
  is_active: boolean;
  is_default: boolean;
  fallback_language: KontentReference;
}

export interface Collection {
  id: string;
  name: string;
  codename: string;
  external_id?: string;
}

export interface KontentWebhook {
  id: string;
  name: string;
  url: string;
  secret: string;
  enabled: boolean;
  triggers: {
    delivery_api_content_changes?: WebhookTriggerConfig[];
    management_api_content_changes?: WebhookTriggerConfig[];
    workflow_step_changes?: WebhookWorkflowTriggerConfig[];
    preview_delivery_api_content_changes?: WebhookTriggerConfig[];
  };
  health_status?: string;
  last_modified?: string;
}

export interface WebhookTriggerConfig {
  type: string;
  operations: string[];
  content_type?: KontentReference;
}

export interface WebhookWorkflowTriggerConfig {
  type: string;
  transitions_to: Array<{ step: KontentReference }>;
}

export interface WebhookNotification {
  data: {
    system: {
      id: string;
      name: string;
      codename: string;
      type?: string;
      language?: string;
      collection?: string;
      workflow?: string;
      workflow_step?: string;
      last_modified?: string;
    };
  };
  message: {
    environment_id: string;
    object_type: string;
    action: string;
    delivery_slot?: string;
  };
}

export interface WebhookPayload {
  notifications: WebhookNotification[];
}

export interface PaginatedResponse<T> {
  items?: T[];
  types?: T[];
  taxonomies?: T[];
  assets?: T[];
  languages?: T[];
  pagination: {
    continuation_token?: string | null;
    next_page?: string | null;
    token?: string | null;
  };
}

export interface PatchOperation {
  op: 'addInto' | 'remove' | 'replace' | 'move';
  path?: string;
  value?: any;
  property_name?: string;
  before?: KontentReference;
  after?: KontentReference;
}
