import { ServiceError } from '@lowerdeck/error';
import { AxiosError, AxiosHeaders, type AxiosResponse, getAdapter, isAxiosError } from 'axios';
import { createAxios, getApiErrorStatus } from 'slates';
import { safeJson } from './contracts';

// Run before the shared trace hook while retaining Axios's native serialization and adapter.
export function createDialpadAxios(
  config: Parameters<typeof createAxios>[0],
  secrets: readonly string[],
  oauth = false
) {
  const client = createAxios(config);
  const nativeAdapter = getAdapter(client.defaults.adapter);
  client.defaults.adapter = async request => {
    let response: AxiosResponse<unknown> | undefined;
    try {
      response = await nativeAdapter(request);
      const headers = new AxiosHeaders();
      for (const [name, value] of Object.entries(response.headers)) {
        if (value !== undefined) headers.set(name, value);
      }
      safeJson(
        {
          headers: headers.toJSON(),
          status: response.status,
          statusText: response.statusText
        },
        secrets,
        true
      );
      const data: unknown =
        typeof response.data === 'string' && response.data !== ''
          ? JSON.parse(response.data)
          : response.data;
      if (oauth && data && typeof data === 'object' && !Array.isArray(data)) {
        const {
          access_token: _access,
          refresh_token: _refresh,
          ...rest
        } = data as Record<string, unknown>;
        safeJson(rest, secrets, true);
      } else safeJson(data, secrets, true);
      return response;
    } catch (error) {
      // Existing safe ServiceErrors thrown by an adapter remain canonical.
      if (!response && error instanceof ServiceError) throw error;
      const candidate = response ?? (isAxiosError(error) ? error.response : undefined);
      const rawStatus = candidate?.status ?? getApiErrorStatus(error);
      const status =
        typeof rawStatus === 'number' &&
        Number.isInteger(rawStatus) &&
        rawStatus >= 100 &&
        rawStatus <= 599
          ? rawStatus
          : undefined;
      const safeResponse =
        status === undefined
          ? undefined
          : {
              status,
              statusText: '',
              headers: {},
              config: request,
              data: {
                message:
                  'Dialpad response could not be verified. Reconcile uncertain writes before retrying.'
              }
            };
      const code =
        isAxiosError(error) &&
        typeof error.code === 'string' &&
        /^[A-Z_]{1,64}$/.test(error.code)
          ? error.code
          : 'ERR_BAD_RESPONSE';
      // Preserve a safe native classification and failed trace without the original response, request object or cause.
      throw new AxiosError(
        'Dialpad response could not be verified.',
        code,
        request,
        undefined,
        safeResponse
      );
    }
  };
  return client;
}
