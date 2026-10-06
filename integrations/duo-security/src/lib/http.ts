import { ServiceError } from '@lowerdeck/error';
import axios, { AxiosError, type AxiosResponse, getAdapter, isAxiosError } from 'axios';
import { createAxios } from 'slates';
import { requireValue, safeJson } from './contracts';
import { withoutIntegrationSecrets } from './models';

type Options = NonNullable<Parameters<typeof createAxios>[0]>;
function headers(response: AxiosResponse) {
  return typeof response.headers?.toJSON === 'function'
    ? response.headers.toJSON()
    : Object.fromEntries(Object.entries(response.headers ?? {}));
}
function screen(response: AxiosResponse, secrets: readonly string[]) {
  let body: unknown = response.data;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      /* Non-JSON failures remain screenable text. */
    }
  }
  const path = new URL(response.config.url ?? '', response.config.baseURL).pathname;
  const clean = withoutIntegrationSecrets(path, body);
  if (clean !== body)
    response = {
      ...response,
      data: typeof response.data === 'string' ? JSON.stringify(clean) : clean
    };
  safeJson(
    {
      body: clean,
      headers: headers(response),
      status: response.status,
      statusText: response.statusText
    },
    secrets
  );
  requireValue(
    Number.isInteger(response.status) && response.status >= 100 && response.status <= 599,
    'Duo returned an invalid status.'
  );
  return response;
}
export function createDuoAxios(options: Options, secrets: readonly string[]) {
  const native = getAdapter(options.adapter ?? axios.defaults.adapter);
  return createAxios({
    ...options,
    adapter: async config => {
      try {
        return screen(await native(config), secrets);
      } catch (error) {
        if (isAxiosError(error)) {
          let response: AxiosResponse | undefined;
          try {
            if (error.response) response = screen(error.response, secrets);
          } catch {
            const code = error.response?.status;
            response =
              typeof code === 'number' && Number.isInteger(code) && code >= 100 && code <= 599
                ? { config, status: code, statusText: '', headers: {}, data: undefined }
                : undefined;
          }
          throw new AxiosError('Duo request failed.', error.code, config, undefined, response);
        }
        if (error instanceof ServiceError) throw error;
        throw new AxiosError('Duo transport failed.', 'ERR_NETWORK', config);
      }
    }
  });
}
