import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import type { z } from 'zod';

export interface PaginationInfo {
  hasNext: boolean;
  quantity: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
  sort?: {
    fieldSort: string;
    sort: string;
  };
}

export interface SymplaEvent {
  id: number;
  start_date: string;
  end_date: string;
  name: string;
  detail: string;
  private_event: number;
  published: number;
  cancelled: number;
  image: string;
  url: string;
  address: {
    name: string;
    address: string;
    city: string;
    state: string;
    country: string;
    zip_code: string;
  };
  host: {
    name: string;
    description: string;
  };
  category_prim: {
    name: string;
  };
  category_sec: {
    name: string;
  };
}

export interface SymplaOrder {
  id: string;
  event_id: number;
  order_date: string;
  order_status: string;
  updated_date: string;
  discount_code: string;
  transaction_type: string;
  order_total_sale_price: number;
  buyer_first_name: string;
  buyer_last_name: string;
  buyer_email: string;
  invoice_info: {
    doc_type: string;
    doc_number: string;
    client_name: string;
    address_zip_code: string;
    address_street: string;
    address_street_number: string;
    address_street2: string;
    address_neighborhood: string;
    address_city: string;
    address_state: string;
    mei: boolean;
  };
}

export interface SymplaParticipant {
  id: number;
  order_id: string;
  first_name: string;
  last_name: string;
  email: string;
  ticket_number: string;
  ticket_num_start: string;
  ticket_name: string;
  ticket_sale_price: number;
  checkin: {
    checked_in: boolean;
    checked_in_date: string;
  };
  custom_form: Record<string, string>;
}

export interface SymplaAffiliate {
  id: number;
  name: string;
  email: string;
  commission: number;
  has_limit: boolean;
  limit: number;
  sales: number;
}

export interface ListEventsParams {
  from?: string;
  published?: boolean;
  pageSize?: number;
  page?: number;
  fieldSort?: string;
  sort?: 'ASC' | 'DESC';
  fields?: string;
}

export interface ListOrdersParams {
  status?: boolean;
  pageSize?: number;
  page?: number;
  fieldSort?: string;
  sort?: 'ASC' | 'DESC';
  fields?: string;
}

export interface ListParticipantsParams {
  ticketNumber?: string;
  pageSize?: number;
  page?: number;
  fieldSort?: string;
  sort?: 'ASC' | 'DESC';
  fields?: string;
}

interface CurrentPageResponse {
  data: Record<string, unknown>[];
  pagination?: Record<string, unknown> | null;
  sort?: Record<string, unknown> | null;
}

export class Client {
  private axios;
  private currentAxios;

  constructor(token: string) {
    if (typeof token !== 'string' || !token.trim()) {
      throw createApiServiceError('A Sympla API token is required.', {
        reason: 'sympla_missing_token'
      });
    }

    let options = {
      authHeader: { name: 's_token', value: token },
      errorAdapter: (error: unknown) =>
        buildApiServiceError(error, {
          providerLabel: 'Sympla',
          reason: 'sympla_api_error',
          extractResponse: (value, helpers) => helpers.getResponseWithBody(value),
          detailKeys: [
            'message',
            'detail',
            'title',
            'error',
            'error_description',
            'violation'
          ],
          nestedKeys: ['errors', 'violations'],
          extractUpstreamCode: (_error, response, helpers) => {
            let body = response?.data;
            if (!helpers.isRecord(body)) return undefined;
            let code = body.code ?? body.type;
            return typeof code === 'string' || typeof code === 'number'
              ? String(code)
              : undefined;
          }
        })
    };
    this.axios = createAuthenticatedAxios({
      ...options,
      baseURL: 'https://api.sympla.com.br/public/v3'
    });
    this.currentAxios = createAuthenticatedAxios({
      ...options,
      baseURL: 'https://api.sympla.com.br/public/v1.6.0'
    });

    for (let client of [this.axios, this.currentAxios]) {
      client.interceptors.response.use(response => {
        let body: unknown = response.data;
        if (
          isApiErrorRecord(body) &&
          (body.success === false ||
            Boolean(body.error) ||
            (typeof body.status === 'number' && body.status >= 400))
        ) {
          throw options.errorAdapter({
            response: { status: response.status, data: body }
          });
        }
        return response;
      });
    }
  }

  async listEvents(params: ListEventsParams = {}): Promise<PaginatedResponse<SymplaEvent>> {
    this.validatePagination(params);
    let queryParams: Record<string, string | number | boolean | undefined> = {
      from: params.from,
      published: params.published,
      page_size: params.pageSize,
      page: params.page,
      field_sort: params.fieldSort,
      sort: params.sort,
      fields: params.fields
    };

    let response = await this.axios.get('/events', { params: pickDefined(queryParams) });
    return this.mapPaginatedResponse(response.data);
  }

  async getEvent(eventId: number, fields?: string): Promise<SymplaEvent> {
    let params = fields ? { fields } : {};
    this.validatePositiveInteger(eventId, 'eventId');
    let response = await this.axios.get(`/events/${eventId}`, { params });
    return this.readRecord(response.data);
  }

  async listOrders(
    eventId: number,
    params: ListOrdersParams = {}
  ): Promise<PaginatedResponse<SymplaOrder>> {
    this.validatePagination(params);
    let queryParams: Record<string, string | number | boolean | undefined> = {
      status: params.status,
      page_size: params.pageSize,
      page: params.page,
      field_sort: params.fieldSort,
      sort: params.sort,
      fields: params.fields
    };

    this.validatePositiveInteger(eventId, 'eventId');
    let response = await this.axios.get(`/events/${eventId}/orders`, {
      params: pickDefined(queryParams)
    });
    return this.mapPaginatedResponse(response.data);
  }

  async getOrder(eventId: number, orderId: string, fields?: string): Promise<SymplaOrder> {
    let params = fields ? { fields } : {};
    this.validatePositiveInteger(eventId, 'eventId');
    this.validateTextId(orderId, 'orderId');
    let response = await this.axios.get(
      `/events/${eventId}/orders/${encodeURIComponent(orderId)}`,
      { params }
    );
    return this.readRecord(response.data);
  }

  async listParticipantsByEvent(
    eventId: number,
    params: ListParticipantsParams = {}
  ): Promise<PaginatedResponse<SymplaParticipant>> {
    this.validatePagination(params);
    let queryParams: Record<string, string | number | boolean | undefined> = {
      ticket_number: params.ticketNumber,
      page_size: params.pageSize,
      page: params.page,
      field_sort: params.fieldSort,
      sort: params.sort,
      fields: params.fields
    };

    this.validatePositiveInteger(eventId, 'eventId');
    let response = await this.axios.get(`/events/${eventId}/participants`, {
      params: pickDefined(queryParams)
    });
    return this.mapPaginatedResponse(response.data);
  }

  async listParticipantsByOrder(
    eventId: number,
    orderId: string,
    params: Omit<ListParticipantsParams, 'ticketNumber'> = {}
  ): Promise<PaginatedResponse<SymplaParticipant>> {
    this.validatePagination(params);
    let queryParams: Record<string, string | number | boolean | undefined> = {
      page_size: params.pageSize,
      page: params.page,
      field_sort: params.fieldSort,
      sort: params.sort,
      fields: params.fields
    };

    this.validatePositiveInteger(eventId, 'eventId');
    this.validateTextId(orderId, 'orderId');
    let response = await this.axios.get(
      `/events/${eventId}/orders/${encodeURIComponent(orderId)}/participants`,
      {
        params: pickDefined(queryParams)
      }
    );
    return this.mapPaginatedResponse(response.data);
  }

  async getParticipantByTicketId(
    eventId: number,
    participantId: number,
    fields?: string
  ): Promise<SymplaParticipant> {
    let params = fields ? { fields } : {};
    this.validatePositiveInteger(eventId, 'eventId');
    this.validatePositiveInteger(participantId, 'ticketId');
    let response = await this.axios.get(`/events/${eventId}/participants/${participantId}`, {
      params
    });
    return this.readRecord(response.data);
  }

  async getParticipantByTicketNumber(
    eventId: number,
    ticketNumber: string,
    fields?: string
  ): Promise<SymplaParticipant> {
    let params = fields ? { fields } : {};
    this.validatePositiveInteger(eventId, 'eventId');
    this.validateTextId(ticketNumber, 'ticketNumber');
    let response = await this.axios.get(
      `/events/${eventId}/participants/ticketNumber/${encodeURIComponent(ticketNumber)}`,
      { params }
    );
    return this.readRecord(response.data);
  }

  async checkinByTicketId(eventId: number, participantId: number): Promise<{ data: unknown }> {
    this.validatePositiveInteger(eventId, 'eventId');
    this.validatePositiveInteger(participantId, 'ticketId');
    let response = await this.axios.post(
      `/events/${eventId}/participants/${participantId}/checkIn`
    );
    return response.data;
  }

  async checkinByTicketNumber(
    eventId: number,
    ticketNumber: string
  ): Promise<{ data: unknown }> {
    this.validatePositiveInteger(eventId, 'eventId');
    this.validateTextId(ticketNumber, 'ticketNumber');
    let response = await this.axios.post(
      `/events/${eventId}/participants/ticketNumber/${encodeURIComponent(ticketNumber)}/checkIn`
    );
    return response.data;
  }

  async listAffiliates(eventId: number): Promise<{ data: SymplaAffiliate[] }> {
    this.validatePositiveInteger(eventId, 'eventId');
    let response = await this.axios.get(`/events/${eventId}/affiliates`);
    let data = this.readList<SymplaAffiliate>(response.data);
    return { data };
  }

  async listCurrentEvents(params: {
    published?: string;
    from?: string;
    timezone?: string;
    sort?: string;
    fieldSort?: string;
    pageSize?: number;
    cursor?: string;
  }) {
    this.validatePagination(params);
    let response = await this.currentAxios.get<CurrentPageResponse>('/events', {
      params: pickDefined({
        published: params.published ?? 'published',
        from: params.from,
        timezone: params.timezone ?? 'America/Sao_Paulo',
        sort: params.sort ?? 'asc',
        field_sort: params.fieldSort,
        page_size: params.pageSize,
        cursor: params.cursor
      })
    });
    this.validateCurrentPage(response.status, response.data);
    return response;
  }

  async listPresentations(
    eventIdHash: string,
    params: {
      published?: boolean;
      from?: string;
      timezone?: string;
      sort?: string;
      pageSize?: number;
      cursor?: string;
      filterOnlineSector?: boolean;
    }
  ) {
    this.validateTextId(eventIdHash, 'eventIdHash');
    this.validatePagination(params);
    let response = await this.currentAxios.get<CurrentPageResponse>(
      `/events/${encodeURIComponent(eventIdHash)}/presentations`,
      {
        params: pickDefined({
          published: params.published ?? true,
          from: params.from,
          timezone: params.timezone ?? 'America/Sao_Paulo',
          sort: params.sort ?? 'asc',
          page_size: params.pageSize,
          cursor: params.cursor,
          filter_online_sector: params.filterOnlineSector
        })
      }
    );
    this.validateCurrentPage(response.status, response.data);
    return response;
  }

  async getPresentation(eventIdHash: string, presentationId: number, timezone?: string) {
    this.validateTextId(eventIdHash, 'eventIdHash');
    this.validatePositiveInteger(presentationId, 'presentationId');
    return this.currentAxios.get<Record<string, unknown>>(
      `/events/${encodeURIComponent(eventIdHash)}/presentations/${presentationId}`,
      { params: pickDefined({ timezone }) }
    );
  }

  private validateCurrentPage(status: number, body: CurrentPageResponse) {
    if (status !== 204 && (!isApiErrorRecord(body) || !Array.isArray(body.data))) {
      throw createApiServiceError('Sympla returned a response without the requested list.', {
        reason: 'sympla_invalid_response'
      });
    }
  }

  private validateTextId(value: string, field: string) {
    if (!value.trim()) {
      throw createApiServiceError(`${field} must not be empty.`, {
        reason: 'sympla_invalid_identifier'
      });
    }
  }

  private validatePositiveInteger(value: number, field: string) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw createApiServiceError(`${field} must be a positive whole number.`, {
        reason: 'sympla_invalid_number'
      });
    }
  }

  private validatePagination(params: { page?: number; pageSize?: number }) {
    if (params.page !== undefined) this.validatePositiveInteger(params.page, 'page');
    if (params.pageSize !== undefined) {
      this.validatePositiveInteger(params.pageSize, 'pageSize');
      if (params.pageSize > 200) {
        throw createApiServiceError('pageSize must not exceed 200.', {
          reason: 'sympla_invalid_page_size'
        });
      }
    }
  }

  private readData<T>(body: { data: T }): T {
    if (!isApiErrorRecord(body) || !('data' in body) || body.data == null) {
      throw createApiServiceError('Sympla returned a response without the requested data.', {
        reason: 'sympla_invalid_response'
      });
    }
    return body.data;
  }

  private readRecord<T>(body: { data: T }): T {
    let data = this.readData(body);
    if (!isApiErrorRecord(data)) {
      throw createApiServiceError('Sympla returned an invalid requested record.', {
        reason: 'sympla_invalid_response'
      });
    }
    return data;
  }

  private readList<T>(body: { data: T[] }): T[] {
    let data = this.readData(body);
    if (!Array.isArray(data) || data.some(item => !isApiErrorRecord(item))) {
      throw createApiServiceError('Sympla returned an invalid requested record list.', {
        reason: 'sympla_invalid_response'
      });
    }
    return data;
  }

  private mapPaginatedResponse<T>(body: {
    data: T[];
    pagination: { has_next: boolean; quantity: number; offset: number };
    sort?: { field_sort: string; sort: string };
  }): PaginatedResponse<T> {
    let data = this.readList(body);
    if (
      !isApiErrorRecord(body.pagination) ||
      typeof body.pagination.has_next !== 'boolean' ||
      typeof body.pagination.quantity !== 'number' ||
      !Number.isFinite(body.pagination.quantity)
    ) {
      throw createApiServiceError('Sympla returned invalid required pagination metadata.', {
        reason: 'sympla_invalid_response'
      });
    }
    return {
      data,
      pagination: {
        hasNext: body.pagination?.has_next,
        quantity: body.pagination?.quantity,
        offset: body.pagination?.offset
      },
      sort: body.sort ? { fieldSort: body.sort.field_sort, sort: body.sort.sort } : undefined
    };
  }
}

export let eventFlag = (value: number): boolean => {
  if (value !== 0 && value !== 1) {
    throw createApiServiceError('Sympla returned an invalid event status flag.', {
      reason: 'sympla_invalid_response'
    });
  }
  return value === 1;
};

export let validateSymplaOutput = <T>(schema: z.ZodType<T>, output: T): T => {
  let result = schema.safeParse(output);
  if (!result.success) {
    let path = result.error.issues[0]?.path.map(String).join('.') || 'result';
    throw createApiServiceError(`Sympla returned an invalid required result at ${path}.`, {
      reason: 'sympla_invalid_response'
    });
  }
  return output;
};
