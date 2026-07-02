export interface ReducerRequest {
  key: string;
  plugin_version?: string;
  lossy: number;
  urllist: string[];
  wait?: number;
  resize?: number;
  resize_width?: number;
  resize_height?: number;
  convertto?: string;
  cmyk2rgb?: number;
  keep_exif?: number;
  upscale?: number;
  bg_remove?: string | number;
  refresh?: number;
}

export interface OptimizationResultSuccess {
  Status: {
    Code: number;
    Message: string;
  };
  OriginalURL: string;
  LossyURL?: string;
  LosslessURL?: string;
  WebPLossyURL?: string;
  WebPLosslessURL?: string;
  AVIFLossyURL?: string;
  AVIFLosslessURL?: string;
  OriginalSize: number;
  LossySize?: number;
  LoselessSize?: number;
  WebPLossySize?: number;
  WebPLoselessSize?: number;
  AVIFLossySize?: number;
  AVIFLoselessSize?: number;
  Timestamp?: string;
  PercentImprovement?: number;
}

export interface OptimizationResultError {
  Status: {
    Code: number;
    Message: string;
  };
  OriginalURL?: string;
}

export type OptimizationResult = OptimizationResultSuccess | OptimizationResultError;

export interface ApiStatusResponse {
  APICallsMade: number;
  APICallsQuota: number;
  APICallsMadeOneTime: number;
  APICallsQuotaOneTime: number;
  APICallsMadeNumeric: number;
  APICallsQuotaNumeric: number;
  DomainCount?: number;
  [key: string]: unknown;
}

export interface DomainStatusResponse {
  Status: number;
  QuotaExceeded?: boolean;
  [key: string]: unknown;
}

export interface DomainCdnUsageResponse {
  PaidAPICalls?: number;
  PaidAPICallsOneTime?: number;
  [key: string]: unknown;
}
