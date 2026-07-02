import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(private config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.abuseipdb.com/api/v2'
    });
  }

  private get headers() {
    return {
      Key: this.config.token,
      Accept: 'application/json'
    };
  }

  async checkIp(params: { ipAddress: string; maxAgeInDays?: number; verbose?: boolean }) {
    let response = await this.axios.get('/check', {
      headers: this.headers,
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
      headers: this.headers,
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
      headers: this.headers,
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
    let response = await this.axios.post('/report', null, {
      headers: {
        ...this.headers,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      params: {
        ip: params.ip,
        categories: params.categories,
        comment: params.comment,
        timestamp: params.timestamp
      }
    });
    return response.data;
  }

  async bulkReport(params: { csvContent: string }) {
    let boundary = `----SlatesBoundary${Date.now().toString(36)}`;
    let body = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="csv"; filename="report.csv"',
      'Content-Type: text/csv',
      '',
      params.csvContent,
      `--${boundary}--`
    ].join('\r\n');

    let response = await this.axios.post('/bulk-report', body, {
      headers: {
        ...this.headers,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      }
    });
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
      headers: this.headers,
      params: queryParams
    });
    return response.data;
  }

  async clearAddress(params: { ipAddress: string }) {
    let response = await this.axios.delete('/clear-address', {
      headers: this.headers,
      params: {
        ipAddress: params.ipAddress
      }
    });
    return response.data;
  }
}
