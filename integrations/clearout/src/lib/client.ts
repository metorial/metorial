import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  extractApiErrorMessage,
  isApiErrorRecord,
  requestAxiosData
} from 'slates';

type BulkUpload = {
  fileContent: string;
  fileName: string;
  ignoreDuplicateFile?: boolean;
  optimize?: 'highest_accuracy' | 'fastest_turnaround';
};

export class ClearoutClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string; baseUrl: string }) {
    let token = config.token.trim().replace(/^Bearer\s+/i, '');
    if (!token) throw createApiServiceError('A Clearout API token is required.');
    this.axios = createAuthenticatedAxios({
      baseURL: config.baseUrl,
      authHeader: { value: `Bearer ${token}` },
      timeout: 190000
    });
  }

  private validateResponse(result: unknown): Record<string, unknown> {
    if (!isApiErrorRecord(result)) {
      throw createApiServiceError('Clearout returned an invalid API response.');
    }
    if (result.status === 'failed' || result.status === 'error' || result.error) {
      let error = isApiErrorRecord(result.error) ? result.error : result;
      throw createApiServiceError(
        `Clearout API request failed: ${extractApiErrorMessage(error, {
          response: { data: error },
          nestedKeys: ['reasons'],
          detailKeys: ['message', 'messages', 'code'],
          fallbackMessage: 'Request rejected by Clearout.'
        })}`,
        {
          reason: 'clearout_api_error',
          upstreamCode: error.code === undefined ? undefined : String(error.code)
        }
      );
    }
    return result;
  }

  private async request(
    method: 'GET' | 'POST',
    path: string,
    data?: Record<string, unknown> | FormData,
    params?: Record<string, string>
  ) {
    let result = await requestAxiosData<unknown>(
      `${method} ${path}`,
      () =>
        this.axios.request({
          method,
          url: path,
          data,
          params,
          ...(data instanceof FormData
            ? { headers: { 'Content-Type': 'multipart/form-data' } }
            : {})
        }),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'Clearout',
          reason: 'clearout_api_error',
          operation,
          nestedKeys: ['error', 'reasons'],
          detailKeys: ['message', 'messages', 'code']
        })
    );
    return this.validateResponse(result);
  }

  async verifyEmail(params: { email: string; timeout?: number }) {
    return this.request('POST', '/v2/email_verify/instant', params);
  }

  private bulkUpload(path: string, params: BulkUpload) {
    let form = new FormData();
    form.append('file', new Blob([params.fileContent], { type: 'text/csv' }), params.fileName);
    if (params.ignoreDuplicateFile !== undefined) {
      form.append('ignore_duplicate_file', String(params.ignoreDuplicateFile));
    }
    if (params.optimize !== undefined) form.append('optimize', params.optimize);
    return this.request('POST', path, form);
  }

  async bulkVerifyUpload(params: BulkUpload) {
    return this.bulkUpload('/v2/email_verify/bulk', params);
  }

  async bulkVerifyProgress(listId: string) {
    return this.request('GET', '/v2/email_verify/bulk/progress_status', undefined, {
      list_id: listId
    });
  }

  async downloadResult(listId: string) {
    return this.request('POST', '/v2/download/result', { list_id: listId });
  }

  async cancelVerifyList(listId: string) {
    return this.request('POST', '/v2/email_verify/list/cancel', { list_id: listId });
  }

  async removeVerifyList(listId: string, ignoreResult?: boolean) {
    return this.request('POST', '/v2/email_verify/list/remove', {
      list_id: listId,
      ...(ignoreResult === undefined ? {} : { ignore_result: ignoreResult })
    });
  }

  async findEmail(params: {
    name: string;
    domain: string;
    timeout?: number;
    queue?: boolean;
  }) {
    try {
      let result = await this.axios.post('/v2/email_finder/instant', params, {
        validateStatus: status => (status >= 200 && status < 300) || status === 524
      });
      if (result.status === 524) {
        let body = isApiErrorRecord(result.data) ? result.data : undefined;
        let details = isApiErrorRecord(body?.error) ? body.error : undefined;
        let info = isApiErrorRecord(details?.additional_info)
          ? details.additional_info
          : undefined;
        if (typeof info?.queue_id === 'string' && info.queue_id) {
          return { status: 'queued', data: { queue_id: info.queue_id } };
        }
        throw buildApiServiceError(
          { response: { status: result.status, data: result.data } },
          {
            providerLabel: 'Clearout',
            reason: 'clearout_api_error',
            operation: 'find email',
            nestedKeys: ['error', 'reasons'],
            detailKeys: ['message', 'messages', 'code']
          }
        );
      }
      return this.validateResponse(result.data);
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Clearout',
        reason: 'clearout_api_error',
        operation: 'find email',
        nestedKeys: ['error', 'reasons'],
        detailKeys: ['message', 'messages', 'code']
      });
    }
  }

  async findEmailQueueStatus(queueId: string) {
    return this.request('GET', '/v2/email_finder/instant/queue_status', undefined, {
      qid: queueId
    });
  }

  async bulkFinderUpload(params: BulkUpload) {
    return this.bulkUpload('/v2/email_finder/bulk', params);
  }

  async bulkFinderProgress(listId: string) {
    return this.request('GET', '/v2/email_finder/bulk/progress_status', undefined, {
      list_id: listId
    });
  }

  async downloadFinderResult(listId: string) {
    return this.request('POST', '/v2/email_finder/download/result', { list_id: listId });
  }

  async cancelFinderList(listId: string) {
    return this.request('POST', '/v2/email_finder/list/cancel', { list_id: listId });
  }

  async removeFinderList(listId: string, ignoreResult?: boolean) {
    return this.request('POST', '/v2/email_finder/list/remove', {
      list_id: listId,
      ...(ignoreResult === undefined ? {} : { ignore_result: ignoreResult })
    });
  }

  async reverseLookupLinkedIn(linkedinUrl: string) {
    return this.request('GET', '/v2/reverse_lookup/linkedin', undefined, { url: linkedinUrl });
  }

  async reverseLookupEmail(emailAddress: string) {
    return this.request('GET', '/v2/reverse_lookup/email', undefined, {
      email_address: emailAddress
    });
  }

  async reverseLookupDomain(domain: string) {
    return this.request('GET', '/v2/reverse_lookup/domain', undefined, { name: domain });
  }

  async mxLookup(domain: string) {
    return this.request('POST', '/v2/domain/resolve/mx', { domain });
  }

  async whoisLookup(domain: string) {
    return this.request('POST', '/v2/domain/resolve/whois', { domain });
  }

  async autocompleteCompany(query: string) {
    return this.request('GET', '/public/companies/autocomplete', undefined, { query });
  }

  async getCredits() {
    return this.request('GET', '/v2/email_verify/getcredits');
  }
}
