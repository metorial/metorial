export interface PaginationParams {
  limit?: number;
  startCursor?: string;
}

export interface PaginationResponse {
  total_count: number;
  has_more: boolean;
  next_cursor: string | null;
}

export interface DovetailProject {
  id: string;
  author: { id: string; name: string | null } | null;
  title: string;
  type: string;
  created_at: string;
  deleted: boolean;
  folder: { id: string } | null;
}

export interface DovetailNote {
  id: string;
  result_type?: string;
  preview_text?: string | null;
  title: string;
  content?: string;
  author_id?: string | null;
  authors?: string[];
  project_id?: string | null;
  project_title?: string | null;
  created_at: string;
  updated_at: string;
  fields?: { label: string; value: string | null }[];
}

export interface DovetailData {
  id: string;
  type: string;
  title: string;
  project?: { id: string; title: string } | null;
  created_at: string;
  deleted: boolean;
  folder?: { id: string } | null;
  content?: string;
}

export interface DovetailInsight {
  id: string;
  title: string;
  preview_text?: string | null;
  content?: string;
  author_id?: string | null;
  authors?: string[];
  project_id?: string | null;
  project_title?: string | null;
  published?: boolean;
  published_at?: string | null;
  contributors?: string[];
  created_at: string;
  updated_at: string;
  fields?: { label: string; value: string | null }[];
}

export interface DovetailHighlight {
  id: string;
  result_type?: string;
  preview_text?: string | null;
  text?: string | null;
  note_id?: string | null;
  note_title?: string | null;
  author_id?: string | null;
  project_id?: string | null;
  project_title?: string | null;
  created_at: string;
  updated_at: string;
  tags: { title: string | null; highlight_count: number | null }[];
}

export interface DovetailTag {
  id: string;
  result_type?: string;
  author_id?: string | null;
  title: string;
  color?: string | null;
  highlight_count: number;
  created_at: string;
  updated_at: string;
}

export interface DovetailContact {
  id: string;
  name: string;
  email?: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface DovetailDoc {
  id: string;
  type?: string;
  title: string;
  content?: string;
  project?: { id: string; title: string } | null;
  created_at: string;
  updated_at?: string;
  deleted?: boolean;
  folder?: { id: string } | null;
  authors?: string[];
  fields?: { label: string; value: string | null }[];
}

export interface DovetailChannel {
  id: string;
  title: string;
  type?: string;
  created_at: string;
  deleted?: boolean;
  folder?: { id: string } | null;
  topics?: DovetailTopic[];
}

export interface DovetailTopic {
  id: string;
  title: string;
  description: string;
  channel?: { id: string };
  created_at?: string;
}

export interface DovetailFolder {
  id: string;
  title: string;
  type: string;
  created_at: string;
  parent_folder: { id: string } | null;
  folders?: { id: string }[] | null;
}

export interface DovetailFolderContent {
  type: string;
  id: string;
  title: string;
  created_at: string;
  author_id?: string | null;
}

export interface SearchResults {
  total: number;
  highlights: DovetailHighlight[];
  tags: DovetailTag[];
  notes: DovetailNote[];
  insights: DovetailInsight[];
  channels: {
    id: string;
    result_type: string;
    author_id: string | null;
    title: string;
    created_at: string;
    updated_at: string;
  }[];
  themes: {
    id: string;
    result_type: string;
    title: string;
    summary: string;
    created_at: string;
    updated_at: string;
  }[];
  offset: number;
  limit: number;
}

export interface SummarizeResult {
  summary: string;
  citations: { id: string; type: string; citation_id: number }[];
}
