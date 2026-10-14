import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';

let BASE_URL = 'https://api.bookingmood.com/v1';

export interface ListParams {
  select?: string;
  order?: string;
  limit?: number;
  offset?: number;
  filters?: Record<string, string>;
}

export interface BookingmoodOrganization {
  id: string;
  name: Record<string, string>;
  company_name: string;
  country_code: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CapacityGroup {
  id: string;
  organization_id: string;
  name: Record<string, string>;
  name_singular: Record<string, string>;
  description: Record<string, string>;
  order: number;
  requires_explicit_input: boolean;
  type: 'manual' | 'sum';
}

export interface AvailabilitySearchResult {
  productId: string;
  match: boolean;
  occupancyMatches: boolean;
  optionsMatch: boolean;
  availability: string;
  price: { min: number; max: number } | null;
}

export class BookingmoodClient {
  private axios;

  constructor(token: string) {
    if (!token.trim()) {
      throw createApiServiceError(
        'A Bookingmood API key is required. Reconnect with a valid API key.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      authHeader: { value: `Bearer ${token}` },
      timeout: 30_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Bookingmood',
          reason: 'bookingmood_api_error'
        }),
      headers: {
        Prefer: 'return=representation'
      }
    });
  }

  private assertInterval(interval: { start: string; end: string }) {
    for (let date of [interval.start, interval.end]) {
      let parsed = new Date(date);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        Number.isNaN(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !== date
      ) {
        throw createApiServiceError('Booking dates must be valid dates in YYYY-MM-DD format.');
      }
    }
    if (interval.end < interval.start) {
      throw createApiServiceError('The end date must not be earlier than the start date.');
    }
  }

  private assertOccupancy(occupancy?: Record<string, number>) {
    if (Object.values(occupancy ?? {}).some(value => !Number.isInteger(value) || value < 0)) {
      throw createApiServiceError('Occupancy guest counts must be non-negative integers.');
    }
  }

  private assertUpdates(data: Record<string, unknown>) {
    if (!Object.values(data).some(value => value !== undefined)) {
      throw createApiServiceError('Provide at least one field to update.');
    }
  }

  private assertMutationResult(data: unknown, operation: string) {
    let result = Array.isArray(data) ? data[0] : data;
    if (!isApiErrorRecord(result) || typeof result.id !== 'string') {
      throw createApiServiceError(
        `Bookingmood ${operation} returned no record. Check the resource ID and your API key's access.`
      );
    }
  }

  private normalizeLocalizedFields(data: Record<string, unknown>, fields: string[]) {
    let normalized = { ...data };
    for (let field of fields) {
      if (typeof normalized[field] === 'string') {
        normalized[field] = { default: normalized[field] };
      }
    }
    return normalized;
  }

  private buildQueryParams(params?: ListParams): Record<string, string> {
    if (params?.limit !== undefined && (!Number.isInteger(params.limit) || params.limit < 0)) {
      throw createApiServiceError('limit must be a non-negative integer.');
    }
    if (
      params?.offset !== undefined &&
      (!Number.isInteger(params.offset) || params.offset < 0)
    ) {
      throw createApiServiceError('offset must be a non-negative integer.');
    }
    for (let key of Object.keys(params?.filters ?? {})) {
      if (['select', 'order', 'limit', 'offset'].includes(key)) {
        throw createApiServiceError(
          'filters must contain field filters, not select, order, limit, or offset controls. Use the dedicated list parameters for sorting and pagination.'
        );
      }
    }
    let query: Record<string, string> = {};
    if (params?.select) query.select = params.select;
    if (params?.order) query.order = params.order;
    if (params?.limit !== undefined) query.limit = String(Math.min(params.limit, 1000));
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
    this.assertUpdates(data);
    let response = await this.axios.patch('/bookings', data, {
      params: { id: `eq.${bookingId}` }
    });
    this.assertMutationResult(response.data, 'update booking');
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
    showPendingAs?: 'CANCELLED' | 'TENTATIVE' | 'CONFIRMED';
  }) {
    this.assertInterval(data.interval);
    this.assertOccupancy(data.occupancy);
    let response = await this.axios.post(
      '/book',
      pickDefined({
        product_id: data.productId,
        interval: data.interval,
        occupancy: data.occupancy,
        coupon_codes: data.couponCodes,
        currency: data.currency,
        form_values: data.formValues,
        language: data.language,
        redirect_url: data.redirectUrl,
        show_pending_as: data.showPendingAs
      })
    );
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
    this.assertUpdates(data);
    let response = await this.axios.patch('/calendar_events', data, {
      params: { id: `eq.${eventId}` }
    });
    this.assertMutationResult(response.data, 'update calendar event');
    return response.data?.[0] || response.data;
  }

  async deleteCalendarEvent(eventId: string) {
    let response = await this.axios.delete('/calendar_events', {
      params: { id: `eq.${eventId}` }
    });
    this.assertMutationResult(response.data, 'delete calendar event');
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
    this.assertMutationResult(response.data, 'create contact');
    return response.data?.[0] || response.data;
  }

  async updateContact(contactId: string, data: Record<string, any>) {
    this.assertUpdates(data);
    let response = await this.axios.patch('/contacts', data, {
      params: { id: `eq.${contactId}` }
    });
    this.assertMutationResult(response.data, 'update contact');
    return response.data?.[0] || response.data;
  }

  async deleteContact(contactId: string) {
    let response = await this.axios.delete('/contacts', {
      params: { id: `eq.${contactId}` }
    });
    this.assertMutationResult(response.data, 'delete contact');
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
    let response = await this.axios.post(
      '/products',
      this.normalizeLocalizedFields(data, ['name', 'description'])
    );
    this.assertMutationResult(response.data, 'create product');
    return response.data?.[0] || response.data;
  }

  async updateProduct(productId: string, data: Record<string, any>) {
    this.assertUpdates(data);
    let response = await this.axios.patch(
      '/products',
      this.normalizeLocalizedFields(data, ['name', 'description']),
      {
        params: { id: `eq.${productId}` }
      }
    );
    this.assertMutationResult(response.data, 'update product');
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
    this.assertMutationResult(response.data, 'create invoice');
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
    this.assertMutationResult(response.data, 'create payment');
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
    this.assertMutationResult(response.data, 'create refund');
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
    this.assertMutationResult(response.data, 'create coupon');
    return response.data?.[0] || response.data;
  }

  async updateCoupon(couponId: string, data: Record<string, any>) {
    this.assertUpdates(data);
    let response = await this.axios.patch('/coupons', data, {
      params: { id: `eq.${couponId}` }
    });
    this.assertMutationResult(response.data, 'update coupon');
    return response.data?.[0] || response.data;
  }

  async deleteCoupon(couponId: string) {
    let response = await this.axios.delete('/coupons', {
      params: { id: `eq.${couponId}` }
    });
    this.assertMutationResult(response.data, 'delete coupon');
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
    this.assertMutationResult(response.data, 'create task');
    return response.data?.[0] || response.data;
  }

  async updateTask(taskId: string, data: Record<string, any>) {
    this.assertUpdates(data);
    let response = await this.axios.patch('/tasks', data, {
      params: { id: `eq.${taskId}` }
    });
    this.assertMutationResult(response.data, 'update task');
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
    let response = await this.axios.post(
      '/reviews',
      this.normalizeLocalizedFields(data, ['content'])
    );
    this.assertMutationResult(response.data, 'create review');
    return response.data?.[0] || response.data;
  }

  async updateReview(reviewId: string, data: Record<string, any>) {
    let response = await this.axios.patch(
      '/reviews',
      this.normalizeLocalizedFields(data, ['content']),
      {
        params: { id: `eq.${reviewId}` }
      }
    );
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

  async searchAvailability(data: {
    interval?: { start: string; end: string };
    occupancy?: Record<string, number>;
    optionIds?: string[];
    productIds?: string[];
    showBookedAs?: 'booked' | 'unavailable';
    showClosedAs?: 'closed' | 'unavailable';
    showPendingAs?: 'CANCELLED' | 'TENTATIVE' | 'CONFIRMED';
  }) {
    if (data.interval) this.assertInterval(data.interval);
    this.assertOccupancy(data.occupancy);
    let response = await this.axios.post<AvailabilitySearchResult[]>(
      '/search',
      pickDefined({
        interval: data.interval,
        occupancy: data.occupancy,
        option_ids: data.optionIds,
        product_ids: data.productIds,
        show_booked_as: data.showBookedAs,
        show_closed_as: data.showClosedAs,
        show_pending_as: data.showPendingAs
      })
    );
    return response.data;
  }

  async listCapacityGroups(params?: ListParams) {
    let response = await this.axios.get<CapacityGroup[]>('/capacity_groups', {
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
    let response = await this.axios.get<BookingmoodOrganization[]>('/organizations', {
      params: this.buildQueryParams(params)
    });
    return response.data;
  }
}
