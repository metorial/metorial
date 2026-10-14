import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

let BASE_URL = 'https://api.hubplanner.com/v1';

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    let token = config.token?.trim();
    if (!token || /[\r\n]/.test(token)) {
      throw createApiServiceError(
        'A valid Hub Planner API key is required. Reconnect with a generated API key.'
      );
    }
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      timeout: 30000,
      authHeader: { value: token },
      headers: { Accept: 'application/json' },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Hub Planner',
          reason: 'hub_planner_api_error'
        })
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
    let res = await this.axios.get(`/project/${encodeURIComponent(projectId)}`);
    return res.data;
  }

  async createProject(data: Record<string, any>): Promise<any> {
    let res = await this.axios.post('/project', pickDefined(data));
    return res.data;
  }

  async updateProject(projectId: string, data: Record<string, any>): Promise<any> {
    let res = await this.axios.patch('/project', [{ ...pickDefined(data), _id: projectId }]);
    return res.data;
  }

  async deleteProject(projectId: string): Promise<void> {
    await this.axios.delete(`/project/${encodeURIComponent(projectId)}`);
  }

  async searchProjects(
    filters: Record<string, any>,
    page?: number,
    limit?: number
  ): Promise<any[]> {
    let res = await this.axios.post('/project/search', pickDefined(filters), {
      params: pickDefined({ page, limit })
    });
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
    let res = await this.axios.get(`/resource/${encodeURIComponent(resourceId)}`);
    return res.data;
  }

  async createResource(data: Record<string, any>): Promise<any> {
    let res = await this.axios.post('/resource', pickDefined(data));
    return res.data;
  }

  async updateResource(resourceId: string, data: Record<string, any>): Promise<any> {
    let res = await this.axios.patch('/resource', [{ ...pickDefined(data), _id: resourceId }]);
    return res.data;
  }

  async deleteResource(resourceId: string): Promise<void> {
    await this.axios.delete(`/resource/${encodeURIComponent(resourceId)}`);
  }

  async searchResources(
    filters: Record<string, any>,
    page?: number,
    limit?: number
  ): Promise<any[]> {
    let res = await this.axios.post('/resource/search', pickDefined(filters), {
      params: pickDefined({ page, limit })
    });
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
    let res = await this.axios.get(`/booking/${encodeURIComponent(bookingId)}`);
    return res.data;
  }

  async createBooking(data: Record<string, any>): Promise<any> {
    let res = await this.axios.post('/booking', pickDefined(data));
    return res.data;
  }

  async updateBooking(bookingId: string, data: Record<string, any>): Promise<any> {
    let res = await this.axios.patch(
      `/booking/${encodeURIComponent(bookingId)}`,
      pickDefined(data)
    );
    return res.data;
  }

  async deleteBooking(bookingId: string): Promise<void> {
    await this.axios.delete(`/booking/${encodeURIComponent(bookingId)}`);
  }

  async deleteBookingsBulk(ids: string[]): Promise<any> {
    let res = await this.axios.delete('/booking', { data: ids });
    return res.data;
  }

  async searchBookings(
    filters: Record<string, any>,
    page?: number,
    limit?: number
  ): Promise<any[]> {
    let res = await this.axios.post('/booking/search', pickDefined(filters), {
      params: pickDefined({ page, limit })
    });
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
    let res = await this.axios.get(`/timeentry/${encodeURIComponent(timeEntryId)}`);
    return res.data;
  }

  async createTimeEntry(data: Record<string, any>): Promise<any> {
    let res = await this.axios.post('/timeentry', pickDefined(data));
    return res.data;
  }

  async updateTimeEntry(timeEntryId: string, data: Record<string, any>): Promise<any> {
    let res = await this.axios.put(
      `/timeentry/${encodeURIComponent(timeEntryId)}`,
      pickDefined(data)
    );
    return res.data;
  }

  async deleteTimeEntry(timeEntryId: string): Promise<void> {
    await this.axios.delete(`/timeentry/${encodeURIComponent(timeEntryId)}`);
  }

  async searchTimeEntries(
    filters: Record<string, any>,
    page?: number,
    limit?: number
  ): Promise<any[]> {
    let res = await this.axios.post('/timeentry/search', pickDefined(filters), {
      params: pickDefined({ page, limit })
    });
    return res.data;
  }

  // --- Events ---

  async getEvents(page?: number, limit?: number): Promise<any[]> {
    let res = await this.axios.get('/event', { params: pickDefined({ page, limit }) });
    return res.data;
  }

  async getEvent(eventId: string): Promise<any> {
    let res = await this.axios.get(`/event/${encodeURIComponent(eventId)}`);
    return res.data;
  }

  async createEvent(data: Record<string, any>): Promise<any> {
    let res = await this.axios.post('/event', pickDefined(data));
    return res.data;
  }

  async updateEvent(eventId: string, data: Record<string, any>): Promise<any> {
    let res = await this.axios.put(`/event/${encodeURIComponent(eventId)}`, pickDefined(data));
    return res.data;
  }

  async deleteEvent(eventId: string): Promise<void> {
    await this.axios.delete(`/event/${encodeURIComponent(eventId)}`);
  }

  async searchEvents(filters: Record<string, any>): Promise<any[]> {
    let res = await this.axios.post('/event/search', filters);
    return res.data;
  }

  // --- Milestones ---

  async getMilestone(milestoneId: string): Promise<any> {
    let res = await this.axios.get(`/milestone/${encodeURIComponent(milestoneId)}`);
    return res.data;
  }

  async createMilestone(data: Record<string, any>): Promise<any> {
    let res = await this.axios.post('/milestone', pickDefined(data));
    return res.data;
  }

  async updateMilestone(milestoneId: string, data: Record<string, any>): Promise<any> {
    let res = await this.axios.put(
      `/milestone/${encodeURIComponent(milestoneId)}`,
      pickDefined(data)
    );
    return res.data;
  }

  async deleteMilestone(milestoneId: string): Promise<void> {
    await this.axios.delete(`/milestone/${encodeURIComponent(milestoneId)}`);
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
    let res = await this.axios.get(`/vacation/${encodeURIComponent(vacationId)}`);
    return res.data;
  }

  async createVacation(data: Record<string, any>): Promise<any> {
    let res = await this.axios.post('/vacation', pickDefined(data));
    return res.data;
  }

  async updateVacation(vacationId: string, data: Record<string, any>): Promise<any> {
    let res = await this.axios.patch(
      `/vacation/${encodeURIComponent(vacationId)}`,
      pickDefined(data)
    );
    return res.data;
  }

  async deleteVacation(vacationId: string): Promise<void> {
    await this.axios.delete(`/vacation/${encodeURIComponent(vacationId)}`);
  }

  async searchVacations(filters: Record<string, any>): Promise<any[]> {
    let res = await this.axios.post('/vacation/search', filters);
    return res.data;
  }

  // --- Clients ---

  async getClients(page?: number, limit?: number): Promise<any[]> {
    let res = await this.axios.get('/client', { params: pickDefined({ page, limit }) });
    return res.data;
  }

  async getClient(clientId: string): Promise<any> {
    let res = await this.axios.get(`/client/${encodeURIComponent(clientId)}`);
    return res.data;
  }

  async createClient(data: Record<string, any>): Promise<any> {
    let res = await this.axios.post('/client', pickDefined(data));
    return res.data;
  }

  async updateClient(clientId: string, data: Record<string, any>): Promise<any> {
    let res = await this.axios.put(
      `/client/${encodeURIComponent(clientId)}`,
      pickDefined(data)
    );
    return res.data;
  }

  async deleteClient(clientId: string): Promise<void> {
    await this.axios.delete(`/client/${encodeURIComponent(clientId)}`);
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
    let res = await this.axios.get(`/holiday/${encodeURIComponent(holidayId)}`);
    return res.data;
  }

  async createHoliday(data: Record<string, any>): Promise<any> {
    let res = await this.axios.post('/holiday', pickDefined(data));
    return res.data;
  }

  async updateHoliday(holidayId: string, data: Record<string, any>): Promise<any> {
    let res = await this.axios.put(
      `/holiday/${encodeURIComponent(holidayId)}`,
      pickDefined(data)
    );
    return res.data;
  }

  async deleteHoliday(holidayId: string): Promise<void> {
    await this.axios.delete(`/holiday/${encodeURIComponent(holidayId)}`);
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
    let res = await this.axios.get(`/categories/${encodeURIComponent(categoryId)}`);
    return res.data;
  }

  async createBookingCategory(data: Record<string, any>): Promise<any> {
    let res = await this.axios.post('/categories', pickDefined(data));
    return res.data;
  }

  async updateBookingCategory(categoryId: string, data: Record<string, any>): Promise<any> {
    let res = await this.axios.put(
      `/categories/${encodeURIComponent(categoryId)}`,
      pickDefined(data)
    );
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
