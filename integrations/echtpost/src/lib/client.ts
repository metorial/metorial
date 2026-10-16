import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export type ProviderRecord = Record<string, unknown>;

export let record = (value: unknown): ProviderRecord => {
  if (!isApiErrorRecord(value)) {
    throw createApiServiceError('EchtPost returned an invalid response object.');
  }
  return value;
};

export let text = (value: unknown, field: string, nullable = false) => {
  if (value === undefined || (nullable && value === null)) return undefined;
  if (typeof value !== 'string') {
    throw createApiServiceError(`EchtPost returned an invalid ${field}.`);
  }
  return value;
};

export let requiredText = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw createApiServiceError(`Provide a non-empty ${field}.`);
  }
  return value;
};

export let resourceId = (value: unknown, field: string): string => {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw createApiServiceError(`EchtPost returned a missing or invalid ${field}.`);
  }
  return String(value);
};

export let inputId = (value: string, field: string): number => {
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw createApiServiceError(`${field} must be a positive whole-number ID.`);
  }
  return Number(value);
};

export interface ContactInput {
  lastName?: string;
  firstName?: string;
  title?: string;
  companyName?: string;
  street?: string;
  zip?: string;
  city?: string;
  countryCode?: string;
  greetingStyle?: 'formal' | 'informal' | 'custom';
  customSalutation?: string;
  gender?: string;
  department?: string;
  stateCode?: string;
  birthdate?: string;
  externalId?: string;
  groupIds?: string[];
  groupNames?: string[];
}

export let contactBody = (input: ContactInput, creating = true) => {
  if (creating) {
    for (let field of ['lastName', 'street', 'zip', 'city', 'countryCode'] as const) {
      requiredText(input[field], field);
    }
  }
  if (input.countryCode !== undefined && !/^[a-z]{2}$/i.test(input.countryCode)) {
    throw createApiServiceError('countryCode must be a two-letter country code.');
  }
  if (creating && input.greetingStyle === 'custom' && !input.customSalutation?.trim()) {
    throw createApiServiceError('Provide customSalutation when greetingStyle is custom.');
  }
  return pickDefined({
    last_name: input.lastName,
    first_name: input.firstName,
    title: input.title,
    company_name: input.companyName,
    street: input.street,
    zip: input.zip,
    city: input.city,
    country_code: input.countryCode?.toLowerCase(),
    greeting_style: input.greetingStyle,
    custom_salutation: input.customSalutation,
    gender: input.gender,
    department: input.department,
    state_code: input.stateCode,
    birthdate: input.birthdate,
    external_id: input.externalId,
    group_ids: input.groupIds?.map(value => inputId(value, 'groupIds')),
    group_names: input.groupNames
  });
};

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    let token = config.token.trim();
    if (!token || /[\r\n]/.test(token)) {
      throw createApiServiceError('Provide a valid EchtPost API key.');
    }
    let redact = (value: string) => {
      for (let secret of new Set([config.token, token, encodeURIComponent(token)])) {
        if (secret) value = value.split(secret).join('[REDACTED]');
      }
      return value;
    };
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.echtpost.de/v2',
      authHeader: { name: 'X-Api-Key', value: token },
      timeout: 30_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'EchtPost',
          reason: 'echtpost_api_error',
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
          extractMessage: (input, helpers) => {
            let body = helpers.getResponseWithBody(input)?.data;
            let details: string[] = [];
            helpers.collectDetails(body, details, {
              detailKeys: ['title', 'detail', 'message', 'error'],
              nestedKeys: ['errors']
            });
            return redact(
              details.length ? details.join(' - ') : helpers.extractMessage(input)
            );
          },
          extractUpstreamCode: (_input, response) =>
            isApiErrorRecord(response?.data) && typeof response.data.type === 'string'
              ? redact(response.data.type)
              : undefined,
          formatMessage: ({ providerLabel, operation, statusLabel, message }) =>
            redact(`${providerLabel} API ${operation} failed: ${statusLabel}${message}`),
          parent: {}
        })
    });
  }

  async request(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    path: string,
    data?: ProviderRecord,
    params?: ProviderRecord
  ) {
    return this.http.request<unknown>({
      method,
      url: path,
      data,
      params: pickDefined(params ?? {})
    });
  }

  async get(path: string, params?: ProviderRecord) {
    return record((await this.request('GET', path, undefined, params)).data);
  }

  async save(method: 'POST' | 'PATCH', path: string, data: ProviderRecord) {
    return record((await this.request(method, path, data)).data);
  }

  async remove(path: string) {
    let response = await this.request('DELETE', path);
    if (response.status !== 204) {
      throw createApiServiceError('EchtPost did not confirm deletion.');
    }
  }

  async list(path: string, params?: ProviderRecord) {
    let response = await this.request('GET', path, undefined, params);
    if (!Array.isArray(response.data)) {
      throw createApiServiceError('EchtPost returned an invalid response list.');
    }
    let count = (header: string) => {
      let value = getResponseHeaderValue(response.headers, header);
      if (value === undefined) return undefined;
      if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) {
        throw createApiServiceError(`EchtPost returned an invalid ${header} header.`);
      }
      return Number(value);
    };
    return {
      items: response.data.map(record),
      totalCount: count('X-Total-Count'),
      totalPages: count('X-Total-Pages'),
      links: getResponseHeaderValue(response.headers, 'Link')
    };
  }
}
