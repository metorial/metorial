import { createAxios } from 'slates';

let BASE_URLS: Record<string, string> = {
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

  constructor(private config: { token: string; environment?: string }) {
    let baseURL = BASE_URLS[config.environment || 'production_us'] || BASE_URLS.production_us;
    this.ax = createAxios({ baseURL });
  }

  private get headers() {
    return {
      Authorization: `Token token=${this.config.token}`,
      'Content-Type': 'application/json'
    };
  }

  // ---- Credentials ----

  async createCredential(input: CreateCredentialInput): Promise<any> {
    let body: any = {
      credential: {
        recipient: {
          name: input.recipient.name,
          email: input.recipient.email,
          ...(input.recipient.phoneNumber && { phone_number: input.recipient.phoneNumber }),
          ...(input.recipient.id && { id: input.recipient.id }),
          ...(input.recipient.metaData && { meta_data: input.recipient.metaData })
        },
        group_id: input.groupId,
        ...(input.name && { name: input.name }),
        ...(input.description && { description: input.description }),
        ...(input.issuedOn && { issued_on: input.issuedOn }),
        ...(input.expiredOn && { expired_on: input.expiredOn }),
        ...(input.complete !== undefined && { complete: input.complete }),
        ...(input.private !== undefined && { private: input.private }),
        ...(input.approve !== undefined && { approve: input.approve }),
        ...(input.customAttributes && { custom_attributes: input.customAttributes }),
        ...(input.metaData && { meta_data: input.metaData })
      }
    };

    if (input.evidenceItems && input.evidenceItems.length > 0) {
      body.credential.evidence_items = input.evidenceItems.map(e => ({
        ...(e.description && { description: e.description }),
        ...(e.url && { url: e.url }),
        ...(e.category && { category: e.category }),
        ...(e.file && { file: e.file })
      }));
    }

    if (input.references && input.references.length > 0) {
      body.credential.references = input.references.map(r => ({
        ...(r.description && { description: r.description }),
        ...(r.relationship && { relationship: r.relationship }),
        ...(r.referee && {
          referee: {
            ...(r.referee.name && { name: r.referee.name }),
            ...(r.referee.email && { email: r.referee.email }),
            ...(r.referee.avatar && { avatar: r.referee.avatar }),
            ...(r.referee.url && { url: r.referee.url })
          }
        })
      }));
    }

    let response = await this.ax.post('/v1/credentials', body, { headers: this.headers });
    return response.data?.credential;
  }

  async getCredential(credentialId: string): Promise<any> {
    let response = await this.ax.get(`/v1/credentials/${credentialId}`, {
      headers: this.headers
    });
    return response.data?.credential;
  }

  async updateCredential(credentialId: string, input: UpdateCredentialInput): Promise<any> {
    let credential: any = {};

    if (input.name !== undefined) credential.name = input.name;
    if (input.description !== undefined) credential.description = input.description;
    if (input.issuedOn !== undefined) credential.issued_on = input.issuedOn;
    if (input.expiredOn !== undefined) credential.expired_on = input.expiredOn;
    if (input.complete !== undefined) credential.complete = input.complete;
    if (input.private !== undefined) credential.private = input.private;
    if (input.approve !== undefined) credential.approve = input.approve;
    if (input.customAttributes !== undefined)
      credential.custom_attributes = input.customAttributes;
    if (input.groupId !== undefined) credential.group_id = input.groupId;

    if (input.recipient) {
      credential.recipient = {};
      if (input.recipient.name !== undefined) credential.recipient.name = input.recipient.name;
      if (input.recipient.email !== undefined)
        credential.recipient.email = input.recipient.email;
      if (input.recipient.phoneNumber !== undefined)
        credential.recipient.phone_number = input.recipient.phoneNumber;
      if (input.recipient.id !== undefined) credential.recipient.id = input.recipient.id;
      if (input.recipient.metaData !== undefined)
        credential.recipient.meta_data = input.recipient.metaData;
    }

    let response = await this.ax.put(
      `/v1/credentials/${credentialId}`,
      { credential },
      { headers: this.headers }
    );
    return response.data?.credential;
  }

  async deleteCredential(credentialId: string): Promise<any> {
    let response = await this.ax.delete(`/v1/credentials/${credentialId}`, {
      headers: this.headers
    });
    return response.data?.credential;
  }

  async searchCredentials(
    input: SearchCredentialsInput
  ): Promise<{ credentials: any[]; meta: any }> {
    let params: any = {};
    if (input.groupId) params.group_id = input.groupId;
    if (input.email) params.email = input.email;
    if (input.recipientId) params.recipient_id = input.recipientId;
    if (input.startDate) params.start_date = input.startDate;
    if (input.endDate) params.end_date = input.endDate;
    if (input.startUpdatedDate) params.start_updated_date = input.startUpdatedDate;
    if (input.endUpdatedDate) params.end_updated_date = input.endUpdatedDate;
    if (input.pageSize) params.page_size = input.pageSize;
    if (input.page) params.page = input.page;

    let response = await this.ax.get('/v1/all_credentials', {
      headers: this.headers,
      params
    });

    return {
      credentials: response.data?.credentials || [],
      meta: response.data?.meta || {}
    };
  }

  // ---- Groups ----

  async createGroup(input: CreateGroupInput): Promise<any> {
    let group: any = {
      name: input.name,
      course_name: input.courseName
    };

    if (input.courseDescription !== undefined)
      group.course_description = input.courseDescription;
    if (input.courseLink !== undefined) group.course_link = input.courseLink;
    if (input.designId !== undefined) group.design_id = input.designId;
    if (input.language !== undefined) group.language = input.language;
    if (input.attachPdf !== undefined) group.attach_pdf = input.attachPdf;

    let response = await this.ax.post(
      '/v1/issuer/groups',
      { group },
      { headers: this.headers }
    );
    return response.data?.group;
  }

  async getGroup(groupId: string): Promise<any> {
    let response = await this.ax.get(`/v1/issuer/groups/${groupId}`, {
      headers: this.headers
    });
    return response.data?.group;
  }

  async updateGroup(groupId: string, input: UpdateGroupInput): Promise<any> {
    let group: any = {};

    if (input.name !== undefined) group.name = input.name;
    if (input.courseName !== undefined) group.course_name = input.courseName;
    if (input.courseDescription !== undefined)
      group.course_description = input.courseDescription;
    if (input.courseLink !== undefined) group.course_link = input.courseLink;
    if (input.designId !== undefined) group.design_id = input.designId;
    if (input.language !== undefined) group.language = input.language;
    if (input.attachPdf !== undefined) group.attach_pdf = input.attachPdf;

    let response = await this.ax.put(
      `/v1/issuer/groups/${groupId}`,
      { group },
      { headers: this.headers }
    );
    return response.data?.group;
  }

  async deleteGroup(groupId: string): Promise<any> {
    let response = await this.ax.delete(`/v1/issuer/groups/${groupId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async listGroups(page?: number, pageSize?: number): Promise<{ groups: any[]; meta: any }> {
    let params: any = {};
    if (page) params.page = page;
    if (pageSize) params.page_size = pageSize;

    let response = await this.ax.get('/v1/issuer/all_groups', {
      headers: this.headers,
      params
    });

    return {
      groups: response.data?.groups || [],
      meta: response.data?.meta || {}
    };
  }

  // ---- Designs ----

  async listDesigns(page?: number, pageSize?: number): Promise<{ designs: any[]; meta: any }> {
    let params: any = {};
    if (page) params.page = page;
    if (pageSize) params.page_size = pageSize;

    let response = await this.ax.get('/v1/issuer/designs', {
      headers: this.headers,
      params
    });

    return {
      designs: response.data?.designs || [],
      meta: response.data?.meta || {}
    };
  }
}
