export interface ZepUser {
  user_id?: string;
  uuid?: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ZepThread {
  thread_id: string;
  user_id?: string | null;
  uuid?: string | null;
  created_at?: string | null;
}

export interface ZepMessage {
  role: string;
  content: string;
  name?: string;
  uuid?: string;
  created_at?: string;
  metadata?: Record<string, unknown>;
  processed?: boolean;
}

export interface ZepMessageList {
  messages?: ZepMessage[];
  user_id?: string;
  thread_created_at?: string;
  row_count?: number;
  total_count?: number;
}

export interface ZepNode {
  uuid: string;
  name: string;
  summary?: string | null;
  labels?: string[] | null;
  attributes?: Record<string, unknown> | null;
  created_at?: string | null;
  score?: number | null;
}

export interface ZepEdge {
  uuid: string;
  fact: string;
  name?: string | null;
  source_node_uuid?: string | null;
  target_node_uuid?: string | null;
  created_at?: string | null;
  valid_at?: string | null;
  invalid_at?: string | null;
  expired_at?: string | null;
}

export interface ZepEpisode {
  uuid: string;
  content: string;
  created_at?: string;
  processed?: boolean;
  task_id?: string;
  source?: string;
  source_description?: string;
  metadata?: Record<string, unknown>;
  document_id?: string;
}
