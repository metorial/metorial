import { createAxios } from 'slates';

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

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.http = createAxios({
      baseURL: 'https://doodle.com/api/v2.0',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async getCurrentUser(): Promise<{
    id: string;
    name: string;
    emailAddress?: string;
  }> {
    let response = await this.http.get('/users/me');
    return response.data;
  }

  async getMyPolls(params?: { locale?: string }): Promise<DashboardPoll[]> {
    let response = await this.http.get('/users/me/dashboard/myPolls', {
      params: {
        fullList: true,
        locale: params?.locale || 'en'
      }
    });
    return response.data?.polls || response.data || [];
  }

  async getParticipatedPolls(params?: { locale?: string }): Promise<DashboardPoll[]> {
    let response = await this.http.get('/users/me/dashboard/otherPolls', {
      params: {
        fullList: true,
        locale: params?.locale || 'en'
      }
    });
    return response.data?.polls || response.data || [];
  }

  async getPoll(pollId: string): Promise<Poll> {
    let response = await this.http.get(`/polls/${pollId}`);
    return response.data;
  }

  async createPoll(params: CreatePollParams): Promise<Poll> {
    let body: Record<string, any> = {
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

    let response = await this.http.post('/polls', body);
    return response.data;
  }

  async deletePoll(pollId: string, adminKey: string): Promise<void> {
    await this.http.delete(`/polls/${pollId}`, {
      params: { adminKey }
    });
  }

  async addParticipant(
    pollId: string,
    participant: AddParticipantParams
  ): Promise<Participant> {
    let body: Record<string, any> = {
      name: participant.name,
      preferences: participant.preferences
    };
    if (participant.email) body.email = participant.email;

    let response = await this.http.post(`/polls/${pollId}/participants`, body);
    return response.data;
  }

  async deleteParticipant(
    pollId: string,
    participantId: string,
    adminKey: string
  ): Promise<void> {
    await this.http.delete(`/polls/${pollId}/participants/${participantId}`, {
      params: { adminKey }
    });
  }

  async addComment(
    pollId: string,
    comment: { author: string; text: string }
  ): Promise<{ commentId: string; author: string; text: string }> {
    let response = await this.http.post(`/polls/${pollId}/comments`, comment);
    return response.data;
  }

  async getComments(
    pollId: string
  ): Promise<{ commentId: string; author: string; text: string; createdAt?: string }[]> {
    let response = await this.http.get(`/polls/${pollId}/comments`);
    return response.data?.comments || response.data || [];
  }

  private formatOptions(type: string, options: PollOption[]): Record<string, any>[] {
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
