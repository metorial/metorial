import { createAxios } from 'slates';
import { googleMeetApiError } from './errors';
import type {
  ConferenceRecord,
  Member,
  Participant,
  ParticipantSession,
  Recording,
  SmartNote,
  Space,
  SpaceConfig,
  Transcript,
  TranscriptEntry
} from './types';

type AxiosResponse<T> = {
  data: T;
};

let meetAxios = createAxios({
  baseURL: 'https://meet.googleapis.com'
});

export class MeetClient {
  private headers: Record<string, string>;

  constructor(config: { token: string }) {
    this.headers = {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json'
    };
  }

  private async request<T>(
    operation: string,
    run: () => Promise<AxiosResponse<T>>
  ): Promise<T> {
    try {
      let response = await run();
      return response.data;
    } catch (error) {
      throw googleMeetApiError(error, operation);
    }
  }

  // --- Spaces ---

  async createSpace(spaceConfig?: SpaceConfig): Promise<Space> {
    let body: Space = {};
    if (spaceConfig) {
      body.config = spaceConfig;
    }
    return await this.request('create space', () =>
      meetAxios.post('/v2/spaces', body, { headers: this.headers })
    );
  }

  async getSpace(spaceNameOrCode: string): Promise<Space> {
    let name = spaceNameOrCode.startsWith('spaces/')
      ? spaceNameOrCode
      : `spaces/${spaceNameOrCode}`;
    return await this.request('get space', () =>
      meetAxios.get(`/v2/${name}`, { headers: this.headers })
    );
  }

  async updateSpace(
    spaceName: string,
    config: SpaceConfig,
    updateMask: string
  ): Promise<Space> {
    let name = spaceName.startsWith('spaces/') ? spaceName : `spaces/${spaceName}`;
    return await this.request('update space', () =>
      meetAxios.patch(
        `/v2/${name}`,
        { config },
        {
          headers: this.headers,
          params: { updateMask }
        }
      )
    );
  }

  async endActiveConference(spaceName: string): Promise<void> {
    let name = spaceName.startsWith('spaces/') ? spaceName : `spaces/${spaceName}`;
    await this.request('end active conference', () =>
      meetAxios.post(`/v2/${name}:endActiveConference`, {}, { headers: this.headers })
    );
  }

  // --- Members (v2beta) ---

  async createMember(
    spaceName: string,
    member: { user?: string; email?: string; role?: string }
  ): Promise<Member> {
    let parent = spaceName.startsWith('spaces/') ? spaceName : `spaces/${spaceName}`;
    return await this.request('create member', () =>
      meetAxios.post(`/v2beta/${parent}/members`, member, {
        headers: this.headers
      })
    );
  }

  async getMember(memberName: string): Promise<Member> {
    return await this.request('get member', () =>
      meetAxios.get(`/v2beta/${memberName}`, { headers: this.headers })
    );
  }

  async listMembers(
    spaceName: string,
    pageSize?: number,
    pageToken?: string
  ): Promise<{ members: Member[]; nextPageToken?: string }> {
    let parent = spaceName.startsWith('spaces/') ? spaceName : `spaces/${spaceName}`;
    let params: Record<string, string | number> = {};
    if (pageSize) params.pageSize = pageSize;
    if (pageToken) params.pageToken = pageToken;

    let response = await this.request<{ members?: Member[]; nextPageToken?: string }>(
      'list members',
      () =>
        meetAxios.get(`/v2beta/${parent}/members`, {
          headers: this.headers,
          params
        })
    );
    return {
      members: response.members || [],
      nextPageToken: response.nextPageToken
    };
  }

  async deleteMember(memberName: string): Promise<void> {
    await this.request('delete member', () =>
      meetAxios.delete(`/v2beta/${memberName}`, { headers: this.headers })
    );
  }

  // --- Conference Records ---

  async getConferenceRecord(name: string): Promise<ConferenceRecord> {
    let fullName = name.startsWith('conferenceRecords/') ? name : `conferenceRecords/${name}`;
    return await this.request('get conference record', () =>
      meetAxios.get(`/v2/${fullName}`, { headers: this.headers })
    );
  }

  async listConferenceRecords(
    filter?: string,
    pageSize?: number,
    pageToken?: string
  ): Promise<{ conferenceRecords: ConferenceRecord[]; nextPageToken?: string }> {
    let params: Record<string, string | number> = {};
    if (filter) params.filter = filter;
    if (pageSize) params.pageSize = pageSize;
    if (pageToken) params.pageToken = pageToken;

    let response = await this.request<{
      conferenceRecords?: ConferenceRecord[];
      nextPageToken?: string;
    }>('list conference records', () =>
      meetAxios.get('/v2/conferenceRecords', {
        headers: this.headers,
        params
      })
    );
    return {
      conferenceRecords: response.conferenceRecords || [],
      nextPageToken: response.nextPageToken
    };
  }

  // --- Participants ---

  async getParticipant(name: string): Promise<Participant> {
    return await this.request('get participant', () =>
      meetAxios.get(`/v2/${name}`, { headers: this.headers })
    );
  }

  async listParticipants(
    conferenceRecordName: string,
    pageSize?: number,
    pageToken?: string,
    filter?: string
  ): Promise<{ participants: Participant[]; nextPageToken?: string }> {
    let parent = conferenceRecordName.startsWith('conferenceRecords/')
      ? conferenceRecordName
      : `conferenceRecords/${conferenceRecordName}`;
    let params: Record<string, string | number> = {};
    if (pageSize) params.pageSize = pageSize;
    if (pageToken) params.pageToken = pageToken;
    if (filter) params.filter = filter;

    let response = await this.request<{
      participants?: Participant[];
      nextPageToken?: string;
    }>('list participants', () =>
      meetAxios.get(`/v2/${parent}/participants`, {
        headers: this.headers,
        params
      })
    );
    return {
      participants: response.participants || [],
      nextPageToken: response.nextPageToken
    };
  }

  // --- Participant Sessions ---

  async getParticipantSession(name: string): Promise<ParticipantSession> {
    return await this.request('get participant session', () =>
      meetAxios.get(`/v2/${name}`, { headers: this.headers })
    );
  }

  async listParticipantSessions(
    participantName: string,
    pageSize?: number,
    pageToken?: string
  ): Promise<{ participantSessions: ParticipantSession[]; nextPageToken?: string }> {
    let params: Record<string, string | number> = {};
    if (pageSize) params.pageSize = pageSize;
    if (pageToken) params.pageToken = pageToken;

    let response = await this.request<{
      participantSessions?: ParticipantSession[];
      nextPageToken?: string;
    }>('list participant sessions', () =>
      meetAxios.get(`/v2/${participantName}/participantSessions`, {
        headers: this.headers,
        params
      })
    );
    return {
      participantSessions: response.participantSessions || [],
      nextPageToken: response.nextPageToken
    };
  }

  // --- Recordings ---

  async getRecording(name: string): Promise<Recording> {
    return await this.request('get recording', () =>
      meetAxios.get(`/v2/${name}`, { headers: this.headers })
    );
  }

  async listRecordings(
    conferenceRecordName: string,
    pageSize?: number,
    pageToken?: string
  ): Promise<{ recordings: Recording[]; nextPageToken?: string }> {
    let parent = conferenceRecordName.startsWith('conferenceRecords/')
      ? conferenceRecordName
      : `conferenceRecords/${conferenceRecordName}`;
    let params: Record<string, string | number> = {};
    if (pageSize) params.pageSize = pageSize;
    if (pageToken) params.pageToken = pageToken;

    let response = await this.request<{ recordings?: Recording[]; nextPageToken?: string }>(
      'list recordings',
      () =>
        meetAxios.get(`/v2/${parent}/recordings`, {
          headers: this.headers,
          params
        })
    );
    return {
      recordings: response.recordings || [],
      nextPageToken: response.nextPageToken
    };
  }

  // --- Smart Notes ---

  async getSmartNote(name: string): Promise<SmartNote> {
    return await this.request('get smart note', () =>
      meetAxios.get(`/v2/${name}`, { headers: this.headers })
    );
  }

  async listSmartNotes(
    conferenceRecordName: string,
    pageSize?: number,
    pageToken?: string
  ): Promise<{ smartNotes: SmartNote[]; nextPageToken?: string }> {
    let parent = conferenceRecordName.startsWith('conferenceRecords/')
      ? conferenceRecordName
      : `conferenceRecords/${conferenceRecordName}`;
    let params: Record<string, string | number> = {};
    if (pageSize) params.pageSize = pageSize;
    if (pageToken) params.pageToken = pageToken;

    let response = await this.request<{ smartNotes?: SmartNote[]; nextPageToken?: string }>(
      'list smart notes',
      () =>
        meetAxios.get(`/v2/${parent}/smartNotes`, {
          headers: this.headers,
          params
        })
    );
    return {
      smartNotes: response.smartNotes || [],
      nextPageToken: response.nextPageToken
    };
  }

  // --- Transcripts ---

  async getTranscript(name: string): Promise<Transcript> {
    return await this.request('get transcript', () =>
      meetAxios.get(`/v2/${name}`, { headers: this.headers })
    );
  }

  async listTranscripts(
    conferenceRecordName: string,
    pageSize?: number,
    pageToken?: string
  ): Promise<{ transcripts: Transcript[]; nextPageToken?: string }> {
    let parent = conferenceRecordName.startsWith('conferenceRecords/')
      ? conferenceRecordName
      : `conferenceRecords/${conferenceRecordName}`;
    let params: Record<string, string | number> = {};
    if (pageSize) params.pageSize = pageSize;
    if (pageToken) params.pageToken = pageToken;

    let response = await this.request<{ transcripts?: Transcript[]; nextPageToken?: string }>(
      'list transcripts',
      () =>
        meetAxios.get(`/v2/${parent}/transcripts`, {
          headers: this.headers,
          params
        })
    );
    return {
      transcripts: response.transcripts || [],
      nextPageToken: response.nextPageToken
    };
  }

  // --- Transcript Entries ---

  async getTranscriptEntry(name: string): Promise<TranscriptEntry> {
    return await this.request('get transcript entry', () =>
      meetAxios.get(`/v2/${name}`, { headers: this.headers })
    );
  }

  async listTranscriptEntries(
    transcriptName: string,
    pageSize?: number,
    pageToken?: string
  ): Promise<{ transcriptEntries: TranscriptEntry[]; nextPageToken?: string }> {
    let params: Record<string, string | number> = {};
    if (pageSize) params.pageSize = pageSize;
    if (pageToken) params.pageToken = pageToken;

    let response = await this.request<{
      transcriptEntries?: TranscriptEntry[];
      nextPageToken?: string;
    }>('list transcript entries', () =>
      meetAxios.get(`/v2/${transcriptName}/entries`, {
        headers: this.headers,
        params
      })
    );
    return {
      transcriptEntries: response.transcriptEntries || [],
      nextPageToken: response.nextPageToken
    };
  }
}
