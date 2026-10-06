import { buildApiServiceError, createAuthenticatedAxios } from 'slates';
import type { RuntimeParams } from './schemas';

type HttpClient = ReturnType<typeof createAuthenticatedAxios>;

export class AdminClient {
  private http: HttpClient;

  constructor(private params: { token: string; workspaceId?: string }) {
    this.http = createAuthenticatedAxios({
      authHeader: { value: `Bearer ${params.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          parent: {},
          providerLabel: 'Botpress',
          reason: 'botpress_api_error'
        }),
      baseURL: 'https://api.botpress.cloud/v1/admin'
    });
  }

  private headers(extra?: Record<string, string>) {
    let h: Record<string, string> = {
      Authorization: `Bearer ${this.params.token}`,
      'x-multiple-integrations': 'true'
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
    let response = await this.http.get(`/bots/${encodeURIComponent(botId)}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async createBot(data: Record<string, unknown>) {
    let response = await this.http.post('/bots', data, {
      headers: this.headers()
    });
    return response.data;
  }

  async updateBot(botId: string, data: Record<string, unknown>) {
    let response = await this.http.put(`/bots/${encodeURIComponent(botId)}`, data, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteBot(botId: string) {
    let response = await this.http.delete(`/bots/${encodeURIComponent(botId)}`, {
      headers: this.headers()
    });
    return response.data;
  }

  // === Bot Analytics ===

  async getBotAnalytics(botId: string, opts?: { startDate?: string; endDate?: string }) {
    let response = await this.http.get(`/bots/${encodeURIComponent(botId)}/analytics`, {
      headers: this.headers(),
      params: opts
    });
    return response.data;
  }

  // === Bot Logs ===

  async getBotLogs(
    botId: string,
    opts: {
      timeStart: string;
      timeEnd?: string;
      level?: string;
      userId?: string;
      workflowId?: string;
      conversationId?: string;
      messageContains?: string;
      nextToken?: string;
    }
  ) {
    let response = await this.http.get(`/bots/${encodeURIComponent(botId)}/logs`, {
      headers: this.headers(),
      params: opts
    });
    return response.data;
  }

  // === Bot Issues ===

  async listBotIssues(botId: string, opts?: { nextToken?: string }) {
    let response = await this.http.get(`/bots/${encodeURIComponent(botId)}/issues`, {
      headers: this.headers(),
      params: opts
    });
    return response.data;
  }

  async getBotIssue(botId: string, issueId: string) {
    let response = await this.http.get(
      `/bots/${encodeURIComponent(botId)}/issues/${encodeURIComponent(issueId)}`,
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async deleteBotIssue(botId: string, issueId: string) {
    let response = await this.http.delete(
      `/bots/${encodeURIComponent(botId)}/issues/${encodeURIComponent(issueId)}`,
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  // === Workspaces ===

  async listWorkspaces(opts?: { nextToken?: string; handle?: string }) {
    let response = await this.http.get('/workspaces', {
      params: opts,
      headers: this.headers()
    });
    return response.data;
  }

  async getWorkspace(workspaceId: string) {
    let response = await this.http.get(`/workspaces/${encodeURIComponent(workspaceId)}`, {
      headers: this.headers()
    });
    return response.data;
  }

  // === Workspace Members ===

  async listWorkspaceMembers(workspaceId: string) {
    let response = await this.http.get(
      `/workspaces/${encodeURIComponent(workspaceId)}/members`,
      {
        headers: this.headers()
      }
    );
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
    let response = await this.http.get(`/integrations/${encodeURIComponent(integrationId)}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async getIntegrationByName(name: string, version = 'latest') {
    let response = await this.http.get(
      `/integrations/${encodeURIComponent(name)}/${encodeURIComponent(version)}`,
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  // === Account ===

  async getAccount() {
    let response = await this.http.get('/account/me', {
      headers: this.headers()
    });
    return response.data;
  }
}

export class RuntimeClient {
  private http: HttpClient;

  constructor(private params: { token: string } & RuntimeParams) {
    this.http = createAuthenticatedAxios({
      authHeader: { value: `Bearer ${params.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          parent: {},
          providerLabel: 'Botpress',
          reason: 'botpress_api_error'
        }),
      baseURL: 'https://api.botpress.cloud/v1/chat'
    });
  }

  private headers(extra?: Record<string, string>) {
    return {
      Authorization: `Bearer ${this.params.token}`,
      'x-bot-id': this.params.botId,
      ...(this.params.integrationId ? { 'x-integration-id': this.params.integrationId } : {}),
      ...(this.params.integrationAlias
        ? { 'x-integration-alias': this.params.integrationAlias }
        : {}),
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
    let response = await this.http.get(
      `/conversations/${encodeURIComponent(conversationId)}`,
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async createConversation(data: { channel: string; tags?: Record<string, string> }) {
    let response = await this.http.post(
      '/conversations',
      { ...data, tags: data.tags ?? {} },
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async getOrCreateConversation(data: {
    channel: string;
    tags?: Record<string, string>;
    discriminateByTags?: string[];
  }) {
    let response = await this.http.post(
      '/conversations/get-or-create',
      { ...data, tags: data.tags ?? {} },
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async updateConversation(conversationId: string, tags: Record<string, string>) {
    return (
      await this.http.put(
        `/conversations/${encodeURIComponent(conversationId)}`,
        { tags },
        { headers: this.headers() }
      )
    ).data;
  }

  async deleteConversation(conversationId: string) {
    return (
      await this.http.delete(`/conversations/${encodeURIComponent(conversationId)}`, {
        headers: this.headers()
      })
    ).data;
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
    let response = await this.http.get(`/messages/${encodeURIComponent(messageId)}`, {
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
    let response = await this.http.post(
      '/messages',
      { ...data, tags: data.tags ?? {} },
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async deleteMessage(messageId: string) {
    let response = await this.http.delete(`/messages/${encodeURIComponent(messageId)}`, {
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
    let response = await this.http.get(`/users/${encodeURIComponent(userId)}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async createUser(data: {
    tags?: Record<string, string>;
    name?: string;
    pictureUrl?: string;
  }) {
    let response = await this.http.post(
      '/users',
      { ...data, tags: data.tags ?? {} },
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async updateUser(
    userId: string,
    data: { tags?: Record<string, string>; name?: string; pictureUrl?: string }
  ) {
    let response = await this.http.put(`/users/${encodeURIComponent(userId)}`, data, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteUser(userId: string) {
    let response = await this.http.delete(`/users/${encodeURIComponent(userId)}`, {
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
    let response = await this.http.get(`/events/${encodeURIComponent(eventId)}`, {
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
    let response = await this.http.get(
      `/states/${encodeURIComponent(stateType)}/${encodeURIComponent(resourceId)}/${encodeURIComponent(stateName)}`,
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  async setState(
    stateType: string,
    resourceId: string,
    stateName: string,
    payload: Record<string, unknown>
  ) {
    let response = await this.http.post(
      `/states/${encodeURIComponent(stateType)}/${encodeURIComponent(resourceId)}/${encodeURIComponent(stateName)}`,
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
      `/states/${encodeURIComponent(stateType)}/${encodeURIComponent(resourceId)}/${encodeURIComponent(stateName)}`,
      { payload },
      {
        headers: this.headers()
      }
    );
    return response.data;
  }

  // === Participants ===

  async listParticipants(conversationId: string, nextToken?: string) {
    let response = await this.http.get(
      `/conversations/${encodeURIComponent(conversationId)}/participants`,
      {
        params: { nextToken },
        headers: this.headers()
      }
    );
    return response.data;
  }

  async addParticipant(conversationId: string, userId: string) {
    return (
      await this.http.post(
        `/conversations/${encodeURIComponent(conversationId)}/participants`,
        { userId },
        { headers: this.headers() }
      )
    ).data;
  }

  async removeParticipant(conversationId: string, userId: string) {
    return (
      await this.http.delete(
        `/conversations/${encodeURIComponent(conversationId)}/participants/${encodeURIComponent(userId)}`,
        { headers: this.headers() }
      )
    ).data;
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
    this.http = createAuthenticatedAxios({
      authHeader: { value: `Bearer ${params.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          parent: {},
          providerLabel: 'Botpress',
          reason: 'botpress_api_error'
        }),
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
    let response = await this.http.get(`/${encodeURIComponent(tableId)}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async createTable(data: {
    name: string;
    schema: Record<string, unknown>;
    tags?: Record<string, string>;
    frozen?: boolean;
    keyColumn?: string;
    factor?: number;
  }) {
    let response = await this.http.post('', data, {
      headers: this.headers()
    });
    return response.data;
  }

  async updateTable(tableId: string, data: Record<string, unknown>) {
    let response = await this.http.put(`/${encodeURIComponent(tableId)}`, data, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteTable(tableId: string) {
    let response = await this.http.delete(`/${encodeURIComponent(tableId)}`, {
      headers: this.headers()
    });
    return response.data;
  }

  // === Rows ===

  async createRows(tableId: string, rows: Record<string, unknown>[]) {
    let response = await this.http.post(
      `/${encodeURIComponent(tableId)}/rows`,
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
    let response = await this.http.post(`/${encodeURIComponent(tableId)}/rows/find`, query, {
      headers: this.headers()
    });
    return response.data;
  }

  async getRow(tableId: string, rowId: number) {
    let response = await this.http.get(`/${encodeURIComponent(tableId)}/row`, {
      params: { id: rowId },
      headers: this.headers()
    });
    return response.data;
  }

  async updateRows(tableId: string, rows: Record<string, unknown>[]) {
    let response = await this.http.put(
      `/${encodeURIComponent(tableId)}/rows`,
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
    let response = await this.http.post(`/${encodeURIComponent(tableId)}/rows/delete`, opts, {
      headers: this.headers()
    });
    return response.data;
  }

  async upsertRows(tableId: string, rows: Record<string, unknown>[], keyColumn: string) {
    let response = await this.http.post(
      `/${encodeURIComponent(tableId)}/rows/upsert`,
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
    this.http = createAuthenticatedAxios({
      authHeader: { value: `Bearer ${params.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          parent: {},
          providerLabel: 'Botpress',
          reason: 'botpress_api_error'
        }),
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
    let response = await this.http.get(`/${encodeURIComponent(fileId)}`, {
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
    contentType?: string;
  }) {
    let response = await this.http.put('', data, {
      headers: this.headers()
    });
    return response.data;
  }

  async uploadContent(url: string, content: string, contentType: string) {
    const upload = createAuthenticatedAxios({
      contentType,
      errorAdapter: error =>
        buildApiServiceError(error, {
          parent: {},
          providerLabel: 'Botpress',
          reason: 'botpress_file_upload_error',
          operation: 'file upload'
        })
    });
    await upload.put(url, Buffer.from(content, 'utf8'));
  }

  async deleteFile(fileId: string) {
    let response = await this.http.delete(`/${encodeURIComponent(fileId)}`, {
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
    let response = await this.http.put(
      `/${encodeURIComponent(fileId)}`,
      { metadata },
      { headers: this.headers() }
    );
    return response.data;
  }
}
