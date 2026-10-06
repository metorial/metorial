import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getApiErrorStatus,
  isApiErrorRecord,
  pickDefined,
  requestAxios
} from 'slates';
import { z } from 'zod';
import {
  identifier,
  type Message,
  mediaSchema,
  memberSchema,
  messageSchema,
  organizationSchema,
  permissionSchema,
  socialProfileSchema,
  teamSchema,
  trustedMediaUrl,
  uploadSchema,
  validateData,
  validateUtc
} from './schemas';

export const HOOTSUITE_BASE_URL = 'https://platform.hootsuite.com';
const MAX_DISCOVERY_PAGES = 20;
const MAX_DISCOVERY_ORGANIZATIONS = 20;

export let upstreamFailure = (error: unknown, operation: string) => {
  let rawStatus = getApiErrorStatus(error);
  if (rawStatus === undefined && isApiErrorRecord(error) && isApiErrorRecord(error.data)) {
    let value = error.data.upstreamStatus;
    if (typeof value === 'number' || typeof value === 'string') rawStatus = value;
  }
  let numeric =
    typeof rawStatus === 'number'
      ? rawStatus
      : /^\d{3}$/.test(rawStatus ?? '')
        ? Number(rawStatus)
        : undefined;
  let status =
    numeric !== undefined && Number.isInteger(numeric) && numeric >= 100 && numeric <= 599
      ? numeric
      : undefined;
  return buildApiServiceError(
    { response: { status } },
    {
      providerLabel: 'Hootsuite',
      reason: 'hootsuite_api_error',
      operation,
      extractMessage: () =>
        'Check account permissions, request parameters and API availability. Inspect any write outcome before retrying.',
      parent: {}
    }
  );
};

export type ProviderFailure = { code?: number; socialProfileId?: string };
type Envelope = { data: unknown; cursor?: string; errors: ProviderFailure[] };

export class HootsuiteClient {
  private api: ReturnType<typeof createAuthenticatedAxios>;

  constructor(token: string) {
    if (
      !token ||
      [...token].some(
        character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
      )
    ) {
      throw createApiServiceError('Reconnect Hootsuite with a valid access token.', {
        reason: 'invalid_auth'
      });
    }
    this.api = createAuthenticatedAxios({
      baseURL: HOOTSUITE_BASE_URL,
      authHeader: { value: `Bearer ${token}` },
      contentType: 'application/json;charset=utf-8',
      timeout: 30_000,
      maxRedirects: 0,
      errorAdapter: error => upstreamFailure(error, 'request')
    });
  }

  private async envelope(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    options: {
      params?: Record<string, string> | URLSearchParams;
      body?: unknown;
      partial?: boolean;
      emptySuccess?: boolean;
    } = {}
  ): Promise<Envelope> {
    let response = await requestAxios(
      'request',
      () =>
        this.api.request<unknown>({
          method,
          url: path,
          params: options.params,
          data: options.body
        }),
      upstreamFailure
    );
    if (response.status === 204) return { data: {}, errors: [] };
    if (
      options.emptySuccess &&
      response.status === 200 &&
      (response.data === undefined ||
        response.data === null ||
        response.data === '' ||
        (isApiErrorRecord(response.data) && Object.keys(response.data).length === 0))
    )
      return { data: {}, errors: [] };
    if (!isApiErrorRecord(response.data)) {
      throw createApiServiceError(
        'Hootsuite returned an invalid response envelope. Inspect any write outcome before retrying.',
        { reason: 'invalid_provider_response' }
      );
    }
    let envelope = response.data;
    if (envelope.errors !== undefined && !Array.isArray(envelope.errors)) {
      throw createApiServiceError(
        'Hootsuite returned invalid error metadata. Inspect any write outcome before retrying.'
      );
    }
    let errors: ProviderFailure[] = (
      Array.isArray(envelope.errors) ? envelope.errors : []
    ).map(value => {
      if (!isApiErrorRecord(value)) return {};
      let resource = isApiErrorRecord(value.resource) ? value.resource : undefined;
      return pickDefined({
        code:
          typeof value.code === 'number' && Number.isSafeInteger(value.code)
            ? value.code
            : undefined,
        socialProfileId:
          resource?.type === 'socialProfile' && typeof resource.id === 'string'
            ? resource.id
            : undefined
      });
    });
    if (errors.length && !options.partial) {
      let codes = errors.flatMap(error => (error.code === undefined ? [] : [error.code]));
      throw createApiServiceError(
        `Hootsuite reported a failed operation${codes.length ? ` (codes ${codes.join(', ')})` : ''}. Inspect any write outcome before retrying.`,
        {
          reason: 'provider_response_error',
          upstreamStatus: response.status
        }
      );
    }
    if (!Object.hasOwn(envelope, 'data')) {
      if (options.partial && errors.length) return { data: [], errors };
      throw createApiServiceError(
        'Hootsuite did not return a data receipt. Inspect any write outcome before retrying.',
        { reason: 'invalid_provider_response' }
      );
    }
    let metadata = isApiErrorRecord(envelope.metadata) ? envelope.metadata : undefined;
    let cursorValue =
      metadata && Object.hasOwn(metadata, 'cursor')
        ? isApiErrorRecord(metadata.cursor)
          ? metadata.cursor.next
          : metadata.cursor
        : envelope.cursor;
    if (
      cursorValue !== undefined &&
      cursorValue !== null &&
      (typeof cursorValue !== 'string' || !cursorValue)
    ) {
      throw createApiServiceError('Hootsuite returned an invalid pagination cursor.');
    }
    return {
      data: envelope.data,
      errors,
      cursor: typeof cursorValue === 'string' ? cursorValue : undefined
    };
  }

  private async page<T>(path: string, schema: z.ZodType<T>, params?: Record<string, string>) {
    let envelope = await this.envelope('GET', path, { params });
    return {
      items: validateData(z.array(schema), envelope.data, 'collection'),
      cursor: envelope.cursor
    };
  }

  private async complete<T>(
    load: (cursor?: string) => Promise<{ items: T[]; cursor?: string }>
  ) {
    let result: T[] = [];
    let cursor: string | undefined;
    let seen = new Set<string>();
    for (let page = 0; page < MAX_DISCOVERY_PAGES; page++) {
      let response = await load(cursor);
      result.push(...response.items);
      if (!response.cursor) return result;
      if (seen.has(response.cursor))
        throw createApiServiceError(
          'Hootsuite repeated a discovery cursor. Choose an explicit organization and try again.'
        );
      seen.add(response.cursor);
      cursor = response.cursor;
    }
    throw createApiServiceError(
      'Hootsuite discovery exceeded its page bound. Choose an explicit organization before acting.'
    );
  }

  private checkIdentity(id: string, requested: string, label: string) {
    if (id !== requested)
      throw createApiServiceError(`Hootsuite returned a different ${label} identity.`);
  }

  async getMe() {
    return validateData(
      memberSchema,
      (await this.envelope('GET', '/v1/me')).data,
      'current member'
    );
  }
  async getMyOrganizations() {
    return this.complete(cursor =>
      this.page('/v1/me/organizations', organizationSchema, cursor ? { cursor } : undefined)
    );
  }
  async getSocialProfiles(cursor?: string) {
    let result = await this.page(
      '/v1/socialProfiles',
      socialProfileSchema,
      cursor ? { cursor } : undefined
    );
    return { profiles: result.items, cursor: result.cursor };
  }
  async getSocialProfile(socialProfileId: string) {
    let result = validateData(
      socialProfileSchema,
      (
        await this.envelope(
          'GET',
          `/v1/socialProfiles/${identifier(socialProfileId, 'social profile ID')}`
        )
      ).data,
      'social profile'
    );
    this.checkIdentity(result.id, socialProfileId, 'social profile');
    return result;
  }
  async getSocialProfileTeams(socialProfileId: string) {
    return this.complete(cursor =>
      this.page(
        `/v1/socialProfiles/${identifier(socialProfileId, 'social profile ID')}/teams`,
        teamSchema,
        cursor ? { cursor } : undefined
      )
    );
  }
  async scheduleMessage(params: {
    text: string;
    socialProfileIds: string[];
    scheduledSendTime: string;
    mediaUrls?: { url: string }[];
    media?: { id: string; videoOptions?: unknown }[];
    tags?: string[];
    location?: { latitude: number; longitude: number };
    emailNotification?: boolean;
    webhookUrls?: string[];
    extendedInfo?: unknown[];
    privacy?: string;
    targeting?: unknown;
  }): Promise<{ messages: Message[]; errors: ProviderFailure[] }> {
    validateUtc(params.scheduledSendTime, 'scheduledSendTime');
    if (
      !params.socialProfileIds.length ||
      new Set(params.socialProfileIds).size !== params.socialProfileIds.length
    )
      throw createApiServiceError('Provide distinct social profile IDs for scheduling.');
    for (let id of params.socialProfileIds) identifier(id, 'social profile ID');
    if (
      params.location &&
      (Math.abs(params.location.latitude) > 90 || Math.abs(params.location.longitude) > 180)
    )
      throw createApiServiceError('Provide valid latitude and longitude coordinates.');
    let response = await this.envelope('POST', '/v1/messages', {
      body: pickDefined(params),
      partial: true
    });
    let messages = validateData(z.array(messageSchema), response.data, 'scheduled messages');
    if (!messages.length && !response.errors.length)
      throw createApiServiceError(
        'Hootsuite returned no scheduling receipts. Inspect the selected profiles before retrying.'
      );
    return { messages, errors: response.errors };
  }
  async getMessage(messageId: string) {
    let result = validateData(
      messageSchema,
      (await this.envelope('GET', `/v1/messages/${identifier(messageId, 'message ID')}`)).data,
      'message'
    );
    this.checkIdentity(result.id, messageId, 'message');
    return result;
  }
  async getMessages(params: {
    startTime: string;
    endTime: string;
    socialProfileIds?: string[];
    state?: string;
    limit?: number;
    cursor?: string;
    includeUnscheduledReviewMessages?: boolean;
  }) {
    let start = validateUtc(params.startTime, 'startTime');
    let end = validateUtc(params.endTime, 'endTime');
    if (end < start || end - start > 28 * 24 * 60 * 60 * 1000)
      throw createApiServiceError(
        'Choose an ordered message time range of at most four weeks.'
      );
    if (
      params.limit !== undefined &&
      (!Number.isInteger(params.limit) || params.limit < 1 || params.limit > 100)
    )
      throw createApiServiceError('Message limit must be an integer from 1 to 100.');
    let query = new URLSearchParams({ startTime: params.startTime, endTime: params.endTime });
    for (let id of params.socialProfileIds ?? []) {
      identifier(id, 'social profile ID');
      query.append('socialProfileIds', id);
    }
    if (params.state)
      query.set(
        'state',
        params.state === 'SEND_FAILED' ? 'SEND_FAILED_PERMANENTLY' : params.state
      );
    if (params.limit !== undefined) query.set('limit', String(params.limit));
    if (params.cursor) query.set('cursor', params.cursor);
    if (params.includeUnscheduledReviewMessages !== undefined)
      query.set(
        'includeUnscheduledReviewMsgs',
        String(params.includeUnscheduledReviewMessages)
      );
    let response = await this.envelope('GET', '/v1/messages', { params: query });
    return {
      messages: validateData(z.array(messageSchema), response.data, 'messages'),
      cursor: response.cursor
    };
  }
  async deleteMessage(messageId: string) {
    await this.envelope('DELETE', `/v1/messages/${identifier(messageId, 'message ID')}`, {
      emptySuccess: true
    });
  }
  async approveMessage(messageId: string, sequenceNumber: number) {
    this.sequence(sequenceNumber);
    return (
      await this.envelope(
        'POST',
        `/v1/messages/${identifier(messageId, 'message ID')}/approve`,
        { body: { sequenceNumber } }
      )
    ).data;
  }
  async rejectMessage(messageId: string, sequenceNumber: number, reason?: string) {
    this.sequence(sequenceNumber);
    if (!reason?.trim())
      throw createApiServiceError('Provide a nonblank reason to reject a message.');
    return (
      await this.envelope(
        'POST',
        `/v1/messages/${identifier(messageId, 'message ID')}/reject`,
        { body: pickDefined({ sequenceNumber, reason }) }
      )
    ).data;
  }
  private sequence(value: number) {
    if (!Number.isInteger(value) || value < 0)
      throw createApiServiceError(
        'Provide the current nonnegative integer sequenceNumber from list_messages.'
      );
  }
  async createMediaUploadUrl(sizeBytes: number, mimeType: string) {
    if (
      !Number.isSafeInteger(sizeBytes) ||
      sizeBytes <= 0 ||
      !['video/mp4', 'image/gif', 'image/jpeg', 'image/jpg', 'image/png'].includes(mimeType)
    )
      throw createApiServiceError(
        'Provide a positive integer sizeBytes and a supported image or MP4 MIME type.'
      );
    let result = validateData(
      uploadSchema,
      (await this.envelope('POST', '/v1/media', { body: { sizeBytes, mimeType } })).data,
      'media upload'
    );
    return {
      mediaId: result.id,
      uploadUrl: trustedMediaUrl(result.uploadUrl, 'upload'),
      uploadUrlDurationSeconds: result.uploadUrlDurationSeconds
    };
  }
  async getMediaUploadStatus(mediaId: string) {
    let result = validateData(
      mediaSchema,
      (await this.envelope('GET', `/v1/media/${identifier(mediaId, 'media ID')}`)).data,
      'media status'
    );
    this.checkIdentity(result.id, mediaId, 'media');
    return result;
  }
  async getOrganizationMembers(organizationId: string, cursor?: string) {
    let result = await this.page(
      `/v1/organizations/${identifier(organizationId, 'organization ID')}/members`,
      memberSchema,
      cursor ? { cursor } : undefined
    );
    return { members: result.items, cursor: result.cursor };
  }
  async getOrganizationMember(organizationId: string, memberId: string) {
    identifier(memberId, 'member ID');
    let members = await this.complete(async cursor => {
      let page = await this.getOrganizationMembers(organizationId, cursor);
      return { items: page.members, cursor: page.cursor };
    });
    if (members.filter(member => member.id === memberId).length !== 1)
      throw createApiServiceError(
        'The requested member was not uniquely found in the selected organization.'
      );
    let result = validateData(
      memberSchema,
      (await this.envelope('GET', `/v1/members/${identifier(memberId, 'member ID')}`)).data,
      'member'
    );
    this.checkIdentity(result.id, memberId, 'member');
    return result;
  }
  async getOrganizationMemberPermissions(organizationId: string, memberId: string) {
    return validateData(
      permissionSchema,
      (
        await this.envelope(
          'GET',
          `/v1/organizations/${identifier(organizationId, 'organization ID')}/members/${identifier(memberId, 'member ID')}/permissions`
        )
      ).data,
      'organization permissions'
    );
  }
  async inviteOrganizationMember(params: {
    organizationId: string;
    fullName: string;
    email: string;
    organizationIds?: string[];
    companyName?: string;
    bio?: string;
    timezone?: string;
  }) {
    let organizations = params.organizationIds ?? [params.organizationId];
    let ids = organizations.map(id => {
      if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0)
        throw createApiServiceError(
          'Member creation requires positive numeric organization IDs from get_user_info.'
        );
      return Number(id);
    });
    let result = validateData(
      memberSchema,
      (
        await this.envelope('POST', '/v1/members', {
          body: pickDefined({
            fullName: params.fullName,
            email: params.email,
            organizationIds: ids,
            companyName: params.companyName,
            bio: params.bio,
            timezone: params.timezone
          })
        })
      ).data,
      'member creation'
    );
    return result;
  }
  async removeOrganizationMember(organizationId: string, memberId: string) {
    await this.envelope(
      'DELETE',
      `/v1/organizations/${identifier(organizationId, 'organization ID')}/members/${identifier(memberId, 'member ID')}`
    );
  }
  async getMemberTeams(organizationId: string, memberId: string) {
    return this.complete(cursor =>
      this.page(
        `/v1/organizations/${identifier(organizationId)}/members/${identifier(memberId)}/teams`,
        teamSchema,
        cursor ? { cursor } : undefined
      )
    );
  }
  async getMemberSocialProfiles(organizationId: string, memberId: string) {
    return this.complete(cursor =>
      this.page(
        `/v1/organizations/${identifier(organizationId)}/members/${identifier(memberId)}/socialProfiles`,
        socialProfileSchema,
        cursor ? { cursor } : undefined
      )
    );
  }
  async getMemberSocialProfilePermissions(
    organizationId: string,
    memberId: string,
    socialProfileId: string
  ) {
    return validateData(
      permissionSchema,
      (
        await this.envelope(
          'GET',
          `/v1/organizations/${identifier(organizationId)}/members/${identifier(memberId)}/socialProfiles/${identifier(socialProfileId)}/permissions`
        )
      ).data,
      'social profile permissions'
    );
  }
  async getOrganizationTeams(organizationId: string, cursor?: string) {
    let result = await this.page(
      `/v1/organizations/${identifier(organizationId, 'organization ID')}/teams`,
      teamSchema,
      cursor ? { cursor } : undefined
    );
    return { teams: result.items, cursor: result.cursor };
  }
  async getTeam(teamId: string) {
    let result = validateData(
      teamSchema,
      (await this.envelope('GET', `/v1/teams/${identifier(teamId, 'team ID')}`)).data,
      'team'
    );
    this.checkIdentity(result.id, teamId, 'team');
    return result;
  }
  async createTeam(organizationId: string, teamName: string) {
    if (teamName.length < 2 || teamName.length > 200)
      throw createApiServiceError('Team names must contain 2 to 200 characters.');
    return validateData(
      teamSchema,
      (
        await this.envelope(
          'POST',
          `/v1/organizations/${identifier(organizationId, 'organization ID')}/teams`,
          { body: { teamName } }
        )
      ).data,
      'team creation'
    );
  }
  async resolveTeamOrganization(teamId: string, organizationId?: string) {
    identifier(teamId, 'team ID');
    let organizations = organizationId
      ? [{ id: organizationId }]
      : await this.getMyOrganizations();
    if (organizations.length > MAX_DISCOVERY_ORGANIZATIONS)
      throw createApiServiceError(
        'Choose an explicit organizationId from get_user_info before accessing this team.'
      );
    let matches: string[] = [];
    for (let organization of organizations) {
      let teams = await this.complete(async cursor => {
        let page = await this.getOrganizationTeams(organization.id, cursor);
        return { items: page.teams, cursor: page.cursor };
      });
      if (teams.some(team => team.id === teamId)) matches.push(organization.id);
    }
    if (matches.length !== 1)
      throw createApiServiceError(
        'The team was not uniquely found in the selected authorized organizations. Call get_user_info and provide its organizationId.'
      );
    return matches[0]!;
  }
  async getTeamMembers(teamId: string, cursor?: string, organizationId?: string) {
    let scope = await this.resolveTeamOrganization(teamId, organizationId);
    let result = await this.page(
      `/v1/organizations/${identifier(scope)}/teams/${identifier(teamId)}/members`,
      memberSchema,
      cursor ? { cursor } : undefined
    );
    return { members: result.items, cursor: result.cursor };
  }
  async addTeamMember(teamId: string, memberId: string, organizationId?: string) {
    let scope = await this.resolveTeamOrganization(teamId, organizationId);
    await this.envelope(
      'POST',
      `/v1/organizations/${identifier(scope)}/teams/${identifier(teamId)}/members/${identifier(memberId)}`
    );
  }
  async removeTeamMember(teamId: string, memberId: string) {
    // Preserved legacy route; the current public REST contract does not document a replacement.
    await this.envelope(
      'DELETE',
      `/v1/teams/${identifier(teamId, 'team ID')}/members/${identifier(memberId, 'member ID')}`
    );
  }
  async getTeamSocialProfiles(teamId: string, cursor?: string, organizationId?: string) {
    let scope = await this.resolveTeamOrganization(teamId, organizationId);
    let result = await this.page(
      `/v1/organizations/${identifier(scope)}/teams/${identifier(teamId)}/socialProfiles`,
      socialProfileSchema,
      cursor ? { cursor } : undefined
    );
    return { profiles: result.items, cursor: result.cursor };
  }
  async getTeamMemberPermissions(teamId: string, memberId: string, organizationId?: string) {
    let scope = await this.resolveTeamOrganization(teamId, organizationId);
    return validateData(
      permissionSchema,
      (
        await this.envelope(
          'GET',
          `/v1/organizations/${identifier(scope)}/teams/${identifier(teamId)}/members/${identifier(memberId)}/permissions`
        )
      ).data,
      'team permissions'
    );
  }
  async shortenLink(url: string) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw createApiServiceError('Provide a valid HTTP or HTTPS URL to shorten.');
    }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password)
      throw createApiServiceError(
        'Provide an HTTP or HTTPS URL without embedded credentials.'
      );
    // The legacy Ow.ly route is retained without claiming current public API availability.
    let value = (await this.envelope('POST', '/v1/owly/links', { body: { url } })).data;
    if (!isApiErrorRecord(value))
      throw createApiServiceError('Hootsuite returned no link-shortening receipt.');
    let shortenedUrl = value.shortenedUrl ?? value.shortUrl ?? value.url;
    if (typeof shortenedUrl !== 'string' || !shortenedUrl)
      throw createApiServiceError(
        'Hootsuite returned no shortened URL. Check Ow.ly API access; the dashboard shortener remains available.'
      );
    let short: URL;
    try {
      short = new URL(shortenedUrl);
    } catch {
      throw createApiServiceError('Hootsuite returned an invalid shortened URL.');
    }
    if (!['http:', 'https:'].includes(short.protocol) || short.username || short.password)
      throw createApiServiceError('Hootsuite returned an unsafe shortened URL.');
    return { shortenedUrl };
  }
}
