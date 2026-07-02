export interface AhaPagination {
  total_records: number;
  total_pages: number;
  current_page: number;
}

export interface AhaProduct {
  id: string;
  reference_prefix: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  product_line?: boolean;
  parent_id?: string;
  capacity_units?: string;
  workspace_type?: string;
}

export interface AhaRelease {
  id: string;
  reference_num: string;
  name: string;
  start_date?: string;
  release_date?: string;
  released?: boolean;
  parking_lot?: boolean;
  description?: string;
  created_at?: string;
  updated_at?: string;
  workflow_status?: AhaWorkflowStatus;
  url?: string;
  resource?: string;
  product_id?: string;
  integration_fields?: AhaIntegrationField[];
}

export interface AhaFeature {
  id: string;
  reference_num: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  start_date?: string;
  due_date?: string;
  workflow_kind?: string;
  workflow_status?: AhaWorkflowStatus;
  assigned_to_user?: AhaUserRef;
  created_by_user?: AhaUserRef;
  url?: string;
  resource?: string;
  product_id?: string;
  release?: AhaReleaseRef;
  epic?: AhaEpicRef;
  tags?: string[];
  score?: number;
  position?: number;
  original_estimate?: number;
  remaining_estimate?: number;
  progress?: number;
  progress_source?: string;
  custom_fields?: AhaCustomField[];
  integration_fields?: AhaIntegrationField[];
  requirements?: AhaRequirement[];
}

export interface AhaEpic {
  id: string;
  reference_num: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  workflow_kind?: string;
  workflow_status?: AhaWorkflowStatus;
  assigned_to_user?: AhaUserRef;
  created_by_user?: AhaUserRef;
  url?: string;
  resource?: string;
  product_id?: string;
  release?: AhaReleaseRef;
  tags?: string[];
  score?: number;
  progress?: number;
  progress_source?: string;
  custom_fields?: AhaCustomField[];
  integration_fields?: AhaIntegrationField[];
}

export interface AhaIdea {
  id: string;
  reference_num: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  workflow_status?: AhaWorkflowStatus;
  assigned_to_user?: AhaUserRef;
  created_by_user?: AhaUserRef;
  url?: string;
  resource?: string;
  product_id?: string;
  tags?: string[];
  score?: number;
  num_endorsements?: number;
  visibility?: string;
  categories?: AhaIdeaCategory[];
  custom_fields?: AhaCustomField[];
  integration_fields?: AhaIntegrationField[];
}

export interface AhaGoal {
  id: string;
  reference_num: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  workflow_status?: AhaWorkflowStatus;
  url?: string;
  resource?: string;
  product_id?: string;
  progress?: number;
  progress_source?: string;
}

export interface AhaInitiative {
  id: string;
  reference_num: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  workflow_status?: AhaWorkflowStatus;
  url?: string;
  resource?: string;
  product_id?: string;
  progress?: number;
  progress_source?: string;
}

export interface AhaComment {
  id: string;
  body: string;
  created_at?: string;
  updated_at?: string;
  user?: AhaUserRef;
}

export interface AhaUser {
  id: string;
  name: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
  avatar_url?: string;
}

export interface AhaTodo {
  id: string;
  name?: string;
  body?: string;
  due_date?: string;
  completed?: boolean;
  created_at?: string;
  updated_at?: string;
  assignees?: AhaUserRef[];
}

export interface AhaRequirement {
  id: string;
  reference_num: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  workflow_status?: AhaWorkflowStatus;
  assigned_to_user?: AhaUserRef;
}

export interface AhaWorkflowStatus {
  id: string;
  name: string;
  color?: string;
  position?: number;
  complete?: boolean;
}

export interface AhaUserRef {
  id: string;
  name?: string;
  email?: string;
}

export interface AhaReleaseRef {
  id: string;
  reference_num?: string;
  name?: string;
}

export interface AhaEpicRef {
  id: string;
  reference_num?: string;
  name?: string;
}

export interface AhaCustomField {
  key: string;
  name: string;
  value: any;
  type: string;
}

export interface AhaIntegrationField {
  id: string;
  name: string;
  value: string;
  integration_id?: string;
  service_name?: string;
}

export interface AhaIdeaCategory {
  id: string;
  name: string;
}
