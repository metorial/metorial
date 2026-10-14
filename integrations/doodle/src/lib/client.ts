import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';

export interface PollOption {
  text?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
}

export interface PollInitiator {
  name: string;
  email?: string;
}

export interface CreatePollParams {
  title: string;
  description?: string;
  location?: string;
  type: 'TEXT' | 'DATE';
  options: PollOption[];
  initiator: PollInitiator;
  multiDay?: boolean;
  hidden?: boolean;
  ifNeedBe?: boolean;
  askAddress?: boolean;
  askEmail?: boolean;
  askPhone?: boolean;
  byInvitation?: boolean;
  timezone?: string;
}

export interface Participant {
  participantId: string;
  name: string;
  preferences: number[];
  email?: string;
}

export interface AddParticipantParams {
  name: string;
  email?: string;
  preferences: number[];
}

export interface Poll {
  pollId: string;
  adminKey?: string;
  title: string;
  description?: string;
  location?: string;
  type: string;
  state: string;
  multiDay?: boolean;
  hidden?: boolean;
  ifNeedBe?: boolean;
  options: PollOption[];
  participants?: Participant[];
  initiator?: PollInitiator;
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardPoll {
  pollId: string;
  title: string;
  state: string;
  type: string;
  latestChange?: string;
  participantsCount?: number;
}

export interface CurrentUser {
  id: string;
  name: string;
  emailAddress?: string;
}

export interface Comment {
  commentId: string;
  author: string;
  text: string;
  createdAt?: string;
}

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    this.http = createAuthenticatedAxios({
      baseURL: 'https://doodle.com/api/v2.0',
      authHeader: { value: `Bearer ${config.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Doodle',
          operation: 'request',
          reason: 'doodle_api_error'
        })
    });
  }

  async getCurrentUser(): Promise<CurrentUser> {
    let response = await this.http.get<CurrentUser>('/users/me');
    return response.data;
  }

  async getMyPolls(params?: { locale?: string }): Promise<DashboardPoll[]> {
    let response = await this.http.get<DashboardPoll[] | { polls: DashboardPoll[] }>(
      '/users/me/dashboard/myPolls',
      {
        params: {
          fullList: true,
          locale: params?.locale || 'en'
        }
      }
    );
    let polls = Array.isArray(response.data) ? response.data : response.data?.polls;
    if (!Array.isArray(polls)) {
      throw createApiServiceError('Doodle did not return a list of created polls.');
    }
    return polls;
  }

  async getParticipatedPolls(params?: { locale?: string }): Promise<DashboardPoll[]> {
    let response = await this.http.get<DashboardPoll[] | { polls: DashboardPoll[] }>(
      '/users/me/dashboard/otherPolls',
      {
        params: {
          fullList: true,
          locale: params?.locale || 'en'
        }
      }
    );
    let polls = Array.isArray(response.data) ? response.data : response.data?.polls;
    if (!Array.isArray(polls)) {
      throw createApiServiceError('Doodle did not return a list of participated polls.');
    }
    return polls;
  }

  async getPoll(pollId: string): Promise<Poll> {
    let response = await this.http.get<Poll>(`/polls/${encodeURIComponent(pollId)}`);
    return response.data;
  }

  async createPoll(params: CreatePollParams): Promise<Poll> {
    if (params.options.length === 0) {
      throw createApiServiceError('Provide at least one option for the selected poll type.');
    }

    let body: Record<string, unknown> = {
      title: params.title,
      type: params.type,
      initiator: params.initiator,
      options: this.formatOptions(params.type, params.options)
    };

    if (params.description) body.description = params.description;
    if (params.location) body.location = params.location;
    if (params.multiDay !== undefined) body.multiDay = params.multiDay;
    if (params.hidden !== undefined) body.hidden = params.hidden;
    if (params.ifNeedBe !== undefined) body.ifNeedBe = params.ifNeedBe;
    if (params.askAddress !== undefined) body.askAddress = params.askAddress;
    if (params.askEmail !== undefined) body.askEmail = params.askEmail;
    if (params.askPhone !== undefined) body.askPhone = params.askPhone;
    if (params.byInvitation !== undefined) body.byInvitation = params.byInvitation;
    if (params.timezone) body.timeZone = params.timezone;

    let response = await this.http.post<Poll>('/polls', body);
    return response.data;
  }

  async deletePoll(pollId: string, adminKey: string): Promise<void> {
    await this.http.delete(`/polls/${encodeURIComponent(pollId)}`, {
      params: { adminKey }
    });
  }

  async addParticipant(
    pollId: string,
    participant: AddParticipantParams
  ): Promise<Participant> {
    if (
      participant.preferences.length === 0 ||
      participant.preferences.some(value => ![0, 1, 2].includes(value))
    ) {
      throw createApiServiceError(
        'Provide a non-empty preferences array containing only 0 (No), 1 (Yes), or 2 (If need be).'
      );
    }

    let body: Record<string, unknown> = {
      name: participant.name,
      preferences: participant.preferences
    };
    if (participant.email) body.email = participant.email;

    let response = await this.http.post<Participant>(
      `/polls/${encodeURIComponent(pollId)}/participants`,
      body
    );
    return response.data;
  }

  async deleteParticipant(
    pollId: string,
    participantId: string,
    adminKey: string
  ): Promise<void> {
    await this.http.delete(
      `/polls/${encodeURIComponent(pollId)}/participants/${encodeURIComponent(participantId)}`,
      { params: { adminKey } }
    );
  }

  async addComment(
    pollId: string,
    comment: { author: string; text: string }
  ): Promise<Comment> {
    let response = await this.http.post<Comment>(
      `/polls/${encodeURIComponent(pollId)}/comments`,
      comment
    );
    return response.data;
  }

  async getComments(pollId: string): Promise<Comment[]> {
    let response = await this.http.get<Comment[] | { comments: Comment[] }>(
      `/polls/${encodeURIComponent(pollId)}/comments`
    );
    let comments = Array.isArray(response.data) ? response.data : response.data?.comments;
    if (!Array.isArray(comments)) {
      throw createApiServiceError('Doodle did not return a list of poll comments.');
    }
    return comments;
  }

  private formatOptions(type: string, options: PollOption[]): PollOption[] {
    if (type === 'TEXT') {
      return options.map(opt => ({ text: opt.text }));
    }
    return options.map(opt => ({
      date: opt.date,
      startTime: opt.startTime,
      endTime: opt.endTime
    }));
  }
}
