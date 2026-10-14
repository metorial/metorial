import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord,
  requestAxiosData
} from 'slates';

let http = createAxios({
  baseURL: 'https://aeroleads.com'
});

export class Client {
  private apiKey: string;

  constructor(config: { token: string }) {
    this.apiKey = config.token.trim();
    if (!this.apiKey) {
      throw createApiServiceError('Provide an AeroLeads API key.');
    }
  }

  private async request(path: string, params: Record<string, string>) {
    let response = await requestAxiosData<unknown>(
      'lookup',
      () => http.get(path, { params: { ...params, api_key: this.apiKey } }),
      (error, operation) =>
        buildApiServiceError(error, {
          providerLabel: 'AeroLeads',
          reason: 'aeroleads_api_error',
          operation,
          extractMessage: (error, helpers) => {
            let status = Number(helpers.getStatus(error));
            if (status === 401) return 'Check your AeroLeads API key in account settings.';
            if (status === 402) return 'Your AeroLeads credit limit has been reached.';
            return helpers.extractMessage(error).replaceAll(this.apiKey, '[redacted]');
          }
        })
    );
    if (!isApiErrorRecord(response)) {
      throw createApiServiceError('AeroLeads returned an unexpected response.', {
        reason: 'aeroleads_invalid_response'
      });
    }
    // AeroLeads can echo the API key in its response query.
    let sanitized = { ...response };
    if ('api_key' in sanitized) sanitized.api_key = '[redacted]';
    if (isApiErrorRecord(sanitized.query)) {
      let query = { ...sanitized.query };
      if ('api_key' in query) query.api_key = '[redacted]';
      sanitized.query = query;
    }
    return sanitized;
  }

  async getLinkedInDetails(linkedinUrl: string) {
    if (!linkedinUrl.trim()) {
      throw createApiServiceError('Provide the prospect’s LinkedIn profile URL.');
    }
    return this.request('/api/get_linkedin_details', {
      linkedin_url: linkedinUrl.trim()
    });
  }

  async getCompanyEmail(firstName: string, lastName: string, company: string) {
    if (!firstName.trim() || !lastName.trim() || !company.trim()) {
      throw createApiServiceError('Provide a first name, last name, and company domain.');
    }
    return this.request('/api/get_company_email', {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      company: company.trim()
    });
  }
}
