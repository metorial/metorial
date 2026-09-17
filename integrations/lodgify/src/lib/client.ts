import { createAxios } from 'slates';
import { lodgifyApiError } from './errors';

export type GuestBreakdown = {
  adults?: number;
  children?: number;
  infants?: number;
  pets?: number;
};

export type LodgifyMessage = {
  subject?: string;
  message?: string;
  type?: 'Owner' | 'Comment' | 'Renter';
  send_notification?: boolean;
  message_id?: string;
};

export type LodgifyGuest = {
  guest_name: {
    first_name?: string;
    last_name?: string;
  };
  email?: string;
  phone?: string;
  locale?: string;
  street_address1?: string;
  street_address2?: string;
  city?: string;
  country_code?: string;
  postal_code?: string;
  state?: string;
};

export type RangedRate = {
  is_default?: boolean;
  start_date?: string;
  end_date?: string;
  price_per_day?: number;
  min_stay?: number;
  max_stay?: number;
  price_per_additional_guest?: number;
  additional_guests_starts_from?: number;
};

export type QuoteRoomTypeParam = {
  Id: number;
  People?: number;
  guest_breakdown?: GuestBreakdown;
};

export type QuoteAddOnParam = {
  Id: number;
  Units?: number;
};

export type BatchReservationRef = {
  id: number;
  type?: string;
};

// Lodgify's v2 quote endpoint takes arrays of objects in the query string and
// documents one exact wire form: `roomTypes[0].Id=1&roomTypes[0].guest_breakdown.adults=2`.
// Axios cannot produce that shape, so keys are built literally (indices and
// property names are code-controlled) and only values are escaped.
export let serializeBracketedParams = (params: Record<string, unknown>) => {
  let parts: string[] = [];

  let append = (key: string, value: unknown) => {
    if (value === undefined || value === null) return;

    if (Array.isArray(value)) {
      value.forEach((item, index) => append(`${key}[${index}]`, item));
      return;
    }

    if (typeof value === 'object') {
      for (let [childKey, childValue] of Object.entries(value as Record<string, unknown>)) {
        append(`${key}.${childKey}`, childValue);
      }
      return;
    }

    parts.push(`${key}=${encodeURIComponent(String(value))}`);
  };

  for (let [key, value] of Object.entries(params)) append(key, value);
  return parts.join('&');
};

let applyLodgifyErrorInterceptor = (http: ReturnType<typeof createAxios>) => {
  http.interceptors.response.use(
    response => response,
    error => Promise.reject(lodgifyApiError(error))
  );
};

export class Client {
  private axiosV1;
  private axiosV2;

  constructor(config: { token: string }) {
    let headers = {
      'X-ApiKey': config.token,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };

    this.axiosV1 = createAxios({ baseURL: 'https://api.lodgify.com/v1', headers });
    this.axiosV2 = createAxios({ baseURL: 'https://api.lodgify.com/v2', headers });

    applyLodgifyErrorInterceptor(this.axiosV1);
    applyLodgifyErrorInterceptor(this.axiosV2);
  }

  // ---- Properties ----

  // GET /v2/properties
  async listProperties(params?: {
    page?: number;
    size?: number;
    includeCount?: boolean;
    includeInOut?: boolean;
    updatedSince?: string;
  }) {
    let response = await this.axiosV2.get('/properties', { params });
    return response.data;
  }

  // GET /v2/properties/{id}
  async getProperty(propertyId: number, params?: { includeInOut?: boolean }) {
    let response = await this.axiosV2.get(`/properties/${propertyId}`, { params });
    return response.data;
  }

  // GET /v2/properties/{id}/rooms
  async getPropertyRooms(propertyId: number) {
    let response = await this.axiosV2.get(`/properties/${propertyId}/rooms`);
    return response.data;
  }

  // GET /v2/deletedproperties — returns a bare array of property IDs
  async listDeletedProperties(params?: { deletedSince?: string }) {
    let response = await this.axiosV2.get('/deletedproperties', { params });
    return response.data;
  }

  // GET /v1/properties/{id}/rates/addons
  async listPropertyAddOns(
    propertyId: number,
    params?: { start?: string; end?: string; rid?: number }
  ) {
    let response = await this.axiosV1.get(`/properties/${propertyId}/rates/addons`, {
      params
    });
    return response.data;
  }

  // GET /v1/properties/{id}/payments
  async listPropertyPaymentSettings(propertyId: number) {
    let response = await this.axiosV1.get(`/properties/${propertyId}/payments`);
    return response.data;
  }

  // ---- Bookings ----

  // GET /v2/reservations/bookings
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
    trash?: string;
  }) {
    let response = await this.axiosV2.get('/reservations/bookings', { params });
    return response.data;
  }

  // GET /v2/reservations/bookings/{id}
  async getBooking(bookingId: number) {
    let response = await this.axiosV2.get(`/reservations/bookings/${bookingId}`);
    return response.data;
  }

  // GET /v1/reservation/booking/{id} — the v1 shape PUT expects back
  async getBookingDetails(bookingId: number) {
    let response = await this.axiosV1.get(`/reservation/booking/${bookingId}`);
    return response.data;
  }

  // POST /v1/reservation/booking — returns a bare booking ID integer.
  // `from` upgrades an existing enquiry and keeps its message history.
  async createBooking(
    data: {
      property_id: number;
      arrival: string;
      departure: string;
      status?: string;
      source_text?: string;
      rooms?: Array<{
        room_type_id: number;
        guest_breakdown: GuestBreakdown;
        key_code?: string;
      }>;
      guest?: LodgifyGuest;
      messages?: LodgifyMessage[];
      payment_website_id?: number;
      bookability?: string;
      total?: number;
      currency_code?: string;
    },
    params?: { from?: number }
  ) {
    let response = await this.axiosV1.post('/reservation/booking', data, { params });
    return response.data;
  }

  // PUT /v1/reservation/booking/{id}
  async updateBooking(bookingId: number, data: Record<string, unknown>) {
    let response = await this.axiosV1.put(`/reservation/booking/${bookingId}`, data);
    return response.data;
  }

  // PUT /v1/reservation/booking/{id}/{book|reopen|decline|tentative}
  async setBookingStatus(
    bookingId: number,
    status: 'book' | 'reopen' | 'decline' | 'tentative'
  ) {
    let response = await this.axiosV1.put(`/reservation/booking/${bookingId}/${status}`);
    return response.data;
  }

  // DELETE /v1/reservation/booking/{id} — soft delete to the trash
  async trashBooking(bookingId: number) {
    let response = await this.axiosV1.delete(`/reservation/booking/${bookingId}`);
    return response.data;
  }

  // PUT /v1/reservation/booking/{id}/recover
  async recoverBooking(bookingId: number) {
    let response = await this.axiosV1.put(`/reservation/booking/${bookingId}/recover`);
    return response.data;
  }

  // PUT /v1/reservation/booking/{id}/request_payment — takes no body or amount
  async requestBookingPayment(bookingId: number) {
    let response = await this.axiosV1.put(`/reservation/booking/${bookingId}/request_payment`);
    return response.data;
  }

  // PUT /v1/reservation/booking/{id}/{replied|not_replied}
  async setBookingRepliedStatus(bookingId: number, status: 'replied' | 'not_replied') {
    let response = await this.axiosV1.put(`/reservation/booking/${bookingId}/${status}`);
    return response.data;
  }

  // POST /v1/reservation/{replied|not_replied}
  async batchSetRepliedStatus(
    status: 'replied' | 'not_replied',
    reservations: BatchReservationRef[]
  ) {
    let response = await this.axiosV1.post(`/reservation/${status}`, reservations);
    return response.data;
  }

  // GET /v2/reservations/bookings/{id}/externalBookings
  async listExternalBookings(bookingId: number) {
    let response = await this.axiosV2.get(
      `/reservations/bookings/${bookingId}/externalBookings`
    );
    return response.data;
  }

  // PUT /v2/reservations/bookings/{id}/{checkin|checkout}
  // `time` is HH:mm:ss in the property's own timezone, not a UTC instant.
  async setBookingStayTime(bookingId: number, action: 'checkin' | 'checkout', time: string) {
    let response = await this.axiosV2.put(`/reservations/bookings/${bookingId}/${action}`, {
      time
    });
    return response.data;
  }

  // PUT /v2/reservations/bookings/{id}/keyCodes
  async updateBookingKeyCodes(
    bookingId: number,
    rooms: Array<{ room_type_id: number; key_code?: string }>
  ) {
    let response = await this.axiosV2.put(`/reservations/bookings/${bookingId}/keyCodes`, {
      rooms
    });
    return response.data;
  }

  // ---- Inbox ----

  // GET /v1/reservation — bookings and enquiries together
  async listInbox(params?: {
    offset?: number;
    limit?: number;
    status?: string;
    trash?: boolean;
    propertyId?: number;
    periodStart?: string;
    periodEnd?: string;
    modifiedSince?: string;
  }) {
    let response = await this.axiosV1.get('/reservation', { params });
    return response.data;
  }

  // ---- Enquiries ----

  // POST /v1/reservation/enquiry — returns a bare enquiry ID integer
  async createEnquiry(data: {
    property_id?: number;
    room_type_id?: number;
    arrival?: string;
    departure?: string;
    guest_breakdown: GuestBreakdown;
    guest?: LodgifyGuest;
    messages?: LodgifyMessage[];
    source_text?: string;
    source_address?: string;
    status?: string;
    has_privacy_consent?: boolean;
  }) {
    let response = await this.axiosV1.post('/reservation/enquiry', data);
    return response.data;
  }

  // GET /v1/reservation/enquiry/{id}
  async getEnquiry(enquiryId: number) {
    let response = await this.axiosV1.get(`/reservation/enquiry/${enquiryId}`);
    return response.data;
  }

  // PUT /v1/reservation/enquiry/{id}/{decline|reopen|recover}
  async setEnquiryStatus(enquiryId: number, status: 'decline' | 'reopen' | 'recover') {
    let response = await this.axiosV1.put(`/reservation/enquiry/${enquiryId}/${status}`);
    return response.data;
  }

  // DELETE /v1/reservation/enquiry/{id} — soft delete to the trash
  async trashEnquiry(enquiryId: number) {
    let response = await this.axiosV1.delete(`/reservation/enquiry/${enquiryId}`);
    return response.data;
  }

  // ---- Availability ----

  // GET /v2/availability/{propertyId}
  async getPropertyAvailability(
    propertyId: number,
    params?: { start?: string; end?: string; includeDetails?: boolean }
  ) {
    let response = await this.axiosV2.get(`/availability/${propertyId}`, { params });
    return response.data;
  }

  // GET /v2/availability/{propertyId}/{roomTypeId}
  async getRoomAvailability(
    propertyId: number,
    roomTypeId: number,
    params?: { start?: string; end?: string; includeDetails?: boolean }
  ) {
    let response = await this.axiosV2.get(`/availability/${propertyId}/${roomTypeId}`, {
      params
    });
    return response.data;
  }

  // POST /v1/availability/{propertyId}/{roomTypeId}/set
  // `available` is a unit count, not a flag: 0 closes the period.
  async setRoomAvailability(
    propertyId: number,
    roomTypeId: number,
    data: { period_start: string; period_end: string; available: number }
  ) {
    let response = await this.axiosV1.post(
      `/availability/${propertyId}/${roomTypeId}/set`,
      data
    );
    return response.data;
  }

  // ---- Rates ----

  // GET /v2/rates/settings
  async getRateSettings(houseId: number) {
    let response = await this.axiosV2.get('/rates/settings', { params: { houseId } });
    return response.data;
  }

  // GET /v2/rates/calendar — all four params are required, and `endDate` is inclusive
  async getRatesCalendar(params: {
    houseId: number;
    roomTypeId: number;
    startDate: string;
    endDate: string;
  }) {
    let response = await this.axiosV2.get('/rates/calendar', { params });
    return response.data;
  }

  // POST /v1/rates/savewithoutavailability — returns a bare boolean.
  // Each rate's `end_date` is exclusive and ranges must not overlap.
  async saveRates(data: { property_id: number; room_type_id: number; rates: RangedRate[] }) {
    let response = await this.axiosV1.post('/rates/savewithoutavailability', data);
    return response.data;
  }

  // ---- Quotes & Payment Links ----

  // GET /v2/quote/{propertyId} — returns a bare array of quotes, one per rate plan
  async getPropertyQuote(
    propertyId: number,
    params: {
      arrival?: string;
      departure?: string;
      roomTypes?: QuoteRoomTypeParam[];
      addOns?: QuoteAddOnParam[];
      promotionCode?: string;
    }
  ) {
    let response = await this.axiosV2.get(`/quote/${propertyId}`, {
      params,
      paramsSerializer: serializeBracketedParams
    });
    return response.data;
  }

  // GET /v1/reservation/booking/{id}/quote
  async getBookingQuote(bookingId: number) {
    let response = await this.axiosV1.get(`/reservation/booking/${bookingId}/quote`);
    return response.data;
  }

  // POST /v1/reservation/booking/{id}/quote — returns a bare quote ID integer
  async createBookingQuote(
    bookingId: number,
    data: {
      is_policy_active?: boolean;
      add_ons?: Array<{ add_on_id: number; units?: number }>;
      room_types?: Array<{ room_type_id: number; custom_fee_amount?: number }>;
    }
  ) {
    let response = await this.axiosV1.post(`/reservation/booking/${bookingId}/quote`, data);
    return response.data;
  }

  // GET /v2/reservations/bookings/{id}/quote/paymentLink
  async getPaymentLink(bookingId: number) {
    let response = await this.axiosV2.get(
      `/reservations/bookings/${bookingId}/quote/paymentLink`
    );
    return response.data;
  }

  // POST /v2/reservations/bookings/{id}/quote/paymentLink
  // `amount` is the only accepted field, and the response is `{ succeeded }`.
  async createPaymentLink(bookingId: number, data: { amount: number }) {
    let response = await this.axiosV2.post(
      `/reservations/bookings/${bookingId}/quote/paymentLink`,
      data
    );
    return response.data;
  }

  // ---- Messaging ----

  // POST /v1/reservation/booking/{id}/messages
  async addMessagesToBooking(bookingId: number, messages: LodgifyMessage[]) {
    let response = await this.axiosV1.post(
      `/reservation/booking/${bookingId}/messages`,
      messages
    );
    return response.data;
  }

  // POST /v1/reservation/enquiry/{id}/messages
  async addMessagesToEnquiry(enquiryId: number, messages: LodgifyMessage[]) {
    let response = await this.axiosV1.post(
      `/reservation/enquiry/${enquiryId}/messages`,
      messages
    );
    return response.data;
  }

  // GET /v2/messaging/{threadGuid}
  async getMessageThread(threadGuid: string) {
    let response = await this.axiosV2.get(`/messaging/${threadGuid}`);
    return response.data;
  }
}
