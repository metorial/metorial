import { createAuthenticatedAxios, pickDefined, requestAxiosData } from 'slates';
import { granolaApiError, granolaAxiosErrorMapping } from './errors';
import type { DetailedMeeting } from './provider';
import {
  mapDetailedMeeting,
  mapFolder,
  mapMeetingSummary,
  mapTranscriptItem,
  parseDetailedMeeting,
  parseProviderResponse,
  providerFolderListSchema,
  providerMeetingListSchema,
  providerTranscriptPageSchema
} from './provider';

export type GranolaListMeetingsParams = {
  createdBefore?: string;
  createdAfter?: string;
  updatedAfter?: string;
  folderId?: string;
  cursor?: string;
  pageSize: number;
};

export class GranolaClient {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(auth: { token: string }) {
    this.http = createAuthenticatedAxios({
      baseURL: 'https://public-api.granola.ai',
      errorMapping: granolaAxiosErrorMapping,
      authHeader: { value: `Bearer ${auth.token}` },
      contentType: false,
      headers: {
        Accept: 'application/json'
      }
    });
  }

  private async get(
    operation: string,
    path: string,
    params: Record<string, unknown>,
    meetingId?: string
  ) {
    return requestAxiosData<unknown>(
      operation,
      () => this.http.get(path, { params: pickDefined(params) }),
      (error, requestOperation) =>
        granolaApiError(error, requestOperation, meetingId ? { meetingId } : {})
    );
  }

  async listMeetingFolders(params: { cursor?: string; pageSize: number }) {
    let operation = 'list meeting folders';
    let data = await this.get(operation, '/v1/folders', {
      cursor: params.cursor,
      page_size: params.pageSize
    });
    let page = parseProviderResponse(providerFolderListSchema, data, operation);

    return {
      folders: page.folders.map(mapFolder),
      hasMore: page.hasMore,
      cursor: page.cursor
    };
  }

  async listMeetings(params: GranolaListMeetingsParams) {
    let operation = 'list meetings';
    let data = await this.get(operation, '/v1/notes', {
      created_before: params.createdBefore,
      created_after: params.createdAfter,
      updated_after: params.updatedAfter,
      folder_id: params.folderId,
      cursor: params.cursor,
      page_size: params.pageSize
    });
    let page = parseProviderResponse(providerMeetingListSchema, data, operation);

    return {
      meetings: page.notes.map(mapMeetingSummary),
      hasMore: page.hasMore,
      cursor: page.cursor
    };
  }

  async getMeeting(meetingId: string) {
    let operation = `get meeting ${meetingId}`;
    let data = await this.get(
      operation,
      `/v1/notes/${encodeURIComponent(meetingId)}`,
      {},
      meetingId
    );
    return mapDetailedMeeting(parseDetailedMeeting(data, operation));
  }

  async getMeetings(meetingIds: string[]) {
    let meetings: DetailedMeeting[] = [];

    for (let meetingId of meetingIds) {
      meetings.push(await this.getMeeting(meetingId));
    }

    return meetings;
  }

  async getMeetingTranscript(params: {
    meetingId: string;
    cursor?: string;
    pageSize: number;
  }) {
    let operation = `get transcript for meeting ${params.meetingId}`;
    let data = await this.get(
      operation,
      `/v1/notes/${encodeURIComponent(params.meetingId)}/transcript`,
      {
        cursor: params.cursor,
        page_size: params.pageSize
      },
      params.meetingId
    );
    let page = parseProviderResponse(providerTranscriptPageSchema, data, operation);

    return {
      meetingId: params.meetingId,
      transcript: page.transcript.map(mapTranscriptItem),
      hasMore: page.hasMore,
      cursor: page.cursor
    };
  }
}
