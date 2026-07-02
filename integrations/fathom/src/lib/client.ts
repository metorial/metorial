import { createAxios } from 'slates';

export interface ListMeetingsParams {
  cursor?: string;
  createdAfter?: string;
  createdBefore?: string;
  recordedBy?: string[];
  teams?: string[];
  calendarInvitees?: string[];
  calendarInviteesDomains?: string[];
  calendarInviteesDomainsType?: 'all' | 'only_internal' | 'one_or_more_external';
  includeTranscript?: boolean;
  includeSummary?: boolean;
  includeActionItems?: boolean;
  includeCrmMatches?: boolean;
}

export interface PaginatedResponse<T> {
  limit: number;
  next_cursor: string | null;
  items: T[];
}

export interface FathomUser {
  display_name: string;
  email: string;
}

export interface CalendarInvitee {
  display_name: string;
  email: string;
}

export interface TranscriptEntry {
  speaker: {
    display_name: string;
    matched_calendar_invitee_email: string | null;
  };
  text: string;
  timestamp: string;
}

export interface MeetingSummary {
  template_name: string | null;
  markdown_formatted: string | null;
}

export interface ActionItem {
  description: string;
  assignee: {
    name: string | null;
    email: string | null;
    team: string | null;
  } | null;
  completed: boolean;
  url: string | null;
}

export interface CrmMatch {
  contacts: Array<{
    name: string;
    email: string | null;
    url: string | null;
  }>;
  companies: Array<{
    name: string;
    url: string | null;
  }>;
  deals: Array<{
    name: string;
    amount: number | null;
    url: string | null;
  }>;
}

export interface Meeting {
  title: string;
  meeting_title: string | null;
  recording_id: number;
  url: string;
  share_url: string;
  created_at: string;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  recording_start_time: string | null;
  recording_end_time: string | null;
  calendar_invitees_domains_type: string | null;
  transcript_language: string | null;
  recorded_by: FathomUser | null;
  calendar_invitees: CalendarInvitee[];
  transcript: TranscriptEntry[] | null;
  default_summary: MeetingSummary | null;
  action_items: ActionItem[] | null;
  crm_matches: CrmMatch | null;
}

export interface Team {
  name: string;
  created_at: string;
}

export interface TeamMember {
  name: string;
  email: string;
  created_at: string;
}

export interface Webhook {
  id: string;
  url: string;
  secret: string;
  created_at: string;
  include_transcript: boolean;
  include_crm_matches: boolean;
  include_summary: boolean;
  include_action_items: boolean;
  triggered_for: string[];
}

export interface CreateWebhookParams {
  destinationUrl: string;
  triggeredFor: string[];
  includeTranscript?: boolean;
  includeSummary?: boolean;
  includeActionItems?: boolean;
  includeCrmMatches?: boolean;
}

export class Client {
  private axios;

  constructor(private config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.fathom.ai/external/v1'
    });
  }

  private getHeaders(): Record<string, string> {
    // Support both API key (X-Api-Key) and OAuth (Bearer) auth
    // We determine by checking if the token looks like an OAuth access token
    // Fathom API keys are user-generated; OAuth tokens come from the OAuth flow
    // Both work with the X-Api-Key header, but OAuth tokens should use Bearer
    // For simplicity, try Bearer first since API keys also work with X-Api-Key
    return {
      Authorization: `Bearer ${this.config.token}`,
      'X-Api-Key': this.config.token
    };
  }

  async listMeetings(params: ListMeetingsParams = {}): Promise<PaginatedResponse<Meeting>> {
    let queryParams: Record<string, string> = {};

    if (params.cursor) queryParams.cursor = params.cursor;
    if (params.createdAfter) queryParams.created_after = params.createdAfter;
    if (params.createdBefore) queryParams.created_before = params.createdBefore;
    if (params.includeTranscript) queryParams.include_transcript = 'true';
    if (params.includeSummary) queryParams.include_summary = 'true';
    if (params.includeActionItems) queryParams.include_action_items = 'true';
    if (params.includeCrmMatches) queryParams.include_crm_matches = 'true';
    if (params.calendarInviteesDomainsType) {
      queryParams.calendar_invitees_domains_type = params.calendarInviteesDomainsType;
    }

    let url = '/meetings';
    let searchParams = new URLSearchParams(queryParams);

    if (params.recordedBy) {
      for (let email of params.recordedBy) {
        searchParams.append('recorded_by[]', email);
      }
    }
    if (params.teams) {
      for (let team of params.teams) {
        searchParams.append('teams[]', team);
      }
    }
    if (params.calendarInvitees) {
      for (let email of params.calendarInvitees) {
        searchParams.append('calendar_invitees[]', email);
      }
    }
    if (params.calendarInviteesDomains) {
      for (let domain of params.calendarInviteesDomains) {
        searchParams.append('calendar_invitees_domains[]', domain);
      }
    }

    let queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }

    let response = await this.axios.get(url, {
      headers: this.getHeaders()
    });

    return response.data;
  }

  async getTranscript(recordingId: number): Promise<{ transcript: TranscriptEntry[] }> {
    let response = await this.axios.get(`/recordings/${recordingId}/transcript`, {
      headers: this.getHeaders()
    });

    return response.data;
  }

  async getSummary(recordingId: number): Promise<{ summary: MeetingSummary }> {
    let response = await this.axios.get(`/recordings/${recordingId}/summary`, {
      headers: this.getHeaders()
    });

    return response.data;
  }

  async listTeams(cursor?: string): Promise<PaginatedResponse<Team>> {
    let params: Record<string, string> = {};
    if (cursor) params.cursor = cursor;

    let response = await this.axios.get('/teams', {
      headers: this.getHeaders(),
      params
    });

    return response.data;
  }

  async listTeamMembers(
    team?: string,
    cursor?: string
  ): Promise<PaginatedResponse<TeamMember>> {
    let params: Record<string, string> = {};
    if (team) params.team = team;
    if (cursor) params.cursor = cursor;

    let response = await this.axios.get('/team_members', {
      headers: this.getHeaders(),
      params
    });

    return response.data;
  }

  async createWebhook(params: CreateWebhookParams): Promise<Webhook> {
    let body: Record<string, any> = {
      destination_url: params.destinationUrl,
      triggered_for: params.triggeredFor,
      include_transcript: params.includeTranscript ?? false,
      include_summary: params.includeSummary ?? false,
      include_action_items: params.includeActionItems ?? false,
      include_crm_matches: params.includeCrmMatches ?? false
    };

    let response = await this.axios.post('/webhooks', body, {
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.axios.delete(`/webhooks/${webhookId}`, {
      headers: this.getHeaders()
    });
  }
}
