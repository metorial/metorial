import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

let BASE_URL = 'https://api.anonyflow.com';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    let token = config.token.trim();
    if (!token) {
      throw createApiServiceError(
        'An AnonyFlow API key is required. Reconnect with a valid key.'
      );
    }

    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      timeout: 30_000,
      authHeader: { name: 'x-api-key', value: token },
      headers: { Accept: 'application/json' },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'AnonyFlow',
          reason: 'anonyflow_api_error',
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
        })
    });
  }

  async anonymizeValue(data: string): Promise<ApiValueResponse<string>> {
    let response = await this.axios.post<unknown>('/anony-value', { data });
    return this.readStringResponse(response.data, 'protect value');
  }

  async deanonymizeValue(data: string): Promise<ApiValueResponse<string>> {
    let response = await this.axios.post<unknown>('/deanony-value', { data });
    return this.readStringResponse(response.data, 'unprotect value');
  }

  async anonymizePacket(
    data: Record<string, unknown>,
    keys: string[]
  ): Promise<ApiValueResponse<Record<string, unknown>>> {
    let response = await this.axios.post<unknown>('/anony-packet', { data, keys });
    return this.readPacketResponse(response.data, 'protect data');
  }

  async deanonymizePacket(
    data: Record<string, unknown>,
    keys: string[]
  ): Promise<ApiValueResponse<Record<string, unknown>>> {
    let response = await this.axios.post<unknown>('/deanony-packet', { data, keys });
    return this.readPacketResponse(response.data, 'unprotect data');
  }

  async checkConnection(): Promise<ApiResponse> {
    let response = await this.axios.get<unknown>('/test');
    return this.readResponse(response.data, 'check connection');
  }

  private readResponse(data: unknown, operation: string): ApiResponse {
    if (isApiErrorRecord(data) && data.status === false) {
      throw buildApiServiceError(
        { response: { status: 200, data } },
        {
          providerLabel: 'AnonyFlow',
          operation,
          reason: 'anonyflow_api_error',
          fallbackMessage: 'The provider reported that the operation failed.'
        }
      );
    }
    if (!isApiErrorRecord(data) || data.status !== true) {
      throw createApiServiceError(
        `AnonyFlow returned an invalid ${operation} response: expected status to be true.`,
        { reason: 'anonyflow_invalid_response' }
      );
    }
    return data as ApiResponse;
  }

  private readStringResponse(data: unknown, operation: string): ApiValueResponse<string> {
    let result = this.readResponse(data, operation);
    if (typeof result.value !== 'string') {
      throw createApiServiceError(
        `AnonyFlow returned an invalid ${operation} response: expected a string value.`,
        { reason: 'anonyflow_invalid_response' }
      );
    }
    return result as ApiValueResponse<string>;
  }

  private readPacketResponse(
    data: unknown,
    operation: string
  ): ApiValueResponse<Record<string, unknown>> {
    let result = this.readResponse(data, operation);
    if (!isApiErrorRecord(result.value)) {
      throw createApiServiceError(
        `AnonyFlow returned an invalid ${operation} response: expected an object value.`,
        { reason: 'anonyflow_invalid_response' }
      );
    }
    return result as ApiValueResponse<Record<string, unknown>>;
  }
}

export interface ApiResponse extends Record<string, unknown> {
  status: true;
}

export interface ApiValueResponse<T> extends ApiResponse {
  value: T;
}
