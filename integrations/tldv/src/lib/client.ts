import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue,
  pickDefined,
  requestAxios,
  requestAxiosData
} from 'slates';

let BASE_URL = 'https://pasta.tldv.io/v1alpha1';

export interface ListMeetingsParams {
  query?: string;
  happenedAfter?: string;
  happenedBefore?: string;
  participated?: boolean;
  meetingType?: 'internal' | 'external';
  page?: number;
  limit?: number;
}

export interface Organizer {
  name: string;
  email: string;
}

export interface Invitee {
  name: string;
  email: string;
}

export interface Meeting {
  id: string;
  name: string;
  happenedAt: string;
  url: string;
  duration: number;
  organizer: Organizer;
  invitees: Invitee[];
  template?: string;
  extraProperties?: { conferenceId?: string };
  phoneNumber?: string | null;
  metadata?: Record<string, string | number | boolean> | null;
}

export interface ListMeetingsResponse {
  results: Meeting[];
  page: number;
  pages: number;
  total: number;
  pageSize: number;
}

export interface TranscriptSegment {
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
}

export interface Transcript {
  id: string;
  meetingId: string;
  data: TranscriptSegment[];
}

export interface HighlightTopic {
  title: string;
  summary: string;
}

export interface Highlight {
  text: string;
  startTime: number;
  source: string;
  topic: HighlightTopic;
}

export interface HighlightsResponse {
  meetingId: string;
  data: Highlight[];
}

export interface DownloadResponse {
  url: string;
  expiresAt: string;
}

export interface ImportMeetingParams {
  name: string;
  url: string;
  happenedAt?: string;
  dryRun?: boolean;
  participants?: string[];
  phoneNumber?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface ImportMeetingResponse {
  success: boolean;
  jobId?: string;
  message: string;
}

export interface NotesResponse {
  structuredNotes: {
    segmentId: string;
    timestamp: number;
    text: string;
    topicId: string;
  }[];
  markdownContent: string;
  topics: { id: string; order: number; title: string; summary: string }[];
}

export class TldvClient {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  private mapError = (error: unknown, operation: string) =>
    buildApiServiceError(error, {
      parent: {},
      providerLabel: 'tl;dv',
      reason: 'tldv_api_error',
      operation
    });

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      authHeader: { name: 'x-api-key', value: config.token },
      timeout: 30_000
    });
  }

  async listMeetings(params?: ListMeetingsParams): Promise<ListMeetingsResponse> {
    for (let [field, value] of [
      ['happenedAfter', params?.happenedAfter],
      ['happenedBefore', params?.happenedBefore]
    ]) {
      if (value !== undefined && !Number.isFinite(Date.parse(value))) {
        throw createApiServiceError(`${field} must be a valid ISO 8601 date or timestamp.`);
      }
    }
    if (
      params?.happenedAfter &&
      params.happenedBefore &&
      Date.parse(params.happenedAfter) > Date.parse(params.happenedBefore)
    ) {
      throw createApiServiceError('happenedAfter must be on or before happenedBefore.');
    }
    return requestAxiosData<ListMeetingsResponse>(
      'list meetings',
      () =>
        this.axios.get('/meetings', {
          params: pickDefined({
            query: params?.query,
            from: params?.happenedAfter,
            to: params?.happenedBefore,
            onlyParticipated: params?.participated,
            meetingType: params?.meetingType,
            page: params?.page === 0 ? 1 : params?.page,
            limit: params?.limit
          })
        }),
      this.mapError
    );
  }

  async getMeeting(meetingId: string): Promise<Meeting> {
    return requestAxiosData<Meeting>(
      'get meeting',
      () => this.axios.get(`/meetings/${encodeURIComponent(meetingId)}`),
      this.mapError
    );
  }

  async getTranscript(meetingId: string): Promise<Transcript> {
    return requestAxiosData<Transcript>(
      'get transcript',
      () => this.axios.get(`/meetings/${encodeURIComponent(meetingId)}/transcript`),
      this.mapError
    );
  }

  async getHighlights(meetingId: string): Promise<HighlightsResponse> {
    return requestAxiosData<HighlightsResponse>(
      'get highlights',
      () => this.axios.get(`/meetings/${encodeURIComponent(meetingId)}/highlights`),
      this.mapError
    );
  }

  async getNotes(meetingId: string): Promise<NotesResponse> {
    return requestAxiosData<NotesResponse>(
      'get notes',
      () => this.axios.get(`/meetings/${encodeURIComponent(meetingId)}/notes`),
      this.mapError
    );
  }

  async getDownloadUrl(meetingId: string): Promise<DownloadResponse> {
    let requestedAt = Date.now();
    let response = await requestAxios(
      'download recording',
      () =>
        this.axios.get(`/meetings/${encodeURIComponent(meetingId)}/download`, {
          maxRedirects: 0,
          validateStatus: (status: number) => status === 302
        }),
      this.mapError
    );
    let location = getResponseHeaderValue(response.headers, 'location');
    if (!location || !/^https:\/\//i.test(location)) {
      throw createApiServiceError('tl;dv did not return a secure recording download URL.');
    }
    // Renew shortly before the documented six-hour lifetime ends.
    return { url: location, expiresAt: new Date(requestedAt + 355 * 60_000).toISOString() };
  }

  async importMeeting(params: ImportMeetingParams): Promise<ImportMeetingResponse> {
    if (params.metadata && Object.keys(params.metadata).length > 20) {
      throw createApiServiceError('metadata supports at most 20 keys.');
    }
    let happenedAt: string | undefined;
    if (params.happenedAt !== undefined) {
      if (!Number.isFinite(Date.parse(params.happenedAt))) {
        throw createApiServiceError('happenedAt must be a valid ISO 8601 timestamp.');
      }
      happenedAt = new Date(params.happenedAt).toISOString();
    }
    let result = await requestAxiosData<ImportMeetingResponse>(
      'import meeting',
      () => this.axios.post('/meetings/import', pickDefined({ ...params, happenedAt })),
      this.mapError
    );
    if (result.success !== true) {
      throw createApiServiceError(
        `tl;dv did not accept the import: ${result.message || 'unknown reason'}`
      );
    }
    return result;
  }
}
