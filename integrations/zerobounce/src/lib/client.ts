import { createAxios } from 'slates';

let BASE_URLS: Record<string, string> = {
  default: 'https://api.zerobounce.net/v2',
  us: 'https://api-us.zerobounce.net/v2',
  eu: 'https://api-eu.zerobounce.net/v2'
};

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private apiKey: string;

  constructor(config: { token: string; region: string }) {
    this.apiKey = config.token;
    let baseURL = BASE_URLS[config.region] || BASE_URLS.default;
    this.axios = createAxios({ baseURL });
  }

  async validateEmail(params: {
    email: string;
    ipAddress?: string;
    timeout?: number;
    activityData?: boolean;
    verifyPlus?: boolean;
  }) {
    let queryParams: Record<string, string> = {
      api_key: this.apiKey,
      email: params.email
    };
    if (params.ipAddress) queryParams.ip_address = params.ipAddress;
    if (params.timeout !== undefined) queryParams.timeout = String(params.timeout);
    if (params.activityData !== undefined)
      queryParams.activity_data = String(params.activityData);
    if (params.verifyPlus !== undefined) queryParams.verify_plus = String(params.verifyPlus);

    let response = await this.axios.get('/validate', { params: queryParams });
    return response.data;
  }

  async validateBatch(params: {
    emails: Array<{ emailAddress: string; ipAddress?: string }>;
    timeout?: number;
    activityData?: boolean;
    verifyPlus?: boolean;
  }) {
    let body: Record<string, unknown> = {
      api_key: this.apiKey,
      email_batch: params.emails.map(e => ({
        email_address: e.emailAddress,
        ip_address: e.ipAddress || null
      }))
    };
    if (params.timeout !== undefined) body.timeout = params.timeout;
    if (params.activityData !== undefined) body.activity_data = params.activityData;
    if (params.verifyPlus !== undefined) body.verify_plus = params.verifyPlus;

    let response = await this.axios.post('/validatebatch', body);
    return response.data;
  }

  async scoreEmail(email: string) {
    let response = await this.axios.get('/scoring', {
      params: {
        api_key: this.apiKey,
        email
      }
    });
    return response.data;
  }

  async findEmail(params: {
    domain?: string;
    companyName?: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
  }) {
    let queryParams: Record<string, string> = {
      api_key: this.apiKey
    };
    if (params.domain) queryParams.domain = params.domain;
    if (params.companyName) queryParams.company_name = params.companyName;
    if (params.firstName) queryParams.first_name = params.firstName;
    if (params.middleName) queryParams.middle_name = params.middleName;
    if (params.lastName) queryParams.last_name = params.lastName;

    let response = await this.axios.get('/guessformat', { params: queryParams });
    return response.data;
  }

  async getActivityData(email: string) {
    let response = await this.axios.get('/activity', {
      params: {
        api_key: this.apiKey,
        email
      }
    });
    return response.data;
  }

  async getCredits() {
    let response = await this.axios.get('/getcredits', {
      params: { api_key: this.apiKey }
    });
    return response.data;
  }

  async getApiUsage(startDate: string, endDate: string) {
    let response = await this.axios.get('/getapiusage', {
      params: {
        api_key: this.apiKey,
        start_date: startDate,
        end_date: endDate
      }
    });
    return response.data;
  }
}
