import { createAxios } from 'slates';

let api = createAxios({
  baseURL: 'https://webexapis.com/v1'
});

export class WebexClient {
  private token: string;

  constructor(config: { token: string }) {
    this.token = config.token;
  }

  private headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  // ---- Messages ----

  async listMessages(params: {
    roomId: string;
    parentId?: string;
    mentionedPeople?: string;
    before?: string;
    beforeMessage?: string;
    max?: number;
  }) {
    let response = await api.get('/messages', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async listDirectMessages(params: { personId?: string; personEmail?: string }) {
    let response = await api.get('/messages/direct', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async createMessage(body: {
    roomId?: string;
    toPersonId?: string;
    toPersonEmail?: string;
    parentId?: string;
    text?: string;
    markdown?: string;
    files?: string[];
    attachments?: any[];
  }) {
    let response = await api.post('/messages', body, {
      headers: this.headers()
    });
    return response.data;
  }

  async getMessage(messageId: string) {
    let response = await api.get(`/messages/${messageId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async updateMessage(
    messageId: string,
    body: {
      roomId: string;
      text?: string;
      markdown?: string;
    }
  ) {
    let response = await api.put(`/messages/${messageId}`, body, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteMessage(messageId: string) {
    await api.delete(`/messages/${messageId}`, {
      headers: this.headers()
    });
  }

  // ---- Rooms / Spaces ----

  async listRooms(params?: { teamId?: string; type?: string; sortBy?: string; max?: number }) {
    let response = await api.get('/rooms', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async createRoom(body: {
    title: string;
    teamId?: string;
    classificationId?: string;
    isLocked?: boolean;
    isPublic?: boolean;
    description?: string;
    isAnnouncementOnly?: boolean;
  }) {
    let response = await api.post('/rooms', body, {
      headers: this.headers()
    });
    return response.data;
  }

  async getRoom(roomId: string) {
    let response = await api.get(`/rooms/${roomId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async updateRoom(
    roomId: string,
    body: {
      title?: string;
      classificationId?: string;
      teamId?: string;
      isLocked?: boolean;
      isPublic?: boolean;
      description?: string;
      isAnnouncementOnly?: boolean;
      isReadOnly?: boolean;
    }
  ) {
    let response = await api.put(`/rooms/${roomId}`, body, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteRoom(roomId: string) {
    await api.delete(`/rooms/${roomId}`, {
      headers: this.headers()
    });
  }

  // ---- Memberships ----

  async listMemberships(params?: {
    roomId?: string;
    personId?: string;
    personEmail?: string;
    max?: number;
  }) {
    let response = await api.get('/memberships', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async createMembership(body: {
    roomId: string;
    personId?: string;
    personEmail?: string;
    isModerator?: boolean;
  }) {
    let response = await api.post('/memberships', body, {
      headers: this.headers()
    });
    return response.data;
  }

  async getMembership(membershipId: string) {
    let response = await api.get(`/memberships/${membershipId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async updateMembership(
    membershipId: string,
    body: {
      isModerator?: boolean;
      isRoomHidden?: boolean;
    }
  ) {
    let response = await api.put(`/memberships/${membershipId}`, body, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteMembership(membershipId: string) {
    await api.delete(`/memberships/${membershipId}`, {
      headers: this.headers()
    });
  }

  // ---- People ----

  async listPeople(params?: {
    email?: string;
    displayName?: string;
    id?: string;
    orgId?: string;
    max?: number;
  }) {
    let response = await api.get('/people', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async getPerson(personId: string) {
    let response = await api.get(`/people/${personId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async getMe() {
    let response = await api.get('/people/me', {
      headers: this.headers()
    });
    return response.data;
  }

  // ---- Meetings ----

  async listMeetings(params?: {
    meetingNumber?: string;
    webLink?: string;
    roomId?: string;
    meetingType?: string;
    state?: string;
    from?: string;
    to?: string;
    hostEmail?: string;
    max?: number;
  }) {
    let response = await api.get('/meetings', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async createMeeting(body: {
    title: string;
    agenda?: string;
    password?: string;
    start?: string;
    end?: string;
    timezone?: string;
    recurrence?: string;
    enabledAutoRecordMeeting?: boolean;
    allowAnyUserToBeCoHost?: boolean;
    enabledJoinBeforeHost?: boolean;
    enableConnectAudioBeforeHost?: boolean;
    joinBeforeHostMinutes?: number;
    excludePassword?: boolean;
    publicMeeting?: boolean;
    reminderTime?: number;
    sendEmail?: boolean;
    hostEmail?: string;
    siteUrl?: string;
    invitees?: Array<{ email: string; displayName?: string; coHost?: boolean }>;
  }) {
    let response = await api.post('/meetings', body, {
      headers: this.headers()
    });
    return response.data;
  }

  async getMeeting(
    meetingId: string,
    params?: {
      current?: boolean;
      hostEmail?: string;
    }
  ) {
    let response = await api.get(`/meetings/${meetingId}`, {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async updateMeeting(
    meetingId: string,
    body: {
      title?: string;
      agenda?: string;
      password?: string;
      start?: string;
      end?: string;
      timezone?: string;
      recurrence?: string;
      enabledAutoRecordMeeting?: boolean;
      allowAnyUserToBeCoHost?: boolean;
      sendEmail?: boolean;
    }
  ) {
    let response = await api.patch(`/meetings/${meetingId}`, body, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteMeeting(
    meetingId: string,
    params?: {
      hostEmail?: string;
      sendEmail?: boolean;
    }
  ) {
    await api.delete(`/meetings/${meetingId}`, {
      headers: this.headers(),
      params
    });
  }

  // ---- Recordings ----

  async listRecordings(params?: {
    from?: string;
    to?: string;
    meetingId?: string;
    hostEmail?: string;
    siteUrl?: string;
    max?: number;
  }) {
    let response = await api.get('/recordings', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async getRecording(
    recordingId: string,
    params?: {
      hostEmail?: string;
    }
  ) {
    let response = await api.get(`/recordings/${recordingId}`, {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async deleteRecording(
    recordingId: string,
    params?: {
      hostEmail?: string;
    }
  ) {
    await api.delete(`/recordings/${recordingId}`, {
      headers: this.headers(),
      params
    });
  }

  // ---- Teams ----

  async listTeams(params?: { max?: number }) {
    let response = await api.get('/teams', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async createTeam(body: { name: string }) {
    let response = await api.post('/teams', body, {
      headers: this.headers()
    });
    return response.data;
  }

  async getTeam(teamId: string) {
    let response = await api.get(`/teams/${teamId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async updateTeam(teamId: string, body: { name: string }) {
    let response = await api.put(`/teams/${teamId}`, body, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteTeam(teamId: string) {
    await api.delete(`/teams/${teamId}`, {
      headers: this.headers()
    });
  }

  // ---- Webhooks ----

  async listWebhooks(params?: { max?: number; ownedBy?: string }) {
    let response = await api.get('/webhooks', {
      headers: this.headers(),
      params
    });
    return response.data;
  }

  async createWebhook(body: {
    name: string;
    targetUrl: string;
    resource: string;
    event: string;
    filter?: string;
    secret?: string;
    ownedBy?: string;
  }) {
    let response = await api.post('/webhooks', body, {
      headers: this.headers()
    });
    return response.data;
  }

  async getWebhook(webhookId: string) {
    let response = await api.get(`/webhooks/${webhookId}`, {
      headers: this.headers()
    });
    return response.data;
  }

  async updateWebhook(
    webhookId: string,
    body: {
      name?: string;
      targetUrl?: string;
      secret?: string;
      status?: string;
      ownedBy?: string;
    }
  ) {
    let response = await api.put(`/webhooks/${webhookId}`, body, {
      headers: this.headers()
    });
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    await api.delete(`/webhooks/${webhookId}`, {
      headers: this.headers()
    });
  }

  // ---- Attachment Actions ----

  async getAttachmentAction(actionId: string) {
    let response = await api.get(`/attachment/actions/${actionId}`, {
      headers: this.headers()
    });
    return response.data;
  }
}
