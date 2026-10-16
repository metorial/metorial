import {
  buildApiServiceError,
  createApiServiceError,
  createAxios,
  isApiErrorRecord
} from 'slates';

type ApiRecord = Record<string, unknown>;

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('A ClickMeeting API key is required.');
    }
    this.axios = createAxios({
      baseURL: 'https://api.clickmeeting.com/v1/',
      headers: { 'X-Api-Key': config.token }
    });
  }

  private async request(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    data?: unknown,
    params?: ApiRecord
  ) {
    try {
      let response = await this.axios.request({ method, url, data, params });
      return response.data as unknown;
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'ClickMeeting',
        reason: 'clickmeeting_api_error',
        operation: `${method} ${url}`,
        extractResponse: (input, helpers) => helpers.getResponseWithBody(input)
      });
    }
  }

  private async object(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    data?: unknown
  ) {
    let result = await this.request(method, url, data);
    if (!isApiErrorRecord(result)) {
      throw createApiServiceError(
        `ClickMeeting returned an invalid object response for ${method} ${url}.`
      );
    }
    return result;
  }

  private async list(url: string, params?: ApiRecord) {
    let result = await this.request('GET', url, undefined, params);
    if (!Array.isArray(result) || !result.every(isApiErrorRecord)) {
      throw createApiServiceError(
        `ClickMeeting returned an invalid list response for GET ${url}.`
      );
    }
    return result as ApiRecord[];
  }

  private async confirmedPost(url: string, data: unknown) {
    let result = await this.object('POST', url, data);
    if (result.status !== 'OK') {
      throw buildApiServiceError(
        { response: { status: 200, data: result } },
        {
          providerLabel: 'ClickMeeting',
          reason: 'clickmeeting_unconfirmed_operation',
          operation: `POST ${url}`
        }
      );
    }
    return result;
  }

  private async confirm(
    method: 'DELETE',
    url: string,
    field: string,
    expected = 'OK',
    data?: unknown
  ) {
    let result = await this.object(method, url, data);
    if (result[field] !== expected) {
      throw createApiServiceError(`ClickMeeting did not confirm the operation for ${url}.`);
    }
    return result;
  }

  listConferences(status = 'active', page?: number) {
    return this.list(`/conferences/${encodeURIComponent(status)}`, { page });
  }

  getConference(roomId: string) {
    return this.object('GET', `/conferences/${encodeURIComponent(roomId)}`);
  }

  createConference(params: ApiRecord) {
    return this.object('POST', '/conferences', params);
  }

  updateConference(roomId: string, params: ApiRecord) {
    return this.object('PUT', `/conferences/${encodeURIComponent(roomId)}`, params);
  }

  deleteConference(roomId: string) {
    return this.confirm('DELETE', `/conferences/${encodeURIComponent(roomId)}`, 'result');
  }

  async generateTokens(roomId: string, howMany: number) {
    return this.object('POST', `/conferences/${encodeURIComponent(roomId)}/tokens`, {
      how_many: howMany
    });
  }

  getTokens(roomId: string) {
    return this.object('GET', `/conferences/${encodeURIComponent(roomId)}/tokens`);
  }

  async getTokensByEmail(roomId: string, email: string) {
    let result = await this.request(
      'POST',
      `/conferences/${encodeURIComponent(roomId)}/token`,
      { email }
    );
    if (!Array.isArray(result) || !result.every(value => typeof value === 'string')) {
      throw createApiServiceError('ClickMeeting returned an invalid email-token response.');
    }
    return result as string[];
  }

  deleteTokens(roomId: string) {
    return this.confirm(
      'DELETE',
      `/conferences/${encodeURIComponent(roomId)}/tokens`,
      'status',
      'deleted'
    );
  }

  getRegistrations(roomId: string, status = 'active') {
    return this.list(
      `/conferences/${encodeURIComponent(roomId)}/registrations/${encodeURIComponent(status)}`
    );
  }

  getSessionRegistrations(roomId: string, sessionId: string) {
    return this.list(
      `/conferences/${encodeURIComponent(roomId)}/sessions/${encodeURIComponent(sessionId)}/registrations`
    );
  }

  registerAttendee(
    roomId: string,
    registration: { firstName: string; lastName: string; email: string; company?: string },
    confirmation?: { enabled?: boolean; language?: string }
  ) {
    let body = new URLSearchParams({
      'registration[1]': registration.firstName,
      'registration[2]': registration.lastName,
      'registration[3]': registration.email
    });
    if (registration.company !== undefined) body.set('registration[10]', registration.company);
    if (confirmation?.enabled !== undefined)
      body.set('confirmation_email[enabled]', confirmation.enabled ? '1' : '0');
    if (confirmation?.language !== undefined)
      body.set('confirmation_email[lang]', confirmation.language);
    return this.confirmedPost(`/conferences/${encodeURIComponent(roomId)}/registration`, body);
  }

  getSessions(roomId: string) {
    return this.list(`/conferences/${encodeURIComponent(roomId)}/sessions`);
  }

  getSession(roomId: string, sessionId: string) {
    return this.object(
      'GET',
      `/conferences/${encodeURIComponent(roomId)}/sessions/${encodeURIComponent(sessionId)}`
    );
  }

  getSessionAttendees(roomId: string, sessionId: string) {
    return this.list(
      `/conferences/${encodeURIComponent(roomId)}/sessions/${encodeURIComponent(sessionId)}/attendees`
    );
  }

  generateSessionPdf(roomId: string, sessionId: string, lang = 'en') {
    return this.object(
      'GET',
      `/conferences/${encodeURIComponent(roomId)}/sessions/${encodeURIComponent(sessionId)}/generate-pdf/${encodeURIComponent(lang)}`
    );
  }

  sendInvitations(
    roomId: string,
    lang: string,
    attendees: { email: string }[],
    options?: { template?: string; role?: string }
  ) {
    return this.confirmedPost(
      `/conferences/${encodeURIComponent(roomId)}/invitation/email/${encodeURIComponent(lang)}`,
      { attendees, ...options }
    );
  }

  generateAutologinHash(
    roomId: string,
    params: {
      email: string;
      nickname?: string;
      role: string;
      password?: string;
      token?: string;
    }
  ) {
    return this.object(
      'POST',
      `/conferences/${encodeURIComponent(roomId)}/room/autologin_hash`,
      params
    );
  }

  listFiles() {
    return this.list('/file-library');
  }

  getFile(fileId: string) {
    return this.object('GET', `/file-library/${encodeURIComponent(fileId)}`);
  }

  deleteFile(fileId: string) {
    return this.confirm('DELETE', `/file-library/${encodeURIComponent(fileId)}`, 'response');
  }

  listConferenceFiles(roomId: string) {
    return this.list(`/file-library/conferences/${encodeURIComponent(roomId)}`);
  }

  uploadFile(data: FormData, roomId?: string) {
    return this.object(
      'POST',
      roomId ? `/file-library/conferences/${encodeURIComponent(roomId)}` : '/file-library',
      data
    );
  }

  listAccountRecordings() {
    return this.list('/conferences/recordings');
  }

  listRecordings(roomId: string) {
    return this.list(`/conferences/${encodeURIComponent(roomId)}/recordings`);
  }

  async publishRecording(roomId: string, recordingId: string, publish: boolean) {
    let result = await this.request(
      'POST',
      `/conferences/${encodeURIComponent(roomId)}/recordings/${encodeURIComponent(recordingId)}/${publish ? 'publish' : 'unpublish'}`
    );
    if (typeof result !== 'string' || !result) {
      throw createApiServiceError(
        'ClickMeeting returned an invalid recording publication response.'
      );
    }
    return result;
  }

  deleteAllRecordings(roomId: string) {
    return this.confirm(
      'DELETE',
      `/conferences/${encodeURIComponent(roomId)}/recordings`,
      'STATUS'
    );
  }

  deleteRecording(roomId: string, recordingId: string) {
    return this.confirm(
      'DELETE',
      `/conferences/${encodeURIComponent(roomId)}/recordings/${encodeURIComponent(recordingId)}`,
      'STATUS'
    );
  }

  addContact(params: {
    email: string;
    firstname?: string;
    lastname?: string;
    phone?: string;
    company?: string;
    country?: string;
  }) {
    return this.confirmedPost('/contacts', params);
  }

  listChats() {
    return this.list('/chats');
  }

  async getTimezones(country?: string) {
    let result = await this.request(
      'GET',
      country ? `/time_zone_list/${encodeURIComponent(country)}` : '/time_zone_list'
    );
    if (!Array.isArray(result) || !result.every(value => typeof value === 'string')) {
      throw createApiServiceError('ClickMeeting returned an invalid timezone list.');
    }
    return result as string[];
  }

  getPhoneGateways() {
    return this.list('/phone_gateways');
  }

  ping() {
    return this.object('GET', '/ping');
  }
}
