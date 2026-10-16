import { createApiServiceError, createAuthenticatedAxios } from 'slates';
import { z } from 'zod';
import { fathomApiError } from './errors';
import {
  meetingResponseSchema,
  meetingTypeResponseSchema,
  memberResponseSchema,
  pageResponseSchema,
  parseFathomResponse,
  summaryResponseSchema,
  teamResponseSchema,
  transcriptEntryResponseSchema
} from './schemas';

export interface ListMeetingsParams {
  cursor?: string;
  createdAfter?: string;
  createdBefore?: string;
  recordedBy?: string[];
  teams?: string[];
  calendarInvitees?: string[];
  calendarInviteesDomains?: string[];
  calendarInviteesDomainsType?: 'all' | 'only_internal' | 'one_or_more_external';
  meetingType?: string;
  includeTranscript?: boolean;
  includeSummary?: boolean;
  includeActionItems?: boolean;
  includeCrmMatches?: boolean;
  includeHighlights?: boolean;
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
  private authMethod: 'api_key' | 'oauth';

  constructor(auth: {
    token: string;
    refreshToken?: string;
    authMethod?: 'api_key' | 'oauth';
  }) {
    if (!auth.token?.trim()) {
      throw createApiServiceError('Fathom credentials are missing. Reconnect your account.');
    }
    // Older OAuth connections already persist refreshToken; personal API key
    // connections do not. New connections record the method explicitly.
    this.authMethod = auth.authMethod ?? (auth.refreshToken ? 'oauth' : 'api_key');
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.fathom.ai/external/v1',
      timeout: 30_000,
      authHeader:
        this.authMethod === 'oauth'
          ? { value: `Bearer ${auth.token}` }
          : { name: 'X-Api-Key', value: auth.token },
      errorAdapter: error => fathomApiError(error, [auth.token, auth.refreshToken ?? ''])
    });
  }

  private validateRecordingId(recordingId: number) {
    if (!Number.isSafeInteger(recordingId) || recordingId <= 0) {
      throw createApiServiceError(
        'recordingId must be a positive whole-number recording ID from list_meetings.'
      );
    }
  }

  async listMeetings(params: ListMeetingsParams = {}) {
    if (this.authMethod === 'oauth' && (params.includeTranscript || params.includeSummary)) {
      throw createApiServiceError(
        'Fathom OAuth connections must use get_transcript and get_summary instead of including transcripts or summaries in list_meetings.'
      );
    }
    for (let key of ['createdAfter', 'createdBefore'] as const) {
      let value = params[key];
      if (value !== undefined && !Number.isFinite(Date.parse(value))) {
        throw createApiServiceError(`${key} must be a valid ISO 8601 timestamp.`);
      }
    }
    if (
      params.createdAfter &&
      params.createdBefore &&
      Date.parse(params.createdAfter) > Date.parse(params.createdBefore)
    ) {
      throw createApiServiceError(
        'createdAfter must be earlier than or equal to createdBefore.'
      );
    }
    let query = new URLSearchParams();
    let fields = {
      cursor: params.cursor,
      created_after: params.createdAfter,
      created_before: params.createdBefore,
      calendar_invitees_domains_type: params.calendarInviteesDomainsType,
      meeting_type: params.meetingType,
      include_transcript: params.includeTranscript,
      include_summary: params.includeSummary,
      include_action_items: params.includeActionItems,
      include_crm_matches: params.includeCrmMatches,
      include_highlights: params.includeHighlights
    };
    for (let [key, value] of Object.entries(fields)) {
      if (value !== undefined) query.set(key, String(value));
    }
    for (let [key, values] of Object.entries({
      'recorded_by[]': params.recordedBy,
      'teams[]': params.teams,
      'calendar_invitees_domains[]': params.calendarInviteesDomains
    })) {
      for (let value of values ?? []) query.append(key, value);
    }
    let response = await this.axios.get(`/meetings?${query.toString()}`);
    let page = parseFathomResponse(
      pageResponseSchema(meetingResponseSchema),
      response.data,
      'meetings'
    );
    // Attendee email filtering is not available upstream. Preserve the input's
    // meaning by applying exact email matches within each provider page.
    if (params.calendarInvitees?.length) {
      let emails = new Set(params.calendarInvitees.map(email => email.toLowerCase()));
      page.items = page.items.filter(meeting =>
        meeting.calendar_invitees.some(
          invitee => invitee.email !== null && emails.has(invitee.email.toLowerCase())
        )
      );
    }
    return page;
  }

  async getTranscript(recordingId: number) {
    this.validateRecordingId(recordingId);
    let response = await this.axios.get(`/recordings/${recordingId}/transcript`);
    return parseFathomResponse(
      z.object({ transcript: z.array(transcriptEntryResponseSchema) }).passthrough(),
      response.data,
      'transcript'
    );
  }

  async getSummary(recordingId: number) {
    this.validateRecordingId(recordingId);
    let response = await this.axios.get(`/recordings/${recordingId}/summary`);
    return parseFathomResponse(
      z.object({ summary: summaryResponseSchema }).passthrough(),
      response.data,
      'summary'
    );
  }

  async listTeams(cursor?: string) {
    let response = await this.axios.get('/teams', { params: { cursor } });
    return parseFathomResponse(pageResponseSchema(teamResponseSchema), response.data, 'teams');
  }

  async listTeamMembers(team?: string, cursor?: string) {
    let response = await this.axios.get('/team_members', { params: { team, cursor } });
    return parseFathomResponse(
      pageResponseSchema(memberResponseSchema),
      response.data,
      'team members'
    );
  }

  async listMeetingTypes(cursor?: string) {
    let response = await this.axios.get('/meeting_types', { params: { cursor } });
    return parseFathomResponse(
      pageResponseSchema(meetingTypeResponseSchema),
      response.data,
      'meeting types'
    );
  }

  async createWebhook(params: CreateWebhookParams) {
    let allowedTypes = [
      'my_recordings',
      'shared_external_recordings',
      'my_shared_with_team_recordings',
      'shared_team_recordings'
    ];
    if (
      !params.triggeredFor.length ||
      params.triggeredFor.some(type => !allowedTypes.includes(type))
    ) {
      throw createApiServiceError(
        'Select at least one supported Fathom recording type for the webhook.'
      );
    }
    if (
      ![
        params.includeTranscript,
        params.includeSummary,
        params.includeActionItems,
        params.includeCrmMatches
      ].some(Boolean)
    ) {
      throw createApiServiceError(
        'Enable at least one of transcript, summary, action items, or CRM matches for the Fathom webhook.'
      );
    }
    let response = await this.axios.post('/webhooks', {
      destination_url: params.destinationUrl,
      triggered_for: params.triggeredFor,
      include_transcript: params.includeTranscript ?? false,
      include_summary: params.includeSummary ?? false,
      include_action_items: params.includeActionItems ?? false,
      include_crm_matches: params.includeCrmMatches ?? false
    });
    return response.data as unknown;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    if (!webhookId.trim()) throw createApiServiceError('Provide the Fathom webhook ID.');
    await this.axios.delete(`/webhooks/${encodeURIComponent(webhookId)}`);
  }
}
