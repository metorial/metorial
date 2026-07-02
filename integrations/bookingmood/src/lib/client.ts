import { createAxios } from 'slates';

let BASE_URL = 'https://api.bookingmood.com/v1';

export interface ListParams {
  select?: string;
  order?: string;
  limit?: number;
  offset?: number;
  filters?: Record<string, string>;
}

export class BookingmoodClient {
  private axios;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      }
    });
  }

  private buildQueryParams(params?: ListParams): Record<string, string> {
    let query: Record<string, string> = {};
    if (params?.select) query.select = params.select;
    if (params?.order) query.order = params.order;
    if (params?.limit !== undefined) query.limit = String(params.limit);
    if (params?.offset !== undefined) query.offset = String(params.offset);
    if (params?.filters) {
      for (let [key, value] of Object.entries(params.filters)) {
        query[key] = value;
      }
    }
    return query;
  }

  // ─── Bookings ──────────────────────────────────────────────

  async listBookings(params?: ListParams) {
    let response = await this.axios.get('/bookings', {
      params: this.buildQueryParams(params)
    });
    return response.data;
  }

  async getBooking(bookingId: string, select?: string) {
    let response = await this.axios.get('/bookings', {
      params: { id: `eq.${bookingId}`, select: select || '*', limit: '1' },
      headers: { Accept: 'application/vnd.pgrst.object+json' }
    });
    return response.data;
  }

  async updateBooking(bookingId: string, data: Record<string, any>) {
    let response = await this.axios.patch('/bookings', data, {
      params: { id: `eq.${bookingId}` }
    });
    return response.data?.[0] || response.data;
  }

  async deleteBooking(bookingId: string) {
    await this.axios.delete('/bookings', {
      params: { id: `eq.${bookingId}` }
    });
  }

  // ─── Book (create booking transaction) ─────────────────────

  async createBooking(data: {
    productId: string;
    interval: { start: string; end: string };
    occupancy: Record<string, number>;
    couponCodes?: string[];
    currency?: string;
    formValues?: Record<string, any>;
    language?: string;
    redirectUrl?: string;
  }) {
    let response = await this.axios.post('/book', {
      product_id: data.productId,
      interval: data.interval,
      occupancy: data.occupancy,
      coupon_codes: data.couponCodes,
      currency: data.currency,
      form_values: data.formValues,
      language: data.language,
      redirect_url: data.redirectUrl
    });
    return response.data;
  }

  // ─── Calendar Events ──────────────────────────────────────

  async listCalendarEvents(params?: ListParams) {
    let response = await this.axios.get('/calendar_events', {
      params: this.buildQueryParams(params)
    });
    return response.data;
  }

  async getCalendarEvent(eventId: string, select?: string) {
    let response = await this.axios.get('/calendar_events', {
      params: { id: `eq.${eventId}`, select: select || '*', limit: '1' },
      headers: { Accept: 'application/vnd.pgrst.object+json' }
    });
    return response.data;
  }

  async updateCalendarEvent(eventId: string, data: Record<string, any>) {
    let response = await this.axios.patch('/calendar_events', data, {
      params: { id: `eq.${eventId}` }
    });
    return response.data?.[0] || response.data;
  }

  async deleteCalendarEvent(eventId: string) {
    await this.axios.delete('/calendar_events', {
      params: { id: `eq.${eventId}` }
    });
  }

  // ─── Contacts ─────────────────────────────────────────────

  async listContacts(params?: ListParams) {
    let response = await this.axios.get('/contacts', {
      params: this.buildQueryParams(params)
    });
    return response.data;
  }

  async getContact(contactId: string, select?: string) {
    let response = await this.axios.get('/contacts', {
      params: { id: `eq.${contactId}`, select: select || '*', limit: '1' },
      headers: { Accept: 'application/vnd.pgrst.object+json' }
    });
    return response.data;
  }

  async createContact(data: Record<string, any>) {
    let response = await this.axios.post('/contacts', data);
    return response.data?.[0] || response.data;
  }

  async updateContact(contactId: string, data: Record<string, any>) {
    let response = await this.axios.patch('/contacts', data, {
      params: { id: `eq.${contactId}` }
    });
    return response.data?.[0] || response.data;
  }

  async deleteContact(contactId: string) {
    await this.axios.delete('/contacts', {
      params: { id: `eq.${contactId}` }
    });
  }

  // ─── Products ─────────────────────────────────────────────

  async listProducts(params?: ListParams) {
    let response = await this.axios.get('/products', {
      params: this.buildQueryParams(params)
    });
    return response.data;
  }

  async getProduct(productId: string, select?: string) {
    let response = await this.axios.get('/products', {
      params: { id: `eq.${productId}`, select: select || '*', limit: '1' },
      headers: { Accept: 'application/vnd.pgrst.object+json' }
    });
    return response.data;
  }

  async createProduct(data: Record<string, any>) {
    let response = await this.axios.post('/products', data);
    return response.data?.[0] || response.data;
  }

  async updateProduct(productId: string, data: Record<string, any>) {
    let response = await this.axios.patch('/products', data, {
      params: { id: `eq.${productId}` }
    });
    return response.data?.[0] || response.data;
  }

  async deleteProduct(productId: string) {
    await this.axios.delete('/products', {
      params: { id: `eq.${productId}` }
    });
  }

  // ─── Invoices ─────────────────────────────────────────────

  async listInvoices(params?: ListParams) {
    let response = await this.axios.get('/invoices', {
      params: this.buildQueryParams(params)
    });
    return response.data;
  }

  async getInvoice(invoiceId: string, select?: string) {
    let response = await this.axios.get('/invoices', {
      params: { id: `eq.${invoiceId}`, select: select || '*', limit: '1' },
      headers: { Accept: 'application/vnd.pgrst.object+json' }
    });
    return response.data;
  }

  async createInvoice(data: Record<string, any>) {
    let response = await this.axios.post('/invoices', data);
    return response.data?.[0] || response.data;
  }

  async updateInvoice(invoiceId: string, data: Record<string, any>) {
    let response = await this.axios.patch('/invoices', data, {
      params: { id: `eq.${invoiceId}` }
    });
    return response.data?.[0] || response.data;
  }

  async deleteInvoice(invoiceId: string) {
    await this.axios.delete('/invoices', {
      params: { id: `eq.${invoiceId}` }
    });
  }

  // ─── Payments ─────────────────────────────────────────────

  async listPayments(params?: ListParams) {
    let response = await this.axios.get('/payments', {
      params: this.buildQueryParams(params)
    });
    return response.data;
  }

  async getPayment(paymentId: string, select?: string) {
    let response = await this.axios.get('/payments', {
      params: { id: `eq.${paymentId}`, select: select || '*', limit: '1' },
      headers: { Accept: 'application/vnd.pgrst.object+json' }
    });
    return response.data;
  }

  async createPayment(data: Record<string, any>) {
    let response = await this.axios.post('/payments', data);
    return response.data?.[0] || response.data;
  }

  async updatePayment(paymentId: string, data: Record<string, any>) {
    let response = await this.axios.patch('/payments', data, {
      params: { id: `eq.${paymentId}` }
    });
    return response.data?.[0] || response.data;
  }

  async deletePayment(paymentId: string) {
    await this.axios.delete('/payments', {
      params: { id: `eq.${paymentId}` }
    });
  }

  // ─── Refunds ──────────────────────────────────────────────

  async listRefunds(params?: ListParams) {
    let response = await this.axios.get('/refunds', { params: this.buildQueryParams(params) });
    return response.data;
  }

  async createRefund(data: Record<string, any>) {
    let response = await this.axios.post('/refunds', data);
    return response.data?.[0] || response.data;
  }

  // ─── Coupons ──────────────────────────────────────────────

  async listCoupons(params?: ListParams) {
    let response = await this.axios.get('/coupons', { params: this.buildQueryParams(params) });
    return response.data;
  }

  async getCoupon(couponId: string, select?: string) {
    let response = await this.axios.get('/coupons', {
      params: { id: `eq.${couponId}`, select: select || '*', limit: '1' },
      headers: { Accept: 'application/vnd.pgrst.object+json' }
    });
    return response.data;
  }

  async createCoupon(data: Record<string, any>) {
    let response = await this.axios.post('/coupons', data);
    return response.data?.[0] || response.data;
  }

  async updateCoupon(couponId: string, data: Record<string, any>) {
    let response = await this.axios.patch('/coupons', data, {
      params: { id: `eq.${couponId}` }
    });
    return response.data?.[0] || response.data;
  }

  async deleteCoupon(couponId: string) {
    await this.axios.delete('/coupons', {
      params: { id: `eq.${couponId}` }
    });
  }

  // ─── Tasks ────────────────────────────────────────────────

  async listTasks(params?: ListParams) {
    let response = await this.axios.get('/tasks', { params: this.buildQueryParams(params) });
    return response.data;
  }

  async getTask(taskId: string, select?: string) {
    let response = await this.axios.get('/tasks', {
      params: { id: `eq.${taskId}`, select: select || '*', limit: '1' },
      headers: { Accept: 'application/vnd.pgrst.object+json' }
    });
    return response.data;
  }

  async createTask(data: Record<string, any>) {
    let response = await this.axios.post('/tasks', data);
    return response.data?.[0] || response.data;
  }

  async updateTask(taskId: string, data: Record<string, any>) {
    let response = await this.axios.patch('/tasks', data, {
      params: { id: `eq.${taskId}` }
    });
    return response.data?.[0] || response.data;
  }

  async deleteTask(taskId: string) {
    await this.axios.delete('/tasks', {
      params: { id: `eq.${taskId}` }
    });
  }

  // ─── Reviews ──────────────────────────────────────────────

  async listReviews(params?: ListParams) {
    let response = await this.axios.get('/reviews', { params: this.buildQueryParams(params) });
    return response.data;
  }

  async getReview(reviewId: string, select?: string) {
    let response = await this.axios.get('/reviews', {
      params: { id: `eq.${reviewId}`, select: select || '*', limit: '1' },
      headers: { Accept: 'application/vnd.pgrst.object+json' }
    });
    return response.data;
  }

  async createReview(data: Record<string, any>) {
    let response = await this.axios.post('/reviews', data);
    return response.data?.[0] || response.data;
  }

  async updateReview(reviewId: string, data: Record<string, any>) {
    let response = await this.axios.patch('/reviews', data, {
      params: { id: `eq.${reviewId}` }
    });
    return response.data?.[0] || response.data;
  }

  async deleteReview(reviewId: string) {
    await this.axios.delete('/reviews', {
      params: { id: `eq.${reviewId}` }
    });
  }

  // ─── Messages ─────────────────────────────────────────────

  async listMessages(params?: ListParams) {
    let response = await this.axios.get('/messages', {
      params: this.buildQueryParams(params)
    });
    return response.data;
  }

  async getMessage(messageId: string, select?: string) {
    let response = await this.axios.get('/messages', {
      params: { id: `eq.${messageId}`, select: select || '*', limit: '1' },
      headers: { Accept: 'application/vnd.pgrst.object+json' }
    });
    return response.data;
  }

  // ─── Services ─────────────────────────────────────────────

  async listServices(params?: ListParams) {
    let response = await this.axios.get('/services', {
      params: this.buildQueryParams(params)
    });
    return response.data;
  }

  // ─── Line Items ───────────────────────────────────────────

  async listLineItems(params?: ListParams) {
    let response = await this.axios.get('/line_items', {
      params: this.buildQueryParams(params)
    });
    return response.data;
  }

  // ─── Webhooks ─────────────────────────────────────────────

  async listWebhooks(params?: ListParams) {
    let response = await this.axios.get('/webhooks', {
      params: this.buildQueryParams(params)
    });
    return response.data;
  }

  async createWebhook(data: { endpoint: string; events: string[]; description?: string }) {
    let response = await this.axios.post('/webhooks', data);
    return response.data?.[0] || response.data;
  }

  async deleteWebhook(webhookId: string) {
    await this.axios.delete('/webhooks', {
      params: { id: `eq.${webhookId}` }
    });
  }

  // ─── Calendar Event Notes ─────────────────────────────────

  async listCalendarEventNotes(params?: ListParams) {
    let response = await this.axios.get('/calendar_event_notes', {
      params: this.buildQueryParams(params)
    });
    return response.data;
  }

  async createCalendarEventNote(data: Record<string, any>) {
    let response = await this.axios.post('/calendar_event_notes', data);
    return response.data?.[0] || response.data;
  }

  // ─── Booking Details ──────────────────────────────────────

  async listBookingDetails(params?: ListParams) {
    let response = await this.axios.get('/booking_details', {
      params: this.buildQueryParams(params)
    });
    return response.data;
  }

  // ─── Members ──────────────────────────────────────────────

  async listMembers(params?: ListParams) {
    let response = await this.axios.get('/members', { params: this.buildQueryParams(params) });
    return response.data;
  }

  // ─── Organizations ────────────────────────────────────────

  async listOrganizations(params?: ListParams) {
    let response = await this.axios.get('/organizations', {
      params: this.buildQueryParams(params)
    });
    return response.data;
  }
}
