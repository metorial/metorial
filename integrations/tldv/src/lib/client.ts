import { createAxios } from 'slates';

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

export interface NoteTemplate {
  id: string;
  name: string;
}

export interface Meeting {
  id: string;
  name: string;
  happenedAt: string;
  url: string;
  duration: number;
  organizer: Organizer;
  invitees: Invitee[];
  template?: NoteTemplate;
  conferenceId?: string;
}

export interface ListMeetingsResponse {
  results: Meeting[];
  hasMore: boolean;
  total?: number;
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
}

export interface ImportMeetingParams {
  url: string;
}

export class TldvClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        'x-api-key': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  async listMeetings(params?: ListMeetingsParams): Promise<ListMeetingsResponse> {
    let queryParams: Record<string, string | number | boolean> = {};

    if (params?.query) queryParams.query = params.query;
    if (params?.happenedAfter) queryParams.happenedAfter = params.happenedAfter;
    if (params?.happenedBefore) queryParams.happenedBefore = params.happenedBefore;
    if (params?.participated !== undefined) queryParams.participated = params.participated;
    if (params?.meetingType) queryParams.meetingType = params.meetingType;
    if (params?.page !== undefined) queryParams.page = params.page;
    if (params?.limit !== undefined) queryParams.limit = params.limit;

    let response = await this.axios.get('/meetings', { params: queryParams });
    return response.data;
  }

  async getMeeting(meetingId: string): Promise<Meeting> {
    let response = await this.axios.get(`/meetings/${meetingId}`);
    return response.data;
  }

  async getTranscript(meetingId: string): Promise<Transcript> {
    let response = await this.axios.get(`/meetings/${meetingId}/transcript`);
    return response.data;
  }

  async getHighlights(meetingId: string): Promise<HighlightsResponse> {
    let response = await this.axios.get(`/meetings/${meetingId}/highlights`);
    return response.data;
  }

  async getDownloadUrl(meetingId: string): Promise<DownloadResponse> {
    let response = await this.axios.get(`/meetings/${meetingId}/download`, {
      maxRedirects: 0,
      validateStatus: (status: number) => status >= 200 && status < 400
    });

    if (response.status === 302 || response.status === 301) {
      let location = response.headers.location as string;
      return { url: location };
    }

    return response.data;
  }

  async importMeeting(params: ImportMeetingParams): Promise<Meeting> {
    let response = await this.axios.post('/meetings/import', {
      url: params.url
    });
    return response.data;
  }
}
