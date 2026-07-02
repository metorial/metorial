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
  type: '1x' | '2x' | '4x' | 'subtle' | 'creative';
  index?: string;
  webhookUrl?: string;
  webhookSecret?: string;
}

export interface RerollRequest {
  parentTaskId: string;
  prompt?: string;
  aspectRatio?: string;
  webhookUrl?: string;
  webhookSecret?: string;
}

export interface PanRequest {
  parentTaskId: string;
  direction: 'up' | 'down' | 'left' | 'right';
  prompt?: string;
  webhookUrl?: string;
  webhookSecret?: string;
}

export interface OutpaintRequest {
  parentTaskId: string;
  zoomRatio: number;
  aspectRatio?: string;
  prompt?: string;
  webhookUrl?: string;
  webhookSecret?: string;
}

export interface InpaintRequest {
  parentTaskId: string;
  mask: string;
  prompt?: string;
  webhookUrl?: string;
  webhookSecret?: string;
}

export interface SeedRequest {
  taskId: string;
  webhookUrl?: string;
  webhookSecret?: string;
}

export interface ImagineVideoRequest {
  prompt: string;
  imageUrl: string;
  motion?: 'low' | 'high';
  webhookUrl?: string;
  webhookSecret?: string;
}

export interface ExtendVideoRequest {
  parentTaskId: string;
  index: string;
  prompt: string;
  imageUrl?: string;
  motion?: 'low' | 'high';
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

export interface VideoTaskResult {
  task_id: string;
  task_type: string;
  status?: string;
  percentage?: string;
  video_urls?: string[];
}

export interface SeedTaskResult {
  task_id: string;
  task_type: 'seed';
  status?: string;
  percentage?: string;
  seed?: string;
}

export type TaskResult =
  | ImagineTaskResult
  | VariationsTaskResult
  | BlendTaskResult
  | DescribeTaskResult
  | UpscaleTaskResult
  | VideoTaskResult
  | SeedTaskResult;

export interface FetchTaskResponse {
  task_id: string;
  task_type: string;
  status?: string;
  percentage?: string;
  original_image_url?: string;
  image_urls?: string[];
  image_url?: string;
  video_urls?: string[];
  content?: string[];
  sref?: string;
  seed?: string;
  error?: string;
}

export interface FetchManyResponse {
  tasks: FetchTaskResponse[];
}

export interface AccountInfoResponse {
  email?: string;
  credits?: number;
  total_images?: number;
  plan?: string;
}
