import { createAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string; apiHost: string }) {
    this.axios = createAxios({
      baseURL: `https://${config.apiHost}/v1`,
      headers: {
        'x-api-key': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Clients ----

  async searchClients(params?: {
    search?: string;
    locationId?: string;
    tags?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    pageSize?: number;
  }) {
    let res = await this.axios.get('/clients', { params });
    return res.data;
  }

  async getClient(clientId: string) {
    let res = await this.axios.get(`/clients/${clientId}`);
    return res.data;
  }

  async createClient(data: Record<string, any>) {
    let res = await this.axios.post('/clients', data);
    return res.data;
  }

  async updateClient(clientId: string, data: Record<string, any>) {
    let res = await this.axios.put(`/clients/${clientId}`, data);
    return res.data;
  }

  async deleteClient(clientId: string) {
    let res = await this.axios.delete(`/clients/${clientId}`);
    return res.data;
  }

  async addClientTags(clientId: string, tags: string[]) {
    let res = await this.axios.post(`/clients/${clientId}/tags/add`, { tags });
    return res.data;
  }

  async removeClientTags(clientId: string, tags: string[]) {
    let res = await this.axios.post(`/clients/${clientId}/tags/remove`, { tags });
    return res.data;
  }

  // ---- Client Tags ----

  async listClientTags(params?: { search?: string }) {
    let res = await this.axios.get('/clientTags', { params });
    return res.data;
  }

  async createClientTag(data: { name: string }) {
    let res = await this.axios.post('/clientTags', data);
    return res.data;
  }

  async getClientTag(tagId: string) {
    let res = await this.axios.get(`/clientTags/${tagId}`);
    return res.data;
  }

  async deleteClientTag(tagId: string) {
    let res = await this.axios.delete(`/clientTags/${tagId}`);
    return res.data;
  }

  // ---- Contacts ----

  async searchContacts(params?: {
    search?: string;
    locationId?: string;
    tags?: string;
    stage?: string;
    channel?: string;
    page?: number;
    pageSize?: number;
  }) {
    let res = await this.axios.get('/contacts', { params });
    return res.data;
  }

  async getContact(contactId: string) {
    let res = await this.axios.get(`/contacts/${contactId}`);
    return res.data;
  }

  async createContact(data: Record<string, any>) {
    let res = await this.axios.post('/contacts', data);
    return res.data;
  }

  async updateContact(contactId: string, data: Record<string, any>) {
    let res = await this.axios.put(`/contacts/${contactId}`, data);
    return res.data;
  }

  async deleteContact(contactId: string) {
    let res = await this.axios.delete(`/contacts/${contactId}`);
    return res.data;
  }

  async addContactTags(contactId: string, tags: string[]) {
    let res = await this.axios.post(`/contacts/${contactId}/tags/add`, { tags });
    return res.data;
  }

  async removeContactTags(contactId: string, tags: string[]) {
    let res = await this.axios.post(`/contacts/${contactId}/tags/remove`, { tags });
    return res.data;
  }

  // ---- Contact Tags ----

  async listContactTags(params?: { search?: string }) {
    let res = await this.axios.get('/contactTags', { params });
    return res.data;
  }

  async createContactTag(data: { name: string }) {
    let res = await this.axios.post('/contactTags', data);
    return res.data;
  }

  async getContactTag(tagId: string) {
    let res = await this.axios.get(`/contactTags/${tagId}`);
    return res.data;
  }

  async deleteContactTag(tagId: string) {
    let res = await this.axios.delete(`/contactTags/${tagId}`);
    return res.data;
  }

  // ---- Messages ----

  async getMessages(contactId: string, params?: { page?: number; pageSize?: number }) {
    let res = await this.axios.get(`/messages/${contactId}`, { params });
    return res.data;
  }

  async sendMessage(channel: string, messageType: string, data: Record<string, any>) {
    let res = await this.axios.post(`/messages/${channel}/${messageType}`, data);
    return res.data;
  }

  // ---- Segments ----

  async listSegments(params?: { search?: string; page?: number; pageSize?: number }) {
    let res = await this.axios.get('/segments', { params });
    return res.data;
  }

  async getSegment(segmentId: string) {
    let res = await this.axios.get(`/segments/${segmentId}`);
    return res.data;
  }

  async createSegment(data: Record<string, any>) {
    let res = await this.axios.post('/segments', data);
    return res.data;
  }

  async deleteSegment(segmentId: string) {
    let res = await this.axios.delete(`/segments/${segmentId}`);
    return res.data;
  }

  // ---- Broadcasts ----

  async listBroadcasts(params?: { page?: number; pageSize?: number }) {
    let res = await this.axios.get('/broadcasts', { params });
    return res.data;
  }

  async getBroadcast(broadcastId: string) {
    let res = await this.axios.get(`/broadcasts/${broadcastId}`);
    return res.data;
  }

  async createBroadcast(data: Record<string, any>) {
    let res = await this.axios.post('/broadcasts', data);
    return res.data;
  }

  async updateBroadcast(broadcastId: string, data: Record<string, any>) {
    let res = await this.axios.put(`/broadcasts/${broadcastId}`, data);
    return res.data;
  }

  async deleteBroadcast(broadcastId: string) {
    let res = await this.axios.delete(`/broadcasts/${broadcastId}`);
    return res.data;
  }

  async getBroadcastLogs(broadcastId: string, params?: { page?: number; pageSize?: number }) {
    let res = await this.axios.get(`/broadcasts/${broadcastId}/logs`, { params });
    return res.data;
  }

  // ---- Appointments ----

  async getAppointmentSlots(params: {
    serviceId: string;
    staffId?: string;
    locationId?: string;
    fromDate: string;
    toDate: string;
    timezone?: string;
  }) {
    let res = await this.axios.get('/appointments/slots', { params });
    return res.data;
  }

  async searchAppointments(params?: {
    fromDate?: string;
    toDate?: string;
    clientId?: string;
    serviceId?: string;
    staffId?: string;
    locationId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    let res = await this.axios.get('/appointments', { params });
    return res.data;
  }

  async getAppointment(appointmentId: string) {
    let res = await this.axios.get(`/appointments/${appointmentId}`);
    return res.data;
  }

  async createAppointment(data: Record<string, any>) {
    let res = await this.axios.post('/appointments', data);
    return res.data;
  }

  async rescheduleAppointment(data: {
    appointmentId: string;
    date: string;
    time: string;
    staffId?: string;
  }) {
    let res = await this.axios.post('/appointments/reschedule', data);
    return res.data;
  }

  async cancelAppointment(data: { appointmentId: string; reason?: string }) {
    let res = await this.axios.post('/appointments/cancel', data);
    return res.data;
  }

  // ---- Classes ----

  async searchClasses(params?: {
    fromDate?: string;
    toDate?: string;
    locationId?: string;
    staffId?: string;
    serviceId?: string;
    page?: number;
    pageSize?: number;
  }) {
    let res = await this.axios.get('/classes', { params });
    return res.data;
  }

  async getClass(classId: string) {
    let res = await this.axios.get(`/classes/${classId}`);
    return res.data;
  }

  async createClass(data: Record<string, any>) {
    let res = await this.axios.post('/classes', data);
    return res.data;
  }

  async updateClass(classId: string, data: Record<string, any>) {
    let res = await this.axios.put(`/classes/${classId}`, data);
    return res.data;
  }

  async deleteClass(classId: string) {
    let res = await this.axios.delete(`/classes/${classId}`);
    return res.data;
  }

  async getClassParticipants(classId: string) {
    let res = await this.axios.get(`/classes/${classId}/participants`);
    return res.data;
  }

  async addClassParticipant(classId: string, data: { clientId: string; status?: string }) {
    let res = await this.axios.post(`/classes/${classId}/participants/add`, data);
    return res.data;
  }

  async cancelClassParticipant(classId: string, data: { clientId: string; reason?: string }) {
    let res = await this.axios.post(`/classes/${classId}/participants/cancel`, data);
    return res.data;
  }

  async getClientClassBookings(
    clientId: string,
    params?: { page?: number; pageSize?: number }
  ) {
    let res = await this.axios.get(`/classes/clients/${clientId}/bookings`, { params });
    return res.data;
  }

  // ---- Services ----

  async listServices(params?: { page?: number; pageSize?: number }) {
    let res = await this.axios.get('/services', { params });
    return res.data;
  }

  async getService(serviceId: string) {
    let res = await this.axios.get(`/services/${serviceId}`);
    return res.data;
  }

  async createService(data: Record<string, any>) {
    let res = await this.axios.post('/services', data);
    return res.data;
  }

  async updateService(serviceId: string, data: Record<string, any>) {
    let res = await this.axios.put(`/services/${serviceId}`, data);
    return res.data;
  }

  // ---- Service Categories ----

  async listServiceCategories(params?: { page?: number; pageSize?: number }) {
    let res = await this.axios.get('/serviceCategories', { params });
    return res.data;
  }

  async getServiceCategory(categoryId: string) {
    let res = await this.axios.get(`/serviceCategories/${categoryId}`);
    return res.data;
  }

  async createServiceCategory(data: Record<string, any>) {
    let res = await this.axios.post('/serviceCategories', data);
    return res.data;
  }

  async deleteServiceCategory(categoryId: string) {
    let res = await this.axios.delete(`/serviceCategories/${categoryId}`);
    return res.data;
  }

  // ---- Staff ----

  async listStaff(params?: { page?: number; pageSize?: number }) {
    let res = await this.axios.get('/staffs', { params });
    return res.data;
  }

  async getStaff(staffId: string) {
    let res = await this.axios.get(`/staffs/${staffId}`);
    return res.data;
  }

  async getStaffAvailabilityBlocks(
    staffId: string,
    params?: { fromDate?: string; toDate?: string }
  ) {
    let res = await this.axios.get(`/staffs/${staffId}/availabilityBlocks`, { params });
    return res.data;
  }

  async createStaffAvailabilityBlock(staffId: string, data: Record<string, any>) {
    let res = await this.axios.post(`/staffs/${staffId}/availabilityBlocks`, data);
    return res.data;
  }

  async getStaffAvailabilityBlock(staffId: string, blockId: string) {
    let res = await this.axios.get(`/staffs/${staffId}/availabilityBlocks/${blockId}`);
    return res.data;
  }

  async deleteStaffAvailabilityBlock(staffId: string, blockId: string) {
    let res = await this.axios.delete(`/staffs/${staffId}/availabilityBlocks/${blockId}`);
    return res.data;
  }

  // ---- Locations ----

  async listLocations() {
    let res = await this.axios.get('/locations');
    return res.data;
  }

  async getLocation(locationId: string) {
    let res = await this.axios.get(`/locations/${locationId}`);
    return res.data;
  }

  // ---- Webhooks ----

  async listWebhooks() {
    let res = await this.axios.get('/webhooks');
    return res.data;
  }

  async getWebhook(webhookId: string) {
    let res = await this.axios.get(`/webhooks/${webhookId}`);
    return res.data;
  }

  async createWebhook(data: {
    serverUrl: string;
    eventTypes: string[];
    customHeaders?: Record<string, string>;
    isActive?: boolean;
  }) {
    let res = await this.axios.post('/webhooks', data);
    return res.data;
  }

  async updateWebhook(webhookId: string, data: Record<string, any>) {
    let res = await this.axios.put(`/webhooks/${webhookId}`, data);
    return res.data;
  }

  async deleteWebhook(webhookId: string) {
    let res = await this.axios.delete(`/webhooks/${webhookId}`);
    return res.data;
  }
}
