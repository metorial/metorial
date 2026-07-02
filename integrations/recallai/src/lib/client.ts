import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  region: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface BotStatusChange {
  code: string;
  message: string | null;
  createdAt: string;
  subCode: string | null;
}

export interface BotMeetingParticipant {
  participantId: number;
  name: string;
  events: Array<{
    code: string;
    createdAt: string;
  }>;
}

export interface BotMediaObject {
  id: string;
  status: string;
  url: string | null;
  createdAt: string;
}

export interface Bot {
  id: string;
  meetingUrl: Record<string, unknown> | string;
  botName: string;
  joinAt: string | null;
  status: string;
  statusChanges: BotStatusChange[];
  meetingParticipants: BotMeetingParticipant[];
  meetingMetadata: Record<string, unknown> | null;
  videoUrl: string | null;
  recordingConfig: Record<string, unknown> | null;
  createdAt: string;
  mediaRetentionEnd: string | null;
}

export interface TranscriptEntry {
  id: number;
  speaker: string;
  speakerId: number | null;
  words: Array<{
    text: string;
    startTime: number;
    endTime: number;
  }>;
  language: string | null;
  original_transcript_id: number | null;
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  meetingUrl: string | null;
  meetingPlatform: string | null;
  startTime: string;
  endTime: string;
  title: string | null;
  isDeleted: boolean;
  raw: Record<string, unknown>;
  updatedAt: string;
  createdAt: string;
}

export interface Calendar {
  id: string;
  platform: string;
  platformEmail: string | null;
  status: string;
  statusChanges: Array<{
    code: string;
    createdAt: string;
  }>;
  createdAt: string;
}

export interface Recording {
  id: string;
  botId: string;
  status: string;
  mediaObjects: BotMediaObject[];
  createdAt: string;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: ClientConfig) {
    this.axios = createAxios({
      baseURL: `https://${config.region}.recall.ai/api/v1`,
      headers: {
        Authorization: `Token ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Bot Management ----

  async createBot(params: {
    meetingUrl: string;
    botName?: string;
    joinAt?: string;
    recordingConfig?: Record<string, unknown>;
    transcriptionOptions?: Record<string, unknown>;
    chatMessages?: Record<string, unknown>[];
    metadata?: Record<string, unknown>;
    automaticLeave?: Record<string, unknown>;
    autoRecordOnJoin?: boolean;
  }): Promise<Bot> {
    let body: Record<string, unknown> = {
      meeting_url: params.meetingUrl
    };
    if (params.botName) body.bot_name = params.botName;
    if (params.joinAt) body.join_at = params.joinAt;
    if (params.recordingConfig) body.recording_config = params.recordingConfig;
    if (params.transcriptionOptions) body.transcription_options = params.transcriptionOptions;
    if (params.chatMessages) body.chat_messages = params.chatMessages;
    if (params.metadata) body.metadata = params.metadata;
    if (params.automaticLeave) body.automatic_leave = params.automaticLeave;
    if (params.autoRecordOnJoin !== undefined)
      body.auto_record_on_join = params.autoRecordOnJoin;

    let response = await this.axios.post('/bot/', body);
    return this.mapBot(response.data);
  }

  async listBots(params?: {
    cursor?: string;
    joinAtAfter?: string;
    joinAtBefore?: string;
    statusIn?: string;
    meetingUrl?: string;
    ordering?: string;
    pageSize?: number;
  }): Promise<PaginatedResponse<Bot>> {
    let queryParams: Record<string, string> = {};
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.joinAtAfter) queryParams.join_at_after = params.joinAtAfter;
    if (params?.joinAtBefore) queryParams.join_at_before = params.joinAtBefore;
    if (params?.statusIn) queryParams.status__in = params.statusIn;
    if (params?.meetingUrl) queryParams.meeting_url = params.meetingUrl;
    if (params?.ordering) queryParams.ordering = params.ordering;
    if (params?.pageSize) queryParams.page_size = String(params.pageSize);

    let response = await this.axios.get('/bot/', { params: queryParams });
    return {
      count: response.data.count,
      next: response.data.next,
      previous: response.data.previous,
      results: response.data.results.map((bot: Record<string, unknown>) => this.mapBot(bot))
    };
  }

  async getBot(botId: string): Promise<Bot> {
    let response = await this.axios.get(`/bot/${botId}/`);
    return this.mapBot(response.data);
  }

  async updateBot(
    botId: string,
    params: {
      meetingUrl?: string;
      botName?: string;
      joinAt?: string;
      recordingConfig?: Record<string, unknown>;
      transcriptionOptions?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
      automaticLeave?: Record<string, unknown>;
    }
  ): Promise<Bot> {
    let body: Record<string, unknown> = {};
    if (params.meetingUrl) body.meeting_url = params.meetingUrl;
    if (params.botName) body.bot_name = params.botName;
    if (params.joinAt) body.join_at = params.joinAt;
    if (params.recordingConfig) body.recording_config = params.recordingConfig;
    if (params.transcriptionOptions) body.transcription_options = params.transcriptionOptions;
    if (params.metadata) body.metadata = params.metadata;
    if (params.automaticLeave) body.automatic_leave = params.automaticLeave;

    let response = await this.axios.patch(`/bot/${botId}/`, body);
    return this.mapBot(response.data);
  }

  async deleteBot(botId: string): Promise<void> {
    await this.axios.delete(`/bot/${botId}/`);
  }

  async removeBotFromCall(botId: string): Promise<void> {
    await this.axios.post(`/bot/${botId}/leave_call/`);
  }

  // ---- Transcript ----

  async getBotTranscript(botId: string): Promise<TranscriptEntry[]> {
    let response = await this.axios.get(`/bot/${botId}/transcript/`);
    let entries = Array.isArray(response.data) ? response.data : response.data.results || [];
    return entries.map((entry: Record<string, unknown>) => this.mapTranscriptEntry(entry));
  }

  // ---- Chat ----

  async sendChatMessage(botId: string, message: string): Promise<void> {
    await this.axios.post(`/bot/${botId}/send_chat_message/`, { message });
  }

  // ---- Output Media ----

  async outputMedia(
    botId: string,
    params: {
      kind: string;
      data: Record<string, unknown>;
    }
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.post(`/bot/${botId}/output_media/`, {
      kind: params.kind,
      data: params.data
    });
    return response.data;
  }

  // ---- Calendar (V2) ----

  async createCalendar(params: {
    platform: string;
    oauthToken: Record<string, unknown>;
  }): Promise<Calendar> {
    let response = await this.axios.post('/calendars/', {
      platform: params.platform,
      oauth_token: params.oauthToken
    });
    return this.mapCalendar(response.data);
  }

  async listCalendars(params?: {
    cursor?: string;
    pageSize?: number;
  }): Promise<PaginatedResponse<Calendar>> {
    let queryParams: Record<string, string> = {};
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.pageSize) queryParams.page_size = String(params.pageSize);

    let response = await this.axios.get('/calendars/', { params: queryParams });
    return {
      count: response.data.count,
      next: response.data.next,
      previous: response.data.previous,
      results: response.data.results.map((cal: Record<string, unknown>) =>
        this.mapCalendar(cal)
      )
    };
  }

  async getCalendar(calendarId: string): Promise<Calendar> {
    let response = await this.axios.get(`/calendars/${calendarId}/`);
    return this.mapCalendar(response.data);
  }

  async deleteCalendar(calendarId: string): Promise<void> {
    await this.axios.delete(`/calendars/${calendarId}/`);
  }

  async listCalendarEvents(params?: {
    cursor?: string;
    calendarId?: string;
    startTimeAfter?: string;
    startTimeBefore?: string;
    updatedAtGte?: string;
    isDeleted?: boolean;
    pageSize?: number;
  }): Promise<PaginatedResponse<CalendarEvent>> {
    let queryParams: Record<string, string> = {};
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.calendarId) queryParams.calendar_id = params.calendarId;
    if (params?.startTimeAfter) queryParams.start_time__gte = params.startTimeAfter;
    if (params?.startTimeBefore) queryParams.start_time__lte = params.startTimeBefore;
    if (params?.updatedAtGte) queryParams.updated_at__gte = params.updatedAtGte;
    if (params?.isDeleted !== undefined) queryParams.is_deleted = String(params.isDeleted);
    if (params?.pageSize) queryParams.page_size = String(params.pageSize);

    let response = await this.axios.get('/calendar-events/', { params: queryParams });
    return {
      count: response.data.count,
      next: response.data.next,
      previous: response.data.previous,
      results: response.data.results.map((evt: Record<string, unknown>) =>
        this.mapCalendarEvent(evt)
      )
    };
  }

  async getCalendarEvent(eventId: string): Promise<CalendarEvent> {
    let response = await this.axios.get(`/calendar-events/${eventId}/`);
    return this.mapCalendarEvent(response.data);
  }

  async scheduleBotForCalendarEvent(
    eventId: string,
    params?: {
      botConfig?: Record<string, unknown>;
    }
  ): Promise<Record<string, unknown>> {
    let body: Record<string, unknown> = {};
    if (params?.botConfig) body.bot_config = params.botConfig;

    let response = await this.axios.post(`/calendar-events/${eventId}/bot/`, body);
    return response.data;
  }

  async deleteBotFromCalendarEvent(eventId: string): Promise<void> {
    await this.axios.delete(`/calendar-events/${eventId}/bot/`);
  }

  // ---- Recordings ----

  async listRecordings(params?: {
    cursor?: string;
    botId?: string;
    pageSize?: number;
  }): Promise<PaginatedResponse<Recording>> {
    let queryParams: Record<string, string> = {};
    if (params?.cursor) queryParams.cursor = params.cursor;
    if (params?.botId) queryParams.bot_id = params.botId;
    if (params?.pageSize) queryParams.page_size = String(params.pageSize);

    let response = await this.axios.get('/recordings/', { params: queryParams });
    return {
      count: response.data.count,
      next: response.data.next,
      previous: response.data.previous,
      results: response.data.results.map((rec: Record<string, unknown>) =>
        this.mapRecording(rec)
      )
    };
  }

  async getRecording(recordingId: string): Promise<Recording> {
    let response = await this.axios.get(`/recordings/${recordingId}/`);
    return this.mapRecording(response.data);
  }

  // ---- Mappers ----

  private mapBot(data: Record<string, unknown>): Bot {
    let statusChanges = Array.isArray(data.status_changes) ? data.status_changes : [];
    let meetingParticipants = Array.isArray(data.meeting_participants)
      ? data.meeting_participants
      : [];

    return {
      id: String(data.id || ''),
      meetingUrl: (data.meeting_url as Record<string, unknown> | string) || '',
      botName: String(data.bot_name || ''),
      joinAt: data.join_at ? String(data.join_at) : null,
      status: String(data.status || ''),
      statusChanges: statusChanges.map((sc: Record<string, unknown>) => ({
        code: String(sc.code || ''),
        message: sc.message ? String(sc.message) : null,
        createdAt: String(sc.created_at || ''),
        subCode: sc.sub_code ? String(sc.sub_code) : null
      })),
      meetingParticipants: meetingParticipants.map((mp: Record<string, unknown>) => ({
        participantId: Number(mp.id || mp.participant_id || 0),
        name: String(mp.name || ''),
        events: Array.isArray(mp.events)
          ? mp.events.map((e: Record<string, unknown>) => ({
              code: String(e.code || ''),
              createdAt: String(e.created_at || '')
            }))
          : []
      })),
      meetingMetadata: (data.meeting_metadata as Record<string, unknown>) || null,
      videoUrl: data.video_url ? String(data.video_url) : null,
      recordingConfig: (data.recording_config as Record<string, unknown>) || null,
      createdAt: String(data.created_at || ''),
      mediaRetentionEnd: data.media_retention_end ? String(data.media_retention_end) : null
    };
  }

  private mapTranscriptEntry(data: Record<string, unknown>): TranscriptEntry {
    let words = Array.isArray(data.words) ? data.words : [];
    return {
      id: Number(data.id || 0),
      speaker: String(data.speaker || ''),
      speakerId: data.speaker_id != null ? Number(data.speaker_id) : null,
      words: words.map((w: Record<string, unknown>) => ({
        text: String(w.text || ''),
        startTime: Number(w.start_time || 0),
        endTime: Number(w.end_time || 0)
      })),
      language: data.language ? String(data.language) : null,
      original_transcript_id:
        data.original_transcript_id != null ? Number(data.original_transcript_id) : null
    };
  }

  private mapCalendar(data: Record<string, unknown>): Calendar {
    let statusChanges = Array.isArray(data.status_changes) ? data.status_changes : [];
    return {
      id: String(data.id || ''),
      platform: String(data.platform || ''),
      platformEmail: data.platform_email ? String(data.platform_email) : null,
      status: String(data.status || ''),
      statusChanges: statusChanges.map((sc: Record<string, unknown>) => ({
        code: String(sc.code || ''),
        createdAt: String(sc.created_at || '')
      })),
      createdAt: String(data.created_at || '')
    };
  }

  private mapCalendarEvent(data: Record<string, unknown>): CalendarEvent {
    return {
      id: String(data.id || ''),
      calendarId: String(data.calendar_id || ''),
      meetingUrl: data.meeting_url ? String(data.meeting_url) : null,
      meetingPlatform: data.meeting_platform ? String(data.meeting_platform) : null,
      startTime: String(data.start_time || ''),
      endTime: String(data.end_time || ''),
      title: data.title ? String(data.title) : null,
      isDeleted: Boolean(data.is_deleted),
      raw: (data.raw as Record<string, unknown>) || {},
      updatedAt: String(data.updated_at || ''),
      createdAt: String(data.created_at || '')
    };
  }

  private mapRecording(data: Record<string, unknown>): Recording {
    let mediaObjects = Array.isArray(data.media_objects) ? data.media_objects : [];
    return {
      id: String(data.id || ''),
      botId: String(data.bot_id || ''),
      status: String(data.status || ''),
      mediaObjects: mediaObjects.map((mo: Record<string, unknown>) => ({
        id: String(mo.id || ''),
        status: String(mo.status || ''),
        url: mo.url ? String(mo.url) : null,
        createdAt: String(mo.created_at || '')
      })),
      createdAt: String(data.created_at || '')
    };
  }
}
