import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export interface PaginatedResponse<T> {
  [key: string]: T[] | number | undefined;
  page?: number;
  pageSize?: number;
  total?: number;
  totalResults?: number;
}

export interface LocationParams {
  overrideLocation?: string;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface EventPaginationParams extends PaginationParams, LocationParams {
  inFutureOnly?: boolean;
  since?: string;
}

export interface OrderPaginationParams extends PaginationParams, LocationParams {
  eventDateId?: string;
  since?: string;
}

export interface TicketPaginationParams extends OrderPaginationParams {
  status?: 'complete' | 'cancelled';
}

export class Client {
  private axios;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('A Humanitix API key is required. Reconnect your account.');
    }

    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.humanitix.com/v1',
      authHeader: { name: 'x-api-key', value: config.token },
      headers: {
        Accept: 'application/json'
      },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Humanitix',
          reason: 'humanitix_api_error'
        })
    });
  }

  async getEvents(params?: EventPaginationParams): Promise<any> {
    let response = await this.axios.get('/events', { params: this.paginationParams(params) });
    return response.data;
  }

  async getEvent(eventId: string, params?: LocationParams): Promise<any> {
    let response = await this.axios.get(`/events/${this.encodeId(eventId, 'Event')}`, {
      params
    });
    return response.data;
  }

  async getOrders(eventId: string, params?: OrderPaginationParams): Promise<any> {
    let response = await this.axios.get(`/events/${this.encodeId(eventId, 'Event')}/orders`, {
      params: this.paginationParams(params)
    });
    return response.data;
  }

  async getOrder(eventId: string, orderId: string, params?: LocationParams): Promise<any> {
    let response = await this.axios.get(
      `/events/${this.encodeId(eventId, 'Event')}/orders/${this.encodeId(orderId, 'Order')}`,
      { params }
    );
    return response.data;
  }

  async getTickets(eventId: string, params?: TicketPaginationParams): Promise<any> {
    let response = await this.axios.get(`/events/${this.encodeId(eventId, 'Event')}/tickets`, {
      params: this.paginationParams(params)
    });
    return response.data;
  }

  async getTicket(eventId: string, ticketId: string, params?: LocationParams): Promise<any> {
    let response = await this.axios.get(
      `/events/${this.encodeId(eventId, 'Event')}/tickets/${this.encodeId(ticketId, 'Ticket')}`,
      { params }
    );
    return response.data;
  }

  async manageTicketCheckIn(
    eventId: string,
    ticketId: string,
    action: 'check_in' | 'check_out',
    params?: LocationParams
  ): Promise<{ scanningMessages: { header: string; message: string }[] }> {
    let endpoint = action === 'check_in' ? 'check-in' : 'check-out';
    let response = await this.axios.post(
      `/events/${this.encodeId(eventId, 'Event')}/tickets/${this.encodeId(ticketId, 'Ticket')}/${endpoint}`,
      undefined,
      { params }
    );
    return response.data;
  }

  async getTags(params?: PaginationParams): Promise<any> {
    let response = await this.axios.get('/tags', { params: this.paginationParams(params) });
    return response.data;
  }

  async getTag(tagId: string): Promise<any> {
    let response = await this.axios.get(`/tags/${this.encodeId(tagId, 'Tag')}`);
    return response.data;
  }

  async getAllEvents(): Promise<any[]> {
    return this.paginate(page => this.getEvents({ page, pageSize: 100 }), 'events');
  }

  async getAllOrders(eventId: string): Promise<any[]> {
    return this.paginate(page => this.getOrders(eventId, { page, pageSize: 100 }), 'orders');
  }

  async getAllTickets(eventId: string): Promise<any[]> {
    return this.paginate(page => this.getTickets(eventId, { page, pageSize: 100 }), 'tickets');
  }

  async getAllTags(): Promise<any[]> {
    return this.paginate(page => this.getTags({ page, pageSize: 100 }), 'tags');
  }

  private encodeId(id: string, resource: string): string {
    if (!id.trim()) {
      throw createApiServiceError(`${resource} ID must not be empty.`);
    }
    return encodeURIComponent(id);
  }

  private paginationParams(params?: PaginationParams) {
    let page = params?.page ?? 1;
    if (!Number.isInteger(page) || page < 1) {
      throw createApiServiceError('Page must be a whole number greater than or equal to 1.');
    }
    let pageSize = params?.pageSize;
    if (
      pageSize !== undefined &&
      (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100)
    ) {
      throw createApiServiceError('Page size must be a whole number between 1 and 100.');
    }
    return { ...params, page };
  }

  private async paginate(
    fetchPage: (page: number) => Promise<any>,
    key: string
  ): Promise<any[]> {
    let allItems: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      let response = await fetchPage(page);
      let items = response[key] || [];
      allItems.push(...items);

      let totalResults = response.total ?? response.totalResults;
      if (
        items.length === 0 ||
        (typeof totalResults === 'number' && allItems.length >= totalResults)
      ) {
        hasMore = false;
      } else {
        page++;
      }
    }

    return allItems;
  }
}
