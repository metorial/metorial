import { createAxios } from 'slates';

let BASE_URL = 'https://api.rocketlane.com/api/1.0';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        'api-key': config.token,
        accept: 'application/json',
        'content-type': 'application/json'
      }
    });
  }

  // ─── Projects ────────────────────────────────────────────

  async listProjects(params?: { offset?: number; limit?: number }) {
    let res = await this.axios.get('/projects', { params });
    return res.data;
  }

  async getProject(projectId: number) {
    let res = await this.axios.get(`/projects/${projectId}`);
    return res.data;
  }

  async createProject(data: {
    projectName: string;
    customer?: { companyName?: string; companyId?: number };
    owner?: { emailId?: string; userId?: number };
    startDate?: string;
    dueDate?: string;
    projectDescription?: string;
    templateId?: number;
    visibility?: string;
    fields?: Array<{ fieldId: number; fieldValue: any }>;
    members?: Array<{ emailId?: string; userId?: number; role?: string }>;
  }) {
    let res = await this.axios.post('/projects', data);
    return res.data;
  }

  async updateProject(
    projectId: number,
    data: {
      projectName?: string;
      startDate?: string;
      dueDate?: string;
      projectDescription?: string;
      visibility?: string;
      owner?: { emailId?: string; userId?: number };
      fields?: Array<{ fieldId: number; fieldValue: any }>;
    }
  ) {
    let res = await this.axios.put(`/projects/${projectId}`, data);
    return res.data;
  }

  async deleteProject(projectId: number) {
    let res = await this.axios.delete(`/projects/${projectId}`);
    return res.data;
  }

  async archiveProject(projectId: number) {
    let res = await this.axios.post(`/projects/${projectId}/archive`);
    return res.data;
  }

  async addProjectMembers(
    projectId: number,
    members: Array<{ emailId?: string; userId?: number; role?: string }>
  ) {
    let res = await this.axios.post(`/projects/${projectId}/members`, { members });
    return res.data;
  }

  async removeProjectMember(projectId: number, userId: number) {
    let res = await this.axios.delete(`/projects/${projectId}/members/${userId}`);
    return res.data;
  }

  // ─── Tasks ───────────────────────────────────────────────

  async listTasks(params?: {
    projectId?: number;
    phaseId?: number;
    offset?: number;
    limit?: number;
  }) {
    let res = await this.axios.get('/tasks', { params });
    return res.data;
  }

  async getTask(taskId: number) {
    let res = await this.axios.get(`/tasks/${taskId}`);
    return res.data;
  }

  async createTask(data: {
    taskName: string;
    projectId: number;
    phaseId?: number;
    parentTaskId?: number;
    assignees?: Array<{ emailId?: string; userId?: number }>;
    followers?: Array<{ emailId?: string; userId?: number }>;
    startDate?: string;
    dueDate?: string;
    effort?: number;
    progress?: number;
    description?: string;
    status?: string;
    priority?: string;
    fields?: Array<{ fieldId: number; fieldValue: any }>;
  }) {
    let res = await this.axios.post('/tasks', data);
    return res.data;
  }

  async updateTask(
    taskId: number,
    data: {
      taskName?: string;
      assignees?: Array<{ emailId?: string; userId?: number }>;
      followers?: Array<{ emailId?: string; userId?: number }>;
      startDate?: string;
      dueDate?: string;
      effort?: number;
      progress?: number;
      description?: string;
      status?: string;
      priority?: string;
      atRisk?: boolean;
      fields?: Array<{ fieldId: number; fieldValue: any }>;
    }
  ) {
    let res = await this.axios.put(`/tasks/${taskId}`, data);
    return res.data;
  }

  async deleteTask(taskId: number) {
    let res = await this.axios.delete(`/tasks/${taskId}`);
    return res.data;
  }

  async moveTask(taskId: number, data: { phaseId: number; position?: number }) {
    let res = await this.axios.post(`/tasks/${taskId}/move`, data);
    return res.data;
  }

  // ─── Phases ──────────────────────────────────────────────

  async listPhases(params?: { projectId?: number; offset?: number; limit?: number }) {
    let res = await this.axios.get('/phases', { params });
    return res.data;
  }

  async getPhase(phaseId: number) {
    let res = await this.axios.get(`/phases/${phaseId}`);
    return res.data;
  }

  async createPhase(data: {
    phaseName: string;
    projectId: number;
    startDate: string;
    dueDate: string;
    private?: boolean;
  }) {
    let res = await this.axios.post('/phases', data);
    return res.data;
  }

  async updatePhase(
    phaseId: number,
    data: {
      phaseName?: string;
      startDate?: string;
      dueDate?: string;
      private?: boolean;
    }
  ) {
    let res = await this.axios.put(`/phases/${phaseId}`, data);
    return res.data;
  }

  async deletePhase(phaseId: number) {
    let res = await this.axios.delete(`/phases/${phaseId}`);
    return res.data;
  }

  // ─── Companies ───────────────────────────────────────────

  async listCompanies(params?: { offset?: number; limit?: number }) {
    let res = await this.axios.get('/companies', { params });
    return res.data;
  }

  async getCompany(companyId: number) {
    let res = await this.axios.get(`/companies/${companyId}`);
    return res.data;
  }

  async createCompany(data: {
    companyName: string;
    companyUrl?: string;
    fields?: Array<{ fieldId: number; fieldValue: any }>;
  }) {
    let res = await this.axios.post('/companies', data);
    return res.data;
  }

  async updateCompany(
    companyId: number,
    data: {
      companyName?: string;
      companyUrl?: string;
      fields?: Array<{ fieldId: number; fieldValue: any }>;
    }
  ) {
    let res = await this.axios.put(`/companies/${companyId}`, data);
    return res.data;
  }

  // ─── Users ───────────────────────────────────────────────

  async listUsers(params?: { offset?: number; limit?: number }) {
    let res = await this.axios.get('/users', { params });
    return res.data;
  }

  async getUser(userId: number) {
    let res = await this.axios.get(`/users/${userId}`);
    return res.data;
  }

  async getUserByEmail(emailId: string) {
    let res = await this.axios.get('/users', { params: { emailId } });
    return res.data;
  }

  async listCustomerUsers(params?: { offset?: number; limit?: number }) {
    let res = await this.axios.get('/users/customers', { params });
    return res.data;
  }

  async listVendorUsers(params?: { offset?: number; limit?: number }) {
    let res = await this.axios.get('/users/vendors', { params });
    return res.data;
  }

  // ─── Time Entries ────────────────────────────────────────

  async listTimeEntries(params?: {
    projectId?: number;
    userId?: number;
    offset?: number;
    limit?: number;
  }) {
    let res = await this.axios.get('/time-entries', { params });
    return res.data;
  }

  async getTimeEntry(timeEntryId: number) {
    let res = await this.axios.get(`/time-entries/${timeEntryId}`);
    return res.data;
  }

  async createTimeEntry(data: {
    projectId: number;
    taskId?: number;
    userId?: number;
    duration: number;
    date: string;
    description?: string;
    categoryId?: number;
  }) {
    let res = await this.axios.post('/time-entries', data);
    return res.data;
  }

  async updateTimeEntry(
    timeEntryId: number,
    data: {
      duration?: number;
      date?: string;
      description?: string;
      categoryId?: number;
    }
  ) {
    let res = await this.axios.put(`/time-entries/${timeEntryId}`, data);
    return res.data;
  }

  async deleteTimeEntry(timeEntryId: number) {
    let res = await this.axios.delete(`/time-entries/${timeEntryId}`);
    return res.data;
  }

  async listTimeEntryCategories() {
    let res = await this.axios.get('/time-entries/categories');
    return res.data;
  }

  // ─── Spaces & Documents ──────────────────────────────────

  async listSpaces(params?: { projectId?: number; offset?: number; limit?: number }) {
    let res = await this.axios.get('/spaces', { params });
    return res.data;
  }

  async getSpace(spaceId: number) {
    let res = await this.axios.get(`/spaces/${spaceId}`);
    return res.data;
  }

  async createSpace(data: { spaceName: string; projectId: number; description?: string }) {
    let res = await this.axios.post('/spaces', data);
    return res.data;
  }

  async updateSpace(
    spaceId: number,
    data: {
      spaceName?: string;
      description?: string;
    }
  ) {
    let res = await this.axios.put(`/spaces/${spaceId}`, data);
    return res.data;
  }

  async deleteSpace(spaceId: number) {
    let res = await this.axios.delete(`/spaces/${spaceId}`);
    return res.data;
  }

  async listSpaceDocuments(spaceId: number) {
    let res = await this.axios.get(`/spaces/${spaceId}/documents`);
    return res.data;
  }

  // ─── Conversations & Comments ────────────────────────────

  async listConversations(params?: { projectId?: number; offset?: number; limit?: number }) {
    let res = await this.axios.get('/conversations', { params });
    return res.data;
  }

  async createConversation(data: {
    projectId: number;
    title: string;
    body?: string;
    members?: Array<{ emailId?: string; userId?: number }>;
  }) {
    let res = await this.axios.post('/conversations', data);
    return res.data;
  }

  async getConversation(conversationId: number) {
    let res = await this.axios.get(`/conversations/${conversationId}`);
    return res.data;
  }

  async createComment(data: { conversationId?: number; taskId?: number; body: string }) {
    let res = await this.axios.post('/comments', data);
    return res.data;
  }

  async getComments(params: { conversationId?: number; taskId?: number }) {
    let res = await this.axios.get('/comments', { params });
    return res.data;
  }

  async deleteComment(commentId: number) {
    let res = await this.axios.delete(`/comments/${commentId}`);
    return res.data;
  }

  // ─── Custom Fields ───────────────────────────────────────

  async listProjectFields() {
    let res = await this.axios.get('/fields', { params: { type: 'project' } });
    return res.data;
  }

  async listTaskFields() {
    let res = await this.axios.get('/fields', { params: { type: 'task' } });
    return res.data;
  }

  async listCompanyFields() {
    let res = await this.axios.get('/fields', { params: { type: 'company' } });
    return res.data;
  }

  async createField(data: {
    fieldLabel: string;
    fieldType: string;
    entityType: string;
    options?: Array<{ label: string; value: string }>;
  }) {
    let res = await this.axios.post('/fields', data);
    return res.data;
  }

  async updateField(
    fieldId: number,
    data: {
      fieldLabel?: string;
      options?: Array<{ label: string; value: string }>;
    }
  ) {
    let res = await this.axios.put(`/fields/${fieldId}`, data);
    return res.data;
  }

  async deleteField(fieldId: number) {
    let res = await this.axios.delete(`/fields/${fieldId}`);
    return res.data;
  }

  // ─── Templates ───────────────────────────────────────────

  async listTemplates(params?: { offset?: number; limit?: number }) {
    let res = await this.axios.get('/templates', { params });
    return res.data;
  }

  async getTemplate(templateId: number) {
    let res = await this.axios.get(`/templates/${templateId}`);
    return res.data;
  }

  // ─── Resource Allocations ────────────────────────────────

  async listResourceAllocations(params?: {
    projectId?: number;
    userId?: number;
    offset?: number;
    limit?: number;
  }) {
    let res = await this.axios.get('/resource-allocations', { params });
    return res.data;
  }

  // ─── Financials ──────────────────────────────────────────

  async searchInvoices(params?: {
    projectId?: number;
    status?: string;
    offset?: number;
    limit?: number;
  }) {
    let res = await this.axios.get('/invoices', { params });
    return res.data;
  }

  async listCurrencies() {
    let res = await this.axios.get('/currencies');
    return res.data;
  }
}
