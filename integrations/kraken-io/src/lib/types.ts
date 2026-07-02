export interface KrakenAuth {
  api_key: string;
  api_secret: string;
}

export interface KrakenResizeOptions {
  width?: number;
  height?: number;
  strategy:
    | 'exact'
    | 'portrait'
    | 'landscape'
    | 'auto'
    | 'crop'
    | 'square'
    | 'fit'
    | 'fill'
    | 'none';
  enhance?: boolean;
  crop_mode?: string;
  background?: string;
  x?: number;
  y?: number;
  scale?: number;
}

export interface KrakenResizeSetItem extends KrakenResizeOptions {
  id: string;
  lossy?: boolean;
  quality?: number;
  sampling_scheme?: string;
  storage_path?: string;
}

export interface KrakenConvertOptions {
  format: 'jpeg' | 'png' | 'gif' | 'webp' | 'avif';
  background?: string;
  keep_extension?: boolean;
}

export interface KrakenS3Store {
  key: string;
  secret: string;
  bucket: string;
  region?: string;
  path?: string;
  acl?: 'public_read' | 'private';
}

export interface KrakenOptimizeRequest {
  auth: KrakenAuth;
  url?: string;
  wait?: boolean;
  callback_url?: string;
  json?: boolean;
  dev?: boolean;
  lossy?: boolean;
  quality?: number;
  sampling_scheme?: string;
  resize?: KrakenResizeOptions | KrakenResizeSetItem[];
  convert?: KrakenConvertOptions;
  preserve_meta?: string[];
  auto_orient?: boolean;
  s3_store?: KrakenS3Store;
}

export interface KrakenOptimizeResponse {
  success: boolean;
  file_name?: string;
  original_size?: number;
  kraked_size?: number;
  saved_bytes?: number;
  kraked_url?: string;
  original_width?: number;
  original_height?: number;
  kraked_width?: number;
  kraked_height?: number;
  message?: string;
}

export interface KrakenImageSetResult {
  file_name: string;
  original_size: number;
  kraked_size: number;
  saved_bytes: number;
  kraked_url: string;
  original_width: number;
  original_height: number;
  kraked_width: number;
  kraked_height: number;
}

export interface KrakenImageSetResponse {
  success: boolean;
  results?: Record<string, KrakenImageSetResult>;
  timestamp?: number;
  message?: string;
}

export interface KrakenCallbackResponse {
  id?: string;
  success: boolean;
  message?: string;
}

export interface KrakenUserStatusResponse {
  success: boolean;
  active: boolean;
  plan_name: string;
  quota_total: number;
  quota_used: number;
  quota_remaining: number;
}
