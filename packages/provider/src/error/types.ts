import type { AxiosError, AxiosResponse } from 'axios';
import type { SlateHttpTrace } from '../axios/trace';
import type { SlateError } from './base';

export type SlateErrorKind =
  | 'declaration'
  | 'validation'
  | 'request'
  | 'auth'
  | 'config'
  | 'resource'
  | 'payment'
  | 'upstream'
  | 'transport'
  | 'internal';

export interface SlateErrorIssue {
  path?: string[];
  code?: string;
  message: string;
  [key: string]: unknown;
}

export interface SlateErrorProviderInfo {
  key?: string;
  service?: string;
  operation?: string;
}

export interface SlateErrorUpstreamInfo {
  status?: number;
  code?: string;
  type?: string;
  requestId?: string;
  method?: string;
  url?: string;
}

export interface SlateErrorResponse {
  code: string;
  message: string;
  kind: SlateErrorKind;
  retryable?: boolean;
  status?: number;
  issues?: SlateErrorIssue[];
  provider?: SlateErrorProviderInfo;
  upstream?: SlateErrorUpstreamInfo;
  baggage?: Record<string, unknown>;
  requestTraces?: SlateHttpTrace[];
}

export interface SlateErrorInput extends Omit<SlateErrorResponse, 'kind'> {
  kind?: SlateErrorKind;
  cause?: unknown;
}

export interface SlateAxiosErrorOptions {
  defaults?: Partial<SlateErrorResponse>;
  extractResponseData?: (response: AxiosResponse) => unknown;
  mapAxiosError?: (
    error: AxiosError,
    inferred: SlateErrorResponse
  ) => SlateError | Partial<SlateErrorResponse> | undefined;
}

export interface SlateServiceErrorData {
  status: number;
  code: string;
  message: string;
  hint?: string;
  description?: string;
  reason?: string;
  errors?: unknown;
  [key: string]: unknown;
}
