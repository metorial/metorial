import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://api.certifier.io/v1'
});

export interface Recipient {
  name: string;
  email?: string;
}

export interface Credential {
  id: string;
  publicId: string;
  groupId: string;
  status: string;
  recipient: Recipient;
  issueDate: string;
  expiryDate: string | null;
  customAttributes: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: string;
  name: string;
  learningEventUrl: string | null;
  certificateDesignId: string | null;
  badgeDesignId: string | null;
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

export interface CredentialInteraction {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    prev: string | null;
    next: string | null;
  };
}

export interface CreateCredentialParams {
  groupId: string;
  recipient: Recipient;
  issueDate?: string;
  expiryDate?: string;
  customAttributes?: Record<string, string>;
}

export interface UpdateCredentialParams {
  recipient?: { name: string };
  issueDate?: string;
  expiryDate?: string | null;
  customAttributes?: Record<string, string>;
}

export interface SearchFilter {
  AND?: SearchFilter[];
  OR?: SearchFilter[];
  NOT?: SearchFilter;
  [key: string]: any;
}

export interface SearchCredentialsParams {
  filter?: SearchFilter;
  sort?: { property: string; order: 'asc' | 'desc' };
  limit?: number;
  cursor?: string;
}

export interface CreateGroupParams {
  name: string;
  certificateDesignId?: string;
  badgeDesignId?: string;
  learningEventUrl?: string;
}

export interface UpdateGroupParams {
  name?: string;
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

export class Client {
  private headers: Record<string, string>;

  constructor(params: { token: string }) {
    this.headers = {
      Authorization: `Bearer ${params.token}`,
      'Certifier-Version': '2022-10-26',
      'Content-Type': 'application/json'
    };
  }

  // ── Credentials ──

  async createCredential(params: CreateCredentialParams): Promise<Credential> {
    let response = await api.post('/credentials', params, { headers: this.headers });
    return response.data;
  }

  async createIssueSendCredential(params: CreateCredentialParams): Promise<Credential> {
    let response = await api.post('/credentials/create-issue-send', params, {
      headers: this.headers
    });
    return response.data;
  }

  async getCredential(credentialId: string): Promise<Credential> {
    let response = await api.get(`/credentials/${credentialId}`, { headers: this.headers });
    return response.data;
  }

  async listCredentials(
    limit?: number,
    cursor?: string
  ): Promise<PaginatedResponse<Credential>> {
    let params: Record<string, any> = {};
    if (limit) params.limit = limit;
    if (cursor) params.cursor = cursor;
    let response = await api.get('/credentials', { headers: this.headers, params });
    return response.data;
  }

  async updateCredential(
    credentialId: string,
    params: UpdateCredentialParams
  ): Promise<Credential> {
    let response = await api.patch(`/credentials/${credentialId}`, params, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteCredential(credentialId: string): Promise<void> {
    await api.delete(`/credentials/${credentialId}`, { headers: this.headers });
  }

  async issueCredential(credentialId: string): Promise<Credential> {
    let response = await api.post(
      `/credentials/${credentialId}/issue`,
      {},
      { headers: this.headers }
    );
    return response.data;
  }

  async sendCredential(credentialId: string): Promise<Credential> {
    let response = await api.post(
      `/credentials/${credentialId}/send`,
      { deliveryMethod: 'email' },
      { headers: this.headers }
    );
    return response.data;
  }

  async searchCredentials(
    params: SearchCredentialsParams
  ): Promise<PaginatedResponse<Credential>> {
    let response = await api.post('/credentials/search', params, { headers: this.headers });
    return response.data;
  }

  // ── Groups ──

  async createGroup(params: CreateGroupParams): Promise<Group> {
    let response = await api.post('/groups', params, { headers: this.headers });
    return response.data;
  }

  async getGroup(groupId: string): Promise<Group> {
    let response = await api.get(`/groups/${groupId}`, { headers: this.headers });
    return response.data;
  }

  async listGroups(limit?: number, cursor?: string): Promise<PaginatedResponse<Group>> {
    let params: Record<string, any> = {};
    if (limit) params.limit = limit;
    if (cursor) params.cursor = cursor;
    let response = await api.get('/groups', { headers: this.headers, params });
    return response.data;
  }

  async updateGroup(groupId: string, params: UpdateGroupParams): Promise<Group> {
    let response = await api.patch(`/groups/${groupId}`, params, { headers: this.headers });
    return response.data;
  }

  async deleteGroup(groupId: string): Promise<void> {
    await api.delete(`/groups/${groupId}`, { headers: this.headers });
  }

  // ── Designs ──

  async getDesign(designId: string): Promise<Design> {
    let response = await api.get(`/designs/${designId}`, { headers: this.headers });
    return response.data;
  }

  async listDesigns(limit?: number, cursor?: string): Promise<PaginatedResponse<Design>> {
    let params: Record<string, any> = {};
    if (limit) params.limit = limit;
    if (cursor) params.cursor = cursor;
    let response = await api.get('/designs', { headers: this.headers, params });
    return response.data;
  }

  // ── Credential Interactions ──

  async createInteraction(params: CreateInteractionParams): Promise<void> {
    await api.post('/credential-interactions', params, { headers: this.headers });
  }

  async listInteractions(
    credentialId: string,
    limit?: number,
    cursor?: string
  ): Promise<PaginatedResponse<CredentialInteraction>> {
    let params: Record<string, any> = { credentialId };
    if (limit) params.limit = limit;
    if (cursor) params.cursor = cursor;
    let response = await api.get('/credential-interactions', {
      headers: this.headers,
      params
    });
    return response.data;
  }
}
