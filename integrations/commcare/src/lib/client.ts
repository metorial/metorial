import { createAxios } from 'slates';

export interface ClientConfig {
  domain: string;
  username: string;
  token: string;
}

export interface PaginatedResponse<T> {
  meta: {
    limit: number;
    next: string | null;
    offset: number;
    previous: string | null;
    total_count: number;
  };
  objects: T[];
}

export interface CaseData {
  case_id: string;
  case_type: string;
  closed: boolean;
  date_closed: string | null;
  date_modified: string;
  date_opened: string;
  domain: string;
  indices: Record<string, { case_id: string; case_type: string; relationship: string }>;
  owner_id: string;
  properties: Record<string, any>;
  resource_uri: string;
  server_date_modified: string;
  server_date_opened: string;
  user_id: string;
  xform_ids: string[];
}

export interface FormData {
  app_id: string;
  archived: boolean;
  build_id: string;
  domain: string;
  edited_on: string | null;
  form: Record<string, any>;
  id: string;
  metadata: {
    appVersion: string;
    deviceID: string;
    instanceID: string;
    timeEnd: string;
    timeStart: string;
    userID: string;
    username: string;
  };
  received_on: string;
  resource_uri: string;
  type: string;
  uiversion: string;
  version: string;
}

export interface MobileWorker {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  default_phone_number: string | null;
  email: string;
  groups: string[];
  phone_numbers: string[];
  resource_uri: string;
  user_data: Record<string, any>;
}

export interface WebUser {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  is_admin: boolean;
  permissions: Record<string, any>;
  resource_uri: string;
  role: string;
}

export interface UserGroup {
  id: string;
  name: string;
  case_sharing: boolean;
  domain: string;
  metadata: Record<string, any>;
  reporting: boolean;
  resource_uri: string;
  users: string[];
}

export interface Application {
  id: string;
  name: string;
  build_spec: Record<string, any>;
  domain: string;
  modules: any[];
  resource_uri: string;
  version: number;
}

export interface LookupTable {
  id: string;
  fixture_type: string;
  fields: any[];
  resource_uri: string;
}

export interface ListCasesParams {
  caseType?: string;
  ownerId?: string;
  dateModifiedStart?: string;
  dateModifiedEnd?: string;
  closed?: boolean;
  limit?: number;
  offset?: number;
  serverDateModifiedStart?: string;
  serverDateModifiedEnd?: string;
  externalId?: string;
  caseName?: string;
  indexCaseId?: string;
}

export interface ListFormsParams {
  xmlns?: string;
  receivedOnStart?: string;
  receivedOnEnd?: string;
  appId?: string;
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
}

export interface ListUsersParams {
  limit?: number;
  offset?: number;
}

export interface ListApplicationsParams {
  limit?: number;
  offset?: number;
}

export interface CaseCreatePayload {
  case_type: string;
  case_name?: string;
  owner_id?: string;
  external_id?: string;
  properties?: Record<string, any>;
  indices?: Record<string, { case_type: string; case_id: string; relationship?: string }>;
}

export interface CaseUpdatePayload {
  properties?: Record<string, any>;
  owner_id?: string;
  case_name?: string;
  close?: boolean;
  indices?: Record<
    string,
    { case_type: string; case_id: string; relationship?: string } | null
  >;
}

export interface BulkCasePayload {
  case_type?: string;
  case_name?: string;
  owner_id?: string;
  external_id?: string;
  case_id?: string;
  properties?: Record<string, any>;
  indices?: Record<
    string,
    { case_type: string; case_id: string; relationship?: string } | null
  >;
  close?: boolean;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private domain: string;

  constructor(config: ClientConfig) {
    this.domain = config.domain;
    this.axios = createAxios({
      baseURL: `https://www.commcarehq.org/a/${config.domain}/api`,
      headers: {
        Authorization: `ApiKey ${config.username}:${config.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  // === Cases ===

  async listCases(params: ListCasesParams = {}): Promise<PaginatedResponse<CaseData>> {
    let queryParams: Record<string, any> = {};
    if (params.caseType) queryParams.type = params.caseType;
    if (params.ownerId) queryParams.owner_id = params.ownerId;
    if (params.dateModifiedStart) queryParams.date_modified_start = params.dateModifiedStart;
    if (params.dateModifiedEnd) queryParams.date_modified_end = params.dateModifiedEnd;
    if (params.closed !== undefined) queryParams.closed = params.closed;
    if (params.serverDateModifiedStart)
      queryParams.server_date_modified_start = params.serverDateModifiedStart;
    if (params.serverDateModifiedEnd)
      queryParams.server_date_modified_end = params.serverDateModifiedEnd;
    if (params.externalId) queryParams.external_id = params.externalId;
    if (params.caseName) queryParams.case_name = params.caseName;
    if (params.indexCaseId) queryParams['index.case_id'] = params.indexCaseId;
    queryParams.limit = params.limit ?? 20;
    if (params.offset) queryParams.offset = params.offset;

    let response = await this.axios.get('/v0.5/case/', { params: queryParams });
    return response.data;
  }

  async getCase(caseId: string): Promise<CaseData> {
    let response = await this.axios.get(`/v0.5/case/${caseId}/`);
    return response.data;
  }

  async createCase(payload: CaseCreatePayload): Promise<any> {
    let response = await this.axios.post('/v0.6/case/', payload);
    return response.data;
  }

  async updateCase(caseId: string, payload: CaseUpdatePayload): Promise<any> {
    let response = await this.axios.put(`/v0.6/case/${caseId}/`, payload);
    return response.data;
  }

  async bulkCreateOrUpdateCases(cases: BulkCasePayload[]): Promise<any> {
    let response = await this.axios.post('/v0.6/case/bulk/', cases);
    return response.data;
  }

  // === Forms ===

  async listForms(params: ListFormsParams = {}): Promise<PaginatedResponse<FormData>> {
    let queryParams: Record<string, any> = {};
    if (params.xmlns) queryParams.xmlns = params.xmlns;
    if (params.receivedOnStart) queryParams.received_on_start = params.receivedOnStart;
    if (params.receivedOnEnd) queryParams.received_on_end = params.receivedOnEnd;
    if (params.appId) queryParams.app_id = params.appId;
    if (params.includeArchived) queryParams.include_archived = params.includeArchived;
    queryParams.limit = params.limit ?? 20;
    if (params.offset) queryParams.offset = params.offset;

    let response = await this.axios.get('/v0.5/form/', { params: queryParams });
    return response.data;
  }

  async getForm(formId: string): Promise<FormData> {
    let response = await this.axios.get(`/v0.5/form/${formId}/`);
    return response.data;
  }

  // === Mobile Workers ===

  async listMobileWorkers(
    params: ListUsersParams = {}
  ): Promise<PaginatedResponse<MobileWorker>> {
    let queryParams: Record<string, any> = {};
    queryParams.limit = params.limit ?? 20;
    if (params.offset) queryParams.offset = params.offset;

    let response = await this.axios.get('/v0.5/user/', { params: queryParams });
    return response.data;
  }

  async getMobileWorker(userId: string): Promise<MobileWorker> {
    let response = await this.axios.get(`/v0.5/user/${userId}/`);
    return response.data;
  }

  async createMobileWorker(data: {
    username: string;
    password: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone_numbers?: string[];
    groups?: string[];
    user_data?: Record<string, any>;
  }): Promise<MobileWorker> {
    let response = await this.axios.post('/v0.5/user/', data);
    return response.data;
  }

  async updateMobileWorker(
    userId: string,
    data: {
      first_name?: string;
      last_name?: string;
      email?: string;
      phone_numbers?: string[];
      groups?: string[];
      user_data?: Record<string, any>;
      password?: string;
    }
  ): Promise<MobileWorker> {
    let response = await this.axios.put(`/v0.5/user/${userId}/`, data);
    return response.data;
  }

  // === Web Users ===

  async listWebUsers(params: ListUsersParams = {}): Promise<PaginatedResponse<WebUser>> {
    let queryParams: Record<string, any> = {};
    queryParams.limit = params.limit ?? 20;
    if (params.offset) queryParams.offset = params.offset;

    let response = await this.axios.get('/v0.5/web-user/', { params: queryParams });
    return response.data;
  }

  // === Groups ===

  async listGroups(params: ListUsersParams = {}): Promise<PaginatedResponse<UserGroup>> {
    let queryParams: Record<string, any> = {};
    queryParams.limit = params.limit ?? 20;
    if (params.offset) queryParams.offset = params.offset;

    let response = await this.axios.get('/v0.5/group/', { params: queryParams });
    return response.data;
  }

  async getGroup(groupId: string): Promise<UserGroup> {
    let response = await this.axios.get(`/v0.5/group/${groupId}/`);
    return response.data;
  }

  async createGroup(data: {
    name: string;
    case_sharing?: boolean;
    reporting?: boolean;
    users?: string[];
    metadata?: Record<string, any>;
  }): Promise<UserGroup> {
    let response = await this.axios.post('/v0.5/group/', data);
    return response.data;
  }

  async updateGroup(
    groupId: string,
    data: {
      name?: string;
      case_sharing?: boolean;
      reporting?: boolean;
      users?: string[];
      metadata?: Record<string, any>;
    }
  ): Promise<UserGroup> {
    let response = await this.axios.put(`/v0.5/group/${groupId}/`, data);
    return response.data;
  }

  // === Applications ===

  async listApplications(
    params: ListApplicationsParams = {}
  ): Promise<PaginatedResponse<Application>> {
    let queryParams: Record<string, any> = {};
    queryParams.limit = params.limit ?? 20;
    if (params.offset) queryParams.offset = params.offset;

    let response = await this.axios.get('/v0.5/application/', { params: queryParams });
    return response.data;
  }

  async getApplication(appId: string): Promise<Application> {
    let response = await this.axios.get(`/v0.5/application/${appId}/`);
    return response.data;
  }

  // === Lookup Tables (Fixtures) ===

  async listLookupTables(
    params: ListUsersParams = {}
  ): Promise<PaginatedResponse<LookupTable>> {
    let queryParams: Record<string, any> = {};
    queryParams.limit = params.limit ?? 20;
    if (params.offset) queryParams.offset = params.offset;

    let response = await this.axios.get('/v0.5/fixture/', { params: queryParams });
    return response.data;
  }

  async getLookupTable(fixtureId: string): Promise<LookupTable> {
    let response = await this.axios.get(`/v0.5/fixture/${fixtureId}/`);
    return response.data;
  }

  // === SMS ===

  async sendSms(data: { phone_number: string; message: string }): Promise<any> {
    let response = await this.axios.post('/v0.5/sms/', data);
    return response.data;
  }

  async listSmsMessages(
    params: { limit?: number; offset?: number } = {}
  ): Promise<PaginatedResponse<any>> {
    let queryParams: Record<string, any> = {};
    queryParams.limit = params.limit ?? 20;
    if (params.offset) queryParams.offset = params.offset;

    let response = await this.axios.get('/v0.5/sms/', { params: queryParams });
    return response.data;
  }
}
