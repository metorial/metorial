import { createAxios } from 'slates';

type HttpClient = ReturnType<typeof createAxios>;

export class AdminClient {
  private http: HttpClient;

  constructor(private params: { token: string; workspaceId?: string }) {
    this.http = createAxios({
      baseURL: 'https://api.botpress.cloud/v1/admin'
    });
  }

  private headers(extra?: Record<string, string>) {
    let h: Record<string, string> = {
      Authorization: `Bearer ${this.params.token}`
    };
    if (this.params.workspaceId) {
      h['x-workspace-id'] = this.params.workspaceId;
    }
    return { ...h, ...extra };
  }

  // === Bots ===

  async listBots(opts?: { nextToken?: string; sortField?: string; sortDirection?: string }) {
    let response = await this.http.get('/bots', {
      headers: this.headers(),
      params: opts
    });
    return response.data;
  }

  async getBot(botId: string) {
    let response = await this.http.get(`/bots/${botId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async createBot(data: { name?: string; tags?: Record<string, string> }) {
    let response = await this.http.post('/bots', data, {
      headers: this.headers()
    });
    return response.data;
  }

  async updateBot(botId: string, data: Record<string, unknown>) {
    let response = await this.http.put(`/bots/${botId}`, data, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteBot(botId: string) {
    let response = await this.http.delete(`/bots/${botId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  // === Bot Analytics ===

  async getBotAnalytics(botId: string, opts?: { startDate?: string; endDate?: string }) {
    let response = await this.http.get(`/bots/${botId}/analytics`, {
      headers: this.headers(),
      params: opts
    });
    return response.data;
  }

  // === Bot Logs ===

  async getBotLogs(botId: string, opts?: { nextToken?: string; sortOrder?: string }) {
    let response = await this.http.get(`/bots/${botId}/logs`, {
      headers: this.headers(),
      params: opts
    });
    return response.data;
  }

  // === Bot Issues ===

  async listBotIssues(botId: string, opts?: { nextToken?: string }) {
    let response = await this.http.get(`/bots/${botId}/issues`, {
      headers: this.headers(),
      params: opts
    });
    return response.data;
  }

  async getBotIssue(botId: string, issueId: string) {
    let response = await this.http.get(`/bots/${botId}/issues/${issueId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteBotIssue(botId: string, issueId: string) {
    let response = await this.http.delete(`/bots/${botId}/issues/${issueId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  // === Workspaces ===

  async listWorkspaces() {
    let response = await this.http.get('/workspaces', {
      headers: this.headers()
    });
    return response.data;
  }

  async getWorkspace(workspaceId: string) {
    let response = await this.http.get(`/workspaces/${workspaceId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  // === Workspace Members ===

  async listWorkspaceMembers(workspaceId: string) {
    let response = await this.http.get(`/workspaces/${workspaceId}/members`, {
      headers: this.headers()
    });
    return response.data;
  }

  // === Integrations ===

  async listIntegrations(opts?: {
    nextToken?: string;
    name?: string;
    version?: string;
    visibility?: string;
    search?: string;
  }) {
    let response = await this.http.get('/integrations', {
      headers: this.headers(),
      params: opts
    });
    return response.data;
  }

  async getIntegration(integrationId: string) {
    let response = await this.http.get(`/integrations/${integrationId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async getIntegrationByName(name: string) {
    let response = await this.http.get(`/integrations/name/${name}`, {
      headers: this.headers()
    });
    return response.data;
  }

  // === Account ===

  async getAccount() {
    let response = await this.http.get('/account', {
      headers: this.headers()
    });
    return response.data;
  }
}

export class RuntimeClient {
  private http: HttpClient;

  constructor(private params: { token: string; botId: string }) {
    this.http = createAxios({
      baseURL: 'https://api.botpress.cloud/v1/chat'
    });
  }

  private headers(extra?: Record<string, string>) {
    return {
      Authorization: `Bearer ${this.params.token}`,
      'x-bot-id': this.params.botId,
      ...extra
    };
  }

  // === Conversations ===

  async listConversations(opts?: { nextToken?: string }) {
    let response = await this.http.get('/conversations', {
      headers: this.headers(),
      params: opts
    });
    return response.data;
  }

  async getConversation(conversationId: string) {
    let response = await this.http.get(`/conversations/${conversationId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async createConversation(data: { channel: string; tags?: Record<string, string> }) {
    let response = await this.http.post('/conversations', data, {
      headers: this.headers()
    });
    return response.data;
  }

  async getOrCreateConversation(data: { channel: string; tags?: Record<string, string> }) {
    let response = await this.http.post('/conversations/get-or-create', data, {
      headers: this.headers()
    });
    return response.data;
  }

  // === Messages ===

  async listMessages(opts?: { conversationId?: string; nextToken?: string }) {
    let response = await this.http.get('/messages', {
      headers: this.headers(),
      params: opts
    });
    return response.data;
  }

  async getMessage(messageId: string) {
    let response = await this.http.get(`/messages/${messageId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async createMessage(data: {
    payload: Record<string, unknown>;
    userId: string;
    conversationId: string;
    type: string;
    tags?: Record<string, string>;
  }) {
    let response = await this.http.post('/messages', data, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteMessage(messageId: string) {
    let response = await this.http.delete(`/messages/${messageId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  // === Users ===

  async listUsers(opts?: { nextToken?: string }) {
    let response = await this.http.get('/users', {
      headers: this.headers(),
      params: opts
    });
    return response.data;
  }

  async getUser(userId: string) {
    let response = await this.http.get(`/users/${userId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async createUser(data: {
    tags?: Record<string, string>;
    name?: string;
    pictureUrl?: string;
  }) {
    let response = await this.http.post('/users', data, {
      headers: this.headers()
    });
    return response.data;
  }

  async updateUser(
    userId: string,
    data: { tags?: Record<string, string>; name?: string; pictureUrl?: string }
  ) {
    let response = await this.http.put(`/users/${userId}`, data, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteUser(userId: string) {
    let response = await this.http.delete(`/users/${userId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  // === Events ===

  async createEvent(data: {
    type: string;
    payload: Record<string, unknown>;
    conversationId?: string;
    userId?: string;
  }) {
    let response = await this.http.post('/events', data, {
      headers: this.headers()
    });
    return response.data;
  }

  async getEvent(eventId: string) {
    let response = await this.http.get(`/events/${eventId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async listEvents(opts?: { nextToken?: string }) {
    let response = await this.http.get('/events', {
      headers: this.headers(),
      params: opts
    });
    return response.data;
  }

  // === State ===

  async getState(stateType: string, resourceId: string, stateName: string) {
    let response = await this.http.get(`/states/${stateType}/${resourceId}/${stateName}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async setState(
    stateType: string,
    resourceId: string,
    stateName: string,
    payload: Record<string, unknown>
  ) {
    let response = await this.http.post(
      `/states/${stateType}/${resourceId}/${stateName}`,
      { payload },
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async patchState(
    stateType: string,
    resourceId: string,
    stateName: string,
    payload: Record<string, unknown>
  ) {
    let response = await this.http.patch(
      `/states/${stateType}/${resourceId}/${stateName}`,
      { payload },
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  // === Participants ===

  async listParticipants(conversationId: string) {
    let response = await this.http.get(`/conversations/${conversationId}/participants`, {
      headers: this.headers()
    });
    return response.data;
  }

  // === Actions ===

  async callAction(data: { type: string; input: Record<string, unknown> }) {
    let response = await this.http.post('/actions', data, {
      headers: this.headers()
    });
    return response.data;
  }
}

export class TablesClient {
  private http: HttpClient;

  constructor(private params: { token: string; botId: string }) {
    this.http = createAxios({
      baseURL: 'https://api.botpress.cloud/v1/tables'
    });
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.params.token}`,
      'x-bot-id': this.params.botId
    };
  }

  // === Tables ===

  async listTables() {
    let response = await this.http.get('', {
      headers: this.headers()
    });
    return response.data;
  }

  async getTable(tableId: string) {
    let response = await this.http.get(`/${tableId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async createTable(data: {
    name: string;
    schema?: Record<string, unknown>;
    factor?: number;
  }) {
    let response = await this.http.post('', data, {
      headers: this.headers()
    });
    return response.data;
  }

  async updateTable(tableId: string, data: Record<string, unknown>) {
    let response = await this.http.put(`/${tableId}`, data, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteTable(tableId: string) {
    let response = await this.http.delete(`/${tableId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  // === Rows ===

  async createRows(tableId: string, rows: Record<string, unknown>[]) {
    let response = await this.http.post(
      `/${tableId}/rows`,
      { rows },
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async findRows(
    tableId: string,
    query: {
      limit?: number;
      offset?: number;
      filter?: Record<string, unknown>;
      search?: string;
      select?: string[];
      orderBy?: string;
      orderDirection?: string;
    }
  ) {
    let response = await this.http.post(`/${tableId}/rows/find`, query, {
      headers: this.headers()
    });
    return response.data;
  }

  async getRow(tableId: string, rowId: number) {
    let response = await this.http.get(`/${tableId}/rows/${rowId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async updateRows(tableId: string, rows: Record<string, unknown>[]) {
    let response = await this.http.put(
      `/${tableId}/rows`,
      { rows },
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async deleteRows(
    tableId: string,
    opts: { ids?: number[]; filter?: Record<string, unknown>; deleteAllRows?: boolean }
  ) {
    let response = await this.http.post(`/${tableId}/rows/delete`, opts, {
      headers: this.headers()
    });
    return response.data;
  }

  async upsertRows(tableId: string, rows: Record<string, unknown>[], keyColumn: string) {
    let response = await this.http.post(
      `/${tableId}/rows/upsert`,
      { rows, keyColumn },
      {
        headers: this.headers()
      }
    );
    return response.data;
  }
}

export class FilesClient {
  private http: HttpClient;

  constructor(private params: { token: string; botId: string }) {
    this.http = createAxios({
      baseURL: 'https://api.botpress.cloud/v1/files'
    });
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.params.token}`,
      'x-bot-id': this.params.botId
    };
  }

  async listFiles(opts?: {
    nextToken?: string;
    tags?: string;
    sortField?: string;
    sortDirection?: string;
  }) {
    let response = await this.http.get('', {
      headers: this.headers(),
      params: opts
    });
    return response.data;
  }

  async getFile(fileId: string) {
    let response = await this.http.get(`/${fileId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async upsertFile(data: {
    key: string;
    size: number;
    index?: boolean;
    tags?: Record<string, string>;
    accessPolicies?: string[];
  }) {
    let response = await this.http.put('', data, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteFile(fileId: string) {
    let response = await this.http.delete(`/${fileId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async searchFiles(
    query: string,
    opts?: { limit?: number; tags?: string; contextDepth?: number }
  ) {
    let response = await this.http.get('/search', {
      headers: this.headers(),
      params: { query, ...opts }
    });
    return response.data;
  }

  async updateFileMetadata(fileId: string, metadata: Record<string, unknown>) {
    let response = await this.http.put(`/${fileId}/metadata`, metadata, {
      headers: this.headers()
    });
    return response.data;
  }
}
