import { createAxios } from 'slates';

export interface PaginatedResponse<T> {
  [key: string]: T[] | number | undefined;
  page?: number;
  pageSize?: number;
  totalResults?: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.humanitix.com/v1',
      headers: {
        'x-api-key': config.token,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  async getEvents(params?: PaginationParams): Promise<any> {
    let response = await this.axios.get('/events', { params });
    return response.data;
  }

  async getEvent(eventId: string): Promise<any> {
    let response = await this.axios.get(`/events/${eventId}`);
    return response.data;
  }

  async getOrders(eventId: string, params?: PaginationParams): Promise<any> {
    let response = await this.axios.get(`/events/${eventId}/orders`, { params });
    return response.data;
  }

  async getOrder(eventId: string, orderId: string): Promise<any> {
    let response = await this.axios.get(`/events/${eventId}/orders/${orderId}`);
    return response.data;
  }

  async getTickets(eventId: string, params?: PaginationParams): Promise<any> {
    let response = await this.axios.get(`/events/${eventId}/tickets`, { params });
    return response.data;
  }

  async getTicket(eventId: string, ticketId: string): Promise<any> {
    let response = await this.axios.get(`/events/${eventId}/tickets/${ticketId}`);
    return response.data;
  }

  async getTags(params?: PaginationParams): Promise<any> {
    let response = await this.axios.get('/tags', { params });
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

      let totalResults = response.totalResults || 0;
      if (allItems.length >= totalResults || items.length === 0) {
        hasMore = false;
      } else {
        page++;
      }
    }

    return allItems;
  }
}
