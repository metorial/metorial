import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://app.appointo.me/api'
});

export class Client {
  private headers: Record<string, string>;

  constructor(private config: { token: string }) {
    this.headers = {
      'APPOINTO-TOKEN': config.token,
      'Content-Type': 'application/json'
    };
  }

  // ─── Products ─────────────────────────────────────────────────

  async listProducts(params?: { limit?: number; offset?: number; searchTerm?: string }) {
    let response = await http.get('/products', {
      headers: this.headers,
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
    let response = await http.get('/bookings', {
      headers: this.headers,
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

  async createBooking(data: {
    appointmentId: number;
    timestring: string;
    name: string;
    email: string;
    phone?: string;
    quantity?: number;
  }) {
    let response = await http.post(
      '/bookings',
      {
        appointment_id: data.appointmentId,
        timestring: data.timestring,
        name: data.name,
        email: data.email,
        phone: data.phone,
        quantity: data.quantity
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async rescheduleBooking(data: {
    bookingId: number;
    timestring: string;
    customerIds?: number[];
    override?: boolean;
  }) {
    let response = await http.put(
      '/bookings/reschedule',
      {
        booking_id: data.bookingId,
        timestring: data.timestring,
        customer_ids: data.customerIds,
        override: data.override
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async cancelBooking(data: { bookingId: number; customerIds?: number[] }) {
    let response = await http.put(
      '/bookings/cancel',
      {
        booking_id: data.bookingId,
        customer_ids: data.customerIds
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async updateBooking(
    bookingId: number,
    data: {
      startBufferTime?: number;
      endBufferTime?: number;
    }
  ) {
    let response = await http.put(
      `/bookings/${bookingId}`,
      {
        booking_id: bookingId,
        start_buffer_time: data.startBufferTime,
        end_buffer_time: data.endBufferTime
      },
      { headers: this.headers }
    );
    return response.data;
  }

  // ─── Appointments ─────────────────────────────────────────────

  async listAppointments(params?: {
    appointmentId?: number;
    productId?: number;
    limit?: number;
    offset?: number;
  }) {
    let response = await http.get('/appointments', {
      headers: this.headers,
      params: {
        appointment_id: params?.appointmentId,
        product_id: params?.productId,
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
    let response = await http.get(`/appointments/${appointmentId}/calendar_availability`, {
      headers: this.headers,
      params: {
        start_date: params.startDate,
        end_date: params.endDate,
        impersonated_tms: params.impersonatedTms
      }
    });
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
    let response = await http.put(
      `/appointments/${appointmentId}`,
      {
        config: data.config,
        availabilities: data.availabilities,
        override: data.override
      },
      { headers: this.headers }
    );
    return response.data;
  }

  // ─── Subscription Contracts ───────────────────────────────────

  async listSubscriptionContracts(params?: { searchTerm?: string }) {
    let response = await http.get('/appointment_subscriptions', {
      headers: this.headers,
      params: {
        search_term: params?.searchTerm
      }
    });
    return response.data;
  }
}
