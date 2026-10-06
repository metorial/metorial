import { buildApiServiceError, createApiServiceError, createAxios, pickDefined } from 'slates';
import { z } from 'zod';

export interface ClientConfig {
  token: string;
  region: string;
}
export interface PaginatedResponse<T> {
  count?: number;
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
  events: Array<{ code: string; createdAt: string }>;
}
export interface Bot {
  id: string;
  meetingUrl: unknown;
  botName: string;
  joinAt: string | null;
  status: string;
  statusChanges: BotStatusChange[];
  meetingParticipants: BotMeetingParticipant[];
  meetingMetadata: Record<string, unknown> | null;
  videoUrl: string | null;
  recordingConfig: Record<string, unknown> | null;
  outputMedia: Record<string, unknown> | null;
  automaticAudioOutput: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  createdAt?: string;
  mediaRetentionEnd: string | null;
  recordings: Recording[];
  legacy: boolean;
}
export interface TranscriptEntry {
  id: number;
  speaker: string;
  speakerId: number | null;
  words: Array<{ text: string; startTime: number; endTime: number }>;
  language: string | null;
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
  bots: Array<{
    botId: string;
    startTime: string;
    deduplicationKey: string;
    meetingUrl: string;
  }>;
}
export interface Calendar {
  id: string;
  platform: string;
  platformEmail: string | null;
  status: string;
  createdAt: string;
}
export interface Recording {
  id: string;
  botId: string | null;
  status: string | null;
  mediaShortcuts: Record<string, unknown>;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
}
export type MediaKind = 'video_mixed' | 'audio_mixed' | 'transcript';
export interface DownloadFile {
  recordingId: string;
  mediaId: string;
  mediaKind: MediaKind;
  url: string;
  expiresAt: string;
  filename: string;
  mimeType: string;
}
const recordSchema = z.record(z.string(), z.unknown());
const object = (value: unknown): Record<string, unknown> => {
  const parsed = recordSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
};
const rows = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.map(object) : [];
const nullableString = (value: unknown) => (typeof value === 'string' ? value : null);
const id = (value: unknown): string => {
  if (typeof value !== 'string' || !value)
    throw createApiServiceError('Recall.ai returned a resource without an identifier.');
  return value;
};
const pathId = (value: string) => {
  if (!value.trim())
    throw createApiServiceError(
      'A resource ID is required. Use the corresponding list tool to discover it.'
    );
  return encodeURIComponent(value);
};

export const nextCursor = (next: string | null): string | null => {
  if (!next) return null;
  try {
    const url = new URL(next, 'https://us-east-1.recall.ai');
    return url.searchParams.get('cursor') ?? url.searchParams.get('page') ?? next;
  } catch {
    return next;
  }
};

const mediaUrlExpiresAt = (value: string): string => {
  const url = new URL(value);
  const date = url.searchParams.get('X-Amz-Date');
  const duration = url.searchParams.get('X-Amz-Expires');
  let expiry: number | undefined;
  if (date && /^\d{8}T\d{6}Z$/.test(date) && duration && /^\d+$/.test(duration)) {
    const issued = Date.parse(
      `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${date.slice(9, 11)}:${date.slice(11, 13)}:${date.slice(13, 15)}Z`
    );
    expiry = issued + Number(duration) * 1000;
  }
  const expires = url.searchParams.get('Expires');
  if (expiry === undefined && expires && /^\d+$/.test(expires))
    expiry = Number(expires) * 1000;
  if (expiry !== undefined && Number.isFinite(expiry) && Math.abs(expiry) < 8640000000000000)
    return new Date(expiry - 60000).toISOString();
  // If the provider changes its signing format, renew at the next download instead of guessing its lifetime.
  return new Date().toISOString();
};

export class Client {
  private axios: ReturnType<typeof createAxios>;
  constructor(config: ClientConfig) {
    if (!['us-west-2', 'us-east-1', 'eu-central-1', 'ap-northeast-1'].includes(config.region))
      throw createApiServiceError('Select a supported Recall.ai region for this API key.');
    this.axios = createAxios({
      baseURL: `https://${config.region}.recall.ai/api`,
      headers: { Authorization: `Token ${config.token}`, 'Content-Type': 'application/json' },
      timeout: 30000
    });
  }
  private async request(
    method: 'get' | 'post' | 'patch' | 'delete',
    url: string,
    data?: unknown,
    params?: object
  ): Promise<unknown> {
    try {
      return (await this.axios.request({ method, url, data, params })).data;
    } catch (error) {
      throw buildApiServiceError(error, {
        parent: {},
        providerLabel: 'Recall.ai',
        reason: 'recallai_api_request_failed',
        operation: `${method.toUpperCase()} ${url}`
      });
    }
  }
  private page<T>(
    value: unknown,
    map: (row: Record<string, unknown>) => T
  ): PaginatedResponse<T> {
    const data = object(value);
    if (!Array.isArray(data.results))
      throw createApiServiceError('Recall.ai returned an invalid paginated response.');
    const results = rows(data.results).map(map);
    return {
      count: typeof data.count === 'number' ? data.count : undefined,
      next: nullableString(data.next),
      previous: nullableString(data.previous),
      results
    };
  }
  async createBot(params: {
    meetingUrl: string;
    botName?: string;
    joinAt?: string;
    recordingConfig?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    automaticLeave?: Record<string, unknown>;
    automaticAudioOutput?: Record<string, unknown>;
  }): Promise<Bot> {
    const data = await this.request(
      'post',
      '/v1/bot/',
      pickDefined({
        meeting_url: params.meetingUrl,
        bot_name: params.botName,
        join_at: params.joinAt,
        recording_config: params.recordingConfig,
        metadata: params.metadata,
        automatic_leave: params.automaticLeave,
        automatic_audio_output: params.automaticAudioOutput
      })
    );
    return this.mapBot(object(data));
  }
  async listBots(params?: {
    cursor?: string;
    page?: number;
    joinAtAfter?: string;
    joinAtBefore?: string;
    statusIn?: string;
    status?: string[];
    meetingUrl?: string;
    ordering?: string;
    pageSize?: number;
  }): Promise<PaginatedResponse<Bot>> {
    const query = new URLSearchParams();
    if (params?.cursor && !/^\d+$/.test(params.cursor)) {
      query.set('use_cursor', 'true');
      query.set('cursor', params.cursor);
    } else {
      query.set('page', params?.cursor ?? String(params?.page ?? 1));
    }
    if (params?.joinAtAfter) query.set('join_at_after', params.joinAtAfter);
    if (params?.joinAtBefore) query.set('join_at_before', params.joinAtBefore);
    if (params?.meetingUrl) query.set('meeting_url', params.meetingUrl);
    for (const status of params?.status ??
      params?.statusIn
        ?.split(',')
        .map(v => v.trim())
        .filter(Boolean) ??
      [])
      query.append('status', status);
    return this.page(await this.request('get', '/v1/bot/', undefined, query), row =>
      this.mapBot(row)
    );
  }
  async getBot(botId: string, includeParticipants = true): Promise<Bot> {
    const bot = this.mapBot(object(await this.request('get', `/v1/bot/${pathId(botId)}/`)));
    const latest = bot.recordings.at(-1);
    if (includeParticipants && !bot.legacy && latest) {
      const media = object(latest.mediaShortcuts.participant_events);
      const data = object(media.data);
      if (
        object(media.status).code === 'done' &&
        typeof data.participants_download_url === 'string'
      ) {
        const participants = await this.downloadJson(data.participants_download_url);
        const events =
          typeof data.participant_events_download_url === 'string'
            ? await this.downloadJson(data.participant_events_download_url)
            : [];
        if (!Array.isArray(participants) || !Array.isArray(events))
          throw createApiServiceError('Recall.ai returned invalid participant data.');
        const participantEvents = rows(events);
        bot.meetingParticipants = rows(participants).map(participant => ({
          participantId: Number(participant.id),
          name: String(participant.name ?? ''),
          events: participantEvents
            .filter(event => object(event.participant).id === participant.id)
            .map(event => ({
              code: String(event.action ?? ''),
              createdAt: String(object(event.timestamp).absolute ?? '')
            }))
        }));
      }
    }
    return bot;
  }
  private async downloadJson(url: string): Promise<unknown> {
    if (!z.string().url().safeParse(url).success || !url.startsWith('https://'))
      throw createApiServiceError('Recall.ai returned an invalid data download URL.');
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok)
        throw createApiServiceError(
          'The recording data download failed. Request it again to refresh its URL.',
          { upstreamStatus: response.status }
        );
      return await response.json();
    } catch (error) {
      throw buildApiServiceError(error, {
        parent: {},
        providerLabel: 'Recall.ai',
        reason: 'recallai_recording_download_failed',
        operation: 'recording data download',
        fallbackMessage: 'The recording data could not be downloaded.'
      });
    }
  }
  async updateBot(
    botId: string,
    params: {
      meetingUrl?: string;
      botName?: string;
      joinAt?: string;
      recordingConfig?: Record<string, unknown>;
      metadata?: Record<string, unknown>;
      automaticLeave?: Record<string, unknown>;
      automaticAudioOutput?: Record<string, unknown>;
    }
  ): Promise<Bot> {
    const body = pickDefined({
      meeting_url: params.meetingUrl,
      bot_name: params.botName,
      join_at: params.joinAt,
      recording_config: params.recordingConfig,
      metadata: params.metadata,
      automatic_leave: params.automaticLeave,
      automatic_audio_output: params.automaticAudioOutput
    });
    if (!Object.keys(body).length)
      throw createApiServiceError('Provide at least one bot setting to update.');
    return this.mapBot(object(await this.request('patch', `/v1/bot/${pathId(botId)}/`, body)));
  }
  async deleteBot(botId: string): Promise<void> {
    await this.request('delete', `/v1/bot/${pathId(botId)}/`);
  }
  async removeBotFromCall(botId: string): Promise<void> {
    await this.request('post', `/v1/bot/${pathId(botId)}/leave_call/`);
  }
  async sendChatMessage(
    botId: string,
    message: string,
    to?: string,
    pin?: boolean
  ): Promise<void> {
    await this.request(
      'post',
      `/v1/bot/${pathId(botId)}/send_chat_message/`,
      pickDefined({ message, to, pin })
    );
  }
  async outputMedia(
    botId: string,
    params: { kind: string; data?: Record<string, unknown>; stop?: boolean }
  ): Promise<Record<string, unknown>> {
    const suffix = params.kind === 'audio' ? 'output_audio' : 'output_media';
    if (params.stop) {
      const target =
        params.kind === 'video_camera' || params.kind === 'camera'
          ? 'camera'
          : params.kind === 'video_screenshare' || params.kind === 'screenshare'
            ? 'screenshare'
            : null;
      if (params.kind !== 'audio' && !target)
        throw createApiServiceError(
          'Choose audio, video_camera, or video_screenshare to stop output.'
        );
      await this.request(
        'delete',
        `/v1/bot/${pathId(botId)}/${suffix}/`,
        target ? { [target]: true } : undefined
      );
      return {};
    }
    let body: Record<string, unknown>;
    if (params.kind === 'audio') {
      const parsed = z
        .object({ kind: z.literal('mp3'), b64_data: z.string().min(1).max(1835008) })
        .safeParse(params.data);
      if (!parsed.success)
        throw createApiServiceError(
          'Audio output requires mediaData with kind "mp3" and b64_data, and a bot configured for automatic audio output.'
        );
      body = parsed.data;
    } else {
      const target =
        params.kind === 'video_camera' || params.kind === 'camera'
          ? 'camera'
          : params.kind === 'video_screenshare' || params.kind === 'screenshare'
            ? 'screenshare'
            : null;
      const parsed = z
        .object({ kind: z.literal('webpage'), config: z.object({ url: z.string().url() }) })
        .safeParse(params.data);
      if (!target || !parsed.success)
        throw createApiServiceError(
          'Use kind "video_camera" or "video_screenshare" with mediaData {"kind":"webpage","config":{"url":"https://..."}}.'
        );
      body = { [target]: parsed.data };
    }
    return object(await this.request('post', `/v1/bot/${pathId(botId)}/${suffix}/`, body));
  }
  async listCalendars(params?: {
    cursor?: string;
    pageSize?: number;
    platform?: string;
    status?: string;
    email?: string;
  }): Promise<PaginatedResponse<Calendar>> {
    return this.page(
      await this.request(
        'get',
        '/v2/calendars/',
        undefined,
        pickDefined({
          cursor: params?.cursor,
          platform: params?.platform,
          status: params?.status,
          email: params?.email
        })
      ),
      row => this.mapCalendar(row)
    );
  }
  async getCalendar(calendarId: string): Promise<Calendar> {
    return this.mapCalendar(
      object(await this.request('get', `/v2/calendars/${pathId(calendarId)}/`))
    );
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
    if (!params?.calendarId)
      throw createApiServiceError(
        'Calendar V2 requires calendarId. Call list_calendars, then supply the selected calendar ID.'
      );
    return this.page(
      await this.request(
        'get',
        '/v2/calendar-events/',
        undefined,
        pickDefined({
          cursor: params.cursor,
          calendar_id: params.calendarId,
          start_time__gte: params.startTimeAfter,
          start_time__lte: params.startTimeBefore,
          updated_at__gte: params.updatedAtGte,
          is_deleted: params.isDeleted
        })
      ),
      row => this.mapCalendarEvent(row)
    );
  }
  async getCalendarEvent(eventId: string): Promise<CalendarEvent> {
    return this.mapCalendarEvent(
      object(await this.request('get', `/v2/calendar-events/${pathId(eventId)}/`))
    );
  }
  async scheduleBotForCalendarEvent(
    eventId: string,
    params?: { botConfig?: Record<string, unknown>; deduplicationKey?: string }
  ): Promise<Record<string, unknown>> {
    return object(
      await this.request('post', `/v2/calendar-events/${pathId(eventId)}/bot/`, {
        bot_config: params?.botConfig ?? {},
        deduplication_key: params?.deduplicationKey ?? `calendar-event:${eventId}`
      })
    );
  }
  async deleteBotFromCalendarEvent(eventId: string): Promise<CalendarEvent> {
    return this.mapCalendarEvent(
      object(await this.request('delete', `/v2/calendar-events/${pathId(eventId)}/bot/`))
    );
  }
  async listRecordings(params?: {
    cursor?: string;
    botId?: string;
    createdAtAfter?: string;
    createdAtBefore?: string;
    statusCode?: string;
  }): Promise<PaginatedResponse<Recording>> {
    return this.page(
      await this.request(
        'get',
        '/v1/recording/',
        undefined,
        pickDefined({
          cursor: params?.cursor,
          bot_id: params?.botId,
          created_at_after: params?.createdAtAfter,
          created_at_before: params?.createdAtBefore,
          status_code: params?.statusCode
        })
      ),
      row => this.mapRecording(row)
    );
  }
  async getRecording(recordingId: string): Promise<Recording> {
    return this.mapRecording(
      object(await this.request('get', `/v1/recording/${pathId(recordingId)}/`))
    );
  }
  async getRecordingFile(recordingId: string, mediaKind: MediaKind): Promise<DownloadFile> {
    const recording = await this.getRecording(recordingId);
    const media = object(recording.mediaShortcuts[mediaKind]);
    const url = nullableString(object(media.data).download_url);
    if (!url || object(media.status).code !== 'done')
      throw createApiServiceError(
        `The ${mediaKind} file is not ready. Check that this recording completed and captured the requested media.`
      );
    const parsed = z.string().url().safeParse(url);
    if (!parsed.success || !url.startsWith('https://'))
      throw createApiServiceError('Recall.ai returned an invalid media download URL.');
    const format =
      typeof media.format === 'string'
        ? media.format
        : mediaKind === 'transcript'
          ? 'json'
          : mediaKind === 'video_mixed'
            ? 'mp4'
            : 'mp3';
    const mimeType =
      format === 'json'
        ? 'application/json'
        : format === 'mp4'
          ? 'video/mp4'
          : format === 'mp3'
            ? 'audio/mpeg'
            : 'application/octet-stream';
    // Signed URLs expire independently of recording retention.
    return {
      recordingId,
      mediaId: id(media.id),
      mediaKind,
      url,
      expiresAt: mediaUrlExpiresAt(url),
      filename: `${recordingId}-${mediaKind}.${format}`,
      mimeType
    };
  }
  async getBotTranscript(
    botId: string,
    recordingId?: string
  ): Promise<{ entries: TranscriptEntry[]; file?: DownloadFile }> {
    const bot = await this.getBot(botId, false);
    if (bot.legacy) {
      const value = await this.request('get', `/v1/bot/${pathId(botId)}/transcript/`);
      const data = Array.isArray(value) ? value : object(value).results;
      if (!Array.isArray(data))
        throw createApiServiceError('Recall.ai returned an invalid transcript.');
      return { entries: rows(data).map((entry, i) => this.mapTranscriptEntry(entry, i)) };
    }
    const recording = recordingId
      ? bot.recordings.find(row => row.id === recordingId)
      : [...bot.recordings].reverse().find(row => object(row.mediaShortcuts.transcript).id);
    if (!recording)
      throw createApiServiceError(
        'No transcript was found for this bot. Enable transcription and wait for a completed recording, or choose its recordingId from get_bot.'
      );
    const file = await this.getRecordingFile(recording.id, 'transcript');
    const value = await this.downloadJson(file.url);
    if (!Array.isArray(value))
      throw createApiServiceError('Recall.ai returned an invalid transcript download.');
    return { entries: rows(value).map((entry, i) => this.mapTranscriptEntry(entry, i)), file };
  }
  private mapBot(data: Record<string, unknown>): Bot {
    const statusChanges = rows(data.status_changes).map(sc => ({
      code: String(sc.code ?? ''),
      message: nullableString(sc.message),
      createdAt: String(sc.created_at ?? ''),
      subCode: nullableString(sc.sub_code)
    }));
    const recordings = rows(data.recordings)
      .map(rec => this.mapRecording(rec, id(data.id)))
      .sort((first, second) => Date.parse(first.createdAt) - Date.parse(second.createdAt));
    const latestRecording = recordings.at(-1);
    return {
      id: id(data.id),
      meetingUrl: data.meeting_url ?? '',
      botName: String(data.bot_name ?? ''),
      joinAt: nullableString(data.join_at),
      status: nullableString(data.status) ?? statusChanges.at(-1)?.code ?? 'ready',
      statusChanges,
      meetingParticipants: rows(data.meeting_participants).map(mp => ({
        participantId: Number(mp.id ?? mp.participant_id ?? 0),
        name: String(mp.name ?? ''),
        events: rows(mp.events).map(e => ({
          code: String(e.code ?? ''),
          createdAt: String(e.created_at ?? '')
        }))
      })),
      meetingMetadata: recordSchema.safeParse(data.meeting_metadata).success
        ? object(data.meeting_metadata)
        : latestRecording &&
            recordSchema.safeParse(
              object(latestRecording.mediaShortcuts.meeting_metadata).data
            ).success
          ? object(object(latestRecording.mediaShortcuts.meeting_metadata).data)
          : null,
      videoUrl:
        nullableString(data.video_url) ??
        nullableString(
          object(object(latestRecording?.mediaShortcuts.video_mixed).data).download_url
        ),
      recordingConfig: recordSchema.safeParse(data.recording_config).success
        ? object(data.recording_config)
        : null,
      outputMedia: recordSchema.safeParse(data.output_media).success
        ? object(data.output_media)
        : null,
      automaticAudioOutput: recordSchema.safeParse(data.automatic_audio_output).success
        ? object(data.automatic_audio_output)
        : null,
      metadata: object(data.metadata),
      createdAt: nullableString(data.created_at) ?? undefined,
      mediaRetentionEnd:
        nullableString(data.media_retention_end) ?? latestRecording?.expiresAt ?? null,
      recordings,
      legacy: !Array.isArray(data.recordings)
    };
  }
  private mapTranscriptEntry(data: Record<string, unknown>, index: number): TranscriptEntry {
    const participant = object(data.participant);
    return {
      id: typeof data.id === 'number' ? data.id : index,
      speaker: String(data.speaker ?? participant.name ?? ''),
      speakerId:
        typeof (data.speaker_id ?? participant.id) === 'number'
          ? Number(data.speaker_id ?? participant.id)
          : null,
      language: nullableString(data.language_code ?? data.language),
      words: rows(data.words).map(w => ({
        text: String(w.text ?? ''),
        startTime: Number(w.start_time ?? object(w.start_timestamp).relative ?? 0),
        endTime: Number(w.end_time ?? object(w.end_timestamp).relative ?? 0)
      }))
    };
  }
  private mapCalendar(data: Record<string, unknown>): Calendar {
    return {
      id: id(data.id),
      platform: String(data.platform ?? ''),
      platformEmail: nullableString(data.platform_email),
      status: String(data.status ?? ''),
      createdAt: String(data.created_at ?? '')
    };
  }
  private mapCalendarEvent(data: Record<string, unknown>): CalendarEvent {
    let raw = object(data.raw);
    if (typeof data.raw === 'string') {
      try {
        raw = object(JSON.parse(data.raw));
      } catch {
        /* Raw data can be a provider-specific string. */
      }
    }
    return {
      id: id(data.id),
      calendarId: String(data.calendar_id ?? ''),
      meetingUrl: nullableString(data.meeting_url),
      meetingPlatform: nullableString(data.meeting_platform),
      startTime: String(data.start_time ?? ''),
      endTime: String(data.end_time ?? ''),
      title: nullableString(data.title ?? raw.summary ?? raw.subject),
      isDeleted: data.is_deleted === true,
      raw,
      updatedAt: String(data.updated_at ?? ''),
      createdAt: String(data.created_at ?? ''),
      bots: rows(data.bots).map(bot => ({
        botId: id(bot.bot_id),
        startTime: String(bot.start_time ?? ''),
        deduplicationKey: String(bot.deduplication_key ?? ''),
        meetingUrl: String(bot.meeting_url ?? '')
      }))
    };
  }
  private mapRecording(data: Record<string, unknown>, botId?: string): Recording {
    return {
      id: id(data.id),
      botId: botId ?? nullableString(object(data.bot).id),
      status: nullableString(data.status) ?? nullableString(object(data.status).code),
      mediaShortcuts: object(data.media_shortcuts),
      createdAt: String(data.created_at ?? ''),
      startedAt: nullableString(data.started_at),
      completedAt: nullableString(data.completed_at),
      expiresAt: nullableString(data.expires_at)
    };
  }
}
