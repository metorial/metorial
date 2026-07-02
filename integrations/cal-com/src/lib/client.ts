import { createAxios } from 'slates';
import { calComApiError } from './errors';

let BOOKING_CREATE_VERSION = '2024-08-13';
let BOOKING_LIFECYCLE_VERSION = '2026-02-25';
let BOOKING_LIST_VERSION = '2026-05-01';
let EVENT_TYPE_VERSION = '2024-06-14';
let SCHEDULE_VERSION = '2024-06-11';
let SLOT_VERSION = '2024-09-04';

let hasDataProperty = (value: unknown): value is { data: unknown } =>
  typeof value === 'object' && value !== null && 'data' in value;

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

  private async request<T>(operation: string, request: () => Promise<any>): Promise<T> {
    try {
      let response = await request();
      let envelope = response.data;

      return (hasDataProperty(envelope) ? envelope.data : envelope) as T;
    } catch (error) {
      throw calComApiError(error, operation);
    }
  }

  private async envelope<T>(operation: string, request: () => Promise<any>): Promise<T> {
    try {
      let response = await request();
      return response.data as T;
    } catch (error) {
      throw calComApiError(error, operation);
    }
  }

  // Profile

  async getMe() {
    return await this.request<any>('get profile', () => this.http.get('/me'));
  }

  async updateMe(data: Record<string, any>) {
    return await this.request<any>('update profile', () => this.http.patch('/me', data));
  }

  // Bookings

  async listBookings(params?: Record<string, any>) {
    let response = await this.envelope<any>('list bookings', () =>
      this.http.get('/bookings', {
        params,
        headers: { 'cal-api-version': BOOKING_LIST_VERSION }
      })
    );

    return {
      bookings: Array.isArray(response?.data) ? response.data : [],
      pagination: response?.pagination
    };
  }

  async getBooking(bookingUid: string) {
    return await this.request<any>('get booking', () =>
      this.http.get(`/bookings/${bookingUid}`, {
        headers: { 'cal-api-version': BOOKING_CREATE_VERSION }
      })
    );
  }

  async createBooking(data: Record<string, any>) {
    return await this.request<any>('create booking', () =>
      this.http.post('/bookings', data, {
        headers: { 'cal-api-version': BOOKING_CREATE_VERSION }
      })
    );
  }

  async cancelBooking(bookingUid: string, data?: Record<string, any>) {
    return await this.request<any>('cancel booking', () =>
      this.http.post(`/bookings/${bookingUid}/cancel`, data || {}, {
        headers: { 'cal-api-version': BOOKING_LIFECYCLE_VERSION }
      })
    );
  }

  async rescheduleBooking(bookingUid: string, data: Record<string, any>) {
    return await this.request<any>('reschedule booking', () =>
      this.http.post(`/bookings/${bookingUid}/reschedule`, data, {
        headers: { 'cal-api-version': BOOKING_LIFECYCLE_VERSION }
      })
    );
  }

  async requestRescheduleBooking(bookingUid: string, data: Record<string, any>) {
    return await this.request<any>('request booking reschedule', () =>
      this.http.post(`/bookings/${bookingUid}/request-reschedule`, data, {
        headers: { 'cal-api-version': BOOKING_LIFECYCLE_VERSION }
      })
    );
  }

  async confirmBooking(bookingUid: string) {
    return await this.request<any>('confirm booking', () =>
      this.http.post(
        `/bookings/${bookingUid}/confirm`,
        {},
        {
          headers: { 'cal-api-version': BOOKING_LIFECYCLE_VERSION }
        }
      )
    );
  }

  async declineBooking(bookingUid: string, data?: Record<string, any>) {
    return await this.request<any>('decline booking', () =>
      this.http.post(`/bookings/${bookingUid}/decline`, data || {}, {
        headers: { 'cal-api-version': BOOKING_LIFECYCLE_VERSION }
      })
    );
  }

  async markNoShow(bookingUid: string, data: Record<string, any>) {
    return await this.request<any>('mark booking absence', () =>
      this.http.post(`/bookings/${bookingUid}/mark-absent`, data, {
        headers: { 'cal-api-version': BOOKING_LIFECYCLE_VERSION }
      })
    );
  }

  async reassignBooking(bookingUid: string, userId?: number) {
    let url = userId
      ? `/bookings/${bookingUid}/reassign/${userId}`
      : `/bookings/${bookingUid}/reassign`;
    return await this.request<any>('reassign booking', () =>
      this.http.post(
        url,
        {},
        {
          headers: { 'cal-api-version': BOOKING_LIFECYCLE_VERSION }
        }
      )
    );
  }

  async addGuests(
    bookingUid: string,
    guests: { email: string; name?: string; timeZone?: string }[]
  ) {
    return await this.request<any>('add booking guests', () =>
      this.http.post(
        `/bookings/${bookingUid}/guests`,
        { guests },
        {
          headers: { 'cal-api-version': BOOKING_CREATE_VERSION }
        }
      )
    );
  }

  async updateBookingLocation(bookingUid: string, location: Record<string, any>) {
    return await this.request<any>('update booking location', () =>
      this.http.patch(
        `/bookings/${bookingUid}/location`,
        { location },
        {
          headers: { 'cal-api-version': BOOKING_CREATE_VERSION }
        }
      )
    );
  }

  // Event Types

  async listEventTypes(params?: Record<string, any>) {
    return await this.request<any[]>('list event types', () =>
      this.http.get('/event-types', {
        params,
        headers: { 'cal-api-version': EVENT_TYPE_VERSION }
      })
    );
  }

  async getEventType(eventTypeId: number) {
    return await this.request<any>('get event type', () =>
      this.http.get(`/event-types/${eventTypeId}`, {
        headers: { 'cal-api-version': EVENT_TYPE_VERSION }
      })
    );
  }

  async createEventType(data: Record<string, any>) {
    return await this.request<any>('create event type', () =>
      this.http.post('/event-types', data, {
        headers: { 'cal-api-version': EVENT_TYPE_VERSION }
      })
    );
  }

  async updateEventType(eventTypeId: number, data: Record<string, any>) {
    return await this.request<any>('update event type', () =>
      this.http.patch(`/event-types/${eventTypeId}`, data, {
        headers: { 'cal-api-version': EVENT_TYPE_VERSION }
      })
    );
  }

  async deleteEventType(eventTypeId: number) {
    return await this.request<any>('delete event type', () =>
      this.http.delete(`/event-types/${eventTypeId}`, {
        headers: { 'cal-api-version': EVENT_TYPE_VERSION }
      })
    );
  }

  // Schedules

  async listSchedules() {
    return await this.request<any[]>('list schedules', () =>
      this.http.get('/schedules', {
        headers: { 'cal-api-version': SCHEDULE_VERSION }
      })
    );
  }

  async getDefaultSchedule() {
    return await this.request<any>('get default schedule', () =>
      this.http.get('/schedules/default', {
        headers: { 'cal-api-version': SCHEDULE_VERSION }
      })
    );
  }

  async getSchedule(scheduleId: number) {
    return await this.request<any>('get schedule', () =>
      this.http.get(`/schedules/${scheduleId}`, {
        headers: { 'cal-api-version': SCHEDULE_VERSION }
      })
    );
  }

  async createSchedule(data: Record<string, any>) {
    return await this.request<any>('create schedule', () =>
      this.http.post('/schedules', data, {
        headers: { 'cal-api-version': SCHEDULE_VERSION }
      })
    );
  }

  async updateSchedule(scheduleId: number, data: Record<string, any>) {
    return await this.request<any>('update schedule', () =>
      this.http.patch(`/schedules/${scheduleId}`, data, {
        headers: { 'cal-api-version': SCHEDULE_VERSION }
      })
    );
  }

  async deleteSchedule(scheduleId: number) {
    return await this.request<any>('delete schedule', () =>
      this.http.delete(`/schedules/${scheduleId}`, {
        headers: { 'cal-api-version': SCHEDULE_VERSION }
      })
    );
  }

  // Slots

  async getAvailableSlots(params: Record<string, any>) {
    return await this.request<any>('get available slots', () =>
      this.http.get('/slots', {
        params,
        headers: { 'cal-api-version': SLOT_VERSION }
      })
    );
  }

  async reserveSlot(data: Record<string, any>) {
    return await this.request<any>('reserve slot', () =>
      this.http.post('/slots/reservations', data, {
        headers: { 'cal-api-version': SLOT_VERSION }
      })
    );
  }

  async getReservedSlot(reservationUid: string) {
    return await this.request<any>('get reserved slot', () =>
      this.http.get(`/slots/reservations/${reservationUid}`, {
        headers: { 'cal-api-version': SLOT_VERSION }
      })
    );
  }

  async updateReservedSlot(reservationUid: string, data: Record<string, any>) {
    return await this.request<any>('update reserved slot', () =>
      this.http.patch(`/slots/reservations/${reservationUid}`, data, {
        headers: { 'cal-api-version': SLOT_VERSION }
      })
    );
  }

  async deleteReservedSlot(reservationUid: string) {
    return await this.request<any>('delete reserved slot', () =>
      this.http.delete(`/slots/reservations/${reservationUid}`, {
        headers: { 'cal-api-version': SLOT_VERSION }
      })
    );
  }

  // Out of Office

  async listOutOfOffice(params?: Record<string, any>) {
    return await this.request<any[]>('list out-of-office entries', () =>
      this.http.get('/me/ooo', { params })
    );
  }

  async createOutOfOffice(data: Record<string, any>) {
    return await this.request<any>('create out-of-office entry', () =>
      this.http.post('/me/ooo', data)
    );
  }

  async updateOutOfOffice(oooId: number, data: Record<string, any>) {
    return await this.request<any>('update out-of-office entry', () =>
      this.http.patch(`/me/ooo/${oooId}`, data)
    );
  }

  async deleteOutOfOffice(oooId: number) {
    return await this.request<any>('delete out-of-office entry', () =>
      this.http.delete(`/me/ooo/${oooId}`)
    );
  }

  // Webhooks (User-level)

  async listWebhooks() {
    return await this.request<any[]>('list webhooks', () => this.http.get('/webhooks'));
  }

  async getWebhook(webhookId: number) {
    return await this.request<any>('get webhook', () =>
      this.http.get(`/webhooks/${webhookId}`)
    );
  }

  async createWebhook(data: Record<string, any>) {
    return await this.request<any>('create webhook', () => this.http.post('/webhooks', data));
  }

  async updateWebhook(webhookId: number, data: Record<string, any>) {
    return await this.request<any>('update webhook', () =>
      this.http.patch(`/webhooks/${webhookId}`, data)
    );
  }

  async deleteWebhook(webhookId: number) {
    return await this.request<any>('delete webhook', () =>
      this.http.delete(`/webhooks/${webhookId}`)
    );
  }

  // Calendars

  async listCalendars() {
    return await this.request<any>('list calendars', () => this.http.get('/calendars'));
  }

  async getBusyTimes(params: Record<string, any>) {
    return await this.request<any>('get busy times', () =>
      this.http.get('/calendars/busy-times', { params })
    );
  }
}
