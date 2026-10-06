import { buildApiServiceError, createAuthenticatedAxios, requestAxiosData } from 'slates';

type RetellRecord = Record<string, any>;
export type RetellPage = {
  items: RetellRecord[];
  has_more: boolean;
  pagination_key?: string;
  total?: number;
};
export type ListOptions = {
  limit?: number;
  paginationKey?: string;
  sortOrder?: 'ascending' | 'descending';
};

export class RetellClient {
  private axios;

  constructor(token: string) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.retellai.com',
      authHeader: { value: `Bearer ${token}` },
      contentType: false,
      timeout: 120000
    });
  }

  private request<T = RetellRecord>(
    operation: string,
    method: 'get' | 'post' | 'patch' | 'delete',
    url: string,
    data?: unknown,
    params?: Record<string, unknown>
  ) {
    return requestAxiosData<T>(
      operation,
      () => this.axios.request<T>({ method, url, data, params }),
      error =>
        buildApiServiceError(error, {
          parent: {},
          providerLabel: 'Retell AI',
          reason: 'retellai_api_error',
          operation
        })
    );
  }

  createAgent(data: RetellRecord) {
    return this.request('create agent', 'post', '/create-agent', data);
  }
  getAgent(agentId: string, version?: number) {
    return this.request(
      'get agent',
      'get',
      `/get-agent/${encodeURIComponent(agentId)}`,
      undefined,
      { version }
    );
  }
  listAgents(options: ListOptions & { query?: string } = {}) {
    return this.request<RetellPage>(
      'list agents',
      'post',
      '/v2/list-agents',
      {
        filter_criteria: {
          channel: { type: 'string', op: 'eq', value: 'voice' },
          ...(options.query !== undefined ? { query: options.query } : {})
        }
      },
      {
        limit: options.limit,
        pagination_key: options.paginationKey,
        sort_order: options.sortOrder
      }
    );
  }
  updateAgent(agentId: string, data: RetellRecord, version?: number) {
    return this.request(
      'update agent',
      'patch',
      `/update-agent/${encodeURIComponent(agentId)}`,
      data,
      { version }
    );
  }
  deleteAgent(agentId: string) {
    return this.request<void>(
      'delete agent',
      'delete',
      `/delete-agent/${encodeURIComponent(agentId)}`
    );
  }
  publishAgent(agentId: string, data: RetellRecord) {
    return this.request<void>(
      'publish agent',
      'post',
      `/publish-agent-version/${encodeURIComponent(agentId)}`,
      data
    );
  }

  createPhoneCall(data: RetellRecord) {
    return this.request('create phone call', 'post', '/v2/create-phone-call', data);
  }
  createWebCall(data: RetellRecord) {
    return this.request('create web call', 'post', '/v3/create-web-call', data);
  }
  getCall(callId: string) {
    return this.request('get call', 'get', `/v2/get-call/${encodeURIComponent(callId)}`);
  }
  listCalls(data: RetellRecord) {
    return this.request<RetellPage>('list calls', 'post', '/v3/list-calls', data);
  }
  deleteCall(callId: string) {
    return this.request<void>(
      'delete call',
      'delete',
      `/v2/delete-call/${encodeURIComponent(callId)}`
    );
  }
  createBatchCall(data: RetellRecord) {
    return this.request('create batch call', 'post', '/create-batch-call', data);
  }

  createPhoneNumber(data: RetellRecord) {
    return this.request('purchase phone number', 'post', '/create-phone-number', data);
  }
  getPhoneNumber(phoneNumber: string) {
    return this.request(
      'get phone number',
      'get',
      `/get-phone-number/${encodeURIComponent(phoneNumber)}`
    );
  }
  listPhoneNumbers(options: ListOptions = {}) {
    return this.request<RetellPage>(
      'list phone numbers',
      'get',
      '/v2/list-phone-numbers',
      undefined,
      {
        limit: options.limit,
        pagination_key: options.paginationKey,
        sort_order: options.sortOrder
      }
    );
  }
  updatePhoneNumber(phoneNumber: string, data: RetellRecord) {
    return this.request(
      'update phone number',
      'patch',
      `/update-phone-number/${encodeURIComponent(phoneNumber)}`,
      data
    );
  }
  deletePhoneNumber(phoneNumber: string) {
    return this.request<void>(
      'delete phone number',
      'delete',
      `/delete-phone-number/${encodeURIComponent(phoneNumber)}`
    );
  }

  createKnowledgeBase(data: FormData) {
    return this.request('create knowledge base', 'post', '/create-knowledge-base', data);
  }
  listKnowledgeBases() {
    return this.request<RetellRecord[]>(
      'list knowledge bases',
      'get',
      '/list-knowledge-bases'
    );
  }
  getKnowledgeBase(id: string) {
    return this.request(
      'get knowledge base',
      'get',
      `/get-knowledge-base/${encodeURIComponent(id)}`
    );
  }
  deleteKnowledgeBase(id: string) {
    return this.request<void>(
      'delete knowledge base',
      'delete',
      `/delete-knowledge-base/${encodeURIComponent(id)}`
    );
  }

  createLlm(data: RetellRecord) {
    return this.request('create response engine', 'post', '/create-retell-llm', data);
  }
  getLlm(id: string, version?: number) {
    return this.request(
      'get response engine',
      'get',
      `/get-retell-llm/${encodeURIComponent(id)}`,
      undefined,
      { version }
    );
  }
  listLlms(options: ListOptions = {}) {
    return this.request<RetellPage>(
      'list response engines',
      'get',
      '/v2/list-retell-llms',
      undefined,
      {
        limit: options.limit,
        pagination_key: options.paginationKey,
        sort_order: options.sortOrder
      }
    );
  }
  updateLlm(id: string, data: RetellRecord, version?: number) {
    return this.request(
      'update response engine',
      'patch',
      `/update-retell-llm/${encodeURIComponent(id)}`,
      data,
      { version }
    );
  }
  deleteLlm(id: string) {
    return this.request<void>(
      'delete response engine',
      'delete',
      `/delete-retell-llm/${encodeURIComponent(id)}`
    );
  }

  listVoices() {
    return this.request<RetellRecord[]>('list voices', 'get', '/list-voices');
  }
  getVoice(id: string) {
    return this.request('get voice', 'get', `/get-voice/${encodeURIComponent(id)}`);
  }
  getConcurrency() {
    return this.request('get concurrency', 'get', '/get-concurrency');
  }
}
