import { createAxios } from 'slates';

let BASE_URL = 'https://productlane.com/api/v1';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Companies ──

  async listCompanies(params?: {
    skip?: number;
    take?: number;
    domain?: string;
    name?: string;
  }) {
    let response = await this.axios.get('/companies', { params });
    return response.data;
  }

  async getCompany(companyId: string) {
    let response = await this.axios.get(`/companies/${companyId}`);
    return response.data;
  }

  async createCompany(data: {
    name: string;
    domains?: string[];
    autoAdd?: boolean;
    externalIds?: string[];
    size?: number | null;
    revenue?: number | null;
    tierId?: string | null;
    tierName?: string | null;
    statusId?: string | null;
    statusName?: string | null;
    statusColor?: string | null;
  }) {
    let response = await this.axios.post('/companies', data);
    return response.data;
  }

  async updateCompany(
    companyId: string,
    data: {
      name?: string;
      domains?: string[];
      autoAdd?: boolean;
      externalIds?: string[];
      size?: number | null;
      revenue?: number | null;
      tierId?: string | null;
      tierName?: string | null;
      statusId?: string | null;
      statusName?: string | null;
      statusColor?: string | null;
    }
  ) {
    let response = await this.axios.patch(`/companies/${companyId}`, data);
    return response.data;
  }

  async deleteCompany(companyId: string) {
    let response = await this.axios.delete(`/companies/${companyId}`);
    return response.data;
  }

  // ── Contacts ──

  async listContacts(params?: {
    skip?: number;
    take?: number;
    email?: string;
    companyId?: string;
  }) {
    let response = await this.axios.get('/contacts', { params });
    return response.data;
  }

  async getContact(contactId: string) {
    let response = await this.axios.get(`/contacts/${contactId}`);
    return response.data;
  }

  async createContact(data: {
    email: string;
    name?: string;
    companyId?: string;
    companyName?: string;
    companyExternalId?: string;
  }) {
    let response = await this.axios.post('/contacts', data);
    return response.data;
  }

  async updateContact(
    contactId: string,
    data: {
      name?: string;
      email?: string;
      companyId?: string;
      companyName?: string;
      companyExternalId?: string;
    }
  ) {
    let response = await this.axios.patch(`/contacts/${contactId}`, data);
    return response.data;
  }

  async deleteContact(contactId: string) {
    let response = await this.axios.delete(`/contacts/${contactId}`);
    return response.data;
  }

  // ── Threads (Insights / Feedback) ──

  async listThreads(params?: {
    skip?: number;
    take?: number;
    state?: string;
    issueId?: string;
    projectId?: string;
  }) {
    let response = await this.axios.get('/threads', { params });
    return response.data;
  }

  async getThread(threadId: string, includeConversation?: boolean) {
    let response = await this.axios.get(`/threads/${threadId}`, {
      params: includeConversation ? { includeConversation: 'true' } : undefined
    });
    return response.data;
  }

  async createThread(data: {
    text: string;
    painLevel: string;
    contactEmail: string;
    title?: string;
    state?: string;
    origin?: string;
    contactName?: string;
    assigneeId?: string;
    projectId?: string;
    issueId?: string;
    companyId?: string;
    createdAt?: string;
    updatedAt?: string;
    notify?: { slack?: boolean; email?: boolean };
  }) {
    let response = await this.axios.post('/threads', data);
    return response.data;
  }

  async updateThread(
    threadId: string,
    data: {
      text?: string;
      title?: string;
      painLevel?: string;
      state?: string;
      assigneeId?: string | null;
      projectId?: string;
      contactId?: string;
      companyId?: string;
      tagIds?: string[];
      notify?: { slack?: boolean; email?: boolean };
      updatedAt?: string;
    }
  ) {
    let response = await this.axios.patch(`/threads/${threadId}`, data);
    return response.data;
  }

  async sendThreadMessage(
    threadId: string,
    data: {
      content: string;
      cc?: Array<{ name: string; email: string; mailboxHash: string }>;
      bcc?: Array<{ name: string; email: string; mailboxHash: string }>;
      channelId?: string;
    }
  ) {
    let response = await this.axios.post(`/threads/${threadId}/messages`, data);
    return response.data;
  }

  // ── Portal: Projects ──

  async listProjects(workspaceId: string, params?: { language?: string }) {
    let response = await this.axios.get(`/projects/${workspaceId}`, { params });
    return response.data;
  }

  async getProject(workspaceId: string, projectId: string) {
    let response = await this.axios.get(`/projects/${workspaceId}/${projectId}`);
    return response.data;
  }

  // ── Portal: Issues ──

  async listIssues(workspaceId: string, params?: { language?: string }) {
    let response = await this.axios.get(`/issues/${workspaceId}`, { params });
    return response.data;
  }

  async getIssue(workspaceId: string, issueId: string) {
    let response = await this.axios.get(`/issues/${workspaceId}/${issueId}`);
    return response.data;
  }

  // ── Portal: Upvotes ──

  async createUpvote(data: { email: string; issueId?: string; projectId?: string }) {
    let response = await this.axios.post('/portal/upvotes', data);
    return response.data;
  }

  async getUpvotes(params?: { skip?: number; take?: number }) {
    let response = await this.axios.get('/portal/upvotes', { params });
    return response.data;
  }

  async deleteUpvote(upvoteId: string) {
    let response = await this.axios.delete(`/portal/upvotes/${upvoteId}`);
    return response.data;
  }

  // ── Changelogs ──

  async listChangelogs(
    workspaceId: string,
    params?: { language?: string; skip?: number; take?: number }
  ) {
    let response = await this.axios.get(`/changelogs/${workspaceId}`, { params });
    return response.data;
  }

  async getChangelog(workspaceId: string, changelogId: string) {
    let response = await this.axios.get(`/changelogs/${workspaceId}/${changelogId}`);
    return response.data;
  }

  async createChangelog(data: {
    title: string;
    content: string;
    date?: string;
    published?: boolean;
    language?: string;
  }) {
    let response = await this.axios.post('/changelogs', data);
    return response.data;
  }

  async updateChangelog(
    changelogId: string,
    data: {
      title?: string;
      content?: string;
      date?: string;
      published?: boolean;
      archived?: boolean;
    }
  ) {
    let response = await this.axios.patch(`/changelogs/${changelogId}`, data);
    return response.data;
  }

  async deleteChangelog(changelogId: string) {
    let response = await this.axios.delete(`/changelogs/${changelogId}`);
    return response.data;
  }

  // ── Workspaces ──

  async getWorkspace(workspaceId: string) {
    let response = await this.axios.get(`/workspaces/${workspaceId}`);
    return response.data;
  }

  // ── Users ──

  async listUsers() {
    let response = await this.axios.get('/users');
    return response.data;
  }

  // ── Documentation Articles ──

  async listArticles(
    workspaceId: string,
    params?: { language?: string; groupId?: string; skip?: number; take?: number }
  ) {
    let response = await this.axios.get(`/docs/articles/${workspaceId}`, { params });
    return response.data;
  }

  async getArticle(workspaceId: string, articleId: string) {
    let response = await this.axios.get(`/docs/articles/${workspaceId}/${articleId}`);
    return response.data;
  }

  async createArticle(data: {
    title: string;
    content: string;
    groupId: string;
    summary?: string;
    published?: boolean;
    language?: string;
  }) {
    let response = await this.axios.post('/docs/articles', data);
    return response.data;
  }

  async updateArticle(
    articleId: string,
    data: {
      title?: string;
      content?: string;
      summary?: string;
      published?: boolean;
      archived?: boolean;
      showOnHomePage?: boolean;
    }
  ) {
    let response = await this.axios.patch(`/docs/articles/${articleId}`, data);
    return response.data;
  }

  async deleteArticle(articleId: string) {
    let response = await this.axios.delete(`/docs/articles/${articleId}`);
    return response.data;
  }
}
