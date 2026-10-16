import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

export let eventbriteApiError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Eventbrite',
    reason: 'eventbrite_api_error',
    detailKeys: ['error_description', 'error', 'message', 'detail'],
    nestedKeys: ['errors', 'arguments'],
    extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
    extractUpstreamCode: (_error, response) =>
      isApiErrorRecord(response?.data) && typeof response.data.error === 'string'
        ? response.data.error
        : undefined
  });

let assertOperation = (result: unknown, field: string) => {
  if (
    result === true ||
    (isApiErrorRecord(result) && (result[field] === true || result.success === true))
  )
    return result;
  throw createApiServiceError(
    `Eventbrite did not confirm ${field}. Retrieve the resource to check its current state before trying again.`
  );
};

let jsonCurrency = (cost?: string) => {
  if (cost === undefined) return undefined;
  let match = /^([A-Z]{3}),(\d+)$/.exec(cost);
  if (!match || !Number.isSafeInteger(Number(match[2]))) {
    throw createApiServiceError(
      'Cost must use a currency code and an integer minor-unit amount, for example USD,1000.'
    );
  }
  return { currency: match[1], value: Number(match[2]) };
};

export class Client {
  private api: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    let token = config.token.trim();
    if (!token) throw createApiServiceError('An Eventbrite access token is required.');
    this.api = createAuthenticatedAxios({
      baseURL: 'https://www.eventbriteapi.com/v3',
      authHeader: { value: `Bearer ${token}` },
      timeout: 30_000,
      errorAdapter: eventbriteApiError
    });
    this.api.interceptors.response.use(response => {
      if (
        isApiErrorRecord(response.data) &&
        (response.data.error || response.data.success === false)
      ) {
        throw eventbriteApiError({
          response: {
            status: response.data.status_code ?? 400,
            data: {
              error_description: 'Eventbrite did not complete the requested operation.',
              ...response.data
            }
          }
        });
      }
      return response;
    });
  }

  // ─── Users ──────────────────────────────────────────────

  async getMe() {
    let response = await this.api.get('/users/me/', {});
    return response.data;
  }

  async getMyOrganizations(params?: { page?: number; continuation?: string }) {
    let response = await this.api.get('/users/me/organizations/', {
      params: params?.continuation ? { ...params, page: undefined } : params
    });
    return response.data;
  }

  // ─── Events ─────────────────────────────────────────────

  async getEvent(eventId: string) {
    let response = await this.api.get(`/events/${encodeURIComponent(eventId)}/`);
    return response.data;
  }

  async listOrganizationEvents(
    organizationId: string,
    params?: {
      status?: string;
      order_by?: string;
      name_filter?: string;
      venue_filter?: string;
      organizer_filter?: string;
      page?: number;
      continuation?: string;
      page_size?: number;
      time_filter?: string;
    }
  ) {
    let response = await this.api.get(
      `/organizations/${encodeURIComponent(organizationId)}/events/`,
      {
        params: params?.continuation ? { ...params, page: undefined } : params
      }
    );
    return response.data;
  }

  async createEvent(
    organizationId: string,
    event: {
      name: { html: string };
      description?: { html: string };
      start: { timezone: string; utc: string };
      end: { timezone: string; utc: string };
      currency: string;
      online_event?: boolean;
      listed?: boolean;
      shareable?: boolean;
      capacity?: number;
      venue_id?: string;
      organizer_id?: string;
      category_id?: string;
      format_id?: string;
    }
  ) {
    let response = await this.api.post(
      `/organizations/${encodeURIComponent(organizationId)}/events/`,
      { event }
    );
    return response.data;
  }

  async updateEvent(
    eventId: string,
    event: {
      name?: { html: string };
      description?: { html: string };
      start?: { timezone: string; utc: string };
      end?: { timezone: string; utc: string };
      currency?: string;
      online_event?: boolean;
      listed?: boolean;
      shareable?: boolean;
      capacity?: number;
      venue_id?: string;
      organizer_id?: string;
      category_id?: string;
      format_id?: string;
    }
  ) {
    let response = await this.api.post(`/events/${encodeURIComponent(eventId)}/`, { event });
    return response.data;
  }

  async publishEvent(eventId: string) {
    let response = await this.api.post(`/events/${encodeURIComponent(eventId)}/publish/`, {});
    return assertOperation(response.data, 'published');
  }

  async unpublishEvent(eventId: string) {
    let response = await this.api.post(
      `/events/${encodeURIComponent(eventId)}/unpublish/`,
      {}
    );
    return assertOperation(response.data, 'unpublished');
  }

  // ─── Ticket Classes ─────────────────────────────────────

  async listTicketClasses(eventId: string, params?: { page?: number; continuation?: string }) {
    let response = await this.api.get(
      `/events/${encodeURIComponent(eventId)}/ticket_classes/`,
      {
        params: params?.continuation ? { ...params, page: undefined } : params
      }
    );
    return response.data;
  }

  async getTicketClass(eventId: string, ticketClassId: string) {
    let response = await this.api.get(
      `/events/${encodeURIComponent(eventId)}/ticket_classes/${encodeURIComponent(ticketClassId)}/`
    );
    return response.data;
  }

  async createTicketClass(
    eventId: string,
    ticketClass: {
      name: string;
      quantity_total?: number;
      cost?: string;
      donation?: boolean;
      free?: boolean;
      minimum_quantity?: number;
      maximum_quantity?: number;
      description?: string;
      sales_start?: string;
      sales_end?: string;
      hidden?: boolean;
      inventory_tier_id?: string;
    }
  ) {
    let response = await this.api.post(
      `/events/${encodeURIComponent(eventId)}/ticket_classes/`,
      { ticket_class: { ...ticketClass, cost: jsonCurrency(ticketClass.cost) } }
    );
    return response.data;
  }

  async updateTicketClass(
    eventId: string,
    ticketClassId: string,
    ticketClass: {
      name?: string;
      quantity_total?: number;
      cost?: string;
      donation?: boolean;
      free?: boolean;
      minimum_quantity?: number;
      maximum_quantity?: number;
      description?: string;
      sales_start?: string;
      sales_end?: string;
      hidden?: boolean;
      inventory_tier_id?: string;
    }
  ) {
    let response = await this.api.post(
      `/events/${encodeURIComponent(eventId)}/ticket_classes/${encodeURIComponent(ticketClassId)}/`,
      { ticket_class: { ...ticketClass, cost: jsonCurrency(ticketClass.cost) } }
    );
    return response.data;
  }

  async deleteTicketClass(eventId: string, ticketClassId: string) {
    let response = await this.api.delete(
      `/events/${encodeURIComponent(eventId)}/ticket_classes/${encodeURIComponent(ticketClassId)}/`
    );
    return assertOperation(response.data, 'deleted');
  }

  // ─── Orders ─────────────────────────────────────────────

  async listEventOrders(
    eventId: string,
    params?: {
      status?: string;
      changed_since?: string;
      page?: number;
      continuation?: string;
    }
  ) {
    let response = await this.api.get(`/events/${encodeURIComponent(eventId)}/orders/`, {
      params: params?.continuation ? { ...params, page: undefined } : params
    });
    return response.data;
  }

  async listOrganizationOrders(
    organizationId: string,
    params?: {
      status?: string;
      changed_since?: string;
      page?: number;
      continuation?: string;
    }
  ) {
    let response = await this.api.get(
      `/organizations/${encodeURIComponent(organizationId)}/orders/`,
      {
        params: params?.continuation ? { ...params, page: undefined } : params
      }
    );
    return response.data;
  }

  async getOrder(orderId: string) {
    let response = await this.api.get(`/orders/${encodeURIComponent(orderId)}/`);
    return response.data;
  }

  // ─── Attendees ──────────────────────────────────────────

  async listEventAttendees(
    eventId: string,
    params?: {
      last_item_seen?: string;
      attendee_ids?: string;
      status?: string;
      changed_since?: string;
      page?: number;
      continuation?: string;
    }
  ) {
    let response = await this.api.get(`/events/${encodeURIComponent(eventId)}/attendees/`, {
      params: params?.continuation ? { ...params, page: undefined } : params
    });
    return response.data;
  }

  async getAttendee(eventId: string, attendeeId: string) {
    let response = await this.api.get(
      `/events/${encodeURIComponent(eventId)}/attendees/${encodeURIComponent(attendeeId)}/`
    );
    return response.data;
  }

  // ─── Venues ─────────────────────────────────────────────

  async getVenue(venueId: string) {
    let response = await this.api.get(`/venues/${encodeURIComponent(venueId)}/`);
    return response.data;
  }

  async listOrganizationVenues(
    organizationId: string,
    params?: { page?: number; continuation?: string }
  ) {
    let response = await this.api.get(
      `/organizations/${encodeURIComponent(organizationId)}/venues/`,
      {
        params: params?.continuation ? { ...params, page: undefined } : params
      }
    );
    return response.data;
  }

  async createVenue(
    organizationId: string,
    venue: {
      name: string;
      address?: {
        address_1?: string;
        address_2?: string;
        city?: string;
        region?: string;
        postal_code?: string;
        country?: string;
      };
      capacity?: number;
    }
  ) {
    let response = await this.api.post(
      `/organizations/${encodeURIComponent(organizationId)}/venues/`,
      { venue }
    );
    return response.data;
  }

  // ─── Organizers ─────────────────────────────────────────

  async getOrganizer(organizerId: string) {
    let response = await this.api.get(`/organizers/${encodeURIComponent(organizerId)}/`);
    return response.data;
  }

  async createOrganizer(
    organizationId: string,
    organizer: {
      name: string;
      description?: { html: string };
      logo?: { id: string };
      website?: string;
    }
  ) {
    let response = await this.api.post(
      `/organizations/${encodeURIComponent(organizationId)}/organizers/`,
      { organizer }
    );
    return response.data;
  }

  // ─── Discounts ──────────────────────────────────────────

  async listOrganizationDiscounts(
    organizationId: string,
    params?: {
      scope?: string;
      event_id?: string;
      code?: string;
      code_filter?: string;
      type?: string;
      page?: number;
      continuation?: string;
      page_size?: number;
    }
  ) {
    let response = await this.api.get(
      `/organizations/${encodeURIComponent(organizationId)}/discounts/`,
      {
        params: params?.continuation ? { ...params, page: undefined } : params
      }
    );
    return response.data;
  }

  async createDiscount(
    organizationId: string,
    discount: {
      code: string;
      type: string;
      amount_off?: string;
      percent_off?: string;
      event_id?: string;
      ticket_class_ids?: string[];
      quantity_available?: number;
      start_date?: string;
      end_date?: string;
    }
  ) {
    let response = await this.api.post(
      `/organizations/${encodeURIComponent(organizationId)}/discounts/`,
      { discount }
    );
    return response.data;
  }

  async getDiscount(discountId: string) {
    let response = await this.api.get(`/discounts/${encodeURIComponent(discountId)}/`);
    return response.data;
  }

  async updateDiscount(
    discountId: string,
    discount: {
      code?: string;
      type?: string;
      amount_off?: string;
      percent_off?: string;
      quantity_available?: number;
      start_date?: string;
      end_date?: string;
      event_id?: string;
      ticket_class_ids?: string[];
    }
  ) {
    let response = await this.api.post(`/discounts/${encodeURIComponent(discountId)}/`, {
      discount
    });
    return response.data;
  }

  async deleteDiscount(discountId: string) {
    let response = await this.api.delete(`/discounts/${encodeURIComponent(discountId)}/`);
    return assertOperation(response.data, 'deleted');
  }

  async getEventDescription(eventId: string) {
    let response = await this.api.get(`/events/${encodeURIComponent(eventId)}/description/`);
    return response.data;
  }

  async cancelEvent(eventId: string) {
    let response = await this.api.post(`/events/${encodeURIComponent(eventId)}/cancel/`, {});
    return assertOperation(response.data, 'canceled');
  }

  async deleteEvent(eventId: string) {
    let response = await this.api.delete(`/events/${encodeURIComponent(eventId)}/`);
    return assertOperation(response.data, 'deleted');
  }

  async updateVenue(
    venueId: string,
    venue: {
      name?: string;
      address?: {
        address_1?: string;
        address_2?: string;
        city?: string;
        region?: string;
        postal_code?: string;
        country?: string;
      };
      capacity?: number;
    }
  ) {
    let response = await this.api.post(`/venues/${encodeURIComponent(venueId)}/`, { venue });
    return response.data;
  }

  // ─── Webhooks ───────────────────────────────────────────

  async createWebhook(
    organizationId: string,
    webhook: {
      endpoint_url: string;
      actions: string;
      event_id?: string;
    }
  ) {
    let response = await this.api.post(
      `/organizations/${encodeURIComponent(organizationId)}/webhooks/`,
      webhook
    );
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    let response = await this.api.delete(`/webhooks/${encodeURIComponent(webhookId)}/`);
    return assertOperation(response.data, 'deleted');
  }

  async listWebhooks(organizationId: string) {
    let response = await this.api.get(
      `/organizations/${encodeURIComponent(organizationId)}/webhooks/`
    );
    return response.data;
  }
}
