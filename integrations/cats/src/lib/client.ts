import { createAxios } from 'slates';

let BASE_URL = 'https://api.catsone.com/v3';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Token ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Candidates ────────────────────────────────────────────

  async listCandidates(params?: { page?: number; perPage?: number }) {
    let response = await this.axios.get('/candidates', {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async getCandidate(candidateId: string) {
    let response = await this.axios.get(`/candidates/${candidateId}`);
    return response.data;
  }

  async createCandidate(data: Record<string, any>, checkDuplicate?: boolean) {
    let response = await this.axios.post('/candidates', data, {
      params: checkDuplicate ? { check_duplicate: true } : undefined
    });
    return response.data;
  }

  async updateCandidate(candidateId: string, data: Record<string, any>) {
    let response = await this.axios.put(`/candidates/${candidateId}`, data);
    return response.data;
  }

  async deleteCandidate(candidateId: string) {
    await this.axios.delete(`/candidates/${candidateId}`);
  }

  async searchCandidates(query: string, params?: { page?: number; perPage?: number }) {
    let response = await this.axios.get('/candidates/search', {
      params: { query, page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async filterCandidates(
    filters: Record<string, any>,
    params?: { page?: number; perPage?: number }
  ) {
    let response = await this.axios.post('/candidates/search', filters, {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async getCandidateTags(candidateId: string) {
    let response = await this.axios.get(`/candidates/${candidateId}/tags`);
    return response.data;
  }

  async replaceCandidateTags(candidateId: string, tags: string[]) {
    let response = await this.axios.post(`/candidates/${candidateId}/tags`, { tags });
    return response.data;
  }

  async attachCandidateTags(candidateId: string, tags: string[]) {
    let response = await this.axios.put(`/candidates/${candidateId}/tags`, { tags });
    return response.data;
  }

  async getCandidateWorkHistory(candidateId: string) {
    let response = await this.axios.get(`/candidates/${candidateId}/work_history`);
    return response.data;
  }

  async createCandidateWorkHistory(candidateId: string, data: Record<string, any>) {
    let response = await this.axios.post(`/candidates/${candidateId}/work_history`, data);
    return response.data;
  }

  async getCandidateCustomFields(candidateId: string) {
    let response = await this.axios.get(`/candidates/${candidateId}/custom_fields`);
    return response.data;
  }

  async updateCandidateCustomField(candidateId: string, fieldId: string, value: any) {
    let response = await this.axios.put(
      `/candidates/${candidateId}/custom_fields/${fieldId}`,
      { value }
    );
    return response.data;
  }

  async getCandidateActivities(
    candidateId: string,
    params?: { page?: number; perPage?: number }
  ) {
    let response = await this.axios.get(`/candidates/${candidateId}/activities`, {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async createCandidateActivity(candidateId: string, data: Record<string, any>) {
    let response = await this.axios.post(`/candidates/${candidateId}/activities`, data);
    return response.data;
  }

  // ─── Jobs ──────────────────────────────────────────────────

  async listJobs(params?: { page?: number; perPage?: number }) {
    let response = await this.axios.get('/jobs', {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async getJob(jobId: string) {
    let response = await this.axios.get(`/jobs/${jobId}`);
    return response.data;
  }

  async createJob(data: Record<string, any>) {
    let response = await this.axios.post('/jobs', data);
    return response.data;
  }

  async updateJob(jobId: string, data: Record<string, any>) {
    let response = await this.axios.put(`/jobs/${jobId}`, data);
    return response.data;
  }

  async deleteJob(jobId: string) {
    await this.axios.delete(`/jobs/${jobId}`);
  }

  async searchJobs(query: string, params?: { page?: number; perPage?: number }) {
    let response = await this.axios.get('/jobs/search', {
      params: { query, page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async filterJobs(
    filters: Record<string, any>,
    params?: { page?: number; perPage?: number }
  ) {
    let response = await this.axios.post('/jobs/search', filters, {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async getJobPipelines(jobId: string, params?: { page?: number; perPage?: number }) {
    let response = await this.axios.get(`/jobs/${jobId}/pipelines`, {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async getJobStatuses(jobId: string) {
    let response = await this.axios.get(`/jobs/${jobId}/statuses`);
    return response.data;
  }

  async changeJobStatus(jobId: string, data: Record<string, any>) {
    let response = await this.axios.post(`/jobs/${jobId}/statuses`, data);
    return response.data;
  }

  async getJobTags(jobId: string) {
    let response = await this.axios.get(`/jobs/${jobId}/tags`);
    return response.data;
  }

  async attachJobTags(jobId: string, tags: string[]) {
    let response = await this.axios.put(`/jobs/${jobId}/tags`, { tags });
    return response.data;
  }

  async getJobCustomFields(jobId: string) {
    let response = await this.axios.get(`/jobs/${jobId}/custom_fields`);
    return response.data;
  }

  // ─── Companies ─────────────────────────────────────────────

  async listCompanies(params?: { page?: number; perPage?: number }) {
    let response = await this.axios.get('/companies', {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async getCompany(companyId: string) {
    let response = await this.axios.get(`/companies/${companyId}`);
    return response.data;
  }

  async createCompany(data: Record<string, any>) {
    let response = await this.axios.post('/companies', data);
    return response.data;
  }

  async updateCompany(companyId: string, data: Record<string, any>) {
    let response = await this.axios.put(`/companies/${companyId}`, data);
    return response.data;
  }

  async deleteCompany(companyId: string) {
    await this.axios.delete(`/companies/${companyId}`);
  }

  async searchCompanies(query: string, params?: { page?: number; perPage?: number }) {
    let response = await this.axios.get('/companies/search', {
      params: { query, page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async filterCompanies(
    filters: Record<string, any>,
    params?: { page?: number; perPage?: number }
  ) {
    let response = await this.axios.post('/companies/search', filters, {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async getCompanyDepartments(companyId: string) {
    let response = await this.axios.get(`/companies/${companyId}/departments`);
    return response.data;
  }

  async getCompanyTags(companyId: string) {
    let response = await this.axios.get(`/companies/${companyId}/tags`);
    return response.data;
  }

  async attachCompanyTags(companyId: string, tags: string[]) {
    let response = await this.axios.put(`/companies/${companyId}/tags`, { tags });
    return response.data;
  }

  // ─── Contacts ──────────────────────────────────────────────

  async listContacts(params?: { page?: number; perPage?: number }) {
    let response = await this.axios.get('/contacts', {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async getContact(contactId: string) {
    let response = await this.axios.get(`/contacts/${contactId}`);
    return response.data;
  }

  async createContact(data: Record<string, any>) {
    let response = await this.axios.post('/contacts', data);
    return response.data;
  }

  async updateContact(contactId: string, data: Record<string, any>) {
    let response = await this.axios.put(`/contacts/${contactId}`, data);
    return response.data;
  }

  async deleteContact(contactId: string) {
    await this.axios.delete(`/contacts/${contactId}`);
  }

  async searchContacts(query: string, params?: { page?: number; perPage?: number }) {
    let response = await this.axios.get('/contacts/search', {
      params: { query, page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async filterContacts(
    filters: Record<string, any>,
    params?: { page?: number; perPage?: number }
  ) {
    let response = await this.axios.post('/contacts/search', filters, {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async getContactActivities(contactId: string, params?: { page?: number; perPage?: number }) {
    let response = await this.axios.get(`/contacts/${contactId}/activities`, {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async createContactActivity(contactId: string, data: Record<string, any>) {
    let response = await this.axios.post(`/contacts/${contactId}/activities`, data);
    return response.data;
  }

  async getContactTags(contactId: string) {
    let response = await this.axios.get(`/contacts/${contactId}/tags`);
    return response.data;
  }

  async attachContactTags(contactId: string, tags: string[]) {
    let response = await this.axios.put(`/contacts/${contactId}/tags`, { tags });
    return response.data;
  }

  // ─── Pipelines ─────────────────────────────────────────────

  async listPipelines(params?: { page?: number; perPage?: number }) {
    let response = await this.axios.get('/pipelines', {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async getPipeline(pipelineId: string) {
    let response = await this.axios.get(`/pipelines/${pipelineId}`);
    return response.data;
  }

  async createPipeline(data: Record<string, any>) {
    let response = await this.axios.post('/pipelines', data);
    return response.data;
  }

  async updatePipeline(pipelineId: string, data: Record<string, any>) {
    let response = await this.axios.put(`/pipelines/${pipelineId}`, data);
    return response.data;
  }

  async deletePipeline(pipelineId: string) {
    await this.axios.delete(`/pipelines/${pipelineId}`);
  }

  async changePipelineStatus(pipelineId: string, data: Record<string, any>) {
    let response = await this.axios.post(`/pipelines/${pipelineId}/status`, data);
    return response.data;
  }

  async filterPipelines(
    filters: Record<string, any>,
    params?: { page?: number; perPage?: number }
  ) {
    let response = await this.axios.post('/pipelines/search', filters, {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async getPipelineWorkflows(pipelineId: string) {
    let response = await this.axios.get(`/pipelines/${pipelineId}/workflows`);
    return response.data;
  }

  // ─── Activities ────────────────────────────────────────────

  async listActivities(params?: { page?: number; perPage?: number }) {
    let response = await this.axios.get('/activities', {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async getActivity(activityId: string) {
    let response = await this.axios.get(`/activities/${activityId}`);
    return response.data;
  }

  async updateActivity(activityId: string, data: Record<string, any>) {
    let response = await this.axios.put(`/activities/${activityId}`, data);
    return response.data;
  }

  async deleteActivity(activityId: string) {
    await this.axios.delete(`/activities/${activityId}`);
  }

  async searchActivities(query: string, params?: { page?: number; perPage?: number }) {
    let response = await this.axios.get('/activities/search', {
      params: { query, page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  // ─── Tasks ─────────────────────────────────────────────────

  async listTasks(params?: { page?: number; perPage?: number }) {
    let response = await this.axios.get('/tasks', {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async getTask(taskId: string) {
    let response = await this.axios.get(`/tasks/${taskId}`);
    return response.data;
  }

  async createTask(data: Record<string, any>) {
    let response = await this.axios.post('/tasks', data);
    return response.data;
  }

  async updateTask(taskId: string, data: Record<string, any>) {
    let response = await this.axios.put(`/tasks/${taskId}`, data);
    return response.data;
  }

  async deleteTask(taskId: string) {
    await this.axios.delete(`/tasks/${taskId}`);
  }

  // ─── Webhooks ──────────────────────────────────────────────

  async listWebhooks(params?: { page?: number; perPage?: number }) {
    let response = await this.axios.get('/webhooks', {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async getWebhook(webhookId: string) {
    let response = await this.axios.get(`/webhooks/${webhookId}`);
    return response.data;
  }

  async createWebhook(data: { url: string; event: string; secret?: string }) {
    let response = await this.axios.post('/webhooks', data);
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    await this.axios.delete(`/webhooks/${webhookId}`);
  }

  // ─── Events ────────────────────────────────────────────────

  async listEvents(params?: {
    startingAfterId?: string;
    startingAfterTimestamp?: string;
    page?: number;
    perPage?: number;
  }) {
    let response = await this.axios.get('/events', {
      params: {
        starting_after_id: params?.startingAfterId,
        starting_after_timestamp: params?.startingAfterTimestamp,
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  // ─── Users ─────────────────────────────────────────────────

  async listUsers(params?: { page?: number; perPage?: number }) {
    let response = await this.axios.get('/users', {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async getUser(userId: string) {
    let response = await this.axios.get(`/users/${userId}`);
    return response.data;
  }

  // ─── Tags ──────────────────────────────────────────────────

  async listTags(params?: { page?: number; perPage?: number }) {
    let response = await this.axios.get('/tags', {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  // ─── Site ──────────────────────────────────────────────────

  async getSite() {
    let response = await this.axios.get('/site');
    return response.data;
  }

  // ─── Lists ─────────────────────────────────────────────────

  async getListItems(
    resourceType: string,
    listId: string,
    params?: { page?: number; perPage?: number }
  ) {
    let response = await this.axios.get(`/${resourceType}/lists/${listId}/items`, {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async addToList(resourceType: string, listId: string, items: string[]) {
    let response = await this.axios.post(`/${resourceType}/lists/${listId}/items`, { items });
    return response.data;
  }

  async getLists(resourceType: string, params?: { page?: number; perPage?: number }) {
    let response = await this.axios.get(`/${resourceType}/lists`, {
      params: { page: params?.page, per_page: params?.perPage }
    });
    return response.data;
  }

  async createList(resourceType: string, data: { name: string; notes?: string }) {
    let response = await this.axios.post(`/${resourceType}/lists`, data);
    return response.data;
  }
}
