import { createAuthenticatedAxios, requestAxiosData } from 'slates';
import type { NaturalRecord } from './envelopes';
import { naturalApiError, naturalServiceError } from './errors';

export type NaturalAuth = {
  token: string;
  keyType: 'party_key' | 'agent_key' | 'unknown';
};

export type NaturalConfig = {
  agentId?: string;
  instanceId?: string;
};

type RequestOptions = {
  params?: NaturalRecord;
  body?: unknown;
  idempotencyKey?: string;
  agentId?: string;
  instanceId?: string;
};

const serializeParams = (params: NaturalRecord) => {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null) search.append(key, String(item));
      }
      continue;
    }

    search.append(key, String(value));
  }

  return search.toString();
};

export class NaturalClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(private readonly options: { auth: NaturalAuth; config?: NaturalConfig }) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.natural.co',
      authHeader: {
        value: `Bearer ${options.auth.token}`
      },
      paramsSerializer: { serialize: serializeParams },
      errorAdapter: naturalApiError
    });
  }

  private headers(options: RequestOptions = {}) {
    const agentId = options.agentId ?? this.options.config?.agentId;
    const instanceId = options.instanceId ?? this.options.config?.instanceId;
    const headers: NaturalRecord = {};

    if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;

    if (agentId) {
      if (this.options.auth.keyType === 'agent_key') {
        throw naturalServiceError(
          'Do not configure X-Agent-ID when using a Natural agent key. Agent keys are already scoped to one agent.'
        );
      }

      if (!instanceId) {
        throw naturalServiceError('X-Instance-ID is required whenever X-Agent-ID is sent.');
      }

      headers['X-Agent-ID'] = agentId;
    }

    if (instanceId) headers['X-Instance-ID'] = instanceId;

    return headers;
  }

  async request<T = unknown>(
    operation: string,
    method: 'get' | 'post' | 'patch' | 'put' | 'delete',
    path: string,
    options: RequestOptions = {}
  ) {
    return await requestAxiosData<T>(
      operation,
      () =>
        this.axios.request<T>({
          method,
          url: path,
          params: options.params,
          data: options.body,
          headers: this.headers(options)
        }),
      naturalApiError
    );
  }
}
