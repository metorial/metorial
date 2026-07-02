import {
  badRequestError,
  isServiceError,
  notFoundError,
  validationError
} from '@lowerdeck/error';
import type z from 'zod';
import {
  type SlatesNotifications,
  type SlatesRequests,
  type SlatesResponsesByMethod,
  slatesNotificationsByMethod,
  slatesRequestsByMethod
} from '../messages';

export class SlatesProviderProtoHandlerManager {
  #implMap = new Map<
    string,
    {
      type: 'request' | 'notification';
      handler: Function;
      schema: z.ZodType<any>;
    }
  >();

  onNotification<Method extends SlatesNotifications['method']>(
    method: Method,
    handler: (message: Extract<SlatesNotifications, { method: Method }>) => void
  ) {
    let schema = slatesNotificationsByMethod[method];
    if (!schema) {
      throw new Error(`No schema found for method: ${method}`);
    }

    this.#implMap.set(method, {
      type: 'notification',
      handler,
      schema
    });
  }

  onRequest<Method extends SlatesRequests['method']>(
    method: Method,
    cb: (
      message: Extract<SlatesRequests, { method: Method }>
    ) => Promise<SlatesResponsesByMethod[Method]['result']>
  ) {
    let schema = slatesRequestsByMethod[method];
    if (!schema) {
      throw new Error(`No schema found for method: ${method}`);
    }

    this.#implMap.set(method, {
      type: 'request',
      handler: cb,
      schema
    });
  }

  private async _handleInput(input: SlatesNotifications | SlatesRequests) {
    try {
      if (typeof input !== 'object' || input === null) {
        return {
          jsonrpc: '2.0' as const,
          id: (input as any).id,
          error: toSlateErrorResponse(badRequestError({ message: 'Invalid input' }))
        };
      }

      if (input.jsonrpc !== '2.0') {
        return {
          jsonrpc: '2.0' as const,
          id: (input as any).id,
          error: toSlateErrorResponse(badRequestError({ message: 'Invalid jsonrpc version' }))
        };
      }

      let method = input.method;
      if (typeof method !== 'string') {
        return {
          jsonrpc: '2.0' as const,
          id: (input as any).id,
          error: toSlateErrorResponse(
            badRequestError({ message: 'Invalid or missing method' })
          )
        };
      }

      let impl = this.#implMap.get(input.method);
      if (!impl) {
        return {
          jsonrpc: '2.0' as const,
          id: (input as any).id,
          error: toSlateErrorResponse(notFoundError('handler', input.method))
        };
      }

      let parsed = impl.schema.safeParse(input);
      if (!parsed.success) {
        return {
          jsonrpc: '2.0' as const,
          id: (input as any).id,
          error: toSlateErrorResponse(
            validationError({
              entity: 'request',
              message: 'Invalid request parameters',
              errors: parsed.error.issues.map(i => ({
                ...i,
                path: i.path.map(p => String(p))
              }))
            })
          )
        };
      }

      if (impl.type === 'notification') {
        await impl.handler(parsed.data);
        return;
      }

      let result = await impl.handler(parsed.data);

      return {
        jsonrpc: '2.0' as const,
        id: parsed.data.id,
        result
      };
    } catch (err) {
      if (!getSlateErrorResponse(err) && !getServiceErrorData(err)) {
        console.error(err);
      }

      return {
        jsonrpc: '2.0' as const,
        id: (input as any).id,
        error: toSlateErrorResponse(err, {
          message: 'Internal server error'
        })
      };
    }
  }

  static async handleInput(
    manager: SlatesProviderProtoHandlerManager,
    input: SlatesNotifications | SlatesRequests
  ) {
    return manager._handleInput(input);
  }
}

export let createSlatesProviderProtoHandler = (
  cb: (manager: SlatesProviderProtoHandlerManager) => Promise<void>
) => ({
  run: async () => {
    let manager = new SlatesProviderProtoHandlerManager();

    await cb(manager);

    return manager;
  }
});

let toSlateErrorResponse = (
  error: unknown,
  defaults: Partial<{ code: string; message: string }> = {}
) => {
  let slateError = getSlateErrorResponse(error);
  if (slateError) return slateError;

  let serviceError = getServiceErrorData(error);
  if (serviceError) {
    return mapServiceErrorToSlateErrorResponse(serviceError, defaults);
  }

  return mapUnknownErrorToSlateErrorResponse(error, defaults);
};

let SERVICE_ERROR_CODE_MAP: Record<string, string> = {
  invalid_data: 'input.invalid',
  bad_request: 'request.bad',
  not_found: 'resource.not_found',
  unauthorized: 'auth.required',
  forbidden: 'permission.denied',
  invalid_version: 'request.invalid_version',
  conflict: 'resource.conflict',
  gone: 'resource.gone',
  payment_required: 'payment.required',
  precondition_failed: 'request.precondition_failed',
  not_acceptable: 'request.not_acceptable',
  not_implemented: 'operation.not_implemented',
  too_many_requests: 'request.rate_limited',
  timeout: 'internal.timeout',
  internal_server_error: 'internal.unexpected'
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let isStructuredValue = (value: unknown): value is Record<string, unknown> | Function =>
  (typeof value === 'object' || typeof value === 'function') && value !== null;

let isSlateErrorPayload = (
  value: unknown
): value is { code: string; message: string; kind?: string; [key: string]: unknown } =>
  isRecord(value) &&
  typeof value.code === 'string' &&
  typeof value.message === 'string' &&
  typeof value.kind === 'string';

let isServiceErrorData = (
  value: unknown
): value is {
  status: number;
  code: string;
  message: string;
  errors?: unknown;
  hint?: string;
  description?: string;
  reason?: string;
  [key: string]: unknown;
} =>
  isRecord(value) &&
  typeof value.status === 'number' &&
  typeof value.code === 'string' &&
  typeof value.message === 'string' &&
  !('config' in value) &&
  !('request' in value) &&
  !('response' in value) &&
  !('isAxiosError' in value);

let getSlateErrorResponse = (error: unknown) => {
  if (
    isStructuredValue(error) &&
    'name' in error &&
    typeof error.name === 'string' &&
    error.name.startsWith('SlateError') &&
    'toResponse' in error &&
    typeof error.toResponse === 'function'
  ) {
    let response = error.toResponse();
    return isSlateErrorPayload(response) ? response : null;
  }

  if (isSlateErrorPayload(error)) return error;

  if (isStructuredValue(error) && 'data' in error && isSlateErrorPayload(error.data)) {
    return error.data;
  }

  return null;
};

let getServiceErrorData = (error: unknown) => {
  if (isServiceError(error) && isServiceErrorData(error.data)) {
    return error.data;
  }

  if (isServiceErrorData(error)) return error;

  if (isStructuredValue(error) && 'data' in error && isServiceErrorData(error.data)) {
    return error.data;
  }

  if (
    isStructuredValue(error) &&
    'toResponse' in error &&
    typeof error.toResponse === 'function'
  ) {
    let response = error.toResponse();
    if (isServiceErrorData(response)) return response;
  }

  return null;
};

let mapKind = (code: string) => {
  if (code.startsWith('declaration.')) return 'declaration';
  if (code.startsWith('input.')) return 'validation';
  if (code.startsWith('request.')) return 'request';
  if (code.startsWith('config.')) return 'config';
  if (code.startsWith('auth.') || code.startsWith('permission.')) return 'auth';
  if (code.startsWith('resource.')) return 'resource';
  if (code.startsWith('payment.')) return 'payment';
  if (code.startsWith('transport.')) return 'transport';
  if (code.startsWith('upstream.')) return 'upstream';
  return 'internal';
};

let mapRetryable = (code: string) =>
  code === 'request.rate_limited' ||
  code === 'upstream.rate_limited' ||
  code === 'upstream.timeout' ||
  code === 'upstream.network_error' ||
  code === 'upstream.unavailable' ||
  code === 'upstream.error' ||
  code === 'transport.invoke_failed' ||
  code === 'internal.timeout';

let mapServiceErrorCode = (code: string, status?: number) => {
  if (SERVICE_ERROR_CODE_MAP[code]) return SERVICE_ERROR_CODE_MAP[code];
  if (status === 400) return 'request.bad';
  if (status === 401) return 'auth.required';
  if (status === 402) return 'payment.required';
  if (status === 403) return 'permission.denied';
  if (status === 404) return 'resource.not_found';
  if (status === 406) return 'request.not_acceptable';
  if (status === 409) return 'resource.conflict';
  if (status === 410) return 'resource.gone';
  if (status === 412) return 'request.precondition_failed';
  if (status === 429) return 'request.rate_limited';
  if (status === 501) return 'operation.not_implemented';
  if (status === 504) return 'internal.timeout';
  if (status && status >= 500) return 'internal.unexpected';
  return 'internal.unexpected';
};

let mapIssues = (errors: unknown) => {
  if (!Array.isArray(errors)) return undefined;
  let issues = errors.map(error => {
    if (!isRecord(error)) {
      return { message: String(error) };
    }

    return {
      ...error,
      path: Array.isArray(error.path) ? error.path.map(entry => String(entry)) : undefined,
      code: typeof error.code === 'string' ? error.code : undefined,
      message: typeof error.message === 'string' ? error.message : 'Validation issue'
    };
  });
  return issues.length > 0 ? issues : undefined;
};

let mapServiceErrorToSlateErrorResponse = (
  error: {
    status: number;
    code: string;
    message: string;
    errors?: unknown;
    hint?: string;
    description?: string;
    reason?: string;
    [key: string]: unknown;
  },
  defaults: Partial<{ code: string; message: string }> = {}
) => {
  let code = defaults.code ?? mapServiceErrorCode(error.code, error.status);
  let extraEntries = Object.entries(error).filter(
    ([key]) =>
      ![
        'status',
        'code',
        'message',
        'errors',
        'hint',
        'description',
        'reason',
        'object',
        'ok'
      ].includes(key)
  );

  return {
    code,
    kind: mapKind(code),
    message: error.message,
    retryable: mapRetryable(code),
    status: error.status,
    ...(mapIssues(error.errors) ? { issues: mapIssues(error.errors) } : {}),
    baggage: {
      serviceError: {
        code: error.code,
        status: error.status,
        hint: error.hint,
        description: error.description,
        reason: error.reason
      },
      ...(extraEntries.length > 0
        ? { serviceErrorData: Object.fromEntries(extraEntries) }
        : {})
    }
  };
};

let mapUnknownErrorToSlateErrorResponse = (
  error: unknown,
  defaults: Partial<{ code: string; message: string }> = {}
) => ({
  code: defaults.code ?? 'internal.unexpected',
  kind: 'internal',
  message:
    defaults.message ??
    (error instanceof Error ? error.message : 'An unexpected internal error occurred.'),
  retryable: false,
  status: 500,
  ...(error instanceof Error
    ? {
        baggage: {
          originalName: error.name
        }
      }
    : {})
});
