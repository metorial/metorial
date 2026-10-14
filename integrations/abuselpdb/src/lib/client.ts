import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token) {
      throw createApiServiceError('An AbuseIPDB API key is required. Reconnect your account.');
    }

    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.abuseipdb.com/api/v2',
      authHeader: { name: 'Key', value: config.token },
      contentType: false,
      headers: { Accept: 'application/json' },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'AbuseIPDB',
          reason: 'abuseipdb_api_error'
        })
    });
  }

  async checkIp(params: { ipAddress: string; maxAgeInDays?: number; verbose?: boolean }) {
    let response = await this.axios.get('/check', {
      params: {
        ipAddress: params.ipAddress,
        maxAgeInDays: params.maxAgeInDays ?? 30,
        verbose: params.verbose ? '' : undefined
      }
    });
    return response.data;
  }

  async getReports(params: {
    ipAddress: string;
    maxAgeInDays?: number;
    page?: number;
    perPage?: number;
  }) {
    let response = await this.axios.get('/reports', {
      params: {
        ipAddress: params.ipAddress,
        maxAgeInDays: params.maxAgeInDays ?? 30,
        page: params.page ?? 1,
        perPage: params.perPage ?? 25
      }
    });
    return response.data;
  }

  async checkBlock(params: { network: string; maxAgeInDays?: number }) {
    let response = await this.axios.get('/check-block', {
      params: {
        network: params.network,
        maxAgeInDays: params.maxAgeInDays ?? 30
      }
    });
    return response.data;
  }

  async reportIp(params: {
    ip: string;
    categories: string;
    comment?: string;
    timestamp?: string;
  }) {
    let body = new URLSearchParams({ ip: params.ip, categories: params.categories });
    if (params.comment !== undefined) body.set('comment', params.comment);
    if (params.timestamp !== undefined) body.set('timestamp', params.timestamp);

    let response = await this.axios.post('/report', body.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return response.data;
  }

  async bulkReport(params: { csvContent: string }) {
    let body = new FormData();
    body.append('csv', new Blob([params.csvContent], { type: 'text/csv' }), 'report.csv');

    let response = await this.axios.post('/bulk-report', body);
    return response.data;
  }

  async getBlacklist(params: {
    confidenceMinimum?: number;
    limit?: number;
    onlyCountries?: string;
    exceptCountries?: string;
    ipVersion?: number;
  }) {
    let queryParams: Record<string, string | number | undefined> = {
      confidenceMinimum: params.confidenceMinimum ?? 100,
      limit: params.limit,
      ipVersion: params.ipVersion
    };

    if (params.onlyCountries) {
      queryParams.onlyCountries = params.onlyCountries;
    }
    if (params.exceptCountries) {
      queryParams.exceptCountries = params.exceptCountries;
    }

    let response = await this.axios.get('/blacklist', {
      params: queryParams
    });
    return response.data;
  }

  async clearAddress(params: { ipAddress: string }) {
    let response = await this.axios.delete('/clear-address', {
      params: {
        ipAddress: params.ipAddress
      }
    });
    return response.data;
  }
}
