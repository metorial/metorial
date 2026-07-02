import { createAxios } from 'slates';

let BASE_URL = 'https://api.hubplanner.com/v1';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // --- Projects ---

  async getProjects(page?: number, limit?: number): Promise<any[]> {
    let params: Record<string, any> = {};
    if (page !== undefined) params.page = page;
    if (limit !== undefined) params.limit = limit;
    let res = await this.axios.get('/project', { params });
    return res.data;
  }

  async getProject(projectId: string): Promise<any> {
    let res = await this.axios.get(`/project/${projectId}`);
    return res.data;
  }

  async createProject(data: Record<string, any>): Promise<any> {
    let res = await this.axios.post('/project', data);
    return res.data;
  }

  async updateProject(projectId: string, data: Record<string, any>): Promise<any> {
    let res = await this.axios.patch('/project', [{ _id: projectId, ...data }]);
    return res.data;
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.axios.delete(`/project/${projectId}`);
  }

  async searchProjects(filters: Record<string, any>): Promise<any[]> {
    let res = await this.axios.post('/project/search', filters);
    return res.data;
  }

  // --- Resources ---

  async getResources(page?: number, limit?: number): Promise<any[]> {
    let params: Record<string, any> = {};
    if (page !== undefined) params.page = page;
    if (limit !== undefined) params.limit = limit;
    let res = await this.axios.get('/resource', { params });
    return res.data;
  }

  async getResource(resourceId: string): Promise<any> {
    let res = await this.axios.get(`/resource/${resourceId}`);
    return res.data;
  }

  async createResource(data: Record<string, any>): Promise<any> {
    let res = await this.axios.post('/resource', data);
    return res.data;
  }

  async updateResource(resourceId: string, data: Record<string, any>): Promise<any> {
    let res = await this.axios.patch('/resource', [{ _id: resourceId, ...data }]);
    return res.data;
  }

  async deleteResource(resourceId: string): Promise<void> {
    await this.axios.delete(`/resource/${resourceId}`);
  }

  async searchResources(filters: Record<string, any>): Promise<any[]> {
    let res = await this.axios.post('/resource/search', filters);
    return res.data;
  }

  // --- Bookings ---

  async getBookings(page?: number, limit?: number): Promise<any[]> {
    let params: Record<string, any> = {};
    if (page !== undefined) params.page = page;
    if (limit !== undefined) params.limit = limit;
    let res = await this.axios.get('/booking', { params });
    return res.data;
  }

  async getBooking(bookingId: string): Promise<any> {
    let res = await this.axios.get(`/booking/${bookingId}`);
    return res.data;
  }

  async createBooking(data: Record<string, any>): Promise<any> {
    let res = await this.axios.post('/booking', data);
    return res.data;
  }

  async updateBooking(bookingId: string, data: Record<string, any>): Promise<any> {
    let res = await this.axios.patch(`/booking/${bookingId}`, data);
    return res.data;
  }

  async deleteBooking(bookingId: string): Promise<void> {
    await this.axios.delete(`/booking/${bookingId}`);
  }

  async deleteBookingsBulk(ids: string[]): Promise<void> {
    await this.axios.delete('/booking', { params: { ids: ids.join(',') } });
  }

  async searchBookings(filters: Record<string, any>): Promise<any[]> {
    let res = await this.axios.post('/booking/search', filters);
    return res.data;
  }

  // --- Time Entries ---

  async getTimeEntries(page?: number, limit?: number): Promise<any[]> {
    let params: Record<string, any> = {};
    if (page !== undefined) params.page = page;
    if (limit !== undefined) params.limit = limit;
    let res = await this.axios.get('/timeentry', { params });
    return res.data;
  }

  async getTimeEntry(timeEntryId: string): Promise<any> {
    let res = await this.axios.get(`/timeentry/${timeEntryId}`);
    return res.data;
  }

  async createTimeEntry(data: Record<string, any>): Promise<any> {
    let res = await this.axios.post('/timeentry', data);
    return res.data;
  }

  async updateTimeEntry(timeEntryId: string, data: Record<string, any>): Promise<any> {
    let res = await this.axios.put(`/timeentry/${timeEntryId}`, data);
    return res.data;
  }

  async deleteTimeEntry(timeEntryId: string): Promise<void> {
    await this.axios.delete(`/timeentry/${timeEntryId}`);
  }

  async searchTimeEntries(filters: Record<string, any>): Promise<any[]> {
    let res = await this.axios.post('/timeentry/search', filters);
    return res.data;
  }

  // --- Events ---

  async getEvents(): Promise<any[]> {
    let res = await this.axios.get('/event');
    return res.data;
  }

  async getEvent(eventId: string): Promise<any> {
    let res = await this.axios.get(`/event/${eventId}`);
    return res.data;
  }

  async createEvent(data: Record<string, any>): Promise<any> {
    let res = await this.axios.post('/event', data);
    return res.data;
  }

  async updateEvent(eventId: string, data: Record<string, any>): Promise<any> {
    let res = await this.axios.put(`/event/${eventId}`, data);
    return res.data;
  }

  async deleteEvent(eventId: string): Promise<void> {
    await this.axios.delete(`/event/${eventId}`);
  }

  async searchEvents(filters: Record<string, any>): Promise<any[]> {
    let res = await this.axios.post('/event/search', filters);
    return res.data;
  }

  // --- Milestones ---

  async getMilestone(milestoneId: string): Promise<any> {
    let res = await this.axios.get(`/milestone/${milestoneId}`);
    return res.data;
  }

  async createMilestone(data: Record<string, any>): Promise<any> {
    let res = await this.axios.post('/milestone', data);
    return res.data;
  }

  async updateMilestone(milestoneId: string, data: Record<string, any>): Promise<any> {
    let res = await this.axios.put(`/milestone/${milestoneId}`, data);
    return res.data;
  }

  async deleteMilestone(milestoneId: string): Promise<void> {
    await this.axios.delete(`/milestone/${milestoneId}`);
  }

  async searchMilestones(filters: Record<string, any>): Promise<any[]> {
    let res = await this.axios.post('/milestone/search', filters);
    return res.data;
  }

  // --- Vacations ---

  async getVacations(): Promise<any[]> {
    let res = await this.axios.get('/vacation');
    return res.data;
  }

  async getVacation(vacationId: string): Promise<any> {
    let res = await this.axios.get(`/vacation/${vacationId}`);
    return res.data;
  }

  async createVacation(data: Record<string, any>): Promise<any> {
    let res = await this.axios.post('/vacation', data);
    return res.data;
  }

  async updateVacation(vacationId: string, data: Record<string, any>): Promise<any> {
    let res = await this.axios.patch(`/vacation/${vacationId}`, data);
    return res.data;
  }

  async deleteVacation(vacationId: string): Promise<void> {
    await this.axios.delete(`/vacation/${vacationId}`);
  }

  async searchVacations(filters: Record<string, any>): Promise<any[]> {
    let res = await this.axios.post('/vacation/search', filters);
    return res.data;
  }

  // --- Clients ---

  async getClients(): Promise<any[]> {
    let res = await this.axios.get('/client');
    return res.data;
  }

  async getClient(clientId: string): Promise<any> {
    let res = await this.axios.get(`/client/${clientId}`);
    return res.data;
  }

  async createClient(data: Record<string, any>): Promise<any> {
    let res = await this.axios.post('/client', data);
    return res.data;
  }

  async updateClient(clientId: string, data: Record<string, any>): Promise<any> {
    let res = await this.axios.put(`/client/${clientId}`, data);
    return res.data;
  }

  async deleteClient(clientId: string): Promise<void> {
    await this.axios.delete(`/client/${clientId}`);
  }

  async searchClients(filters: Record<string, any>): Promise<any[]> {
    let res = await this.axios.post('/client/search', filters);
    return res.data;
  }

  // --- Holidays ---

  async getHolidays(): Promise<any[]> {
    let res = await this.axios.get('/holiday');
    return res.data;
  }

  async getHoliday(holidayId: string): Promise<any> {
    let res = await this.axios.get(`/holiday/${holidayId}`);
    return res.data;
  }

  async createHoliday(data: Record<string, any>): Promise<any> {
    let res = await this.axios.post('/holiday', data);
    return res.data;
  }

  async updateHoliday(holidayId: string, data: Record<string, any>): Promise<any> {
    let res = await this.axios.put(`/holiday/${holidayId}`, data);
    return res.data;
  }

  async deleteHoliday(holidayId: string): Promise<void> {
    await this.axios.delete(`/holiday/${holidayId}`);
  }

  async searchHolidays(filters: Record<string, any>): Promise<any[]> {
    let res = await this.axios.post('/holiday/search', filters);
    return res.data;
  }

  // --- Booking Categories ---

  async getBookingCategories(): Promise<any[]> {
    let res = await this.axios.get('/categories');
    return res.data;
  }

  async getBookingCategory(categoryId: string): Promise<any> {
    let res = await this.axios.get(`/categories/${categoryId}`);
    return res.data;
  }

  async createBookingCategory(data: Record<string, any>): Promise<any> {
    let res = await this.axios.post('/categories', data);
    return res.data;
  }

  async updateBookingCategory(categoryId: string, data: Record<string, any>): Promise<any> {
    let res = await this.axios.put(`/categories/${categoryId}`, data);
    return res.data;
  }

  async getCategoryGroups(): Promise<any[]> {
    let res = await this.axios.get('/category-groups');
    return res.data;
  }

  // --- Webhooks (Subscriptions) ---

  async getWebhooks(): Promise<any[]> {
    let res = await this.axios.get('/subscription');
    return res.data;
  }

  async createWebhook(data: {
    event: string;
    target_url: string;
    authorization_token?: string;
  }): Promise<any> {
    let res = await this.axios.post('/subscription', data);
    return res.data;
  }

  async deleteWebhook(subscriptionId: string): Promise<void> {
    await this.axios.delete(`/subscription/${subscriptionId}`);
  }

  // --- Project Resources / Tags ---

  async addResourcesToProject(projectId: string, resourceIds: string[]): Promise<any> {
    let res = await this.axios.post(`/project/${projectId}/addResourcesToProject`, {
      resourceIds
    });
    return res.data;
  }

  async getProjectTags(projectId: string): Promise<any[]> {
    let res = await this.axios.get(`/project/${projectId}/tag`);
    return res.data;
  }

  async addProjectTags(projectId: string, tagIds: string[]): Promise<any> {
    let res = await this.axios.patch(`/project/${projectId}/tag`, { tags: tagIds });
    return res.data;
  }

  async removeProjectTag(projectId: string, tagId: string): Promise<void> {
    await this.axios.delete(`/project/${projectId}/tag/${tagId}`);
  }

  // --- Resource Tags ---

  async getResourceTags(resourceId: string): Promise<any[]> {
    let res = await this.axios.get(`/resource/${resourceId}/tag`);
    return res.data;
  }

  async addResourceTags(resourceId: string, tagIds: string[]): Promise<any> {
    let res = await this.axios.patch(`/resource/${resourceId}/tag`, { tags: tagIds });
    return res.data;
  }

  async removeResourceTag(resourceId: string, tagId: string): Promise<void> {
    await this.axios.delete(`/resource/${resourceId}/tag/${tagId}`);
  }
}
