import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

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
  fixture_type: string | null;
  fields: Record<string, unknown> | unknown[];
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

export interface CaseWriteResponse {
  case: { case_id: string; [key: string]: unknown };
  form_id?: string;
  xform_id?: string;
}

export interface BulkCaseWriteResponse {
  cases: { case_id: string; [key: string]: unknown }[];
  form_id?: string;
  xform_id?: string;
}

export interface CurrentUser {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface Project {
  domain_name: string;
  project_name: string;
}

export interface BulkCaseReadResponse {
  matching_records: number;
  missing_records: number;
  cases: Record<string, unknown>[];
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
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private domain: string;

  constructor(config: ClientConfig) {
    this.domain = config.domain;
    this.axios = createAuthenticatedAxios({
      baseURL: `https://www.commcarehq.org/a/${encodeURIComponent(config.domain)}/api`,
      headers: {
        Authorization: `ApiKey ${config.username}:${config.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      errorMapping: {
        mapAxiosError: error => {
          let data = error.response?.data;
          let message = isApiErrorRecord(data) ? data.error_message : undefined;
          return typeof message === 'string' && message.trim() ? { message } : undefined;
        }
      },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'CommCare',
          reason: 'commcare_api_error'
        })
    });
  }

  private pagination(params: ListUsersParams, maximum?: number) {
    let limit = params.limit ?? 20;
    let offset = params.offset ?? 0;
    if (!Number.isInteger(limit) || limit < 1 || (maximum !== undefined && limit > maximum)) {
      throw createApiServiceError(
        `limit must be a positive whole number${maximum ? ` no greater than ${maximum}` : ''}.`
      );
    }
    if (!Number.isInteger(offset) || offset < 0) {
      throw createApiServiceError('offset must be a non-negative whole number.');
    }
    return { limit, offset };
  }

  private normalizeCase(data: CaseData): CaseData {
    return {
      ...data,
      case_type: data.case_type ?? data.properties?.case_type ?? '',
      owner_id: data.owner_id ?? data.properties?.owner_id ?? '',
      date_opened: data.date_opened ?? data.properties?.date_opened ?? '',
      server_date_opened: data.server_date_opened ?? '',
      user_id: data.user_id ?? ''
    };
  }

  private casePayload(
    payload: CaseCreatePayload | CaseUpdatePayload | BulkCasePayload,
    create: boolean
  ) {
    if (
      create &&
      (!('case_type' in payload) ||
        payload.case_type === undefined ||
        payload.case_name === undefined ||
        payload.owner_id === undefined)
    ) {
      throw createApiServiceError(
        'caseType, caseName, and ownerId are required when creating a case. Use list_mobile_workers or list_groups to find an owner ID.'
      );
    }
    for (let [name, value] of Object.entries(payload.properties ?? {})) {
      if (typeof value !== 'string') {
        throw createApiServiceError(`Case property "${name}" must have a string value.`);
      }
    }
    let indices =
      payload.indices &&
      Object.fromEntries(
        Object.entries(payload.indices).map(([name, index]) => {
          if (index === null) return [name, {}];
          let relationship = index.relationship ?? 'child';
          if (!['child', 'extension'].includes(relationship)) {
            throw createApiServiceError(
              `Index "${name}" relationship must be "child" or "extension".`
            );
          }
          return [name, { ...index, relationship }];
        })
      );
    return pickDefined({ ...payload, indices });
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
    if (params.caseName !== undefined) queryParams.name = params.caseName;
    if (params.indexCaseId) queryParams['index.case_id'] = params.indexCaseId;
    Object.assign(queryParams, this.pagination(params, 5000));
    let response = await this.axios.get<PaginatedResponse<CaseData>>('/case/v1/', {
      params: queryParams
    });
    return {
      ...response.data,
      objects: response.data.objects.map(data => this.normalizeCase(data))
    };
  }

  async getCase(caseId: string): Promise<CaseData> {
    let response = await this.axios.get<CaseData>(`/case/v1/${encodeURIComponent(caseId)}/`);
    return this.normalizeCase(response.data);
  }

  async createCase(payload: CaseCreatePayload): Promise<CaseWriteResponse> {
    let response = await this.axios.post<CaseWriteResponse>(
      '/case/v2/',
      this.casePayload(payload, true)
    );
    return response.data;
  }

  async updateCase(caseId: string, payload: CaseUpdatePayload): Promise<CaseWriteResponse> {
    if (payload.close === false && (await this.getCase(caseId)).closed) {
      throw createApiServiceError(
        'CommCare does not support reopening a closed case through the JSON Case API. Restore it using CommCare data-management tools.'
      );
    }
    let response = await this.axios.put<CaseWriteResponse>(
      `/case/v2/${encodeURIComponent(caseId)}/`,
      this.casePayload(payload, false)
    );
    return response.data;
  }

  async bulkCreateOrUpdateCases(cases: BulkCasePayload[]): Promise<BulkCaseWriteResponse> {
    for (let entry of cases) {
      if (
        entry.close === false &&
        entry.case_id &&
        (await this.getCase(entry.case_id)).closed
      ) {
        throw createApiServiceError(
          `CommCare cannot reopen closed case ${entry.case_id} through the JSON Case API.`
        );
      }
    }
    let payload = cases.map(entry => ({
      ...this.casePayload(entry, !entry.case_id),
      create: !entry.case_id
    }));
    let response = await this.axios.post<BulkCaseWriteResponse>('/case/v2/', payload);
    return response.data;
  }

  // === Forms ===

  async listForms(params: ListFormsParams = {}): Promise<PaginatedResponse<FormData>> {
    let queryParams: Record<string, any> = {};
    if (params.xmlns) queryParams.xmlns = params.xmlns;
    if (params.receivedOnStart) queryParams.received_on_start = params.receivedOnStart;
    if (params.receivedOnEnd) queryParams.received_on_end = params.receivedOnEnd;
    if (params.appId) queryParams.app_id = params.appId;
    if (params.includeArchived !== undefined)
      queryParams.include_archived = params.includeArchived;
    Object.assign(queryParams, this.pagination(params, 1000));
    let response = await this.axios.get('/form/v1/', { params: queryParams });
    return response.data;
  }

  async getForm(formId: string): Promise<FormData> {
    let response = await this.axios.get(`/form/v1/${encodeURIComponent(formId)}/`);
    return response.data;
  }

  // === Mobile Workers ===

  async listMobileWorkers(
    params: ListUsersParams = {}
  ): Promise<PaginatedResponse<MobileWorker>> {
    let queryParams: Record<string, any> = {};
    Object.assign(queryParams, this.pagination(params));

    let response = await this.axios.get('/user/v1/', { params: queryParams });
    return response.data;
  }

  async getMobileWorker(userId: string): Promise<MobileWorker> {
    let response = await this.axios.get(`/user/v1/${encodeURIComponent(userId)}/`);
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
    let response = await this.axios.post<{ id: string }>('/user/v1/', data);
    return this.getMobileWorker(response.data.id);
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
    let response = await this.axios.put(`/user/v1/${encodeURIComponent(userId)}/`, data);
    return response.data;
  }

  // === Web Users ===

  async listWebUsers(params: ListUsersParams = {}): Promise<PaginatedResponse<WebUser>> {
    let queryParams: Record<string, any> = {};
    Object.assign(queryParams, this.pagination(params));

    let response = await this.axios.get('/web-user/v1/', { params: queryParams });
    return response.data;
  }

  // === Groups ===

  async listGroups(params: ListUsersParams = {}): Promise<PaginatedResponse<UserGroup>> {
    let queryParams: Record<string, any> = {};
    Object.assign(queryParams, this.pagination(params));

    let response = await this.axios.get('/group/v1/', { params: queryParams });
    return response.data;
  }

  async getGroup(groupId: string): Promise<UserGroup> {
    let response = await this.axios.get(`/group/v1/${encodeURIComponent(groupId)}/`);
    return response.data;
  }

  async createGroup(data: {
    name: string;
    case_sharing?: boolean;
    reporting?: boolean;
    users?: string[];
    metadata?: Record<string, any>;
  }): Promise<UserGroup> {
    let response = await this.axios.post<{ id: string }>('/group/v1/', data);
    return this.getGroup(response.data.id);
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
    let response = await this.axios.put(`/group/v1/${encodeURIComponent(groupId)}/`, data);
    return response.data;
  }

  // === Applications ===

  async listApplications(
    params: ListApplicationsParams = {}
  ): Promise<PaginatedResponse<Application>> {
    let queryParams: Record<string, any> = {};
    Object.assign(queryParams, this.pagination(params));

    let response = await this.axios.get<PaginatedResponse<Application>>('/application/v1/', {
      params: queryParams
    });
    let { limit, offset } = this.pagination(params);
    let all = response.data.objects;
    return {
      objects: all
        .slice(offset, offset + limit)
        .map(application => ({ ...application, domain: application.domain ?? this.domain })),
      meta: {
        total_count: all.length,
        limit,
        offset,
        next: offset + limit < all.length ? `?limit=${limit}&offset=${offset + limit}` : null,
        previous: offset > 0 ? `?limit=${limit}&offset=${Math.max(0, offset - limit)}` : null
      }
    };
  }

  async getApplication(appId: string): Promise<Application> {
    let response = await this.axios.get(`/application/v1/${encodeURIComponent(appId)}/`);
    return response.data;
  }

  // === Lookup Tables (Fixtures) ===

  async listLookupTables(
    params: ListUsersParams = {}
  ): Promise<PaginatedResponse<LookupTable>> {
    let queryParams: Record<string, any> = {};
    Object.assign(queryParams, this.pagination(params));

    let response = await this.axios.get('/fixture/v1/', { params: queryParams });
    return response.data;
  }

  async getLookupTable(fixtureId: string): Promise<LookupTable> {
    let response = await this.axios.get(`/fixture/v1/${encodeURIComponent(fixtureId)}/`);
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

  async getCurrentUser(): Promise<CurrentUser> {
    let response = await this.axios.get<CurrentUser>(
      'https://www.commcarehq.org/api/identity/v1/'
    );
    return response.data;
  }

  async listProjects(params: ListUsersParams = {}): Promise<PaginatedResponse<Project>> {
    let response = await this.axios.get<PaginatedResponse<Project>>(
      'https://www.commcarehq.org/api/user_domains/v1/',
      { params: this.pagination(params) }
    );
    let { limit, offset } = this.pagination(params);
    let all = response.data.objects;
    return {
      objects: all.slice(offset, offset + limit),
      meta: {
        total_count: all.length,
        limit,
        offset,
        next: offset + limit < all.length ? `?limit=${limit}&offset=${offset + limit}` : null,
        previous: offset > 0 ? `?limit=${limit}&offset=${Math.max(0, offset - limit)}` : null
      }
    };
  }

  async bulkGetCases(params: {
    caseIds?: string[];
    externalIds?: string[];
  }): Promise<BulkCaseReadResponse> {
    if (!params.caseIds?.length && !params.externalIds?.length) {
      throw createApiServiceError('Provide at least one case ID or external ID.');
    }
    let response = await this.axios.post<BulkCaseReadResponse>(
      '/case/v2/bulk-fetch/',
      pickDefined({ case_ids: params.caseIds, external_ids: params.externalIds })
    );
    return response.data;
  }
}
