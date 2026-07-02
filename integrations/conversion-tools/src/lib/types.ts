export interface FileUploadResponse {
  error: string | null;
  file_id: string;
}

export interface FileInfo {
  preview: boolean;
  size: number;
  name: string;
  previewData: string[];
}

export interface TaskCreateRequest {
  type: string;
  options: Record<string, unknown>;
  callbackUrl?: string;
}

export interface TaskCreateResponse {
  error: string | null;
  task_id: string;
  sandbox?: boolean;
  message?: string;
}

export interface TaskStatus {
  error: string | null;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'ERROR';
  file_id: string | null;
  conversionProgress: number;
}

export interface TaskDetail {
  id: string;
  type: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'ERROR';
  error: string | null;
  url: string | null;
  dateCreated: string;
  dateFinished: string | null;
  conversionProgress: number;
  fileSource: {
    id: string;
    name: string;
    size: number;
    exists: boolean;
  };
  fileResult: {
    id: string;
    name: string;
    size: number;
    exists: boolean;
  } | null;
  retentionMode: string;
  cleanupStatus: string;
  dateDeleted: string | null;
  dateExpires: string | null;
}

export interface TaskListResponse {
  error: string | null;
  data: TaskDetail[];
}

export interface TaskRetentionResponse {
  error: string | null;
  retentionMode: string;
  dateExpires: string;
}

export interface TaskDeleteResponse {
  error: string | null;
  message: string;
  dateDeleted: string;
}

export interface ConversionOption {
  type: string;
  title: string;
  options: Record<string, unknown>[];
}

export interface ConfigResponse {
  error: string | null;
  conversions: ConversionOption[];
}

export interface AuthResponse {
  error: string | null;
  email: string;
}
