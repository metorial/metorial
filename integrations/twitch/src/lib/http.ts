import { ServiceError } from '@lowerdeck/error';
import { AxiosError, AxiosHeaders, type AxiosResponse, getAdapter, isAxiosError } from 'axios';
import { createAxios, type SlateAxiosDefaults } from 'slates';
import { safeJson } from './contracts';

// Keep Axios serialization and native adapters; screen before the shared trace recorder.
function responseHeaders(value: AxiosResponse['headers']) {
  return value instanceof AxiosHeaders
    ? value.toJSON()
    : Object.fromEntries(Object.entries(value));
}
export function createTwitchAxios(
  options: SlateAxiosDefaults,
  secrets: readonly string[],
  repeatedCredentials: Readonly<Record<string, string | undefined>> = {}
) {
  const screenedData = (data: unknown) => {
    let value = data;
    if (Object.keys(repeatedCredentials).length && typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch {
        return data;
      }
    }
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) === Object.prototype
    ) {
      const copy = { ...value };
      for (const [field, expected] of Object.entries(repeatedCredentials))
        if (expected !== undefined && (copy as Record<string, unknown>)[field] === expected)
          (copy as Record<string, unknown>)[field] = undefined;
      return copy;
    }
    return value;
  };
  const client = createAxios(options);
  const native = getAdapter(client.defaults.adapter);
  client.defaults.adapter = async config => {
    let response: AxiosResponse;
    try {
      response = await native(config);
    } catch (error) {
      if (error instanceof ServiceError) throw error;
      if (isAxiosError(error)) {
        let withheld = false;
        try {
          safeJson(
            {
              message: error.message,
              code: error.code,
              status: error.response?.status,
              statusText: error.response?.statusText,
              data: error.response?.data,
              headers: error.response ? responseHeaders(error.response.headers) : undefined
            },
            secrets
          );
        } catch {
          withheld = true;
        }
        if (!withheld) throw error;
        const status = error.response?.status;
        throw new AxiosError(
          'Twitch request could not be safely verified.',
          'ERR_BAD_RESPONSE',
          config,
          undefined,
          typeof status === 'number' &&
            Number.isInteger(status) &&
            status >= 100 &&
            status <= 599
            ? { config, status, statusText: '', headers: {}, data: undefined }
            : undefined
        );
      }
      throw new AxiosError('Twitch transport failed.', 'ERR_BAD_RESPONSE', config);
    }
    try {
      safeJson(
        {
          data: screenedData(response.data),
          headers: responseHeaders(response.headers),
          status: response.status,
          statusText: response.statusText
        },
        secrets
      );
    } catch {
      throw new AxiosError(
        'Twitch returned credential-bearing or invalid response data.',
        'ERR_BAD_RESPONSE',
        config,
        undefined,
        { config, status: response.status, statusText: '', headers: {}, data: undefined }
      );
    }
    return response;
  };
  return client;
}
