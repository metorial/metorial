import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import type {
  AvailableTimeSlot,
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
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.oncehub.com/v2',
      authHeader: { name: 'API-Key', value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'OnceHub',
          reason: 'oncehub_api_error'
        })
    });
  }

  private async list<T>(
    path: string,
    params: PaginationParams,
    filters: Record<string, string> = {}
  ): Promise<PaginatedResponse<T>> {
    let response = await this.http.get<{ data: T[]; has_more: boolean }>(path, {
      params: { ...pickDefined(params), ...filters }
    });
    if (!Array.isArray(response.data?.data) || typeof response.data.has_more !== 'boolean') {
      throw createApiServiceError('OnceHub returned an invalid list response.', {
        reason: 'oncehub_invalid_response'
      });
    }
    return { ...response.data, count: response.data.data.length };
  }

  async getAccountIdentity(): Promise<{ message: string; accountEmail: string | null }> {
    let response = await this.http.get<{ message: string }>('/test');
    if (typeof response.data?.message !== 'string' || !response.data.message.trim()) {
      throw createApiServiceError('OnceHub returned an invalid account identity response.', {
        reason: 'oncehub_invalid_response'
      });
    }
    let accountEmail = response.data.message.match(/account:\s*(\S+@\S+)\s*$/i)?.[1] ?? null;
    return { message: response.data.message, accountEmail };
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

    return this.list('/bookings', {}, queryParams);
  }

  async getBooking(bookingId: string, expand?: string[]): Promise<Booking> {
    let queryParams: Record<string, string> = {};
    if (expand && expand.length > 0) queryParams.expand = expand.join(',');

    let response = await this.http.get<Booking>(`/bookings/${encodeURIComponent(bookingId)}`, {
      params: queryParams
    });
    return response.data;
  }

  async listBookingCalendars(
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<BookingCalendar>> {
    return this.list('/booking-calendars', params);
  }

  async getBookingCalendar(calendarId: string): Promise<BookingCalendar> {
    let response = await this.http.get(`/booking-calendars/${encodeURIComponent(calendarId)}`);
    return response.data;
  }

  async listBookingPages(
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<BookingPage>> {
    return this.list('/booking-pages', params);
  }

  async getBookingPage(pageId: string): Promise<BookingPage> {
    let response = await this.http.get(`/booking-pages/${encodeURIComponent(pageId)}`);
    return response.data;
  }

  async listMasterPages(
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<MasterPage>> {
    return this.list('/master-pages', params);
  }

  async getMasterPage(masterPageId: string): Promise<MasterPage> {
    let response = await this.http.get(`/master-pages/${encodeURIComponent(masterPageId)}`);
    return response.data;
  }

  async listEventTypes(params: PaginationParams = {}): Promise<PaginatedResponse<EventType>> {
    return this.list('/event-types', params);
  }

  async getEventType(eventTypeId: string): Promise<EventType> {
    let response = await this.http.get(`/event-types/${encodeURIComponent(eventTypeId)}`);
    return response.data;
  }

  async listUsers(params: PaginationParams = {}): Promise<PaginatedResponse<User>> {
    return this.list('/users', params);
  }

  async getUser(userId: string): Promise<User> {
    let response = await this.http.get(`/users/${encodeURIComponent(userId)}`);
    return response.data;
  }

  async listTeams(params: PaginationParams = {}): Promise<PaginatedResponse<Team>> {
    return this.list('/teams', params);
  }

  async cancelBooking(
    bookingId: string,
    cancellationReason?: string,
    sendCancellationEmail?: boolean
  ): Promise<void> {
    await this.http.post(
      `/bookings/${encodeURIComponent(bookingId)}/cancel`,
      pickDefined({
        cancellation_reason: cancellationReason,
        send_cancellation_email: sendCancellationEmail
      })
    );
  }

  async getAvailableTimeSlots(
    calendarId: string,
    startTime: string,
    endTime: string
  ): Promise<AvailableTimeSlot[]> {
    let response = await this.http.get<AvailableTimeSlot[]>(
      `/booking-calendars/${encodeURIComponent(calendarId)}/time-slots`,
      { params: { start_time: startTime, end_time: endTime } }
    );
    if (!Array.isArray(response.data)) {
      throw createApiServiceError('OnceHub returned an invalid availability response.', {
        reason: 'oncehub_invalid_response'
      });
    }
    return response.data;
  }

  async listWebhooks(): Promise<PaginatedResponse<Webhook>> {
    return this.list('/webhooks', {});
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
