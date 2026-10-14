import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  requestAxiosData
} from 'slates';

let mapGoDialError = (error: unknown, operation: string) =>
  buildApiServiceError(error, {
    providerLabel: 'GoDial',
    reason: 'godial_api_error',
    operation
  });

let requireValue = (value: string, field: string) => {
  if (!value.trim()) {
    throw createApiServiceError(`${field} must not be empty.`, {
      reason: 'godial_invalid_input'
    });
  }
};

let requireArrayResponse = (data: unknown, operation: string): unknown[] => {
  if (!Array.isArray(data)) {
    throw createApiServiceError(
      `GoDial API ${operation} returned an unexpected response. Expected an array.`,
      { reason: 'godial_invalid_response' }
    );
  }
  return data;
};

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    requireValue(config.token, 'API access token');
    this.http = createAxios({
      baseURL: 'https://enterprise.godial.cc/meta/api/externals',
      params: { access_token: config.token },
      timeout: 30000
    });
  }

  async getLists(): Promise<unknown[]> {
    let data = await requestAxiosData(
      'list calling lists',
      () => this.http.get('/lists/list'),
      mapGoDialError
    );
    return requireArrayResponse(data, 'list calling lists');
  }

  async getContacts(listId: string): Promise<unknown[]> {
    requireValue(listId, 'Calling list ID');
    let data = await requestAxiosData(
      'list contacts',
      () => this.http.get(`/contact/list/${encodeURIComponent(listId)}`),
      mapGoDialError
    );
    return requireArrayResponse(data, 'list contacts');
  }

  async addContact(data: {
    listId: string;
    phone: string;
    name?: string;
    email?: string;
    secondPhone?: string;
    companyName?: string;
    note?: string;
    remarks?: string;
    extra?: string;
    assignmentMode?: string;
  }): Promise<unknown> {
    requireValue(data.listId, 'Calling list ID');
    requireValue(data.phone, 'Primary phone number');
    return requestAxiosData(
      'add contact',
      () => this.http.post('/contact/add', data),
      mapGoDialError
    );
  }

  async listAccounts(): Promise<unknown[]> {
    let data = await requestAxiosData(
      'list accounts',
      () => this.http.get('/accounts/list'),
      mapGoDialError
    );
    return requireArrayResponse(data, 'list accounts');
  }

  async addMember(data: {
    teamsId: string[];
    name: string;
    email?: string;
    username: string;
    password: string;
    role: string;
  }): Promise<unknown> {
    if (data.teamsId.length === 0) {
      throw createApiServiceError('At least one team ID is required. Call list_teams first.', {
        reason: 'godial_invalid_input'
      });
    }
    for (let teamId of data.teamsId) {
      requireValue(teamId, 'Team ID');
    }
    requireValue(data.name, 'Member name');
    requireValue(data.username, 'Member username');
    requireValue(data.password, 'Member password');
    return requestAxiosData(
      'add member',
      () => this.http.post('/accounts/add', data),
      mapGoDialError
    );
  }

  async removeAccount(accountId: string): Promise<unknown> {
    requireValue(accountId, 'Account ID');
    return requestAxiosData(
      'remove account',
      () => this.http.post('/accounts/remove', { id: accountId }),
      mapGoDialError
    );
  }

  async getTeams(): Promise<unknown[]> {
    let data = await requestAxiosData(
      'list teams',
      () => this.http.get('/team/list'),
      mapGoDialError
    );
    return requireArrayResponse(data, 'list teams');
  }
}
