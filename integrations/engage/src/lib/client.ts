import { createAxios } from 'slates';
import type {
  CreateListParams,
  CreateUserParams,
  EngageList,
  EngageUser,
  PaginatedResponse,
  SendEmailParams,
  SendSmsParams,
  SubscribeToListParams,
  TrackEventParams,
  UpdateListParams,
  UpdateUserParams
} from './types';

export class Client {
  private http;

  constructor(credentials: { token: string; secret: string }) {
    this.http = createAxios({
      baseURL: 'https://api.engage.so/v1',
      auth: {
        username: credentials.token,
        password: credentials.secret
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Users ──

  async createUser(params: CreateUserParams): Promise<EngageUser> {
    let res = await this.http.post('/users', params);
    return res.data;
  }

  async getUser(uid: string): Promise<EngageUser> {
    let res = await this.http.get(`/users/${encodeURIComponent(uid)}`);
    return res.data;
  }

  async updateUser(uid: string, params: UpdateUserParams): Promise<EngageUser> {
    let res = await this.http.put(`/users/${encodeURIComponent(uid)}`, params);
    return res.data;
  }

  async listUsers(options?: {
    limit?: number;
    nextCursor?: string;
    previousCursor?: string;
    email?: string;
  }): Promise<PaginatedResponse<EngageUser>> {
    let queryParams: Record<string, string> = {};
    if (options?.limit) queryParams.limit = String(options.limit);
    if (options?.nextCursor) queryParams.next_cursor = options.nextCursor;
    if (options?.previousCursor) queryParams.previous_cursor = options.previousCursor;
    if (options?.email) queryParams.email = options.email;

    let res = await this.http.get('/users', { params: queryParams });
    return res.data;
  }

  async archiveUser(uid: string): Promise<{ status: string }> {
    let res = await this.http.post(`/users/${encodeURIComponent(uid)}/archive`);
    return res.data;
  }

  async deleteUser(uid: string): Promise<{ status: string }> {
    let res = await this.http.delete(`/users/${encodeURIComponent(uid)}`);
    return res.data;
  }

  async mergeUsers(sourceUid: string, destinationUid: string): Promise<unknown> {
    let res = await this.http.post('/users/merge', {
      source: sourceUid,
      destination: destinationUid
    });
    return res.data;
  }

  async deleteUserAttribute(uid: string, attribute: string): Promise<unknown> {
    let res = await this.http.delete(
      `/users/${encodeURIComponent(uid)}/attributes/${encodeURIComponent(attribute)}`
    );
    return res.data;
  }

  async deleteDeviceToken(uid: string, token: string): Promise<unknown> {
    let res = await this.http.delete(
      `/users/${encodeURIComponent(uid)}/tokens/${encodeURIComponent(token)}`
    );
    return res.data;
  }

  // ── User Type Conversion ──

  async convertUserType(uid: string, type: 'customer' | 'account'): Promise<unknown> {
    let res = await this.http.post(`/users/${encodeURIComponent(uid)}/convert`, { type });
    return res.data;
  }

  // ── User-Account Relationships ──

  async addUserToAccounts(
    uid: string,
    accounts: Array<{ id: string; role?: string }>
  ): Promise<unknown> {
    let res = await this.http.post(`/users/${encodeURIComponent(uid)}/accounts`, { accounts });
    return res.data;
  }

  async removeUserFromAccount(uid: string, accountId: string): Promise<unknown> {
    let res = await this.http.delete(
      `/users/${encodeURIComponent(uid)}/accounts/${encodeURIComponent(accountId)}`
    );
    return res.data;
  }

  async changeAccountRole(uid: string, accountId: string, role: string): Promise<unknown> {
    let res = await this.http.put(
      `/users/${encodeURIComponent(uid)}/accounts/${encodeURIComponent(accountId)}`,
      { role }
    );
    return res.data;
  }

  async getAccountMembers(uid: string): Promise<{ data: EngageUser[] }> {
    let res = await this.http.get(`/users/${encodeURIComponent(uid)}/members`);
    return res.data;
  }

  // ── User-List Relationships ──

  async addUserToLists(uid: string, listIds: string[]): Promise<unknown> {
    let res = await this.http.post(`/users/${encodeURIComponent(uid)}/lists`, {
      lists: listIds
    });
    return res.data;
  }

  async removeUserFromLists(uid: string, listIds: string[]): Promise<unknown> {
    let res = await this.http.delete(`/users/${encodeURIComponent(uid)}/lists`, {
      data: { lists: listIds }
    });
    return res.data;
  }

  // ── Events ──

  async trackEvent(uid: string, params: TrackEventParams): Promise<unknown> {
    let res = await this.http.post(`/users/${encodeURIComponent(uid)}/events`, params);
    return res.data;
  }

  // ── Lists ──

  async createList(params: CreateListParams): Promise<EngageList> {
    let body: Record<string, unknown> = { title: params.title };
    if (params.description !== undefined) body.description = params.description;
    if (params.redirectUrl !== undefined) body.redirect_url = params.redirectUrl;
    if (params.doubleOptin !== undefined) body.double_optin = params.doubleOptin;

    let res = await this.http.post('/lists', body);
    return res.data;
  }

  async getLists(options?: {
    limit?: number;
    nextCursor?: string;
    previousCursor?: string;
  }): Promise<PaginatedResponse<EngageList>> {
    let queryParams: Record<string, string> = {};
    if (options?.limit) queryParams.limit = String(options.limit);
    if (options?.nextCursor) queryParams.next_cursor = options.nextCursor;
    if (options?.previousCursor) queryParams.previous_cursor = options.previousCursor;

    let res = await this.http.get('/lists', { params: queryParams });
    return res.data;
  }

  async getList(listId: string): Promise<EngageList> {
    let res = await this.http.get(`/lists/${encodeURIComponent(listId)}`);
    return res.data;
  }

  async updateList(listId: string, params: UpdateListParams): Promise<EngageList> {
    let body: Record<string, unknown> = {};
    if (params.title !== undefined) body.title = params.title;
    if (params.description !== undefined) body.description = params.description;
    if (params.redirectUrl !== undefined) body.redirect_url = params.redirectUrl;
    if (params.doubleOptin !== undefined) body.double_optin = params.doubleOptin;

    let res = await this.http.put(`/lists/${encodeURIComponent(listId)}`, body);
    return res.data;
  }

  async archiveList(listId: string): Promise<{ status: string }> {
    let res = await this.http.delete(`/lists/${encodeURIComponent(listId)}`);
    return res.data;
  }

  async subscribeToList(
    listId: string,
    params: SubscribeToListParams
  ): Promise<{ uid: string }> {
    let res = await this.http.post(`/lists/${encodeURIComponent(listId)}/subscribers`, params);
    return res.data;
  }

  async updateSubscription(
    listId: string,
    uid: string,
    subscribed: boolean
  ): Promise<{ subscribed: boolean }> {
    let res = await this.http.put(
      `/lists/${encodeURIComponent(listId)}/subscribers/${encodeURIComponent(uid)}`,
      { subscribed }
    );
    return res.data;
  }

  async removeSubscriber(listId: string, uid: string): Promise<{ status: string }> {
    let res = await this.http.delete(
      `/lists/${encodeURIComponent(listId)}/subscribers/${encodeURIComponent(uid)}`
    );
    return res.data;
  }

  // ── Transactional Messaging ──

  async sendEmail(params: SendEmailParams): Promise<{ id: string }> {
    let body: Record<string, unknown> = {
      from: params.from,
      to: params.to,
      subject: params.subject
    };
    if (params.html !== undefined) body.html = params.html;
    if (params.text !== undefined) body.text = params.text;
    if (params.template !== undefined) body.template = params.template;
    if (params.templateVariables !== undefined)
      body.template_variables = params.templateVariables;
    if (params.cc !== undefined) body.cc = params.cc;
    if (params.bcc !== undefined) body.bcc = params.bcc;
    if (params.replyTo !== undefined) body.reply_to = params.replyTo;
    if (params.trackClicks !== undefined) body.track_clicks = params.trackClicks;
    if (params.trackOpens !== undefined) body.track_opens = params.trackOpens;

    let res = await this.http.post('/send/email', body);
    return res.data;
  }

  async sendSms(params: SendSmsParams): Promise<{ id: string }> {
    let body: Record<string, unknown> = {
      from: params.from,
      to: params.to,
      body: params.body,
      source: params.source
    };
    if (params.trackClicks !== undefined) body.track_clicks = params.trackClicks;
    if (params.channel !== undefined) body.channel = params.channel;

    let res = await this.http.post('/send/sms', body);
    return res.data;
  }
}
