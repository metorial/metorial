import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import { generateAuthHeaders } from './hmac';

let BASE_URL = 'https://www.etermin.net/api';

export class Client {
  private publicKey: string;
  private privateKey: string;

  constructor(config: { publicKey: string; privateKey: string }) {
    this.publicKey = config.publicKey;
    this.privateKey = config.privateKey;
  }

  private getAxios() {
    return createAuthenticatedAxios({
      baseURL: BASE_URL,
      headers: generateAuthHeaders(this.publicKey, this.privateKey),
      contentType: 'application/x-www-form-urlencoded',
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'eTermin',
          reason: 'etermin_api_error'
        })
    });
  }

  // ─── Appointments ─────────────────────────────────────────────

  async listAppointments(params: Record<string, string | undefined>) {
    let http = this.getAxios();
    let filtered = pickDefined(params);
    let res = await http.get('/appointment', { params: filtered });
    return res.data;
  }

  async getAppointment(appId: string) {
    let http = this.getAxios();
    let res = await http.get('/appointment', { params: { appid: appId } });
    return res.data;
  }

  async createAppointment(data: Record<string, string | number | undefined>) {
    let http = this.getAxios();
    let res = await http.post('/appointment', encodeFormData(data), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return normalizeMutationResponse(res.data);
  }

  async updateAppointment(data: Record<string, string | number | undefined>) {
    // Reads use the internal AppID; updates require the appointment's external ID.
    let appIdText = String(data.appid ?? '').trim();
    let appId = Number(appIdText);
    if (!/^\d+$/.test(appIdText) || !Number.isSafeInteger(appId) || appId <= 0) {
      throw createApiServiceError(
        'Provide a positive numeric AppID from the ID field returned by list_appointments.',
        { reason: 'invalid_appointment_id' }
      );
    }
    let result = await this.getAppointment(String(appId));
    let records = Array.isArray(result) ? result : [result];
    let appointment = records[0];
    if (records.length !== 1 || !isApiErrorRecord(appointment) || appointment.ID !== appId) {
      throw createApiServiceError(
        `No unique appointment matching AppID ${appId} was returned. Call list_appointments to retrieve its ID and try again.`,
        { reason: 'appointment_lookup_mismatch' }
      );
    }
    if (
      typeof appointment.ExternalID !== 'string' ||
      appointment.ExternalID.trim().length === 0
    ) {
      throw createApiServiceError(
        'The matching appointment has no ExternalID. Retrieve it with get_appointment and verify the appointment in eTermin before updating.',
        { reason: 'missing_appointment_external_id' }
      );
    }
    let { appid: _appId, ...fields } = data;
    let http = this.getAxios();
    let res = await http.put(
      '/appointment',
      encodeFormData({ ...fields, id: appointment.ExternalID }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return normalizeMutationResponse(res.data);
  }

  async deleteAppointment(appId: string) {
    let http = this.getAxios();
    let res = await http.delete('/appointment', { params: { appid: appId } });
    return normalizeMutationResponse(res.data);
  }

  async getDeletedAppointments(start: string, end: string) {
    let http = this.getAxios();
    let res = await http.get('/appointmentdeleted', { params: { start, end } });
    return res.data;
  }

  // ─── Contacts ─────────────────────────────────────────────────

  async listContacts(params: Record<string, string | undefined>) {
    let http = this.getAxios();
    let filtered = pickDefined(params);
    let res = await http.get('/contact', { params: filtered });
    return res.data;
  }

  async getContactById(contactId: string) {
    let http = this.getAxios();
    let res = await http.get('/contact', { params: { cid: contactId } });
    return res.data;
  }

  async getContactByEmail(email: string) {
    let http = this.getAxios();
    let res = await http.get('/contact', { params: { email } });
    return res.data;
  }

  async createContact(data: Record<string, string | number | undefined>) {
    let http = this.getAxios();
    let res = await http.post('/contact', encodeFormData(data), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return normalizeMutationResponse(res.data);
  }

  async updateContact(data: Record<string, string | number | undefined>) {
    let http = this.getAxios();
    let res = await http.put('/contact', encodeFormData(data), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return normalizeMutationResponse(res.data);
  }

  async deleteContact(contactId: string) {
    let http = this.getAxios();
    let res = await http.delete('/contact', { params: { cid: contactId } });
    return normalizeMutationResponse(res.data);
  }

  // ─── Calendars ────────────────────────────────────────────────

  async listCalendars(calendarId?: string) {
    let http = this.getAxios();
    let params: Record<string, string> = {};
    if (calendarId) params.calendarid = calendarId;
    let res = await http.get('/calendar', { params });
    return res.data;
  }

  async getCalendar(calendarId: string) {
    let http = this.getAxios();
    let res = await http.get('/calendar', { params: { calendarid: calendarId } });
    return res.data;
  }

  // ─── Available Time Slots ─────────────────────────────────────

  async getAvailableTimeSlots(params: Record<string, string | number | undefined>) {
    let http = this.getAxios();
    let filtered = pickDefined(params);
    let res = await http.get('/timeslots', { params: filtered });
    return res.data;
  }

  // ─── Working Times ────────────────────────────────────────────

  async getWorkingTimes(calendarId: string) {
    let http = this.getAxios();
    let res = await http.get('/workingtimes', { params: { calendarid: calendarId } });
    return res.data;
  }

  // ─── Services ─────────────────────────────────────────────────

  async listServices(params?: Record<string, string | undefined>) {
    let http = this.getAxios();
    let filtered = pickDefined(params ?? {});
    let res = await http.get('/service', { params: filtered });
    return res.data;
  }

  async getService(serviceId: string) {
    let http = this.getAxios();
    let res = await http.get('/service', { params: { id: serviceId } });
    return res.data;
  }

  async createService(data: Record<string, string | number | undefined>) {
    let http = this.getAxios();
    let res = await http.post('/service', encodeFormData(data), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return normalizeMutationResponse(res.data);
  }

  async updateService(data: Record<string, string | number | undefined>) {
    let http = this.getAxios();
    let res = await http.put('/service', encodeFormData(data), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return normalizeMutationResponse(res.data);
  }

  async deleteService(serviceId: string) {
    let http = this.getAxios();
    let res = await http.delete('/service', { params: { id: serviceId } });
    return normalizeMutationResponse(res.data);
  }

  // ─── Service Groups ───────────────────────────────────────────

  async listServiceGroups() {
    let http = this.getAxios();
    let res = await http.get('/servicegroup');
    return res.data;
  }

  // ─── Vouchers ─────────────────────────────────────────────────

  async listVouchers() {
    let http = this.getAxios();
    let res = await http.get('/voucher');
    return res.data;
  }

  async getVoucher(voucherId: string) {
    let http = this.getAxios();
    let res = await http.get('/voucher', { params: { id: voucherId } });
    return res.data;
  }

  async createVoucher(data: Record<string, string | number | undefined>) {
    let http = this.getAxios();
    let res = await http.post('/voucher', encodeFormData(data), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return normalizeMutationResponse(res.data);
  }

  async updateVoucher(data: Record<string, string | number | undefined>) {
    let http = this.getAxios();
    let res = await http.put('/voucher', encodeFormData(data), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return normalizeMutationResponse(res.data);
  }

  async deleteVoucher(voucherId: string) {
    let http = this.getAxios();
    let res = await http.delete('/voucher', { params: { id: voucherId } });
    return normalizeMutationResponse(res.data);
  }

  // ─── Company ──────────────────────────────────────────────────

  async getCompanyInfo() {
    let http = this.getAxios();
    let res = await http.get('/company');
    return res.data;
  }

  // ─── Non-Working Times ────────────────────────────────────────

  async listNonWorkingTimes(calendarId: string) {
    let http = this.getAxios();
    let res = await http.get('/calendarsnonworkingtimes', {
      params: { calendarid: calendarId }
    });
    return res.data;
  }

  async createNonWorkingTime(data: Record<string, string | number | undefined>) {
    let http = this.getAxios();
    let res = await http.post('/calendarsnonworkingtimes', encodeFormData(data), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return normalizeMutationResponse(res.data);
  }

  async deleteNonWorkingTime(nwId: string) {
    let http = this.getAxios();
    let res = await http.delete('/calendarsnonworkingtimes', { params: { id: nwId } });
    return normalizeMutationResponse(res.data);
  }
}

let encodeFormData = (data: Record<string, string | number | undefined>): string => {
  let filtered = pickDefined(data);
  let params = new URLSearchParams();
  for (let [key, value] of Object.entries(filtered)) {
    params.append(key, String(value));
  }
  return params.toString();
};

let normalizeMutationResponse = (data: unknown): Record<string, unknown> => {
  if (!isApiErrorRecord(data)) {
    return typeof data === 'string' ? { message: data } : { response: data ?? null };
  }
  let status = data.Status ?? data.status;
  if (Number(status) >= 400) {
    throw buildApiServiceError(
      { response: { status, data } },
      {
        providerLabel: 'eTermin',
        reason: 'etermin_api_error',
        detailKeys: ['StatusMsg', 'statusmsg', 'message']
      }
    );
  }
  return data;
};
