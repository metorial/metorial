import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type CreateAxiosDefaults,
  getAdapter,
  type InternalAxiosRequestConfig,
  isAxiosError
} from 'axios';
import { AuthConfigSecretRedactor, createAxios } from 'slates';
import { clean, fail, type Row, record } from './validation';

const REDACTED = '[redacted]';
function sanitizer(secrets: readonly string[]) {
  const r = new AuthConfigSecretRedactor(
    Object.fromEntries(
      secrets
        .filter(Boolean)
        .flatMap(s => [
          s,
          Buffer.from(s).toString('base64'),
          Buffer.from(s).toString('base64url')
        ])
        .map((s, i) => [`secret${i}`, s])
    )
  );
  const string = (value: string) => {
    let decoded = value;
    for (let i = 0; i <= 5; i++) {
      if (r.redactEmbedded(decoded) !== decoded) return REDACTED;
      if (i === 5) break;
      const next = decoded.replace(/(?:%[a-f0-9]{2})+/gi, v =>
        Buffer.from(v.replaceAll('%', ''), 'hex').toString('utf8')
      );
      if (next === decoded) break;
      decoded = next;
    }
    return value;
  };
  const walk = (value: unknown): unknown => {
    if (typeof value === 'string') return string(value);
    if (Array.isArray(value)) return value.map(walk);
    if (record(value)) {
      const result: Row = Object.getPrototypeOf(value) === null ? Object.create(null) : {};
      for (const [k, v] of Object.entries(value)) {
        const key = string(k);
        if (Object.hasOwn(result, key))
          fail(
            'Softr returned conflicting credential-bearing property names. Read the exact resource before retrying a possible write.',
            'unsafe_response'
          );
        Object.defineProperty(result, key, {
          value: walk(v),
          enumerable: true,
          writable: true,
          configurable: true
        });
      }
      return result;
    }
    return value;
  };
  return {
    string,
    data: (value: unknown) => {
      let parsed = value;
      if (typeof value === 'string') {
        try {
          parsed = JSON.parse(value);
        } catch {
          /* Non-JSON responses remain strings and are validated by the native receipt schema. */
        }
      }
      clean(parsed);
      return walk(parsed);
    }
  };
}
export function safeAxios(config: CreateAxiosDefaults, secrets: readonly string[]) {
  const sanitize = sanitizer(secrets),
    native = getAdapter(axios.defaults.adapter);
  const headers = (value: unknown) => {
    const raw = record(value) && typeof value.toJSON === 'function' ? value.toJSON() : value;
    const cleaned = sanitize.data(raw);
    const result = new AxiosHeaders();
    if (record(cleaned))
      for (const [key, item] of Object.entries(cleaned)) {
        if (key === REDACTED) continue;
        if (
          typeof item === 'string' ||
          typeof item === 'number' ||
          typeof item === 'boolean' ||
          item === null ||
          (Array.isArray(item) && item.every(v => typeof v === 'string'))
        )
          result.set(key, item);
        else fail('Softr returned an invalid native header value.', 'invalid_response');
      }
    return result;
  };
  return createAxios({
    ...config,
    adapter: async request => {
      const safeConfig = (): InternalAxiosRequestConfig => ({
        ...request,
        headers: headers(request.headers),
        data: sanitize.data(request.data),
        params: sanitize.data(request.params),
        url: request.url === undefined ? undefined : sanitize.string(request.url),
        baseURL: request.baseURL === undefined ? undefined : sanitize.string(request.baseURL),
        adapter: undefined
      });
      const nativeStatus = (response: AxiosResponse) => {
        try {
          const status: unknown = response.status;
          if (
            typeof status === 'number' &&
            Number.isInteger(status) &&
            status >= 100 &&
            status <= 599
          )
            return status;
        } catch {
          /* An unreadable status is not native HTTP evidence. */
        }
        return undefined;
      };
      const safeResponse = (response: AxiosResponse): AxiosResponse => {
        const status = nativeStatus(response);
        if (status === undefined)
          fail(
            'Softr returned an invalid native HTTP status. Reconcile any possible write before retrying.',
            'invalid_response'
          );
        return {
          data: sanitize.data(response.data),
          status,
          statusText: sanitize.string(response.statusText),
          headers: headers(response.headers),
          config: safeConfig()
        };
      };
      let received: AxiosResponse | undefined;
      try {
        received = await native(request);
        return safeResponse(received);
      } catch (error) {
        let original = received;
        let code: string | undefined;
        try {
          if (isAxiosError(error)) original = error.response ?? received;
        } catch {
          /* Do not retain a transport error whose response getter throws. */
        }
        try {
          const candidate: unknown = isAxiosError(error) ? error.code : undefined;
          if (
            typeof candidate === 'string' &&
            [
              'ECONNABORTED',
              'ETIMEDOUT',
              'ERR_CANCELED',
              'ERR_NETWORK',
              'ERR_BAD_REQUEST',
              'ERR_BAD_RESPONSE'
            ].includes(candidate)
          )
            code = candidate;
        } catch {
          /* A throwing code getter cannot supply trusted transport metadata. */
        }
        let response: AxiosResponse | undefined;
        try {
          if (original) response = safeResponse(original);
        } catch {
          const status = original && nativeStatus(original);
          if (status !== undefined)
            response = {
              data: { message: 'Unusable native receipt; reconcile before retrying.' },
              status,
              statusText: 'Native response',
              headers: {},
              config: safeConfig()
            };
        }
        throw new AxiosError(
          'Softr request failed; reconcile any possible write before retrying.',
          code,
          safeConfig(),
          undefined,
          response
        );
      }
    }
  });
}
