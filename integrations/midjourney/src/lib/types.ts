export interface ImagineRequest {
  prompt: string;
  aspectRatio?: string;
  webhookUrl?: string;
  webhookSecret?: string;
}

export interface VariationsRequest {
  parentTaskId: string;
  index: string;
  webhookUrl?: string;
  webhookSecret?: string;
}

export interface BlendRequest {
  imageUrls: string[];
  dimension?: 'square' | 'portrait' | 'landscape';
  webhookUrl?: string;
  webhookSecret?: string;
}

export interface DescribeRequest {
  imageUrl: string;
  webhookUrl?: string;
  webhookSecret?: string;
}

export interface UpscaleRequest {
  parentTaskId?: string;
  imageUrl?: string;
  type: '2x' | '4x';
  index?: string;
  webhookUrl?: string;
  webhookSecret?: string;
}

export interface TaskSubmitResponse {
  task_id: string;
}

export interface ImagineTaskResult {
  task_id: string;
  task_type: 'imagine';
  status?: string;
  percentage?: string;
  original_image_url?: string;
  image_urls?: string[];
  sref?: string;
}

export interface VariationsTaskResult {
  task_id: string;
  task_type: 'variations';
  status?: string;
  percentage?: string;
  original_image_url?: string;
  image_urls?: string[];
}

export interface BlendTaskResult {
  task_id: string;
  task_type: 'blend';
  status?: string;
  percentage?: string;
  original_image_url?: string;
  image_urls?: string[];
}

export interface DescribeTaskResult {
  task_id: string;
  task_type: 'describe';
  status?: string;
  percentage?: string;
  image_url?: string;
  content?: string[];
}

export interface UpscaleTaskResult {
  task_id: string;
  task_type: string;
  status?: string;
  percentage?: string;
  image_url?: string;
}

export type TaskResult =
  | ImagineTaskResult
  | VariationsTaskResult
  | BlendTaskResult
  | DescribeTaskResult
  | UpscaleTaskResult;

export interface FetchTaskResponse {
  task_id: string;
  task_type: string;
  status?: string;
  percentage?: string;
  original_image_url?: string;
  image_urls?: string[];
  image_url?: string;
  content?: string[];
  sref?: string;
  error?: string;
}
