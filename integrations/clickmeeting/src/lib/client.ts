import { createAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.clickmeeting.com/v1/',
      headers: {
        'X-Api-Key': config.token
      }
    });
  }

  // ──────────────────────────── Conferences ────────────────────────────

  async listConferences(status: string = 'active') {
    let response = await this.axios.get(`/conferences/${status}`);
    return response.data;
  }

  async getConference(roomId: string) {
    let response = await this.axios.get(`/conferences/${roomId}`);
    return response.data;
  }

  async createConference(params: Record<string, unknown>) {
    let response = await this.axios.post('/conferences', params);
    return response.data;
  }

  async updateConference(roomId: string, params: Record<string, unknown>) {
    let response = await this.axios.put(`/conferences/${roomId}`, params);
    return response.data;
  }

  async deleteConference(roomId: string) {
    let response = await this.axios.delete(`/conferences/${roomId}`);
    return response.data;
  }

  // ──────────────────────────── Access Tokens ────────────────────────────

  async generateTokens(roomId: string, howMany: number) {
    let response = await this.axios.post(`/conferences/${roomId}/tokens`, {
      how_many: howMany
    });
    return response.data;
  }

  async getTokens(roomId: string) {
    let response = await this.axios.get(`/conferences/${roomId}/tokens`);
    return response.data;
  }

  async getTokensByEmail(roomId: string, email: string) {
    let response = await this.axios.post(`/conferences/${roomId}/token`, {
      email
    });
    return response.data;
  }

  async deleteTokens(roomId: string) {
    let response = await this.axios.delete(`/conferences/${roomId}/tokens`);
    return response.data;
  }

  // ──────────────────────────── Registrations ────────────────────────────

  async getRegistrations(roomId: string, status: string = 'active') {
    let response = await this.axios.get(`/conferences/${roomId}/registrations/${status}`);
    return response.data;
  }

  async getSessionRegistrations(roomId: string, sessionId: string) {
    let response = await this.axios.get(
      `/conferences/${roomId}/sessions/${sessionId}/registrations`
    );
    return response.data;
  }

  async registerAttendee(
    roomId: string,
    registration: { firstName: string; lastName: string; email: string }
  ) {
    let response = await this.axios.post(`/conferences/${roomId}/registration`, {
      registration: {
        1: registration.firstName,
        2: registration.lastName,
        3: registration.email
      }
    });
    return response.data;
  }

  // ──────────────────────────── Sessions & Attendees ────────────────────────────

  async getSessions(roomId: string) {
    let response = await this.axios.get(`/conferences/${roomId}/sessions`);
    return response.data;
  }

  async getSession(roomId: string, sessionId: string) {
    let response = await this.axios.get(`/conferences/${roomId}/sessions/${sessionId}`);
    return response.data;
  }

  async getSessionAttendees(roomId: string, sessionId: string) {
    let response = await this.axios.get(
      `/conferences/${roomId}/sessions/${sessionId}/attendees`
    );
    return response.data;
  }

  async generateSessionPdf(roomId: string, sessionId: string, lang: string = 'en') {
    let response = await this.axios.get(
      `/conferences/${roomId}/sessions/${sessionId}/generate-pdf/${lang}`
    );
    return response.data;
  }

  // ──────────────────────────── Invitations ────────────────────────────

  async sendInvitations(roomId: string, lang: string, attendees: { email: string }[]) {
    let response = await this.axios.post(`/conferences/${roomId}/invitation/email/${lang}`, {
      attendees
    });
    return response.data;
  }

  // ──────────────────────────── Auto-login URLs ────────────────────────────

  async generateAutologinHash(
    roomId: string,
    params: { email: string; nickname?: string; role: string }
  ) {
    let response = await this.axios.post(`/conferences/${roomId}/room/autologin_hash`, params);
    return response.data;
  }

  // ──────────────────────────── File Library ────────────────────────────

  async listFiles() {
    let response = await this.axios.get('/file-library');
    return response.data;
  }

  async getFile(fileId: string) {
    let response = await this.axios.get(`/file-library/${fileId}`);
    return response.data;
  }

  async deleteFile(fileId: string) {
    let response = await this.axios.delete(`/file-library/${fileId}`);
    return response.data;
  }

  async getFileDownloadUrl(fileId: string) {
    let response = await this.axios.get(`/file-library/${fileId}/download`);
    return response.data;
  }

  async listConferenceFiles(roomId: string) {
    let response = await this.axios.get(`/file-library/conferences/${roomId}`);
    return response.data;
  }

  // ──────────────────────────── Recordings ────────────────────────────

  async listRecordings(roomId: string) {
    let response = await this.axios.get(`/conferences/${roomId}/recordings`);
    return response.data;
  }

  async deleteAllRecordings(roomId: string) {
    let response = await this.axios.delete(`/conferences/${roomId}/recordings`);
    return response.data;
  }

  async deleteRecording(roomId: string, recordingId: string) {
    let response = await this.axios.delete(`/conferences/${roomId}/recordings/${recordingId}`);
    return response.data;
  }

  // ──────────────────────────── Contacts ────────────────────────────

  async addContact(params: {
    email: string;
    firstname?: string;
    lastname?: string;
    phone?: string;
    company?: string;
  }) {
    let response = await this.axios.post('/contacts', params);
    return response.data;
  }

  // ──────────────────────────── Chat ────────────────────────────

  async listChats() {
    let response = await this.axios.get('/chats');
    return response.data;
  }

  async getChatSession(sessionId: string) {
    let response = await this.axios.get(`/chats/${sessionId}`);
    return response.data;
  }

  // ──────────────────────────── Utility ────────────────────────────

  async getTimezones(country?: string) {
    let path = country ? `/time_zone_list/${country}` : '/time_zone_list';
    let response = await this.axios.get(path);
    return response.data;
  }

  async getPhoneGateways() {
    let response = await this.axios.get('/phone_gateways');
    return response.data;
  }

  async ping() {
    let response = await this.axios.get('/ping');
    return response.data;
  }
}
