import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

export interface Recipient {
  id?: string;
  name: string;
  email?: string;
}

export interface Credential {
  id: string;
  publicId: string;
  groupId: string;
  status: string;
  recipient: Recipient;
  attributes?: Record<string, unknown>;
  issueDate: string;
  expiryDate: string | null;
  customAttributes: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

type CredentialResponse = Omit<Credential, 'recipient'> & { recipient: Recipient | null };

export interface Group {
  id: string;
  name: string;
  learningEventUrl: string | null;
  designIds: string[];
  certificateDesignId?: string | null;
  badgeDesignId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Design {
  id: string;
  name: string;
  type: string;
  previewUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface CredentialDesign {
  id: string;
  name: string;
  previews: { format: 'png' | 'pdf'; url: string }[];
}

export interface CredentialInteraction {
  id: string;
  credentialId: string;
  eventType: string;
  triggeredBy: 'recipient' | 'guest';
  triggeredAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination?: { prev: string | null; next: string | null };
}

export interface CreateCredentialParams {
  groupId: string;
  recipient: Recipient;
  issueDate?: string;
  expiryDate?: string;
  customAttributes?: Record<string, string>;
}

export interface UpdateCredentialParams {
  recipient?: { id?: string; name?: string; email?: string };
  issueDate?: string;
  expiryDate?: string | null;
  customAttributes?: Record<string, string>;
}

export interface SearchFilter {
  AND?: SearchFilter[];
  OR?: SearchFilter[];
  NOT?: SearchFilter[];
  [key: string]: unknown;
}

export interface SearchCredentialsParams {
  filter?: SearchFilter;
  sort?: { property: string; order: 'asc' | 'desc' };
  limit?: number;
  cursor?: string;
}

export interface CreateGroupParams {
  name: string;
  designIds?: string[];
  certificateDesignId?: string;
  badgeDesignId?: string;
  learningEventUrl?: string;
}

export interface UpdateGroupParams {
  name?: string;
  designIds?: string[];
  certificateDesignId?: string;
  badgeDesignId?: string;
  learningEventUrl?: string;
}

export interface CreateInteractionParams {
  credentialId: string;
  eventType: string;
  triggeredBy: string;
  triggeredAt: string;
}

let requireText = (value: string, field: string) => {
  if (!value.trim()) throw createApiServiceError(`${field} must not be empty.`);
  return value;
};

let resourceId = (id: string) => encodeURIComponent(requireText(id, 'Resource ID'));

let paginationParams = (limit?: number, cursor?: string) => {
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 100)) {
    throw createApiServiceError('limit must be a whole number from 1 to 100.');
  }
  return pickDefined({ limit, cursor });
};

let validateCredentialDates = (params: { issueDate?: string; expiryDate?: string | null }) => {
  for (let [field, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    let date = new Date(`${value}T00:00:00.000Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    ) {
      throw createApiServiceError(`${field} must be a valid date in YYYY-MM-DD format.`);
    }
  }
};

let validateGroupDesigns = (params: UpdateGroupParams, creating = false) => {
  let hasLegacy =
    params.certificateDesignId !== undefined || params.badgeDesignId !== undefined;
  if (params.designIds !== undefined) {
    if (hasLegacy)
      throw createApiServiceError(
        'Use designIds or the legacy certificateDesignId/badgeDesignId fields, not both.'
      );
    if (!params.designIds.length)
      throw createApiServiceError(
        'designIds must contain at least one design ID. Call list_designs to find designs.'
      );
    for (let id of params.designIds) requireText(id, 'Design ID');
  } else if (creating && !hasLegacy) {
    throw createApiServiceError(
      'Provide designIds, certificateDesignId, or badgeDesignId. Call list_designs to find designs.'
    );
  }
  if (params.certificateDesignId !== undefined)
    requireText(params.certificateDesignId, 'Certificate design ID');
  if (params.badgeDesignId !== undefined) requireText(params.badgeDesignId, 'Badge design ID');
};

// Credentials without an email have no linked recipient object. Their display
// name remains available in the credential's per-credential attributes.
let normalizeCredential = (credential: CredentialResponse): Credential => {
  let name = credential.attributes?.['recipient.name'] ?? credential.recipient?.name;
  if (typeof name !== 'string') {
    throw createApiServiceError('Certifier returned a credential without a recipient name.', {
      reason: 'certifier_invalid_response'
    });
  }
  return { ...credential, recipient: { ...credential.recipient, name } };
};

export class Client {
  private api: ReturnType<typeof createAuthenticatedAxios>;

  constructor(params: { token: string }) {
    requireText(params.token, 'Certifier access token');
    this.api = createAuthenticatedAxios({
      baseURL: 'https://api.certifier.io/v1',
      authHeader: { value: `Bearer ${params.token}` },
      headers: { 'Certifier-Version': '2022-10-26' },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Certifier',
          reason: 'certifier_api_error',
          extractResponse: (input, helpers) => helpers.getResponseWithBody(input),
          nestedKeys: ['error', 'errors'],
          extractUpstreamCode: (_input, response, helpers) => {
            let body = response?.data;
            if (!helpers.isRecord(body) || !helpers.isRecord(body.error)) return undefined;
            return typeof body.error.code === 'string' ? body.error.code : undefined;
          }
        })
    });
  }

  private validateCredential(params: CreateCredentialParams) {
    requireText(params.groupId, 'Group ID');
    requireText(params.recipient.name, 'Recipient name');
    validateCredentialDates({ issueDate: params.issueDate, expiryDate: params.expiryDate });
  }

  async createCredential(params: CreateCredentialParams): Promise<Credential> {
    this.validateCredential(params);
    let response = await this.api.post<CredentialResponse>(
      '/credentials',
      pickDefined(params)
    );
    return normalizeCredential(response.data);
  }

  async createIssueSendCredential(params: CreateCredentialParams): Promise<Credential> {
    this.validateCredential(params);
    let response = await this.api.post<CredentialResponse>(
      '/credentials/create-issue-send',
      pickDefined(params)
    );
    return normalizeCredential(response.data);
  }

  async getCredential(credentialId: string): Promise<Credential> {
    let response = await this.api.get<CredentialResponse>(
      `/credentials/${resourceId(credentialId)}`
    );
    return normalizeCredential(response.data);
  }

  async listCredentials(
    limit?: number,
    cursor?: string
  ): Promise<PaginatedResponse<Credential>> {
    let response = await this.api.get<PaginatedResponse<CredentialResponse>>('/credentials', {
      params: paginationParams(limit, cursor)
    });
    return { ...response.data, data: response.data.data.map(normalizeCredential) };
  }

  async updateCredential(
    credentialId: string,
    params: UpdateCredentialParams
  ): Promise<Credential> {
    let body = pickDefined(params);
    if (!Object.keys(body).length)
      throw createApiServiceError('Provide at least one credential field to update.');
    validateCredentialDates({ issueDate: params.issueDate, expiryDate: params.expiryDate });
    if (params.recipient) {
      let current = await this.getCredential(credentialId);
      let id = params.recipient.id ?? current.recipient.id;
      if (!id)
        throw createApiServiceError(
          'Updating recipient details requires a linked recipient ID. Supply recipientId for an existing recipient, or update the credential in Certifier.'
        );
      requireText(id, 'Recipient ID');
      let changingRecipient = id !== current.recipient.id;
      let name =
        params.recipient.name ?? (changingRecipient ? undefined : current.recipient.name);
      if (name === undefined) {
        throw createApiServiceError(
          'Provide recipientName for the target recipient when changing recipientId. Provide recipientEmail if you want to set the target email; details from the previous recipient are not reused.'
        );
      }
      requireText(name, 'Recipient name');
      body.recipient = pickDefined({
        id,
        name,
        email:
          params.recipient.email ?? (changingRecipient ? undefined : current.recipient.email)
      });
    }
    let response = await this.api.patch<CredentialResponse>(
      `/credentials/${resourceId(credentialId)}`,
      body
    );
    return normalizeCredential(response.data);
  }

  async deleteCredential(credentialId: string): Promise<void> {
    await this.api.delete(`/credentials/${resourceId(credentialId)}`);
  }

  async issueCredential(credentialId: string): Promise<Credential> {
    let response = await this.api.post<CredentialResponse>(
      `/credentials/${resourceId(credentialId)}/issue`,
      {}
    );
    return normalizeCredential(response.data);
  }

  async sendCredential(credentialId: string): Promise<Credential> {
    let response = await this.api.post<CredentialResponse>(
      `/credentials/${resourceId(credentialId)}/send`,
      { deliveryMethod: 'email' }
    );
    return normalizeCredential(response.data);
  }

  async getCredentialDesigns(credentialId: string): Promise<CredentialDesign[]> {
    let response = await this.api.get<CredentialDesign[]>(
      `/credentials/${resourceId(credentialId)}/designs`
    );
    return response.data;
  }

  async searchCredentials(
    params: SearchCredentialsParams
  ): Promise<PaginatedResponse<Credential>> {
    paginationParams(params.limit, params.cursor);
    if (
      params.filter !== undefined &&
      (typeof params.filter !== 'object' ||
        params.filter === null ||
        Array.isArray(params.filter))
    ) {
      throw createApiServiceError(
        'filter must be a search filter object. Use nested recipient fields and arrays for AND, OR, and NOT.'
      );
    }
    let response = await this.api.post<PaginatedResponse<CredentialResponse>>(
      '/credentials/search',
      pickDefined(params)
    );
    return { ...response.data, data: response.data.data.map(normalizeCredential) };
  }

  async createGroup(params: CreateGroupParams): Promise<Group> {
    requireText(params.name, 'Group name');
    validateGroupDesigns(params, true);
    let response = await this.api.post<Group>('/groups', pickDefined(params));
    return response.data;
  }

  async getGroup(groupId: string): Promise<Group> {
    let response = await this.api.get<Group>(`/groups/${resourceId(groupId)}`);
    return response.data;
  }

  async listGroups(limit?: number, cursor?: string): Promise<PaginatedResponse<Group>> {
    let response = await this.api.get<PaginatedResponse<Group>>('/groups', {
      params: paginationParams(limit, cursor)
    });
    return response.data;
  }

  async updateGroup(groupId: string, params: UpdateGroupParams): Promise<Group> {
    let body = pickDefined(params);
    if (!Object.keys(body).length)
      throw createApiServiceError('Provide at least one group field to update.');
    if (params.name !== undefined) requireText(params.name, 'Group name');
    validateGroupDesigns(params);
    let response = await this.api.patch<Group>(`/groups/${resourceId(groupId)}`, body);
    return response.data;
  }

  async deleteGroup(groupId: string): Promise<void> {
    await this.api.delete(`/groups/${resourceId(groupId)}`);
  }

  async getDesign(designId: string): Promise<Design> {
    let response = await this.api.get<Design>(`/designs/${resourceId(designId)}`);
    return response.data;
  }

  async listDesigns(limit?: number, cursor?: string): Promise<PaginatedResponse<Design>> {
    let response = await this.api.get<PaginatedResponse<Design>>('/designs', {
      params: paginationParams(limit, cursor)
    });
    return response.data;
  }

  async createInteraction(params: CreateInteractionParams): Promise<void> {
    requireText(params.credentialId, 'Credential ID');
    if (
      !/^\d{4}-\d{2}-\d{2}T/.test(params.triggeredAt) ||
      !/(Z|[+-]\d{2}:\d{2})$/.test(params.triggeredAt) ||
      Number.isNaN(Date.parse(params.triggeredAt))
    ) {
      throw createApiServiceError(
        'triggeredAt must be an ISO 8601 timestamp including a timezone.'
      );
    }
    await this.api.post('/credential-interactions', params);
  }

  async listInteractions(
    credentialId: string,
    limit?: number,
    cursor?: string
  ): Promise<PaginatedResponse<CredentialInteraction>> {
    requireText(credentialId, 'Credential ID');
    let response = await this.api.get<PaginatedResponse<CredentialInteraction>>(
      '/credential-interactions',
      {
        params: { credentialId, ...paginationParams(limit, cursor) }
      }
    );
    return response.data;
  }
}
