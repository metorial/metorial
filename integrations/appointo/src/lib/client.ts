import { buildApiServiceError, createAuthenticatedAxios } from 'slates';

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.http = createAuthenticatedAxios({
      baseURL: 'https://app.appointo.me/api',
      authHeader: { name: 'APPOINTO-TOKEN', value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Appointo',
          reason: 'appointo_api',
          extractUpstreamCode: (_error, response, helpers) => {
            let data = response?.data;
            return helpers.isRecord(data) && typeof data.error_code === 'string'
              ? data.error_code
              : undefined;
          }
        })
    });
  }

  // ─── Products ─────────────────────────────────────────────────

  async listProducts(params?: { limit?: number; offset?: number; searchTerm?: string }) {
    let response = await this.http.get('/products', {
      params: {
        limit: params?.limit,
        offset: params?.offset,
        search_term: params?.searchTerm
      }
    });
    return response.data;
  }

  // ─── Bookings ─────────────────────────────────────────────────

  async listBookings(params?: {
    limit?: number;
    offset?: number;
    status?: string;
    bookingId?: number;
    searchTerm?: string;
  }) {
    let response = await this.http.get('/bookings', {
      params: {
        limit: params?.limit,
        offset: params?.offset,
        status: params?.status,
        booking_id: params?.bookingId,
        search_term: params?.searchTerm
      }
    });
    return response.data;
  }

  async listCancelledBookings(params?: {
    limit?: number;
    offset?: number;
    status?: string;
    searchTerm?: string;
  }) {
    let response = await this.http.get('/bookings/cancelled_bookings', {
      params: {
        limit: params?.limit,
        offset: params?.offset,
        status: params?.status,
        search_term: params?.searchTerm
      }
    });
    return response.data;
  }

  async createBooking(data: {
    appointmentId: number;
    timestring: string;
    name: string;
    email: string;
    phone?: string;
    quantity?: number;
  }) {
    let response = await this.http.post('/bookings', {
      appointment_id: data.appointmentId,
      timestring: data.timestring,
      name: data.name,
      email: data.email,
      phone: data.phone,
      quantity: data.quantity
    });
    return response.data;
  }

  async rescheduleBooking(data: {
    bookingId: number;
    timestring: string;
    customerIds?: number[];
    override?: boolean;
  }) {
    let response = await this.http.put('/bookings/reschedule', {
      booking_id: data.bookingId,
      timestring: data.timestring,
      customer_ids: data.customerIds,
      override: data.override
    });
    return response.data;
  }

  async cancelBooking(data: { bookingId: number; customerIds?: number[] }) {
    let response = await this.http.put('/bookings/cancel', {
      booking_id: data.bookingId,
      customer_ids: data.customerIds
    });
    return response.data;
  }

  async updateBooking(
    bookingId: number,
    data: {
      startBufferTime?: number;
      endBufferTime?: number;
    }
  ) {
    let response = await this.http.put(`/bookings/${bookingId}`, {
      booking_id: bookingId,
      start_buffer_time: data.startBufferTime,
      end_buffer_time: data.endBufferTime
    });
    return response.data;
  }

  // ─── Appointments ─────────────────────────────────────────────

  async listAppointments(params?: {
    appointmentId?: number;
    productId?: number;
    searchTerm?: string;
    limit?: number;
    offset?: number;
  }) {
    let response = await this.http.get('/appointments', {
      params: {
        appointment_id: params?.appointmentId,
        product_id: params?.productId,
        search_term: params?.searchTerm,
        limit: params?.limit,
        offset: params?.offset
      }
    });
    return response.data;
  }

  async getCalendarAvailability(
    appointmentId: number,
    params: {
      startDate: string;
      endDate?: string;
      impersonatedTms?: number[];
    }
  ) {
    let response = await this.http.get(
      `/appointments/${appointmentId}/calendar_availability`,
      {
        params: {
          start_date: params.startDate,
          end_date: params.endDate,
          impersonated_tms: params.impersonatedTms
        }
      }
    );
    return response.data;
  }

  async updateAppointmentConfig(
    appointmentId: number,
    data: {
      config?: Record<string, any>;
      availabilities?: any[];
      override?: any[];
    }
  ) {
    let response = await this.http.put(`/appointments/${appointmentId}`, {
      config: data.config,
      availabilities: data.availabilities,
      override: data.override
    });
    return response.data;
  }

  // ─── Subscription Contracts ───────────────────────────────────

  async listSubscriptionContracts(params?: { searchTerm?: string }) {
    let response = await this.http.get('/appointment_subscriptions', {
      params: {
        search_term: params?.searchTerm
      }
    });
    return response.data;
  }
}
