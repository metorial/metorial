import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

export let environments = ['production_us', 'production_eu', 'sandbox'] as const;

let baseUrls: Record<string, string> = {
  production_us: 'https://api.accredible.com',
  production_eu: 'https://eu.api.accredible.com',
  sandbox: 'https://sandbox.api.accredible.com'
};

export interface RecipientInput {
  name: string;
  email: string;
  phoneNumber?: string;
  id?: string;
  metaData?: Record<string, any>;
}

export interface EvidenceItemInput {
  description?: string;
  url?: string;
  category?: string;
  file?: string;
}

export interface ReferenceInput {
  description?: string;
  relationship?: string;
  referee?: {
    name?: string;
    email?: string;
    avatar?: string;
    url?: string;
  };
}

export interface CreateCredentialInput {
  recipient: RecipientInput;
  groupId: number;
  name?: string;
  description?: string;
  issuedOn?: string;
  expiredOn?: string;
  complete?: boolean;
  private?: boolean;
  approve?: boolean;
  customAttributes?: Record<string, any>;
  evidenceItems?: EvidenceItemInput[];
  references?: ReferenceInput[];
  metaData?: Record<string, any>;
}

export interface UpdateCredentialInput {
  name?: string;
  description?: string;
  issuedOn?: string;
  expiredOn?: string;
  complete?: boolean;
  private?: boolean;
  approve?: boolean;
  customAttributes?: Record<string, any>;
  groupId?: number;
  recipient?: Partial<RecipientInput>;
}

export interface SearchCredentialsInput {
  groupId?: string;
  email?: string;
  recipientId?: string;
  startDate?: string;
  endDate?: string;
  startUpdatedDate?: string;
  endUpdatedDate?: string;
  pageSize?: number;
  page?: number;
}

export interface CreateGroupInput {
  name: string;
  courseName: string;
  courseDescription?: string;
  courseLink?: string;
  designId?: number;
  language?: string;
  attachPdf?: boolean;
}

export interface UpdateGroupInput {
  name?: string;
  courseName?: string;
  courseDescription?: string;
  courseLink?: string;
  designId?: number;
  language?: string;
  attachPdf?: boolean;
}

export class Client {
  private ax;

  constructor(config: { token: string; environment?: string }) {
    let environment = config.environment ?? 'production_us';
    if (!config.token.trim()) {
      throw createApiServiceError('An Accredible API key is required.');
    }
    if (!Object.hasOwn(baseUrls, environment)) {
      throw createApiServiceError('Select a supported Accredible API environment.');
    }
    this.ax = createAuthenticatedAxios({
      baseURL: baseUrls[environment],
      authHeader: { value: `Token token=${config.token}` },
      timeout: 30000,
      maxRedirects: 0,
      errorAdapter: error => this.apiError(error)
    });
    this.ax.interceptors.response.use(response => {
      if (isApiErrorRecord(response.data) && response.data.success === false) {
        throw this.apiError({ response });
      }
      return response;
    });
  }

  private apiError(error: unknown) {
    return buildApiServiceError(error, {
      providerLabel: 'Accredible',
      reason: 'accredible_api_error',
      detailKeys: ['message', 'detail', 'error', 'error_description', 'data'],
      extractMessage: (value, helpers) => {
        let response = helpers.getResponseWithBody(value);
        if (!helpers.isRecord(response?.data)) return undefined;
        let errors = response.data.errors;
        if (!helpers.isRecord(errors)) return undefined;
        let messages: string[] = [];
        for (let [field, details] of Object.entries(errors)) {
          let fieldMessages: string[] = [];
          helpers.collectDetails(details, fieldMessages);
          if (fieldMessages.length) messages.push(`${field}: ${fieldMessages.join(', ')}`);
        }
        return messages.length ? messages.join('; ') : undefined;
      }
    });
  }

  private entity(data: any, key: string, numericId = false): any {
    let entity = data?.[key];
    let id = entity?.id;
    let validId = numericId
      ? typeof id === 'number' && Number.isFinite(id)
      : (typeof id === 'string' && id.trim().length > 0) ||
        (typeof id === 'number' && Number.isFinite(id));
    if (!isApiErrorRecord(entity) || !validId) {
      throw createApiServiceError(`Accredible returned an invalid ${key} without a valid ID.`);
    }
    return entity;
  }

  private collection(data: any, key: string, numericId = false): any[] {
    if (!Array.isArray(data?.[key])) {
      throw createApiServiceError(`Accredible returned an invalid ${key} list.`);
    }
    for (let item of data[key]) this.entity({ item }, 'item', numericId);
    return data[key];
  }

  private pagination(page?: number, pageSize?: number) {
    for (let [label, value] of [
      ['page', page],
      ['pageSize', pageSize]
    ] as const) {
      if (value !== undefined && (!Number.isSafeInteger(value) || value < 1)) {
        throw createApiServiceError(`${label} must be a positive whole number.`);
      }
    }
  }

  async getIssuer(): Promise<any> {
    let response = await this.ax.get('/v1/issuer/details');
    return this.entity(response.data, 'issuer', true);
  }

  async createCredential(input: CreateCredentialInput): Promise<any> {
    let credential = pickDefined({
      recipient: pickDefined({
        name: input.recipient.name,
        email: input.recipient.email,
        phone_number: input.recipient.phoneNumber,
        id: input.recipient.id,
        meta_data: input.recipient.metaData
      }),
      group_id: input.groupId,
      name: input.name,
      description: input.description,
      issued_on: input.issuedOn,
      expired_on: input.expiredOn,
      complete: input.complete,
      private: input.private,
      approve: input.approve,
      custom_attributes: input.customAttributes,
      meta_data: input.metaData,
      evidence_items: input.evidenceItems?.map(item => pickDefined(item)),
      references: input.references?.map(reference =>
        pickDefined({
          ...reference,
          referee: reference.referee && pickDefined(reference.referee)
        })
      )
    });
    let response = await this.ax.post('/v1/credentials', { credential });
    return this.entity(response.data, 'credential');
  }

  async getCredential(credentialId: string): Promise<any> {
    let response = await this.ax.get(`/v1/credentials/${encodeURIComponent(credentialId)}`);
    return this.entity(response.data, 'credential');
  }

  async updateCredential(credentialId: string, input: UpdateCredentialInput): Promise<any> {
    let credential = pickDefined({
      name: input.name,
      description: input.description,
      issued_on: input.issuedOn,
      expired_on: input.expiredOn,
      complete: input.complete,
      private: input.private,
      approve: input.approve,
      custom_attributes: input.customAttributes,
      group_id: input.groupId,
      recipient:
        input.recipient &&
        pickDefined({
          name: input.recipient.name,
          email: input.recipient.email,
          phone_number: input.recipient.phoneNumber,
          id: input.recipient.id,
          meta_data: input.recipient.metaData
        })
    });
    let response = await this.ax.put(`/v1/credentials/${encodeURIComponent(credentialId)}`, {
      credential
    });
    // The documented update response has no body contract; retrieve the saved object when absent.
    if (response.data?.credential === undefined) return this.getCredential(credentialId);
    return this.entity(response.data, 'credential');
  }

  async deleteCredential(credentialId: string): Promise<any> {
    let response = await this.ax.delete(`/v1/credentials/${encodeURIComponent(credentialId)}`);
    return this.entity(response.data, 'credential');
  }

  async searchCredentials(
    input: SearchCredentialsInput
  ): Promise<{ credentials: any[]; meta: any }> {
    this.pagination(input.page, input.pageSize);
    let size = input.pageSize ?? 50;
    let from = ((input.page ?? 1) - 1) * size;
    if (size > 50) throw createApiServiceError('pageSize must be at most 50.');
    if (!Number.isSafeInteger(from) || from + size > 10000) {
      throw createApiServiceError(
        'Accredible page-based search is limited to the first 10,000 results. Narrow the date range or group filter.'
      );
    }
    let response = await this.ax.post('/v2/credentials/search', {
      query: pickDefined({
        'group.id': input.groupId,
        recipient_email: input.email,
        recipient_id: input.recipientId,
        'issued_on[gte]': input.startDate,
        'issued_on[lte]': input.endDate,
        'updated_at[gte]': input.startUpdatedDate,
        'updated_at[lte]': input.endUpdatedDate
      }),
      page: { from, size }
    });
    let credentials = this.collection(response.data, 'credentials').map(credential => ({
      ...credential,
      recipient: { name: credential.recipient_name, email: credential.recipient_email },
      group_name: credential.group?.name,
      group_id: credential.group?.id
    }));
    let meta = response.data?.meta;
    return {
      credentials,
      meta: {
        current_page:
          typeof meta?.from === 'number' && typeof meta?.size === 'number' && meta.size > 0
            ? Math.floor(meta.from / meta.size) + 1
            : undefined,
        total_pages:
          typeof meta?.count === 'number' && typeof meta?.size === 'number' && meta.size > 0
            ? Math.ceil(meta.count / meta.size)
            : undefined,
        total_count: meta?.count
      }
    };
  }

  private groupInput(input: CreateGroupInput | UpdateGroupInput) {
    return pickDefined({
      name: input.name,
      course_name: input.courseName,
      course_description: input.courseDescription,
      course_link: input.courseLink,
      design_id: input.designId,
      language: input.language,
      attach_pdf: input.attachPdf
    });
  }

  async createGroup(input: CreateGroupInput): Promise<any> {
    let response = await this.ax.post('/v1/issuer/groups', { group: this.groupInput(input) });
    return this.entity(response.data, 'group', true);
  }

  async getGroup(groupId: string): Promise<any> {
    let response = await this.ax.get(`/v1/issuer/groups/${encodeURIComponent(groupId)}`);
    return this.entity(response.data, 'group', true);
  }

  async updateGroup(groupId: string, input: UpdateGroupInput): Promise<any> {
    let response = await this.ax.put(`/v1/issuer/groups/${encodeURIComponent(groupId)}`, {
      group: this.groupInput(input)
    });
    return this.entity(response.data, 'group', true);
  }

  async deleteGroup(groupId: string): Promise<any> {
    let response = await this.ax.delete(`/v1/issuer/groups/${encodeURIComponent(groupId)}`);
    return this.entity(response.data, 'group', true);
  }

  async listGroups(page?: number, pageSize?: number): Promise<{ groups: any[]; meta: any }> {
    this.pagination(page, pageSize);
    let response = await this.ax.post(
      '/v1/issuer/groups/search',
      pickDefined({ page, page_size: pageSize })
    );
    return {
      groups: this.collection(response.data, 'groups', true),
      meta: response.data?.meta
    };
  }

  async listDesigns(page?: number, pageSize?: number): Promise<{ designs: any[]; meta: any }> {
    this.pagination(page, pageSize);
    let response = await this.ax.post('/v1/designs/search', {});
    let designs = this.collection(response.data, 'designs', true);
    // The provider documents no paging parameters or completeness guarantee for this endpoint.
    // Apply the existing page inputs to the returned set without inventing global totals.
    let size = pageSize ?? 50;
    let start = ((page ?? 1) - 1) * size;
    return { designs: designs.slice(start, start + size), meta: response.data?.meta };
  }

  async generateCredentialPdf(credentialId: string): Promise<string> {
    let response = await this.ax.post(
      `/v1/credentials/generate_single_pdf/${encodeURIComponent(credentialId)}`
    );
    let file = response.data?.file;
    if (
      typeof file !== 'string' ||
      !URL.canParse(file) ||
      new URL(file).protocol !== 'https:'
    ) {
      throw createApiServiceError('Accredible did not return a valid HTTPS PDF download URL.');
    }
    return file;
  }
}
