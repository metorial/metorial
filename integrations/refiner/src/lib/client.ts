import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export interface PaginationParams {
  page?: number;
  pageCursor?: string;
  pageLength?: number;
}

export interface ContactListParams extends PaginationParams {
  orderBy?: 'first_seen_at' | 'last_seen_at' | 'last_form_submission_at';
  formUuid?: string;
  segmentUuid?: string;
  search?: string;
}

export interface ResponseListParams extends PaginationParams {
  formUuid?: string;
  formUuids?: string[];
  segmentUuid?: string;
  segmentUuids?: string[];
  dateRangeStart?: string;
  dateRangeEnd?: string;
  include?: 'completed' | 'partials' | 'all';
  search?: string;
  withAttributes?: boolean;
}

export interface ReportingParams {
  type: 'nps' | 'csat' | 'ratings' | 'distribution' | 'count';
  questionIdentifiers?: string;
  tagUuids?: string;
  formUuids?: string;
  segmentUuids?: string;
  dateRangeStart?: string;
  dateRangeEnd?: string;
}

export interface FormListParams extends PaginationParams {
  list?: 'all' | 'published' | 'drafts' | 'archived' | 'all_with_archived';
  includeConfig?: boolean;
  includeInfo?: boolean;
}

export interface SegmentListParams extends PaginationParams {}

export class RefinerClient {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.refiner.io/v1',
      authHeader: { value: `Bearer ${config.token}` },
      paramsSerializer: { indexes: false },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Refiner',
          reason: 'refiner_api_error'
        })
    });
  }

  private requireIdentifier(identifier: { id?: string; email?: string; uuid?: string }) {
    if (![identifier.id, identifier.email, identifier.uuid].some(value => value?.trim())) {
      throw createApiServiceError('Provide a user ID, email address, or contact UUID.', {
        reason: 'missing_contact_identifier'
      });
    }
  }

  async getCurrentProject(): Promise<{ project_uuid: string; project_name: string }> {
    let response = await this.axios.get('/');
    return response.data;
  }

  // ---- Account ----

  async getAccount(): Promise<Record<string, unknown>> {
    let response = await this.axios.get('/account');
    return response.data;
  }

  // ---- Contacts ----

  async listContacts(params?: ContactListParams): Promise<Record<string, unknown>> {
    let query: Record<string, unknown> = {};
    if (params?.page) query.page = params.page;
    if (params?.pageCursor) query.page_cursor = params.pageCursor;
    if (params?.pageLength) query.page_length = params.pageLength;
    if (params?.orderBy) query.order_by = params.orderBy;
    if (params?.formUuid) query.form_uuid = params.formUuid;
    if (params?.segmentUuid) query.segment_uuid = params.segmentUuid;
    if (params?.search) query.search = params.search;

    let response = await this.axios.get('/contacts', { params: query });
    return response.data;
  }

  async getContact(identifier: {
    id?: string;
    email?: string;
    uuid?: string;
  }): Promise<Record<string, unknown>> {
    this.requireIdentifier(identifier);
    let query: Record<string, unknown> = {};
    if (identifier.id) query.id = identifier.id;
    if (identifier.email) query.email = identifier.email;
    if (identifier.uuid) query.uuid = identifier.uuid;

    let response = await this.axios.get('/contact', { params: query });
    return response.data;
  }

  async deleteContact(identifier: {
    id?: string;
    email?: string;
    uuid?: string;
  }): Promise<Record<string, unknown>> {
    this.requireIdentifier(identifier);
    let query: Record<string, unknown> = {};
    if (identifier.id) query.id = identifier.id;
    if (identifier.email) query.email = identifier.email;
    if (identifier.uuid) query.uuid = identifier.uuid;

    let response = await this.axios.delete('/contact', { params: query });
    return response.data;
  }

  // ---- Identify User ----

  async identifyUser(params: {
    id?: string;
    email?: string;
    traits?: Record<string, unknown>;
    account?: {
      id?: string;
      name?: string;
      traits?: Record<string, unknown>;
    };
  }): Promise<Record<string, unknown>> {
    this.requireIdentifier(params);
    if (params.account && !params.account.id?.trim()) {
      throw createApiServiceError('Provide accountId when grouping a user under an account.', {
        reason: 'missing_account_identifier'
      });
    }
    let body: Record<string, unknown> = { ...params.traits };
    if (params.id) body.id = params.id;
    if (params.email) body.email = params.email;
    if (params.account) {
      let accountObj: Record<string, unknown> = { ...params.account.traits };
      if (params.account.id) accountObj.id = params.account.id;
      if (params.account.name) accountObj.name = params.account.name;
      body.account = accountObj;
    }

    let response = await this.axios.post('/identify-user', body);
    return response.data;
  }

  // ---- Track Event ----

  async trackEvent(params: {
    id?: string;
    email?: string;
    event: string;
  }): Promise<Record<string, unknown>> {
    this.requireIdentifier(params);
    let body: Record<string, unknown> = { event: params.event };
    if (params.id) body.id = params.id;
    if (params.email) body.email = params.email;

    let response = await this.axios.post('/track-event', body);
    return response.data;
  }

  // ---- Responses ----

  async listResponses(params?: ResponseListParams): Promise<Record<string, unknown>> {
    let query: Record<string, unknown> = {};
    if (params?.page) query.page = params.page;
    if (params?.pageCursor) query.page_cursor = params.pageCursor;
    if (params?.pageLength) query.page_length = params.pageLength;
    if (params?.formUuid) query.form_uuid = params.formUuid;
    if (params?.formUuids) query.form_uuids = params.formUuids;
    if (params?.segmentUuid) query.segment_uuid = params.segmentUuid;
    if (params?.segmentUuids) query.segment_uuids = params.segmentUuids;
    if (params?.dateRangeStart) query.date_range_start = params.dateRangeStart;
    if (params?.dateRangeEnd) query.date_range_end = params.dateRangeEnd;
    if (params?.include) query.include = params.include;
    if (params?.search) query.search = params.search;
    if (params?.withAttributes) query.with_attributes = 1;

    let response = await this.axios.get('/responses', { params: query });
    return response.data;
  }

  async storeResponse(params: {
    id?: string;
    email?: string;
    uuid?: string;
    formUuid: string;
    date?: string;
    preventDuplicates?: boolean;
    responseData?: Record<string, unknown>;
  }): Promise<Record<string, unknown>> {
    this.requireIdentifier(params);
    let body: Record<string, unknown> = {
      ...params.responseData,
      form_uuid: params.formUuid
    };
    if (params.id) body.id = params.id;
    if (params.email) body.email = params.email;
    if (params.uuid) body.uuid = params.uuid;
    if (params.date) body.date = params.date;
    if (params.preventDuplicates !== undefined)
      body.prevent_duplicates = params.preventDuplicates;

    let response = await this.axios.post('/responses', body);
    return response.data;
  }

  async tagResponse(params: {
    responseUuid: string;
    tags: string[];
  }): Promise<Record<string, unknown>> {
    if (params.tags.length > 20) {
      throw createApiServiceError('A survey response can have at most 20 tags.', {
        reason: 'too_many_response_tags'
      });
    }
    let response = await this.axios.post('/responses/tags', {
      uuid: params.responseUuid,
      tags: params.tags
    });
    return response.data;
  }

  // ---- Reporting ----

  async getReporting(params: ReportingParams): Promise<Record<string, unknown>> {
    let query: Record<string, unknown> = { type: params.type };
    for (let [key, value] of Object.entries({
      question_identifiers: params.questionIdentifiers,
      tag_uuids: params.tagUuids,
      form_uuids: params.formUuids,
      segment_uuids: params.segmentUuids
    })) {
      if (value)
        query[key] = value
          .split(',')
          .map(item => item.trim())
          .filter(Boolean);
    }
    if (params.dateRangeStart) query.date_range_start = params.dateRangeStart;
    if (params.dateRangeEnd) query.date_range_end = params.dateRangeEnd;

    let response = await this.axios.get('/reporting', { params: query });
    return response.data;
  }

  // ---- Forms (Surveys) ----

  async listForms(params?: FormListParams): Promise<Record<string, unknown>> {
    let query: Record<string, unknown> = {};
    if (params?.page) query.page = params.page;
    if (params?.pageLength) query.page_length = params.pageLength;
    if (params?.list) query.list = params.list;
    if (params?.includeConfig) query.include_config = 1;
    if (params?.includeInfo) query.include_info = 1;

    let response = await this.axios.get('/forms', { params: query });
    return response.data;
  }

  async listFormHistory(
    formUuid: string,
    params?: Pick<PaginationParams, 'page' | 'pageLength'>
  ): Promise<{
    items: {
      uuid: string;
      action: string;
      snapshot: Record<string, unknown>;
      created_at: string;
    }[];
    pagination: {
      items_count: number;
      current_page: number;
      last_page: number;
      page_length: number;
    };
  }> {
    let response = await this.axios.get('/forms/history', {
      params: { form_uuid: formUuid, page: params?.page, page_length: params?.pageLength }
    });
    return response.data;
  }

  async publishForm(
    formUuid: string,
    published: boolean = true
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/forms/publish', {
      form_uuid: formUuid,
      published: published ? 1 : 0
    });
    return response.data;
  }

  async deleteForm(formUuid: string): Promise<Record<string, unknown>> {
    let response = await this.axios.delete('/forms', {
      data: { form_uuid: formUuid }
    });
    return response.data;
  }

  async duplicateForm(formUuid: string, name: string): Promise<Record<string, unknown>> {
    let response = await this.axios.post('/forms/duplicate', {
      form_uuid: formUuid,
      name
    });
    return response.data;
  }

  // ---- Segments ----

  async listSegments(params?: SegmentListParams): Promise<Record<string, unknown>> {
    let query: Record<string, unknown> = {};
    if (params?.page) query.page = params.page;
    if (params?.pageLength) query.page_length = params.pageLength;

    let response = await this.axios.get('/segments', { params: query });
    return response.data;
  }

  async addUserToSegment(params: {
    id?: string;
    email?: string;
    segmentUuid: string;
  }): Promise<Record<string, unknown>> {
    this.requireIdentifier(params);
    let body: Record<string, unknown> = { segment_uuid: params.segmentUuid };
    if (params.id) body.id = params.id;
    if (params.email) body.email = params.email;

    let response = await this.axios.post('/sync-segment', body);
    return response.data;
  }

  async removeUserFromSegment(params: {
    id?: string;
    email?: string;
    segmentUuid: string;
  }): Promise<Record<string, unknown>> {
    this.requireIdentifier(params);
    let body: Record<string, unknown> = { segment_uuid: params.segmentUuid };
    if (params.id) body.id = params.id;
    if (params.email) body.email = params.email;

    let response = await this.axios.delete('/sync-segment', { data: body });
    return response.data;
  }
}
