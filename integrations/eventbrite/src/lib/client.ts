import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://www.eventbriteapi.com/v3'
});

export class Client {
  private headers: Record<string, string>;

  constructor(config: { token: string }) {
    this.headers = {
      Authorization: `Bearer ${config.token}`
    };
  }

  // ─── Users ──────────────────────────────────────────────

  async getMe() {
    let response = await api.get('/users/me/', { headers: this.headers });
    return response.data;
  }

  async getMyOrganizations(params?: { page?: number }) {
    let response = await api.get('/users/me/organizations/', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  // ─── Events ─────────────────────────────────────────────

  async getEvent(eventId: string) {
    let response = await api.get(`/events/${eventId}/`, { headers: this.headers });
    return response.data;
  }

  async listOrganizationEvents(
    organizationId: string,
    params?: {
      status?: string;
      order_by?: string;
      page?: number;
      page_size?: number;
      time_filter?: string;
    }
  ) {
    let response = await api.get(`/organizations/${organizationId}/events/`, {
      headers: this.headers,
      params
    });
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
    let response = await api.post(
      `/organizations/${organizationId}/events/`,
      { event },
      {
        headers: this.headers
      }
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
    let response = await api.post(
      `/events/${eventId}/`,
      { event },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async publishEvent(eventId: string) {
    let response = await api.post(
      `/events/${eventId}/publish/`,
      {},
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async unpublishEvent(eventId: string) {
    let response = await api.post(
      `/events/${eventId}/unpublish/`,
      {},
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ─── Ticket Classes ─────────────────────────────────────

  async listTicketClasses(eventId: string) {
    let response = await api.get(`/events/${eventId}/ticket_classes/`, {
      headers: this.headers
    });
    return response.data;
  }

  async getTicketClass(eventId: string, ticketClassId: string) {
    let response = await api.get(`/events/${eventId}/ticket_classes/${ticketClassId}/`, {
      headers: this.headers
    });
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
    }
  ) {
    let response = await api.post(
      `/events/${eventId}/ticket_classes/`,
      { ticket_class: ticketClass },
      {
        headers: this.headers
      }
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
    }
  ) {
    let response = await api.post(
      `/events/${eventId}/ticket_classes/${ticketClassId}/`,
      { ticket_class: ticketClass },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteTicketClass(eventId: string, ticketClassId: string) {
    let response = await api.delete(`/events/${eventId}/ticket_classes/${ticketClassId}/`, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── Orders ─────────────────────────────────────────────

  async listEventOrders(
    eventId: string,
    params?: {
      status?: string;
      changed_since?: string;
      page?: number;
    }
  ) {
    let response = await api.get(`/events/${eventId}/orders/`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async listOrganizationOrders(
    organizationId: string,
    params?: {
      status?: string;
      changed_since?: string;
      page?: number;
    }
  ) {
    let response = await api.get(`/organizations/${organizationId}/orders/`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getOrder(orderId: string) {
    let response = await api.get(`/orders/${orderId}/`, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── Attendees ──────────────────────────────────────────

  async listEventAttendees(
    eventId: string,
    params?: {
      status?: string;
      changed_since?: string;
      page?: number;
    }
  ) {
    let response = await api.get(`/events/${eventId}/attendees/`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getAttendee(eventId: string, attendeeId: string) {
    let response = await api.get(`/events/${eventId}/attendees/${attendeeId}/`, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── Venues ─────────────────────────────────────────────

  async getVenue(venueId: string) {
    let response = await api.get(`/venues/${venueId}/`, {
      headers: this.headers
    });
    return response.data;
  }

  async listOrganizationVenues(organizationId: string, params?: { page?: number }) {
    let response = await api.get(`/organizations/${organizationId}/venues/`, {
      headers: this.headers,
      params
    });
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
    let response = await api.post(
      `/organizations/${organizationId}/venues/`,
      { venue },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ─── Organizers ─────────────────────────────────────────

  async getOrganizer(organizerId: string) {
    let response = await api.get(`/organizers/${organizerId}/`, {
      headers: this.headers
    });
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
    let response = await api.post(
      `/organizations/${organizationId}/organizers/`,
      { organizer },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ─── Discounts ──────────────────────────────────────────

  async listOrganizationDiscounts(
    organizationId: string,
    params?: {
      scope?: string;
      page?: number;
      page_size?: number;
    }
  ) {
    let response = await api.get(`/organizations/${organizationId}/discounts/`, {
      headers: this.headers,
      params
    });
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
    let response = await api.post(
      `/organizations/${organizationId}/discounts/`,
      { discount },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async getDiscount(discountId: string) {
    let response = await api.get(`/discounts/${discountId}/`, {
      headers: this.headers
    });
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
    }
  ) {
    let response = await api.post(
      `/discounts/${discountId}/`,
      { discount },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteDiscount(discountId: string) {
    let response = await api.delete(`/discounts/${discountId}/`, {
      headers: this.headers
    });
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
    let response = await api.post(`/organizations/${organizationId}/webhooks/`, webhook, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    let response = await api.delete(`/webhooks/${webhookId}/`, {
      headers: this.headers
    });
    return response.data;
  }

  async listWebhooks(organizationId: string) {
    let response = await api.get(`/organizations/${organizationId}/webhooks/`, {
      headers: this.headers
    });
    return response.data;
  }
}
