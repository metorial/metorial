import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  extractApiErrorMessage,
  isApiErrorRecord,
  requestAxiosData
} from 'slates';

type RequestOptions = {
  legacy?: boolean;
  params?: Record<string, string>;
  body?: unknown;
  allowString?: boolean;
  allowPartial?: boolean;
};

export class Client {
  private axios;
  private legacyAxios;

  constructor(config: { token: string }) {
    if (!config.token?.trim()) {
      throw createApiServiceError('A CallerAPI API key is required. Reconnect your account.');
    }

    let options = { authHeader: { name: 'X-Auth', value: config.token } };
    this.axios = createAuthenticatedAxios({
      ...options,
      baseURL: 'https://api.callerapi.com'
    });
    // Keep the existing host for endpoints not present in the current API reference.
    this.legacyAxios = createAuthenticatedAxios({
      ...options,
      baseURL: 'https://callerapi.com'
    });
  }

  private request(
    path: string,
    operation: string,
    options: RequestOptions & { allowString: true }
  ): Promise<string | Record<string, any>>;
  private request(
    path: string,
    operation: string,
    options?: RequestOptions & { allowString?: false }
  ): Promise<Record<string, any>>;
  private async request(
    path: string,
    operation: string,
    options: RequestOptions = {}
  ): Promise<string | Record<string, any>> {
    let axios = options.legacy ? this.legacyAxios : this.axios;
    let result = await requestAxiosData<any>(
      operation,
      () =>
        options.body === undefined
          ? axios.get(path, { params: options.params })
          : axios.post(path, options.body),
      (error, requestOperation) =>
        buildApiServiceError(error, {
          providerLabel: 'CallerAPI',
          reason: 'callerapi_api_error',
          operation: requestOperation,
          detailKeys: ['message', 'status_message', 'error', 'error_description']
        })
    );

    if (options.allowString && typeof result === 'string') return result;
    if (!isApiErrorRecord(result)) {
      throw createApiServiceError(
        `CallerAPI returned an unexpected response for ${operation}.`
      );
    }

    let partialPresenceReply =
      options.allowPartial && result.status === 4 && isApiErrorRecord(result.online_presence);

    if (
      result.status === 'error' ||
      (!partialPresenceReply &&
        ((typeof result.error === 'string' && result.error.length > 0) ||
          (typeof result.status === 'number' && result.status !== 0)))
    ) {
      let detail = extractApiErrorMessage(result, {
        response: { data: result },
        detailKeys: ['message', 'status_message', 'error', 'error_description'],
        fallbackMessage: 'The provider rejected the request'
      });
      throw createApiServiceError(`CallerAPI ${operation} failed: ${detail}`, {
        reason: 'callerapi_api_error',
        upstreamCode: String(result.status ?? result.error)
      });
    }

    return result;
  }

  getAccountInfo() {
    return this.request('/api/me', 'get account information');
  }

  lookupPhoneNumber(phoneNumber: string, hlr: boolean = false) {
    return this.request(
      `/api/lookup/${encodeURIComponent(phoneNumber)}`,
      'look up phone number',
      {
        params: { hlr: String(hlr) }
      }
    );
  }

  getPhoneInfo(phoneNumber: string) {
    return this.request(
      `/api/phone/info/${encodeURIComponent(phoneNumber)}`,
      'get caller ID',
      {
        legacy: true
      }
    );
  }

  getPhonePicture(phoneNumber: string) {
    return this.request(
      `/api/phone/pic/${encodeURIComponent(phoneNumber)}`,
      'get caller picture',
      {
        legacy: true,
        allowString: true
      }
    );
  }

  getPortedStatus(phoneNumber: string) {
    return this.request(`/api/ported/${encodeURIComponent(phoneNumber)}`, 'get ported status');
  }

  getPortingHistory(phoneNumber: string) {
    return this.request(
      `/api/porting-history/${encodeURIComponent(phoneNumber)}`,
      'get porting history'
    );
  }

  getPortFraudRisk(phoneNumber: string) {
    return this.request(
      `/api/port-fraud/${encodeURIComponent(phoneNumber)}`,
      'assess port fraud risk',
      {
        legacy: true
      }
    );
  }

  getOnlinePresence(phoneNumber: string) {
    return this.request(
      `/api/online-presence/${encodeURIComponent(phoneNumber)}`,
      'check online presence',
      {
        allowPartial: true
      }
    );
  }

  verifyIdentity(phoneNumber: string, body: unknown) {
    return this.request(`/api/kyc/${encodeURIComponent(phoneNumber)}`, 'verify identity', {
      body
    });
  }
}
