import { createAxios } from 'slates';
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
    return createAxios({
      baseURL: BASE_URL,
      headers: generateAuthHeaders(this.publicKey, this.privateKey)
    });
  }

  // ─── Appointments ─────────────────────────────────────────────

  async listAppointments(params: Record<string, string | undefined>) {
    let http = this.getAxios();
    let filtered = filterUndefined(params);
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
    return res.data;
  }

  async updateAppointment(data: Record<string, string | number | undefined>) {
    let http = this.getAxios();
    let res = await http.put('/appointment', encodeFormData(data), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return res.data;
  }

  async deleteAppointment(appId: string) {
    let http = this.getAxios();
    let res = await http.delete('/appointment', { params: { appid: appId } });
    return res.data;
  }

  async getDeletedAppointments(start: string, end: string) {
    let http = this.getAxios();
    let res = await http.get('/appointmentdeleted', { params: { start, end } });
    return res.data;
  }

  // ─── Contacts ─────────────────────────────────────────────────

  async listContacts(params: Record<string, string | undefined>) {
    let http = this.getAxios();
    let filtered = filterUndefined(params);
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
    return res.data;
  }

  async updateContact(data: Record<string, string | number | undefined>) {
    let http = this.getAxios();
    let res = await http.put('/contact', encodeFormData(data), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return res.data;
  }

  async deleteContact(contactId: string) {
    let http = this.getAxios();
    let res = await http.delete('/contact', { params: { cid: contactId } });
    return res.data;
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

  async getAvailableTimeSlots(params: Record<string, string | undefined>) {
    let http = this.getAxios();
    let filtered = filterUndefined(params);
    let res = await http.get('/availabletimeslots', { params: filtered });
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
    let filtered = filterUndefined(params ?? {});
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
    return res.data;
  }

  async updateService(data: Record<string, string | number | undefined>) {
    let http = this.getAxios();
    let res = await http.put('/service', encodeFormData(data), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return res.data;
  }

  async deleteService(serviceId: string) {
    let http = this.getAxios();
    let res = await http.delete('/service', { params: { id: serviceId } });
    return res.data;
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
    return res.data;
  }

  async updateVoucher(data: Record<string, string | number | undefined>) {
    let http = this.getAxios();
    let res = await http.put('/voucher', encodeFormData(data), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return res.data;
  }

  async deleteVoucher(voucherId: string) {
    let http = this.getAxios();
    let res = await http.delete('/voucher', { params: { id: voucherId } });
    return res.data;
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
    return res.data;
  }

  async deleteNonWorkingTime(nwId: string) {
    let http = this.getAxios();
    let res = await http.delete('/calendarsnonworkingtimes', { params: { id: nwId } });
    return res.data;
  }
}

let filterUndefined = (
  obj: Record<string, string | number | undefined>
): Record<string, string | number> => {
  let result: Record<string, string | number> = {};
  for (let key of Object.keys(obj)) {
    let val = obj[key];
    if (val !== undefined && val !== null && val !== '') {
      result[key] = val;
    }
  }
  return result;
};

let encodeFormData = (data: Record<string, string | number | undefined>): string => {
  let filtered = filterUndefined(data);
  let params = new URLSearchParams();
  for (let [key, value] of Object.entries(filtered)) {
    params.append(key, String(value));
  }
  return params.toString();
};
