import { createAxios } from 'slates';
import type {
  Booking,
  BookingCalendar,
  BookingPage,
  EventType,
  ListBookingsParams,
  MasterPage,
  PaginatedResponse,
  PaginationParams,
  Team,
  User,
  Webhook
} from './types';

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.http = createAxios({
      baseURL: 'https://api.oncehub.com/v2',
      headers: {
        'API-Key': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  async listBookings(params: ListBookingsParams = {}): Promise<PaginatedResponse<Booking>> {
    let queryParams: Record<string, string> = {};

    if (params.startingTimeGt) queryParams['starting_time.gt'] = params.startingTimeGt;
    if (params.startingTimeLt) queryParams['starting_time.lt'] = params.startingTimeLt;
    if (params.lastUpdatedTimeGt)
      queryParams['last_updated_time.gt'] = params.lastUpdatedTimeGt;
    if (params.creationTimeGt) queryParams['creation_time.gt'] = params.creationTimeGt;
    if (params.status) queryParams.status = params.status;
    if (params.owner) queryParams.owner = params.owner;
    if (params.bookingPage) queryParams.booking_page = params.bookingPage;
    if (params.eventType) queryParams.event_type = params.eventType;
    if (params.bookingCalendar) queryParams.booking_calendar = params.bookingCalendar;
    if (params.expand && params.expand.length > 0)
      queryParams.expand = params.expand.join(',');
    if (params.limit) queryParams.limit = String(params.limit);
    if (params.after) queryParams.after = params.after;
    if (params.before) queryParams.before = params.before;

    let response = await this.http.get('/bookings', { params: queryParams });
    return response.data;
  }

  async getBooking(bookingId: string, expand?: string[]): Promise<Booking> {
    let queryParams: Record<string, string> = {};
    if (expand && expand.length > 0) queryParams.expand = expand.join(',');

    let response = await this.http.get(`/bookings/${bookingId}`, { params: queryParams });
    return response.data;
  }

  async listBookingCalendars(
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<BookingCalendar>> {
    let queryParams: Record<string, string> = {};
    if (params.limit) queryParams.limit = String(params.limit);
    if (params.after) queryParams.after = params.after;
    if (params.before) queryParams.before = params.before;

    let response = await this.http.get('/booking-calendars', { params: queryParams });
    return response.data;
  }

  async getBookingCalendar(calendarId: string): Promise<BookingCalendar> {
    let response = await this.http.get(`/booking-calendars/${calendarId}`);
    return response.data;
  }

  async listBookingPages(
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<BookingPage>> {
    let queryParams: Record<string, string> = {};
    if (params.limit) queryParams.limit = String(params.limit);
    if (params.after) queryParams.after = params.after;
    if (params.before) queryParams.before = params.before;

    let response = await this.http.get('/booking-pages', { params: queryParams });
    return response.data;
  }

  async getBookingPage(pageId: string): Promise<BookingPage> {
    let response = await this.http.get(`/booking-pages/${pageId}`);
    return response.data;
  }

  async listMasterPages(
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<MasterPage>> {
    let queryParams: Record<string, string> = {};
    if (params.limit) queryParams.limit = String(params.limit);
    if (params.after) queryParams.after = params.after;
    if (params.before) queryParams.before = params.before;

    let response = await this.http.get('/master-pages', { params: queryParams });
    return response.data;
  }

  async getMasterPage(masterPageId: string): Promise<MasterPage> {
    let response = await this.http.get(`/master-pages/${masterPageId}`);
    return response.data;
  }

  async listEventTypes(params: PaginationParams = {}): Promise<PaginatedResponse<EventType>> {
    let queryParams: Record<string, string> = {};
    if (params.limit) queryParams.limit = String(params.limit);
    if (params.after) queryParams.after = params.after;
    if (params.before) queryParams.before = params.before;

    let response = await this.http.get('/event-types', { params: queryParams });
    return response.data;
  }

  async getEventType(eventTypeId: string): Promise<EventType> {
    let response = await this.http.get(`/event-types/${eventTypeId}`);
    return response.data;
  }

  async listUsers(params: PaginationParams = {}): Promise<PaginatedResponse<User>> {
    let queryParams: Record<string, string> = {};
    if (params.limit) queryParams.limit = String(params.limit);
    if (params.after) queryParams.after = params.after;
    if (params.before) queryParams.before = params.before;

    let response = await this.http.get('/users', { params: queryParams });
    return response.data;
  }

  async getUser(userId: string): Promise<User> {
    let response = await this.http.get(`/users/${userId}`);
    return response.data;
  }

  async listTeams(params: PaginationParams = {}): Promise<PaginatedResponse<Team>> {
    let queryParams: Record<string, string> = {};
    if (params.limit) queryParams.limit = String(params.limit);
    if (params.after) queryParams.after = params.after;
    if (params.before) queryParams.before = params.before;

    let response = await this.http.get('/teams', { params: queryParams });
    return response.data;
  }

  async listWebhooks(): Promise<PaginatedResponse<Webhook>> {
    let response = await this.http.get('/webhooks');
    return response.data;
  }

  async createWebhook(name: string, url: string, events: string[]): Promise<Webhook> {
    let response = await this.http.post('/webhooks', { name, url, events });
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.http.delete(`/webhooks/${webhookId}`);
  }

  async getWebhook(webhookId: string): Promise<Webhook> {
    let response = await this.http.get(`/webhooks/${webhookId}`);
    return response.data;
  }
}
