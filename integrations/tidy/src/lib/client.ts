import { createApiServiceError, createAuthenticatedAxios } from 'slates';
import { toTidyServiceError } from './errors';
import { toTidyDateTime, toTidyId } from './format';

export class Client {
  private http;

  constructor(config: { token: string }) {
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.tidy.com/api/v1',
      timeout: 30_000,
      authHeader: { value: `Bearer ${config.token}` },
      errorAdapter: toTidyServiceError
    });
  }

  // ── Addresses ──────────────────────────────────────────

  async listAddresses(): Promise<any> {
    let res = await this.http.get('/addresses');
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

    let res = await this.http.post('/addresses', body);
    return res.data;
  }

  async getAddress(addressId: string): Promise<any> {
    let res = await this.http.get(`/addresses/${encodeURIComponent(addressId)}`);
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

    let res = await this.http.put(`/addresses/${encodeURIComponent(addressId)}`, body);
    return res.data;
  }

  async deleteAddress(addressId: string): Promise<void> {
    await this.http.delete(`/addresses/${encodeURIComponent(addressId)}`);
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
    let res = await this.http.get('/jobs', { params: query });
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
      address_id: toTidyId(params.addressId, 'addressId'),
      service_type_key: params.serviceTypeKey,
      start_no_earlier_than: toTidyDateTime(params.startNoEarlierThan, 'startNoEarlierThan'),
      end_no_later_than: toTidyDateTime(params.endNoLaterThan, 'endNoLaterThan')
    };
    if (params.toDoListId !== undefined)
      body.to_do_list_id = toTidyId(params.toDoListId, 'toDoListId');
    if (params.preferredStartDatetime !== undefined)
      body.preferred_start_datetime = toTidyDateTime(
        params.preferredStartDatetime,
        'preferredStartDatetime'
      );

    let res = await this.http.post('/jobs', body);
    return res.data;
  }

  async getJob(jobId: string): Promise<any> {
    let res = await this.http.get(`/jobs/${encodeURIComponent(jobId)}`);
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
    if (params.toDoListId !== undefined)
      body.to_do_list_id = toTidyId(params.toDoListId, 'toDoListId');
    if (params.startNoEarlierThan !== undefined)
      body.start_no_earlier_than = toTidyDateTime(
        params.startNoEarlierThan,
        'startNoEarlierThan'
      );
    if (params.endNoLaterThan !== undefined)
      body.end_no_later_than = toTidyDateTime(params.endNoLaterThan, 'endNoLaterThan');

    let res = await this.http.put(`/jobs/${encodeURIComponent(jobId)}`, body);
    return res.data;
  }

  async cancelJob(jobId: string): Promise<any> {
    let res = await this.http.post(`/jobs/${encodeURIComponent(jobId)}/cancel`, {});
    if (res.data?.id !== undefined) return res.data;
    if (res.data?.result !== 'success') {
      throw createApiServiceError('TIDY did not confirm that the job was cancelled.');
    }
    return this.getJob(jobId);
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
      start_no_earlier_than: toTidyDateTime(params.startNoEarlierThan, 'startNoEarlierThan'),
      end_no_later_than: toTidyDateTime(params.endNoLaterThan, 'endNoLaterThan')
    };
    if (params.preferredStartDatetime !== undefined)
      body.preferred_start_datetime = toTidyDateTime(
        params.preferredStartDatetime,
        'preferredStartDatetime'
      );
    if (params.toDoListId !== undefined)
      body.to_do_list_id = toTidyId(params.toDoListId, 'toDoListId');

    let res = await this.http.post(`/jobs/${encodeURIComponent(jobId)}/reschedule`, body);
    return res.data;
  }

  // ── Booking Availabilities ─────────────────────────────

  async listBookingAvailabilities(params: {
    serviceTypeKey: string;
    addressId: string;
  }): Promise<any> {
    let res = await this.http.get('/booking-availabilities', {
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
    if (params.serviceTypes !== undefined) {
      body.service_types = params.serviceTypes
        .split(',')
        .map(value => value.trim())
        .filter(Boolean);
      if (body.service_types.length === 0) {
        throw createApiServiceError('serviceTypes must contain at least one service type.');
      }
    }

    let res = await this.http.post('/pros', body);
    return res.data;
  }

  // ── To-Do Lists ────────────────────────────────────────

  async listToDoLists(addressId?: string): Promise<any> {
    let query: Record<string, string> = {};
    if (addressId) query.address_id = addressId;
    let res = await this.http.get('/to-do-lists', { params: query });
    return res.data;
  }

  // ── Guest Reservations ─────────────────────────────────

  async listGuestReservations(addressId?: string): Promise<any> {
    let query: Record<string, string> = {};
    if (addressId) query.address_id = addressId;
    let res = await this.http.get('/guest-reservations', { params: query });
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
      address_id: toTidyId(params.addressId, 'addressId'),
      check_in: {
        date: params.checkInDate,
        ...(params.checkInTime !== undefined ? { time: params.checkInTime } : {})
      },
      check_out: {
        date: params.checkOutDate,
        ...(params.checkOutTime !== undefined ? { time: params.checkOutTime } : {})
      }
    };

    let res = await this.http.post('/guest-reservations', body);
    return res.data;
  }

  async getGuestReservation(reservationId: string): Promise<any> {
    let res = await this.http.get(`/guest-reservations/${encodeURIComponent(reservationId)}`);
    return res.data;
  }

  async deleteGuestReservation(reservationId: string): Promise<void> {
    await this.http.delete(`/guest-reservations/${encodeURIComponent(reservationId)}`);
  }

  // ── Issues ─────────────────────────────────────────────

  async listIssues(params?: { addressId?: string; status?: string }): Promise<any> {
    let query: Record<string, string> = {};
    if (params?.addressId) query.address_id = params.addressId;
    if (params?.status) query.status = params.status;
    let res = await this.http.get('/issues', { params: query });
    return res.data;
  }

  async createIssue(params: {
    addressId: string;
    description: string;
    type: string;
  }): Promise<any> {
    let body = {
      address_id: toTidyId(params.addressId, 'addressId'),
      description: params.description,
      type: params.type
    };
    let res = await this.http.post('/issues', body);
    return res.data;
  }

  async getIssue(issueId: string): Promise<any> {
    let res = await this.http.get(`/issues/${encodeURIComponent(issueId)}`);
    return res.data;
  }

  async resolveIssue(issueId: string): Promise<any> {
    let res = await this.http.post(`/issues/${encodeURIComponent(issueId)}/resolve`, {});
    return res.data;
  }

  async deleteIssue(issueId: string): Promise<void> {
    await this.http.delete(`/issues/${encodeURIComponent(issueId)}`);
  }

  async messageTidy(message: string): Promise<unknown> {
    let res = await this.http.post('https://api.tidy.com/api/v2/message-tidy', { message });
    return res.data;
  }
}
