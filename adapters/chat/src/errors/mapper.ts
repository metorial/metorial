import { getServiceErrorData, SlateError } from '@slates/provider';
import {
  type ChatErrorCode,
  type ChatErrorProviderInfo,
  type ChatErrorTargetType,
  getChatErrorTargetType
} from './catalog';
import { ChatError, wrapChatError } from './error';
import type { ChatErrorDetailsInput } from './types';

/** Chat codes for the generic slates codes, used when no provider rule matched. */
export let SLATE_CHAT_ERROR_CODES: Readonly<Record<string, ChatErrorCode>> = {
  'upstream.rate_limited': 'chat.rate_limit.exceeded',
  'upstream.timeout': 'chat.provider.timeout',
  'upstream.network_error': 'chat.provider.network_error',
  'upstream.unavailable': 'chat.provider.unavailable',
  'auth.invalid': 'chat.auth.invalid',
  'auth.expired': 'chat.auth.expired',
  'auth.required': 'chat.auth.invalid',
  'permission.denied': 'chat.access.forbidden'
};

export interface ChatErrorUpstream {
  code?: string;
  status?: number;
  retryAfterMs?: number;
  message?: string;
}

let readCode = (value: unknown) => {
  if (typeof value === 'number') return String(value);
  return typeof value === 'string' && value ? value : undefined;
};

let readStatus = (value: unknown) => {
  let status = typeof value === 'string' && value ? Number(value) : value;
  return typeof status === 'number' && Number.isFinite(status) ? status : undefined;
};

// Duck-typed too, so a SlateError from another copy of the provider package still classifies.
let isSlateError = (error: unknown): error is SlateError => {
  if (SlateError.is(error)) return true;
  if (!(error instanceof Error) || !error.name.startsWith('SlateError')) return false;
  let data = (error as { data?: { code?: unknown } }).data;
  return typeof data?.code === 'string';
};

/** Upstream code, HTTP status, retry delay and message from a `SlateError` or `ServiceError`. */
export let readChatErrorUpstream = (error: unknown): ChatErrorUpstream => {
  if (isSlateError(error)) {
    let retryAfterMs = error.data.baggage?.retryAfterMs;
    return {
      code: readCode(error.data.upstream?.code),
      status: readStatus(error.data.upstream?.status ?? error.data.status),
      retryAfterMs: typeof retryAfterMs === 'number' ? retryAfterMs : undefined,
      message: error.message
    };
  }

  let service =
    error instanceof Error && !error.name.startsWith('SlateError')
      ? getServiceErrorData(error)
      : null;
  if (service) {
    return {
      code: readCode(service.upstreamCode),
      status: readStatus(service.upstreamStatus),
      message: (error as Error).message
    };
  }

  return {};
};

/** The common HTTP status fallback; 404 needs an operation-specific code. */
export let chatErrorCodeForStatus = (
  status: number | undefined,
  notFound?: ChatErrorCode
): ChatErrorCode | undefined => {
  switch (status) {
    case 401:
      return 'chat.auth.invalid';
    case 403:
      return 'chat.access.forbidden';
    case 404:
      return notFound;
    case 429:
      return 'chat.rate_limit.exceeded';
  }
  if (status !== undefined && status >= 500) return 'chat.provider.unavailable';
  return undefined;
};

/** A `Retry-After` header (delay in seconds or an HTTP date) in milliseconds. */
export let parseRetryAfterMs = (value: unknown, now = Date.now()): number | undefined => {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  let seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, Math.ceil(seconds * 1000));
  let date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - now) : undefined;
};

/** What a provider learned from an error; an omitted `code` falls back to the slates code. */
export interface ChatErrorClassification {
  code?: ChatErrorCode;
  provider?: ChatErrorProviderInfo;
  message?: string;
  scopes?: string[];
  retryAfterMs?: number;
}

export interface ChatErrorMapperContext {
  action?: string;
}

export interface ChatErrorMapperOptions<Context extends ChatErrorMapperContext> {
  classify: (
    error: unknown,
    context: Context,
    upstream: ChatErrorUpstream
  ) => ChatErrorClassification;
  /** Context field holding the id for each target type. */
  targetFields: Partial<Record<ChatErrorTargetType, keyof Context>>;
  /** Extra or overriding slates-code fallbacks. */
  extraCodes?: Record<string, ChatErrorCode>;
}

export interface ChatErrorMapper<Context extends ChatErrorMapperContext> {
  map: (error: unknown, context?: Context) => ChatError;
  withErrors: <T>(context: Context, run: () => Promise<T>) => Promise<T>;
}

export let createChatErrorMapper = <Context extends ChatErrorMapperContext>(
  options: ChatErrorMapperOptions<Context>
): ChatErrorMapper<Context> => {
  let slateCodes: Record<string, ChatErrorCode> = {
    ...SLATE_CHAT_ERROR_CODES,
    ...options.extraCodes
  };

  let slateFallback = (error: unknown) =>
    isSlateError(error) && Object.hasOwn(slateCodes, error.data.code)
      ? slateCodes[error.data.code]
      : undefined;

  let map = (error: unknown, context = {} as Context): ChatError => {
    if (ChatError.is(error)) return error;

    let upstream = readChatErrorUpstream(error);
    let result = options.classify(error, context, upstream);
    let code = result.code ?? slateFallback(error) ?? 'chat.provider.error';

    let entity = getChatErrorTargetType(code);
    let field = entity ? options.targetFields[entity] : undefined;
    let target = field ? context[field] : undefined;

    let details: ChatErrorDetailsInput = {
      action: context.action,
      target: typeof target === 'string' ? target : undefined,
      provider: result.provider
    };
    if (result.message) details.message = result.message;
    if (result.scopes) details.scopes = result.scopes;

    let retryAfterMs = result.retryAfterMs ?? upstream.retryAfterMs;
    if (code === 'chat.rate_limit.exceeded' && retryAfterMs !== undefined) {
      details.retryAfterMs = retryAfterMs;
    }

    return wrapChatError(code, error, details);
  };

  let withErrors = async <T>(context: Context, run: () => Promise<T>): Promise<T> => {
    try {
      return await run();
    } catch (error) {
      throw map(error, context);
    }
  };

  return { map, withErrors };
};
