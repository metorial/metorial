import { buildApiServiceError, createAuthenticatedAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(authConfig: { token: string; authMethod: 'oauth' | 'basic' }) {
    let authHeader =
      authConfig.authMethod === 'oauth'
        ? `Bearer ${authConfig.token}`
        : `Basic ${authConfig.token}`;

    this.axios = createAuthenticatedAxios({
      baseURL: 'https://acuityscheduling.com/api/v1',
      authHeader: { value: authHeader },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Acuity Scheduling',
          reason: 'acuity_api'
        })
    });
  }

  // ─── Appointments ───

  async listAppointments(params?: {
    max?: number;
    minDate?: string;
    maxDate?: string;
    calendarID?: number;
    appointmentTypeID?: number;
    canceled?: boolean;
    showall?: boolean;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    excludeForms?: boolean;
    direction?: 'ASC' | 'DESC';
  }) {
    let response = await this.axios.get('/appointments', { params });
    return response.data;
  }

  async getAppointment(appointmentId: number) {
    let response = await this.axios.get(`/appointments/${appointmentId}`);
    return response.data;
  }

  async createAppointment(
    data: {
      datetime: string;
      appointmentTypeID: number;
      firstName: string;
      lastName: string;
      email: string;
      calendarID?: number;
      phone?: string;
      timezone?: string;
      certificate?: string;
      notes?: string;
      addonIDs?: number[];
      fields?: Array<{ id: number; value: string }>;
      labels?: Array<{ id: number }>;
    },
    options?: { admin?: boolean; noEmail?: boolean }
  ) {
    let response = await this.axios.post('/appointments', data, { params: options });
    return response.data;
  }

  async updateAppointment(
    appointmentId: number,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      notes?: string;
      fields?: Array<{ id: number; value: string }>;
      labels?: Array<{ id: number }>;
      certificate?: string;
    },
    options?: { admin?: boolean }
  ) {
    let response = await this.axios.put(`/appointments/${appointmentId}`, data, {
      params: options
    });
    return response.data;
  }

  async cancelAppointment(
    appointmentId: number,
    data?: {
      cancelNote?: string;
      noEmail?: boolean;
      admin?: boolean;
      noShow?: boolean;
    }
  ) {
    let { admin, noEmail, ...body } = data ?? {};
    let response = await this.axios.put(`/appointments/${appointmentId}/cancel`, body, {
      params: { admin, noEmail }
    });
    return response.data;
  }

  async rescheduleAppointment(
    appointmentId: number,
    data: {
      datetime: string;
      calendarID?: number;
      timezone?: string;
      admin?: boolean;
      noEmail?: boolean;
    }
  ) {
    let { admin, noEmail, ...body } = data;
    let response = await this.axios.put(`/appointments/${appointmentId}/reschedule`, body, {
      params: { admin, noEmail }
    });
    return response.data;
  }

  async getAppointmentPayments(appointmentId: number) {
    let response = await this.axios.get(`/appointments/${appointmentId}/payments`);
    return response.data;
  }

  // ─── Availability ───

  async getAvailableDates(params: {
    appointmentTypeID: number;
    month: string;
    calendarID?: number;
    timezone?: string;
    addonIDs?: number[];
  }) {
    let response = await this.axios.get('/availability/dates', { params });
    return response.data;
  }

  async getAvailableTimes(params: {
    appointmentTypeID: number;
    date: string;
    calendarID?: number;
    timezone?: string;
    addonIDs?: number[];
    ignoreAppointmentIDs?: number[];
  }) {
    let response = await this.axios.get('/availability/times', { params });
    return response.data;
  }

  async getClassAvailability(params?: {
    appointmentTypeID?: number;
    month?: string;
    calendarID?: number;
    includeUnavailable?: boolean;
    includePrivate?: boolean;
    timezone?: string;
    minDate?: string;
    maxDate?: string;
  }) {
    let response = await this.axios.get('/availability/classes', { params });
    return response.data;
  }

  // ─── Blocks ───

  async listBlocks(params?: { minDate?: string; maxDate?: string; calendarID?: number }) {
    let response = await this.axios.get('/blocks', { params });
    return response.data;
  }

  async getBlock(blockId: number) {
    let response = await this.axios.get(`/blocks/${blockId}`);
    return response.data;
  }

  async createBlock(data: { start: string; end: string; calendarID: number; notes?: string }) {
    let response = await this.axios.post('/blocks', data);
    return response.data;
  }

  async deleteBlock(blockId: number) {
    let response = await this.axios.delete(`/blocks/${blockId}`);
    return response.data;
  }

  // ─── Calendars ───

  async listCalendars() {
    let response = await this.axios.get('/calendars');
    return response.data;
  }

  // ─── Clients ───

  async listClients(params?: {
    search?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  }) {
    let response = await this.axios.get('/clients', { params: { search: params?.search } });
    return (
      response.data as Array<{
        id?: number;
        firstName: string;
        lastName: string;
        email?: string;
        phone?: string;
        notes?: string;
      }>
    ).filter(client =>
      (['firstName', 'lastName', 'email', 'phone'] as const).every(
        key =>
          params?.[key] === undefined ||
          client[key]?.toLowerCase() === params[key]?.toLowerCase()
      )
    );
  }

  async createClient(data: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    notes?: string;
  }) {
    let response = await this.axios.post('/clients', data);
    return response.data;
  }

  async updateClient(
    selector: { firstName: string; lastName: string; phone?: string },
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      notes?: string;
    }
  ) {
    let response = await this.axios.put(
      '/clients',
      {
        ...data,
        firstName: data.firstName ?? selector.firstName,
        lastName: data.lastName ?? selector.lastName
      },
      { params: selector }
    );
    return response.data;
  }

  async deleteClient(selector: { firstName: string; lastName: string; phone?: string }) {
    let response = await this.axios.delete('/clients', { params: selector });
    return response.data;
  }

  // ─── Appointment Types ───

  async listAppointmentTypes() {
    let response = await this.axios.get('/appointment-types');
    return response.data;
  }

  // ─── Appointment Add-ons ───

  async listAppointmentAddons() {
    let response = await this.axios.get('/appointment-addons');
    return response.data;
  }

  // ─── Intake Forms ───

  async listForms() {
    let response = await this.axios.get('/forms');
    return response.data;
  }

  // ─── Certificates ───

  async listCertificates(params?: {
    productID?: number;
    orderID?: number;
    appointmentTypeID?: number;
    email?: string;
  }) {
    let response = await this.axios.get('/certificates', { params });
    return response.data;
  }

  async createCertificate(data: {
    productID?: number;
    couponID?: number;
    certificate?: string;
    email?: string;
  }) {
    let response = await this.axios.post('/certificates', data);
    return response.data;
  }

  async deleteCertificate(certificateId: number) {
    let response = await this.axios.delete(`/certificates/${certificateId}`);
    return response.data;
  }

  async checkCertificate(params: { certificate: string; appointmentTypeID?: number }) {
    let response = await this.axios.get('/certificates/check', { params });
    return response.data;
  }

  // ─── Products ───

  async listProducts() {
    let response = await this.axios.get('/products');
    return response.data;
  }

  // ─── Orders ───

  async listOrders() {
    let response = await this.axios.get('/orders');
    return response.data;
  }

  // ─── Labels ───

  async listLabels() {
    let response = await this.axios.get('/labels');
    return response.data;
  }

  // ─── Account ───

  async getMe() {
    let response = await this.axios.get('/me');
    return response.data;
  }

  // ─── Webhooks ───

  async listWebhooks() {
    let response = await this.axios.get('/webhooks');
    return response.data;
  }

  async createWebhook(data: { event: string; target: string }) {
    let response = await this.axios.post('/webhooks', data);
    return response.data;
  }

  async deleteWebhook(webhookId: number) {
    let response = await this.axios.delete(`/webhooks/${webhookId}`);
    return response.data;
  }
}
