import { createAxios } from 'slates';

export class Client {
  private http;

  constructor(config: { token: string; baseUrl: string }) {
    this.http = createAxios({
      baseURL: `${config.baseUrl}/v2`,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Profile ──

  async getMe() {
    let response = await this.http.get('/me');
    return response.data?.data;
  }

  async updateMe(data: Record<string, any>) {
    let response = await this.http.patch('/me', data);
    return response.data?.data;
  }

  // ── Bookings ──

  async listBookings(params?: Record<string, any>) {
    let response = await this.http.get('/bookings', {
      params,
      headers: { 'cal-api-version': '2024-08-13' }
    });
    return response.data?.data;
  }

  async getBooking(bookingUid: string) {
    let response = await this.http.get(`/bookings/${bookingUid}`, {
      headers: { 'cal-api-version': '2024-08-13' }
    });
    return response.data?.data;
  }

  async createBooking(data: Record<string, any>) {
    let response = await this.http.post('/bookings', data, {
      headers: { 'cal-api-version': '2024-08-13' }
    });
    return response.data?.data;
  }

  async cancelBooking(bookingUid: string, data?: Record<string, any>) {
    let response = await this.http.post(`/bookings/${bookingUid}/cancel`, data || {}, {
      headers: { 'cal-api-version': '2024-08-13' }
    });
    return response.data?.data;
  }

  async rescheduleBooking(bookingUid: string, data: Record<string, any>) {
    let response = await this.http.post(`/bookings/${bookingUid}/reschedule`, data, {
      headers: { 'cal-api-version': '2024-08-13' }
    });
    return response.data?.data;
  }

  async confirmBooking(bookingUid: string) {
    let response = await this.http.post(
      `/bookings/${bookingUid}/confirm`,
      {},
      {
        headers: { 'cal-api-version': '2024-08-13' }
      }
    );
    return response.data?.data;
  }

  async declineBooking(bookingUid: string, data?: Record<string, any>) {
    let response = await this.http.post(`/bookings/${bookingUid}/decline`, data || {}, {
      headers: { 'cal-api-version': '2024-08-13' }
    });
    return response.data?.data;
  }

  async markNoShow(bookingUid: string, data: Record<string, any>) {
    let response = await this.http.post(`/bookings/${bookingUid}/mark-absent`, data, {
      headers: { 'cal-api-version': '2024-08-13' }
    });
    return response.data?.data;
  }

  async reassignBooking(bookingUid: string, userId?: number) {
    let url = userId
      ? `/bookings/${bookingUid}/reassign/${userId}`
      : `/bookings/${bookingUid}/reassign`;
    let response = await this.http.post(
      url,
      {},
      {
        headers: { 'cal-api-version': '2024-08-13' }
      }
    );
    return response.data?.data;
  }

  async addGuests(bookingUid: string, guests: { email: string; name?: string }[]) {
    let response = await this.http.post(
      `/bookings/${bookingUid}/guests`,
      { guests },
      {
        headers: { 'cal-api-version': '2024-08-13' }
      }
    );
    return response.data?.data;
  }

  // ── Event Types ──

  async listEventTypes(params?: Record<string, any>) {
    let response = await this.http.get('/event-types', {
      params,
      headers: { 'cal-api-version': '2024-06-14' }
    });
    return response.data?.data;
  }

  async getEventType(eventTypeId: number) {
    let response = await this.http.get(`/event-types/${eventTypeId}`, {
      headers: { 'cal-api-version': '2024-06-14' }
    });
    return response.data?.data;
  }

  async createEventType(data: Record<string, any>) {
    let response = await this.http.post('/event-types', data, {
      headers: { 'cal-api-version': '2024-06-14' }
    });
    return response.data?.data;
  }

  async updateEventType(eventTypeId: number, data: Record<string, any>) {
    let response = await this.http.patch(`/event-types/${eventTypeId}`, data, {
      headers: { 'cal-api-version': '2024-06-14' }
    });
    return response.data?.data;
  }

  async deleteEventType(eventTypeId: number) {
    let response = await this.http.delete(`/event-types/${eventTypeId}`, {
      headers: { 'cal-api-version': '2024-06-14' }
    });
    return response.data?.data;
  }

  // ── Schedules ──

  async listSchedules() {
    let response = await this.http.get('/schedules', {
      headers: { 'cal-api-version': '2024-06-11' }
    });
    return response.data?.data;
  }

  async getSchedule(scheduleId: number) {
    let response = await this.http.get(`/schedules/${scheduleId}`, {
      headers: { 'cal-api-version': '2024-06-11' }
    });
    return response.data?.data;
  }

  async createSchedule(data: Record<string, any>) {
    let response = await this.http.post('/schedules', data, {
      headers: { 'cal-api-version': '2024-06-11' }
    });
    return response.data?.data;
  }

  async updateSchedule(scheduleId: number, data: Record<string, any>) {
    let response = await this.http.patch(`/schedules/${scheduleId}`, data, {
      headers: { 'cal-api-version': '2024-06-11' }
    });
    return response.data?.data;
  }

  async deleteSchedule(scheduleId: number) {
    let response = await this.http.delete(`/schedules/${scheduleId}`, {
      headers: { 'cal-api-version': '2024-06-11' }
    });
    return response.data?.data;
  }

  // ── Slots ──

  async getAvailableSlots(params: Record<string, any>) {
    let response = await this.http.get('/slots', {
      params,
      headers: { 'cal-api-version': '2024-09-04' }
    });
    return response.data?.data;
  }

  // ── Webhooks (User-level) ──

  async listWebhooks() {
    let response = await this.http.get('/webhooks');
    return response.data?.data;
  }

  async getWebhook(webhookId: number) {
    let response = await this.http.get(`/webhooks/${webhookId}`);
    return response.data?.data;
  }

  async createWebhook(data: Record<string, any>) {
    let response = await this.http.post('/webhooks', data);
    return response.data?.data;
  }

  async updateWebhook(webhookId: number, data: Record<string, any>) {
    let response = await this.http.patch(`/webhooks/${webhookId}`, data);
    return response.data?.data;
  }

  async deleteWebhook(webhookId: number) {
    let response = await this.http.delete(`/webhooks/${webhookId}`);
    return response.data?.data;
  }

  // ── Calendars ──

  async listCalendars() {
    let response = await this.http.get('/calendars');
    return response.data?.data;
  }

  async getBusyTimes(params: Record<string, any>) {
    let response = await this.http.get('/calendars/busy-times', { params });
    return response.data?.data;
  }
}
