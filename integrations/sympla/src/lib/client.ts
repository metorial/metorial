import { createAxios } from 'slates';

export interface PaginationInfo {
  hasNext: boolean;
  quantity: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
  sort: {
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

export class Client {
  private axios;

  constructor(private token: string) {
    this.axios = createAxios({
      baseURL: 'https://api.sympla.com.br/public/v3',
      headers: {
        s_token: this.token,
        'Content-Type': 'application/json'
      }
    });
  }

  async listEvents(params: ListEventsParams = {}): Promise<PaginatedResponse<SymplaEvent>> {
    let queryParams: Record<string, string | number | boolean | undefined> = {
      from: params.from,
      published: params.published,
      page_size: params.pageSize,
      page: params.page,
      field_sort: params.fieldSort,
      sort: params.sort,
      fields: params.fields
    };

    let response = await this.axios.get('/events', { params: this.cleanParams(queryParams) });
    return this.mapPaginatedResponse(response.data);
  }

  async getEvent(eventId: number, fields?: string): Promise<SymplaEvent> {
    let params = fields ? { fields } : {};
    let response = await this.axios.get(`/events/${eventId}`, { params });
    return response.data.data;
  }

  async listOrders(
    eventId: number,
    params: ListOrdersParams = {}
  ): Promise<PaginatedResponse<SymplaOrder>> {
    let queryParams: Record<string, string | number | boolean | undefined> = {
      status: params.status,
      page_size: params.pageSize,
      page: params.page,
      field_sort: params.fieldSort,
      sort: params.sort,
      fields: params.fields
    };

    let response = await this.axios.get(`/events/${eventId}/orders`, {
      params: this.cleanParams(queryParams)
    });
    return this.mapPaginatedResponse(response.data);
  }

  async getOrder(eventId: number, orderId: string, fields?: string): Promise<SymplaOrder> {
    let params = fields ? { fields } : {};
    let response = await this.axios.get(`/events/${eventId}/orders/${orderId}`, { params });
    return response.data.data;
  }

  async listParticipantsByEvent(
    eventId: number,
    params: ListParticipantsParams = {}
  ): Promise<PaginatedResponse<SymplaParticipant>> {
    let queryParams: Record<string, string | number | boolean | undefined> = {
      ticket_number: params.ticketNumber,
      page_size: params.pageSize,
      page: params.page,
      field_sort: params.fieldSort,
      sort: params.sort,
      fields: params.fields
    };

    let response = await this.axios.get(`/events/${eventId}/participants`, {
      params: this.cleanParams(queryParams)
    });
    return this.mapPaginatedResponse(response.data);
  }

  async listParticipantsByOrder(
    eventId: number,
    orderId: string,
    params: Omit<ListParticipantsParams, 'ticketNumber'> = {}
  ): Promise<PaginatedResponse<SymplaParticipant>> {
    let queryParams: Record<string, string | number | boolean | undefined> = {
      page_size: params.pageSize,
      page: params.page,
      field_sort: params.fieldSort,
      sort: params.sort,
      fields: params.fields
    };

    let response = await this.axios.get(`/events/${eventId}/orders/${orderId}/participants`, {
      params: this.cleanParams(queryParams)
    });
    return this.mapPaginatedResponse(response.data);
  }

  async getParticipantByTicketId(
    eventId: number,
    participantId: number,
    fields?: string
  ): Promise<SymplaParticipant> {
    let params = fields ? { fields } : {};
    let response = await this.axios.get(`/events/${eventId}/participants/${participantId}`, {
      params
    });
    return response.data.data;
  }

  async getParticipantByTicketNumber(
    eventId: number,
    ticketNumber: string,
    fields?: string
  ): Promise<SymplaParticipant> {
    let params = fields ? { fields } : {};
    let response = await this.axios.get(
      `/events/${eventId}/participants/ticketNumber/${ticketNumber}`,
      { params }
    );
    return response.data.data;
  }

  async checkinByTicketId(eventId: number, participantId: number): Promise<{ data: any }> {
    let response = await this.axios.post(
      `/events/${eventId}/participants/${participantId}/checkIn`
    );
    return response.data;
  }

  async checkinByTicketNumber(eventId: number, ticketNumber: string): Promise<{ data: any }> {
    let response = await this.axios.post(
      `/events/${eventId}/participants/ticketNumber/${ticketNumber}/checkIn`
    );
    return response.data;
  }

  async listAffiliates(eventId: number): Promise<{ data: SymplaAffiliate[] }> {
    let response = await this.axios.get(`/events/${eventId}/affiliates`);
    return response.data;
  }

  private cleanParams(
    params: Record<string, string | number | boolean | undefined>
  ): Record<string, string | number | boolean> {
    let cleaned: Record<string, string | number | boolean> = {};
    for (let [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }

  private mapPaginatedResponse<T>(data: any): PaginatedResponse<T> {
    return {
      data: data.data || [],
      pagination: {
        hasNext: data.pagination?.has_next ?? false,
        quantity: data.pagination?.quantity ?? 0,
        offset: data.pagination?.offset ?? 0
      },
      sort: {
        fieldSort: data.sort?.field_sort ?? '',
        sort: data.sort?.sort ?? ''
      }
    };
  }
}
