import {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  getAdapter,
  type InternalAxiosRequestConfig,
  isAxiosError
} from 'axios';
import { createAuthenticatedAxios, getResponseHeaderValue } from 'slates';
import { matches, upstream } from './validation';

type Options = {
  baseURL?: string;
  token?: string;
  bearer?: boolean;
  orgId?: string;
  authorization?: string;
  secrets: readonly string[];
};
function screen(
  value: unknown,
  secrets: readonly string[],
  budget: { count: number },
  depth = 0
): { value: unknown; changed: boolean } {
  if (++budget.count > 100_000 || depth > 32)
    return { value: '[withheld: inspection bound]', changed: true };
  if (typeof value === 'string')
    return matches(value, secrets)
      ? { value: '[withheld: credential reflection]', changed: true }
      : { value, changed: false };
  if (!value || typeof value !== 'object') return { value, changed: false };
  let changed = false;
  if (Array.isArray(value)) {
    const values = value.map(v => {
      const result = screen(v, secrets, budget, depth + 1);
      changed ||= result.changed;
      return result.value;
    });
    return { value: values, changed };
  }
  const entries = Object.entries(value).map(([key, child]) => {
    const unsafe = matches(key, secrets);
    const result = screen(child, secrets, budget, depth + 1);
    changed ||= unsafe || result.changed;
    return [unsafe ? '[withheld: credential key]' : key, result.value];
  });
  return { value: Object.fromEntries(entries), changed };
}
function safeResponse(response: AxiosResponse, secrets: readonly string[]) {
  const raw = response.data;
  let parsed: unknown = raw,
    wasJson = false;
  if (
    typeof raw === 'string' &&
    getResponseHeaderValue(response.headers, 'content-type')?.includes('json')
  ) {
    try {
      parsed = JSON.parse(raw);
      wasJson = true;
    } catch {}
  }
  const body = screen(parsed, secrets, { count: 0 });
  const headers = screen(Object.fromEntries(Object.entries(response.headers)), secrets, {
    count: 0
  });
  const statusText = screen(response.statusText, secrets, { count: 0 });
  return {
    changed: body.changed || headers.changed || statusText.changed,
    response: {
      ...response,
      data: body.changed ? (wasJson ? JSON.stringify(body.value) : body.value) : raw,
      headers: AxiosHeaders.from(headers.value as Record<string, string>),
      statusText: String(statusText.value ?? '')
    }
  };
}
function safeFailure(
  error: unknown,
  config: InternalAxiosRequestConfig,
  secrets: readonly string[]
) {
  const response =
    isAxiosError(error) && error.response
      ? safeResponse(error.response, secrets).response
      : undefined;
  const code =
    isAxiosError(error) && typeof error.code === 'string' && !matches(error.code, secrets)
      ? error.code
      : undefined;
  return new AxiosError(
    'JumpCloud request failed; reconnect or check the requested operation.',
    code,
    config,
    undefined,
    response
  );
}
export function httpClient(options: Options) {
  const client = createAuthenticatedAxios({
    baseURL: options.baseURL,
    authHeader: options.authorization
      ? { value: options.authorization }
      : options.token
        ? {
            name: options.bearer ? 'Authorization' : 'x-api-key',
            value: options.bearer ? `Bearer ${options.token}` : options.token
          }
        : undefined,
    headers: {
      Accept: 'application/json',
      ...(options.orgId ? { 'x-org-id': options.orgId } : {})
    },
    maxRedirects: 0,
    timeout: 30_000,
    maxContentLength: 4 * 1024 * 1024,
    maxBodyLength: 1024 * 1024,
    errorAdapter: error => upstream(error)
  });
  const native = getAdapter(client.defaults.adapter);
  // The shared outer adapter still owns request capture and both response/error traces.
  client.defaults.adapter = async config => {
    let response: AxiosResponse;
    try {
      response = await native(config);
    } catch (error) {
      throw safeFailure(error, config, options.secrets);
    }
    const safe = safeResponse(response, options.secrets);
    if (safe.changed)
      throw new AxiosError(
        'JumpCloud reflected a connection credential; content was withheld.',
        'JUMPCLOUD_REFLECTION',
        config,
        undefined,
        safe.response
      );
    return safe.response;
  };
  return client;
}
