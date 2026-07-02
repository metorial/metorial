import { createAxios } from '@slates/provider';
import { zoomApiError } from './errors';

let api = createAxios({
  baseURL: 'https://api.zoom.us/v2'
});

api.interceptors.response.use(
  response => response,
  error => Promise.reject(zoomApiError(error))
);

export interface PaginatedResponse<_T> {
  page_count?: number;
  page_number?: number;
  page_size?: number;
  total_records?: number;
  next_page_token?: string;
  [key: string]: any;
}

let encodeZoomPathId = (value: number | string) => {
  let raw = String(value);
  let decoded = raw;

  try {
    decoded = decodeURIComponent(raw);
  } catch {}

  let encoded = encodeURIComponent(decoded);
  if (decoded.startsWith('/') || decoded.includes('//')) {
    return encodeURIComponent(encoded);
  }

  return encoded;
};

let appendDefinedFormField = (
  formData: FormData,
  name: string,
  value: string | number | boolean | undefined
) => {
  if (value !== undefined) {
    formData.append(name, String(value));
  }
};

export class ZoomClient {
  private headers: Record<string, string>;

  constructor(token: string) {
    this.headers = {
      Authorization: `Bearer ${token}`
    };
  }

  // ─── Users ───────────────────────────────────────────────

  async listUsers(params?: {
    status?: string;
    pageSize?: number;
    pageNumber?: number;
    nextPageToken?: string;
    roleId?: string;
  }) {
    let query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.pageSize) query.set('page_size', String(params.pageSize));
    if (params?.pageNumber) query.set('page_number', String(params.pageNumber));
    if (params?.nextPageToken) query.set('next_page_token', params.nextPageToken);
    if (params?.roleId) query.set('role_id', params.roleId);

    let response = await api.get(`/users?${query.toString()}`, { headers: this.headers });
    return response.data;
  }

  async getUser(userId: string) {
    let response = await api.get(`/users/${encodeURIComponent(userId)}`, {
      headers: this.headers
    });
    return response.data;
  }

  async createUser(userData: {
    action: string;
    userInfo: {
      email: string;
      type: number;
      firstName?: string;
      lastName?: string;
    };
  }) {
    let response = await api.post(
      '/users',
      {
        action: userData.action,
        user_info: {
          email: userData.userInfo.email,
          type: userData.userInfo.type,
          first_name: userData.userInfo.firstName,
          last_name: userData.userInfo.lastName
        }
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async updateUser(userId: string, userData: Record<string, any>) {
    let response = await api.patch(`/users/${encodeURIComponent(userId)}`, userData, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteUser(userId: string, params?: { action?: string; transferEmail?: string }) {
    let query = new URLSearchParams();
    if (params?.action) query.set('action', params.action);
    if (params?.transferEmail) query.set('transfer_email', params.transferEmail);

    let response = await api.delete(
      `/users/${encodeURIComponent(userId)}?${query.toString()}`,
      { headers: this.headers }
    );
    return response.data;
  }

  async getUserSettings(userId: string) {
    let response = await api.get(`/users/${encodeURIComponent(userId)}/settings`, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── Meetings ────────────────────────────────────────────

  async listMeetings(
    userId: string,
    params?: {
      type?: string;
      pageSize?: number;
      pageNumber?: number;
      nextPageToken?: string;
    }
  ) {
    let query = new URLSearchParams();
    if (params?.type) query.set('type', params.type);
    if (params?.pageSize) query.set('page_size', String(params.pageSize));
    if (params?.pageNumber) query.set('page_number', String(params.pageNumber));
    if (params?.nextPageToken) query.set('next_page_token', params.nextPageToken);

    let response = await api.get(
      `/users/${encodeURIComponent(userId)}/meetings?${query.toString()}`,
      { headers: this.headers }
    );
    return response.data;
  }

  async getMeeting(meetingId: number | string) {
    let response = await api.get(`/meetings/${meetingId}`, { headers: this.headers });
    return response.data;
  }

  async createMeeting(userId: string, meetingData: Record<string, any>) {
    let response = await api.post(
      `/users/${encodeURIComponent(userId)}/meetings`,
      meetingData,
      { headers: this.headers }
    );
    return response.data;
  }

  async updateMeeting(meetingId: number | string, meetingData: Record<string, any>) {
    let response = await api.patch(`/meetings/${meetingId}`, meetingData, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteMeeting(
    meetingId: number | string,
    params?: { scheduleForReminder?: boolean; cancelMeetingReminder?: boolean }
  ) {
    let query = new URLSearchParams();
    if (params?.scheduleForReminder !== undefined)
      query.set('schedule_for_reminder', String(params.scheduleForReminder));
    if (params?.cancelMeetingReminder !== undefined)
      query.set('cancel_meeting_reminder', String(params.cancelMeetingReminder));

    let response = await api.delete(`/meetings/${meetingId}?${query.toString()}`, {
      headers: this.headers
    });
    return response.data;
  }

  async getMeetingInvitation(meetingId: number | string) {
    let response = await api.get(
      `/meetings/${encodeURIComponent(String(meetingId))}/invitation`,
      { headers: this.headers }
    );
    return response.data;
  }

  async listMeetingRegistrants(
    meetingId: number | string,
    params?: {
      status?: string;
      pageSize?: number;
      nextPageToken?: string;
    }
  ) {
    let query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.pageSize) query.set('page_size', String(params.pageSize));
    if (params?.nextPageToken) query.set('next_page_token', params.nextPageToken);

    let response = await api.get(
      `/meetings/${encodeZoomPathId(meetingId)}/registrants?${query.toString()}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async addMeetingRegistrant(meetingId: number | string, registrantData: Record<string, any>) {
    let response = await api.post(
      `/meetings/${encodeZoomPathId(meetingId)}/registrants`,
      registrantData,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async getMeetingParticipants(
    meetingId: string,
    params?: {
      pageSize?: number;
      nextPageToken?: string;
    }
  ) {
    let query = new URLSearchParams();
    if (params?.pageSize) query.set('page_size', String(params.pageSize));
    if (params?.nextPageToken) query.set('next_page_token', params.nextPageToken);

    let response = await api.get(
      `/report/meetings/${encodeZoomPathId(meetingId)}/participants?${query.toString()}`,
      { headers: this.headers }
    );
    return response.data;
  }

  // ─── Webinars ────────────────────────────────────────────

  async listWebinars(
    userId: string,
    params?: {
      pageSize?: number;
      pageNumber?: number;
      nextPageToken?: string;
    }
  ) {
    let query = new URLSearchParams();
    if (params?.pageSize) query.set('page_size', String(params.pageSize));
    if (params?.pageNumber) query.set('page_number', String(params.pageNumber));
    if (params?.nextPageToken) query.set('next_page_token', params.nextPageToken);

    let response = await api.get(
      `/users/${encodeURIComponent(userId)}/webinars?${query.toString()}`,
      { headers: this.headers }
    );
    return response.data;
  }

  async getWebinar(
    webinarId: number | string,
    params?: { occurrenceId?: string; showPreviousOccurrences?: boolean }
  ) {
    let query = new URLSearchParams();
    if (params?.occurrenceId) query.set('occurrence_id', params.occurrenceId);
    if (params?.showPreviousOccurrences !== undefined) {
      query.set('show_previous_occurrences', String(params.showPreviousOccurrences));
    }

    let response = await api.get(
      `/webinars/${encodeURIComponent(String(webinarId))}?${query.toString()}`,
      { headers: this.headers }
    );
    return response.data;
  }

  async createWebinar(userId: string, webinarData: Record<string, any>) {
    let response = await api.post(
      `/users/${encodeURIComponent(userId)}/webinars`,
      webinarData,
      { headers: this.headers }
    );
    return response.data;
  }

  async updateWebinar(
    webinarId: number | string,
    webinarData: Record<string, any>,
    params?: { occurrenceId?: string }
  ) {
    let query = new URLSearchParams();
    if (params?.occurrenceId) query.set('occurrence_id', params.occurrenceId);

    let response = await api.patch(
      `/webinars/${encodeURIComponent(String(webinarId))}?${query.toString()}`,
      webinarData,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteWebinar(
    webinarId: number | string,
    params?: { occurrenceId?: string; cancelWebinarReminder?: boolean }
  ) {
    let query = new URLSearchParams();
    if (params?.occurrenceId) query.set('occurrence_id', params.occurrenceId);
    if (params?.cancelWebinarReminder !== undefined) {
      query.set('cancel_webinar_reminder', String(params.cancelWebinarReminder));
    }

    let response = await api.delete(
      `/webinars/${encodeURIComponent(String(webinarId))}?${query.toString()}`,
      { headers: this.headers }
    );
    return response.data;
  }

  async listWebinarRegistrants(
    webinarId: number | string,
    params?: {
      status?: string;
      pageSize?: number;
      nextPageToken?: string;
    }
  ) {
    let query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.pageSize) query.set('page_size', String(params.pageSize));
    if (params?.nextPageToken) query.set('next_page_token', params.nextPageToken);

    let response = await api.get(`/webinars/${webinarId}/registrants?${query.toString()}`, {
      headers: this.headers
    });
    return response.data;
  }

  async addWebinarRegistrant(webinarId: number | string, registrantData: Record<string, any>) {
    let response = await api.post(`/webinars/${webinarId}/registrants`, registrantData, {
      headers: this.headers
    });
    return response.data;
  }

  async listWebinarPanelists(webinarId: number | string) {
    let response = await api.get(`/webinars/${webinarId}/panelists`, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── Recordings ──────────────────────────────────────────

  async listRecordings(
    userId: string,
    params?: {
      from?: string;
      to?: string;
      pageSize?: number;
      nextPageToken?: string;
      trashType?: string;
      mc?: boolean;
    }
  ) {
    let query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.pageSize) query.set('page_size', String(params.pageSize));
    if (params?.nextPageToken) query.set('next_page_token', params.nextPageToken);
    if (params?.trashType) query.set('trash_type', params.trashType);
    if (params?.mc !== undefined) query.set('mc', String(params.mc));

    let response = await api.get(
      `/users/${encodeURIComponent(userId)}/recordings?${query.toString()}`,
      { headers: this.headers }
    );
    return response.data;
  }

  async getMeetingRecordings(meetingId: string) {
    let response = await api.get(`/meetings/${encodeZoomPathId(meetingId)}/recordings`, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteMeetingRecordings(meetingId: string, params?: { action?: string }) {
    let query = new URLSearchParams();
    if (params?.action) query.set('action', params.action);

    let response = await api.delete(
      `/meetings/${encodeZoomPathId(meetingId)}/recordings?${query.toString()}`,
      { headers: this.headers }
    );
    return response.data;
  }

  async deleteRecordingFile(
    meetingId: string,
    recordingId: string,
    params?: { action?: string }
  ) {
    let query = new URLSearchParams();
    if (params?.action) query.set('action', params.action);

    let response = await api.delete(
      `/meetings/${encodeZoomPathId(meetingId)}/recordings/${encodeURIComponent(recordingId)}?${query.toString()}`,
      { headers: this.headers }
    );
    return response.data;
  }

  // ─── Chat ────────────────────────────────────────────────

  async listChatChannels(
    userId: string,
    params?: {
      pageSize?: number;
      nextPageToken?: string;
    }
  ) {
    let query = new URLSearchParams();
    if (params?.pageSize) query.set('page_size', String(params.pageSize));
    if (params?.nextPageToken) query.set('next_page_token', params.nextPageToken);

    let response = await api.get(
      `/chat/users/${encodeURIComponent(userId)}/channels?${query.toString()}`,
      { headers: this.headers }
    );
    return response.data;
  }

  async getChatChannel(channelId: string) {
    let response = await api.get(`/chat/channels/${channelId}`, { headers: this.headers });
    return response.data;
  }

  async createChatChannel(channelData: {
    name: string;
    type?: number;
    members?: Array<{ email: string }>;
  }) {
    let response = await api.post('/chat/users/me/channels', channelData, {
      headers: this.headers
    });
    return response.data;
  }

  async listChatMessages(
    userId: string,
    params: {
      toChannel?: string;
      toContact?: string;
      date?: string;
      from?: string;
      to?: string;
      pageSize?: number;
      nextPageToken?: string;
      includeDeletedAndEditedMessage?: boolean;
    }
  ) {
    let query = new URLSearchParams();
    if (params.toChannel) query.set('to_channel', params.toChannel);
    if (params.toContact) query.set('to_contact', params.toContact);
    if (params.date) query.set('date', params.date);
    if (params.from) query.set('from', params.from);
    if (params.to) query.set('to', params.to);
    if (params.pageSize) query.set('page_size', String(params.pageSize));
    if (params.nextPageToken) query.set('next_page_token', params.nextPageToken);
    if (params.includeDeletedAndEditedMessage !== undefined) {
      query.set(
        'include_deleted_and_edited_message',
        String(params.includeDeletedAndEditedMessage)
      );
    }

    let response = await api.get(
      `/chat/users/${encodeURIComponent(userId)}/messages?${query.toString()}`,
      { headers: this.headers }
    );
    return response.data;
  }

  async getChatMessage(
    messageId: string,
    userId: string,
    params: {
      toChannel?: string;
      toContact?: string;
    }
  ) {
    let query = new URLSearchParams();
    if (params.toChannel) query.set('to_channel', params.toChannel);
    if (params.toContact) query.set('to_contact', params.toContact);

    let response = await api.get(
      `/chat/users/${encodeURIComponent(userId)}/messages/${encodeURIComponent(messageId)}?${query.toString()}`,
      { headers: this.headers }
    );
    return response.data;
  }

  async sendChatMessage(
    userId: string,
    messageData: {
      message: string;
      toChannel?: string;
      toContact?: string;
    }
  ) {
    let formData = new FormData();
    formData.append('message', messageData.message);
    appendDefinedFormField(formData, 'to_channel', messageData.toChannel);
    appendDefinedFormField(formData, 'to_contact', messageData.toContact);

    let response = await api.post(
      `/chat/users/${encodeURIComponent(userId)}/messages`,
      formData,
      { headers: this.headers }
    );
    return response.data;
  }

  async updateChatMessage(
    messageId: string,
    userId: string,
    messageData: {
      message: string;
      toChannel?: string;
      toContact?: string;
    }
  ) {
    let formData = new FormData();
    formData.append('message', messageData.message);
    appendDefinedFormField(formData, 'to_channel', messageData.toChannel);
    appendDefinedFormField(formData, 'to_contact', messageData.toContact);

    let response = await api.put(
      `/chat/users/${encodeURIComponent(userId)}/messages/${encodeURIComponent(messageId)}`,
      formData,
      { headers: this.headers }
    );
    return response.data;
  }

  async deleteChatMessage(
    messageId: string,
    userId: string,
    params: {
      toChannel?: string;
      toContact?: string;
    }
  ) {
    let query = new URLSearchParams();
    if (params.toChannel) query.set('to_channel', params.toChannel);
    if (params.toContact) query.set('to_contact', params.toContact);

    let response = await api.delete(
      `/chat/users/${encodeURIComponent(userId)}/messages/${encodeURIComponent(messageId)}?${query.toString()}`,
      { headers: this.headers }
    );
    return response.data;
  }

  // ─── Chat Channel Members ────────────────────────────────

  async listChannelMembers(
    channelId: string,
    params?: {
      pageSize?: number;
      nextPageToken?: string;
    }
  ) {
    let query = new URLSearchParams();
    if (params?.pageSize) query.set('page_size', String(params.pageSize));
    if (params?.nextPageToken) query.set('next_page_token', params.nextPageToken);

    let response = await api.get(`/chat/channels/${channelId}/members?${query.toString()}`, {
      headers: this.headers
    });
    return response.data;
  }

  async addChannelMembers(channelId: string, members: Array<{ email: string }>) {
    let response = await api.post(
      `/chat/channels/${channelId}/members`,
      { members },
      { headers: this.headers }
    );
    return response.data;
  }

  async removeChannelMember(channelId: string, memberId: string) {
    let response = await api.delete(`/chat/channels/${channelId}/members/${memberId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // ─── Reports ─────────────────────────────────────────────

  async getDailyReport(params?: { year?: number; month?: number }) {
    let query = new URLSearchParams();
    if (params?.year) query.set('year', String(params.year));
    if (params?.month) query.set('month', String(params.month));

    let response = await api.get(`/report/daily?${query.toString()}`, {
      headers: this.headers
    });
    return response.data;
  }

  async getMeetingReport(meetingId: string) {
    let response = await api.get(`/report/meetings/${encodeZoomPathId(meetingId)}`, {
      headers: this.headers
    });
    return response.data;
  }

  async getMeetingParticipantReport(
    meetingId: string,
    params?: {
      pageSize?: number;
      nextPageToken?: string;
    }
  ) {
    let query = new URLSearchParams();
    if (params?.pageSize) query.set('page_size', String(params.pageSize));
    if (params?.nextPageToken) query.set('next_page_token', params.nextPageToken);

    let response = await api.get(
      `/report/meetings/${encodeZoomPathId(meetingId)}/participants?${query.toString()}`,
      { headers: this.headers }
    );
    return response.data;
  }

  async getUserReport(
    userId: string,
    params: {
      from: string;
      to: string;
      pageSize?: number;
      nextPageToken?: string;
      type?: string;
    }
  ) {
    let query = new URLSearchParams({
      from: params.from,
      to: params.to
    });
    if (params.pageSize) query.set('page_size', String(params.pageSize));
    if (params.nextPageToken) query.set('next_page_token', params.nextPageToken);
    if (params.type) query.set('type', params.type);

    let response = await api.get(
      `/report/users/${encodeURIComponent(userId)}/meetings?${query.toString()}`,
      { headers: this.headers }
    );
    return response.data;
  }

  // ─── Meeting Polls ───────────────────────────────────────

  async listMeetingPolls(meetingId: number | string, params?: { anonymous?: boolean }) {
    let query = new URLSearchParams();
    if (params?.anonymous !== undefined) query.set('anonymous', String(params.anonymous));

    let response = await api.get(
      `/meetings/${encodeURIComponent(String(meetingId))}/polls?${query.toString()}`,
      { headers: this.headers }
    );
    return response.data;
  }

  async getMeetingPoll(meetingId: number | string, pollId: number | string) {
    let response = await api.get(
      `/meetings/${encodeURIComponent(String(meetingId))}/polls/${encodeURIComponent(String(pollId))}`,
      { headers: this.headers }
    );
    return response.data;
  }

  async createMeetingPoll(meetingId: number | string, pollData: Record<string, any>) {
    let response = await api.post(
      `/meetings/${encodeURIComponent(String(meetingId))}/polls`,
      pollData,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async updateMeetingPoll(
    meetingId: number | string,
    pollId: number | string,
    pollData: Record<string, any>
  ) {
    let response = await api.put(
      `/meetings/${encodeURIComponent(String(meetingId))}/polls/${encodeURIComponent(String(pollId))}`,
      pollData,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteMeetingPoll(meetingId: number | string, pollId: number | string) {
    let response = await api.delete(
      `/meetings/${encodeURIComponent(String(meetingId))}/polls/${encodeURIComponent(String(pollId))}`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }
}
