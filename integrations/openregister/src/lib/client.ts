import { ServiceError } from '@lowerdeck/error';
import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  extractApiErrorMessage,
  getApiErrorStatus,
  requestAxiosData
} from 'slates';
import type { z } from 'zod';

export class OpenRegisterClient {
  private http;

  constructor(private token: string) {
    if (!token?.trim())
      throw createApiServiceError('Connect an OpenRegister API key before making requests.');
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.openregister.de',
      authHeader: { value: `Bearer ${token}` },
      timeout: 120_000,
      maxRedirects: 0
    });
  }

  async request<S extends z.ZodType>(
    operation: string,
    path: string,
    schema: S,
    options: { method?: 'GET' | 'POST'; params?: object; body?: object } = {}
  ): Promise<z.output<S>> {
    const data = await requestAxiosData(
      operation,
      () =>
        this.http.request<unknown>({
          method: options.method ?? 'GET',
          url: path,
          params: options.params,
          data: options.body
        }),
      (error, action) => {
        if (error instanceof ServiceError) return error;
        const status = Number(getApiErrorStatus(error));
        const hint =
          status === 401
            ? 'Check the API key.'
            : status === 402 || status === 403
              ? 'Check API plan access and available credits.'
              : status === 404
                ? 'Check the identifier and whether this record has the requested data.'
                : status === 429
                  ? 'Wait before retrying; the API rate limit was reached.'
                  : !status
                    ? 'The request timed out or could not reach OpenRegister. Retry explicitly if needed.'
                    : '';
        return buildApiServiceError(error, {
          providerLabel: 'OpenRegister',
          operation: action,
          reason: 'openregister_api_error',
          extractMessage: current =>
            `${extractApiErrorMessage(current).split(this.token).join('[redacted]')} ${hint}`.trim()
        });
      }
    );
    const parsed = schema.safeParse(data);
    if (!parsed.success)
      throw createApiServiceError(
        `OpenRegister returned an unexpected response while trying to ${operation}.`,
        { reason: 'openregister_invalid_response' }
      );
    return parsed.data;
  }
}
