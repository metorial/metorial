import { createAxios } from 'slates';

export class Client {
  private axiosV1;
  private axiosV2;
  private axiosWebhooks;

  constructor(config: { token: string }) {
    this.axiosV1 = createAxios({
      baseURL: 'https://api.lodgify.com/v1',
      headers: {
        'X-ApiKey': config.token,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });

    this.axiosV2 = createAxios({
      baseURL: 'https://api.lodgify.com/v2',
      headers: {
        'X-ApiKey': config.token,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });

    this.axiosWebhooks = createAxios({
      baseURL: 'https://api.lodgify.com/webhooks/v1',
      headers: {
        'X-ApiKey': config.token,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  // ---- Properties ----

  async listProperties(params?: {
    page?: number;
    size?: number;
    includeCount?: boolean;
    includeInOut?: boolean;
  }) {
    let response = await this.axiosV2.get('/properties', { params });
    return response.data;
  }

  async getProperty(
    propertyId: number,
    params?: {
      includeInOut?: boolean;
    }
  ) {
    let response = await this.axiosV2.get(`/properties/${propertyId}`, { params });
    return response.data;
  }

  async getPropertyRooms(propertyId: number) {
    let response = await this.axiosV2.get(`/properties/${propertyId}/rooms`);
    return response.data;
  }

  // ---- Bookings ----

  async listBookings(params?: {
    page?: number;
    size?: number;
    includeCount?: boolean;
    includeTransactions?: boolean;
    includeExternal?: boolean;
    includeQuoteDetails?: boolean;
    stayFilter?: string;
    stayFilterDate?: string;
    updatedSince?: string;
    trash?: boolean;
  }) {
    let response = await this.axiosV2.get('/reservations/bookings', { params });
    return response.data;
  }

  async getBooking(bookingId: number) {
    let response = await this.axiosV2.get(`/reservations/bookings/${bookingId}`);
    return response.data;
  }

  async getBookingDetailsV1(bookingId: number) {
    let response = await this.axiosV1.get(`/reservation/booking/${bookingId}`);
    return response.data;
  }

  async createBooking(data: {
    property_id: number;
    rooms: Array<{
      room_type_id: number;
      people: number;
    }>;
    arrival: string;
    departure: string;
    guest: {
      name: string;
      email?: string;
      phone?: string;
    };
    status?: string;
    source?: string;
    total?: number;
    currency_code?: string;
    notes?: string;
    language?: string;
  }) {
    let response = await this.axiosV1.post('/reservation/booking', data);
    return response.data;
  }

  async setBookingStatus(
    bookingId: number,
    status: 'book' | 'open' | 'decline' | 'tentative'
  ) {
    let endpoint = `/reservation/booking/${bookingId}/${status}`;
    let response = await this.axiosV1.put(endpoint);
    return response.data;
  }

  // ---- Availability ----

  async getPropertyAvailability(
    propertyId: number,
    params?: {
      start?: string;
      end?: string;
    }
  ) {
    let response = await this.axiosV1.get(`/availability/${propertyId}`, { params });
    return response.data;
  }

  async getRoomAvailability(
    propertyId: number,
    roomTypeId: number,
    params?: {
      start?: string;
      end?: string;
    }
  ) {
    let response = await this.axiosV2.get(`/availability/${propertyId}/${roomTypeId}`, {
      params
    });
    return response.data;
  }

  async updateAvailability(
    propertyId: number,
    data: Array<{
      room_type_id: number;
      periods: Array<{
        start: string;
        end: string;
        is_available: boolean;
        min_stay?: number;
      }>;
    }>
  ) {
    let response = await this.axiosV2.put(`/availability/${propertyId}`, data);
    return response.data;
  }

  // ---- Rates ----

  async getRateSettings(houseId: number) {
    let response = await this.axiosV2.get('/rates/settings', { params: { houseId } });
    return response.data;
  }

  async getDailyRates(params: {
    roomTypeId: number;
    houseId: number;
    startDate: string;
    endDate: string;
  }) {
    let response = await this.axiosV1.get('/rates/daily', {
      params: {
        room_type_id: params.roomTypeId,
        house_id: params.houseId,
        start_date: params.startDate,
        end_date: params.endDate
      }
    });
    return response.data;
  }

  async updateRates(data: {
    house_id: number;
    room_type_id: number;
    date_ranges: Array<{
      start_date: string;
      end_date: string;
      daily: number;
      weekly?: number;
      monthly?: number;
      min_stay?: number;
    }>;
  }) {
    let response = await this.axiosV1.put('/rates', data);
    return response.data;
  }

  // ---- Quotes & Payment Links ----

  async getQuote(
    propertyId: number,
    params: {
      arrival: string;
      departure: string;
      roomTypes?: string;
    }
  ) {
    let response = await this.axiosV2.get(`/quote/${propertyId}`, { params });
    return response.data;
  }

  async getBookingQuote(bookingId: number) {
    let response = await this.axiosV1.get(`/reservation/booking/${bookingId}/quote`);
    return response.data;
  }

  async getPaymentLink(bookingId: number) {
    let response = await this.axiosV2.get(
      `/reservations/bookings/${bookingId}/quote/paymentLink`
    );
    return response.data;
  }

  async createPaymentLink(
    bookingId: number,
    data?: {
      amount?: number;
      currency?: string;
      description?: string;
    }
  ) {
    let response = await this.axiosV2.post(
      `/reservations/bookings/${bookingId}/quote/paymentLink`,
      data
    );
    return response.data;
  }

  // ---- Messaging ----

  async addMessagesToBooking(
    bookingId: number,
    messages: Array<{
      subject?: string;
      message: string;
      type?: string;
      send_notification?: boolean;
    }>
  ) {
    let response = await this.axiosV1.post(
      `/reservation/booking/${bookingId}/messages`,
      messages
    );
    return response.data;
  }

  // ---- Webhooks ----

  async subscribeWebhook(event: string, targetUrl: string) {
    let response = await this.axiosWebhooks.post('/subscribe', {
      event,
      target_url: targetUrl
    });
    return response.data;
  }

  async listWebhooks() {
    let response = await this.axiosWebhooks.get('/list');
    return response.data;
  }

  async unsubscribeWebhook(webhookId: string) {
    let response = await this.axiosWebhooks.delete(`/unsubscribe/${webhookId}`);
    return response.data;
  }
}
