import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://api.tidy.com/api/v1'
});

export class Client {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  // ── Addresses ──────────────────────────────────────────

  async listAddresses(): Promise<any> {
    let res = await http.get('/addresses', { headers: this.headers });
    return res.data;
  }

  async createAddress(params: {
    address: string;
    postalCode: string;
    city: string;
    unit?: string;
    countryCode?: string;
    addressName?: string;
    accessNotes?: string;
    closingNotes?: string;
    paidParking?: boolean;
    parkingSpot?: string;
    parkingPayWith?: string;
    maxParkingCost?: number;
    parkingNotes?: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      address: params.address,
      postal_code: params.postalCode,
      city: params.city
    };
    if (params.unit !== undefined) body.unit = params.unit;
    if (params.countryCode !== undefined) body.country_code = params.countryCode;
    if (params.addressName !== undefined) body.address_name = params.addressName;

    let notes: Record<string, any> = {};
    if (params.accessNotes !== undefined) notes.access = params.accessNotes;
    if (params.closingNotes !== undefined) notes.closing = params.closingNotes;
    if (Object.keys(notes).length > 0) body.notes = notes;

    let parking: Record<string, any> = {};
    if (params.paidParking !== undefined) parking.paid_parking = params.paidParking;
    if (params.parkingSpot !== undefined) parking.parking_spot = params.parkingSpot;
    if (params.parkingPayWith !== undefined) parking.parking_pay_with = params.parkingPayWith;
    if (params.maxParkingCost !== undefined) parking.max_parking_cost = params.maxParkingCost;
    if (params.parkingNotes !== undefined) parking.parking_notes = params.parkingNotes;
    if (Object.keys(parking).length > 0) body.parking = parking;

    let res = await http.post('/addresses', body, { headers: this.headers });
    return res.data;
  }

  async getAddress(addressId: string): Promise<any> {
    let res = await http.get(`/addresses/${addressId}`, { headers: this.headers });
    return res.data;
  }

  async updateAddress(
    addressId: string,
    params: {
      addressName?: string;
      accessNotes?: string;
      closingNotes?: string;
      paidParking?: boolean;
      parkingSpot?: string;
      parkingPayWith?: string;
      maxParkingCost?: number;
      parkingNotes?: string;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (params.addressName !== undefined) body.address_name = params.addressName;

    let notes: Record<string, any> = {};
    if (params.accessNotes !== undefined) notes.access = params.accessNotes;
    if (params.closingNotes !== undefined) notes.closing = params.closingNotes;
    if (Object.keys(notes).length > 0) body.notes = notes;

    let parking: Record<string, any> = {};
    if (params.paidParking !== undefined) parking.paid_parking = params.paidParking;
    if (params.parkingSpot !== undefined) parking.parking_spot = params.parkingSpot;
    if (params.parkingPayWith !== undefined) parking.parking_pay_with = params.parkingPayWith;
    if (params.maxParkingCost !== undefined) parking.max_parking_cost = params.maxParkingCost;
    if (params.parkingNotes !== undefined) parking.parking_notes = params.parkingNotes;
    if (Object.keys(parking).length > 0) body.parking = parking;

    let res = await http.put(`/addresses/${addressId}`, body, { headers: this.headers });
    return res.data;
  }

  async deleteAddress(addressId: string): Promise<void> {
    await http.delete(`/addresses/${addressId}`, { headers: this.headers });
  }

  // ── Jobs ───────────────────────────────────────────────

  async listJobs(params?: {
    addressId?: string;
    status?: string;
    toDoListId?: string;
  }): Promise<any> {
    let query: Record<string, string> = {};
    if (params?.addressId) query.address_id = params.addressId;
    if (params?.status) query.status = params.status;
    if (params?.toDoListId) query.to_do_list_id = params.toDoListId;
    let res = await http.get('/jobs', { headers: this.headers, params: query });
    return res.data;
  }

  async createJob(params: {
    addressId: string;
    serviceTypeKey: string;
    startNoEarlierThan: string;
    endNoLaterThan: string;
    toDoListId?: string;
    preferredStartDatetime?: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      address_id: params.addressId,
      service_type_key: params.serviceTypeKey,
      start_no_earlier_than: params.startNoEarlierThan,
      end_no_later_than: params.endNoLaterThan
    };
    if (params.toDoListId !== undefined) body.to_do_list_id = params.toDoListId;
    if (params.preferredStartDatetime !== undefined)
      body.preferred_start_datetime = params.preferredStartDatetime;

    let res = await http.post('/jobs', body, { headers: this.headers });
    return res.data;
  }

  async getJob(jobId: string): Promise<any> {
    let res = await http.get(`/jobs/${jobId}`, { headers: this.headers });
    return res.data;
  }

  async updateJob(
    jobId: string,
    params: {
      toDoListId?: string;
      startNoEarlierThan?: string;
      endNoLaterThan?: string;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (params.toDoListId !== undefined) body.to_do_list_id = params.toDoListId;
    if (params.startNoEarlierThan !== undefined)
      body.start_no_earlier_than = params.startNoEarlierThan;
    if (params.endNoLaterThan !== undefined) body.end_no_later_than = params.endNoLaterThan;

    let res = await http.put(`/jobs/${jobId}`, body, { headers: this.headers });
    return res.data;
  }

  async cancelJob(jobId: string): Promise<any> {
    let res = await http.post(`/jobs/${jobId}/cancel`, {}, { headers: this.headers });
    return res.data;
  }

  async rescheduleJob(
    jobId: string,
    params: {
      serviceTypeKey: string;
      startNoEarlierThan: string;
      endNoLaterThan: string;
      preferredStartDatetime?: string;
      toDoListId?: string;
    }
  ): Promise<any> {
    let body: Record<string, any> = {
      service_type_key: params.serviceTypeKey,
      start_no_earlier_than: params.startNoEarlierThan,
      end_no_later_than: params.endNoLaterThan
    };
    if (params.preferredStartDatetime !== undefined)
      body.preferred_start_datetime = params.preferredStartDatetime;
    if (params.toDoListId !== undefined) body.to_do_list_id = params.toDoListId;

    let res = await http.post(`/jobs/${jobId}/reschedule`, body, { headers: this.headers });
    return res.data;
  }

  // ── Booking Availabilities ─────────────────────────────

  async listBookingAvailabilities(params: {
    serviceTypeKey: string;
    addressId: string;
  }): Promise<any> {
    let res = await http.get('/booking-availabilities', {
      headers: this.headers,
      params: {
        service_type_key: params.serviceTypeKey,
        address_id: params.addressId
      }
    });
    return res.data;
  }

  // ── Pros ───────────────────────────────────────────────

  async addPro(params: {
    name: string;
    email: string;
    phone?: string;
    serviceTypes?: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      name: params.name,
      email: params.email
    };
    if (params.phone !== undefined) body.phone = params.phone;
    if (params.serviceTypes !== undefined) body.service_types = params.serviceTypes;

    let res = await http.post('/pros', body, { headers: this.headers });
    return res.data;
  }

  // ── To-Do Lists ────────────────────────────────────────

  async listToDoLists(addressId?: string): Promise<any> {
    let query: Record<string, string> = {};
    if (addressId) query.address_id = addressId;
    let res = await http.get('/to-do-lists', { headers: this.headers, params: query });
    return res.data;
  }

  // ── Guest Reservations ─────────────────────────────────

  async listGuestReservations(addressId?: string): Promise<any> {
    let query: Record<string, string> = {};
    if (addressId) query.address_id = addressId;
    let res = await http.get('/guest-reservations', { headers: this.headers, params: query });
    return res.data;
  }

  async createGuestReservation(params: {
    addressId: string;
    checkInDate: string;
    checkOutDate: string;
    checkInTime?: string;
    checkOutTime?: string;
  }): Promise<any> {
    let body: Record<string, any> = {
      address_id: params.addressId,
      check_in: {
        date: params.checkInDate,
        ...(params.checkInTime !== undefined ? { time: params.checkInTime } : {})
      },
      check_out: {
        date: params.checkOutDate,
        ...(params.checkOutTime !== undefined ? { time: params.checkOutTime } : {})
      }
    };

    let res = await http.post('/guest-reservations', body, { headers: this.headers });
    return res.data;
  }

  async getGuestReservation(reservationId: string): Promise<any> {
    let res = await http.get(`/guest-reservations/${reservationId}`, {
      headers: this.headers
    });
    return res.data;
  }

  async deleteGuestReservation(reservationId: string): Promise<void> {
    await http.delete(`/guest-reservations/${reservationId}`, { headers: this.headers });
  }

  // ── Issues ─────────────────────────────────────────────

  async listIssues(params?: { addressId?: string; status?: string }): Promise<any> {
    let query: Record<string, string> = {};
    if (params?.addressId) query.address_id = params.addressId;
    if (params?.status) query.status = params.status;
    let res = await http.get('/issues', { headers: this.headers, params: query });
    return res.data;
  }

  async createIssue(params: {
    addressId: string;
    description: string;
    type: string;
  }): Promise<any> {
    let body = {
      address_id: params.addressId,
      description: params.description,
      type: params.type
    };
    let res = await http.post('/issues', body, { headers: this.headers });
    return res.data;
  }

  async getIssue(issueId: string): Promise<any> {
    let res = await http.get(`/issues/${issueId}`, { headers: this.headers });
    return res.data;
  }

  async resolveIssue(issueId: string): Promise<any> {
    let res = await http.post(`/issues/${issueId}/resolve`, {}, { headers: this.headers });
    return res.data;
  }

  async deleteIssue(issueId: string): Promise<void> {
    await http.delete(`/issues/${issueId}`, { headers: this.headers });
  }
}
