import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

// The provider's transcript download links last 12 hours; renew five minutes early.
export let transcriptUrlRefreshIntervalMs = (12 * 60 - 5) * 60_000;

export interface LaunchSpaceParams {
  id: string;
  name?: string | null;
  allowGuests?: boolean;
  recordAv?: boolean | null;
  recordContent?: boolean | null;
  transcribe?: boolean | null;
  summarise?: boolean | null;
  user?: {
    id?: string;
    name?: string;
    email?: string;
    leader?: boolean;
    singleUse?: boolean;
    ghost?: boolean;
    customJwtParameters?: Record<string, unknown>;
  };
  timeouts?: { notBefore?: string | null; notAfter?: string | null };
  features?: Record<string, boolean>;
  theme?: Record<string, string> | null;
  videoLayoutMode?: string | null;
  locale?: string | null;
  server?: string | null;
  sessionTags?: Record<string, string>;
  spaceTags?: Record<string, string>;
  inviteUrl?: string | null;
  resourceUrl?: string | null;
}

export interface LaunchSpaceResponse {
  clientUrl: string;
  apiBase: string;
  roomId: string;
  secret: string;
  sessionId: string;
  userId: number;
  roomSettings?: Record<string, unknown> | null;
}

export interface SessionProfile {
  user: number;
  name: string | null;
  email: string;
  role: string;
}

export interface SessionGuest {
  socketId?: string;
  name: string | null;
  id?: number;
  uuid?: string;
  session?: number;
}

export interface SpaceData {
  id: string;
  alias: string;
  slug: string;
  name: string | null;
  organisation: number;
  isLocked: string;
  tags: string;
  url: string | null;
  createdAt: string;
  region: string;
  recordAv: boolean | null;
  transcribe: boolean | null;
  summarise: boolean | null;
}

export interface SessionData {
  id: number;
  name: string | null;
  uuid: string;
  startTime: string;
  endTime: string | null;
  profiles: SessionProfile[];
  guests: SessionGuest[];
  billableSeconds: number;
  tags: string;
  recordingAccessPolicy: unknown;
  summary: string | null;
  playbackUrl: string | null;
  recordingDeleted: boolean;
  recordingAvailable: boolean;
  playbackPassword: string | null;
  isPasswordSet: boolean;
  space?: SpaceData;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ListSessionsParams {
  search?: string;
  page?: number;
  includeSingleUser?: boolean;
  durationMin?: number;
  durationMax?: number;
  startTimeAfter?: string;
  startTimeBefore?: string;
  endTimeAfter?: string;
  endTimeBefore?: string;
  dateAfter?: string;
  dateBefore?: string;
  user?: string;
  space?: string;
  launchId?: string;
  inProgressOnly?: boolean;
  tags?: string;
  userExternalId?: string;
  userName?: string;
}

export interface ListSpacesParams {
  session?: string;
  tagKey?: string;
  tagValue?: string;
  user?: string;
  assignedTo?: number;
  search?: string;
  page?: number;
  dateAfter?: string;
  dateBefore?: string;
}

export interface ListUsersParams {
  role?: string;
  space?: string;
  session?: string;
  search?: string;
  page?: number;
}

export interface OrganisationUser {
  user: { id: number; username?: string; email?: string };
  role: string;
  active: boolean;
  name: string | null;
  externalId: string;
  url: string;
}

export interface UpdateSessionParams {
  name: string;
  recordingAccessPolicy?: string[];
}

export interface PlaybackResponse {
  recordingUrl: string;
  ready: boolean;
}

export interface TranscriptResponse {
  transcriptionUrl: string;
}

interface ApiSpace {
  id: string;
  alias: string;
  slug: string;
  name?: string | null;
  organisation: number;
  is_locked: string;
  tags?: string | null;
  url?: string | null;
  created_at: string;
  region: string;
  record_av?: boolean | null;
  transcribe?: boolean | null;
  summarise?: boolean | null;
}

interface ApiSession {
  id: number;
  name?: string | null;
  uuid: string;
  start_time: string;
  end_time?: string | null;
  profiles: SessionProfile[];
  guests: {
    socket_id?: string;
    socketId?: string;
    name?: string | null;
    id?: number;
    uuid?: string;
    session?: number;
  }[];
  billable_seconds: number;
  tags?: string | null;
  recording_access_policy?: unknown;
  summary?: string | null;
  playback_url?: string | null;
  recording_deleted: boolean;
  recording_available: boolean;
  playback_password?: string | null;
  is_password_set: boolean;
  space?: ApiSpace;
}

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (typeof config.token !== 'string' || !config.token.trim()) {
      throw createApiServiceError(
        'A Lessonspace API key is required. Reconnect with an API key from Settings > Developer.'
      );
    }
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.thelessonspace.com/v2/',
      authHeader: { value: `Organisation ${config.token}` },
      timeout: 30_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Lessonspace',
          reason: 'lessonspace_api_error',
          nestedKeys: ['errors', 'non_field_errors']
        })
    });
  }

  async launchSpace(params: LaunchSpaceParams): Promise<LaunchSpaceResponse> {
    let user = params.user;
    let response = await this.http.post<{
      client_url: string;
      api_base: string;
      room_id: string;
      secret: string;
      session_id: string;
      user_id: number;
      room_settings?: Record<string, unknown> | null;
    }>(
      'spaces/launch/',
      pickDefined({
        id: params.id,
        name: params.name,
        allow_guests: params.allowGuests,
        record_av: params.recordAv,
        record_content: params.recordContent,
        transcribe: params.transcribe,
        summarise: params.summarise,
        user: user
          ? pickDefined({
              id: user.id,
              name: user.name,
              email: user.email,
              leader: user.leader,
              single_use: user.singleUse,
              ghost: user.ghost,
              custom_jwt_parameters: user.customJwtParameters
            })
          : undefined,
        timeouts: params.timeouts
          ? pickDefined({
              not_before: params.timeouts.notBefore,
              not_after: params.timeouts.notAfter
            })
          : undefined,
        features: params.features,
        theme: params.theme,
        video_layout_mode: params.videoLayoutMode,
        locale: params.locale,
        server: params.server,
        session_tags: params.sessionTags,
        space_tags: params.spaceTags,
        invite_url: params.inviteUrl,
        resource_url: params.resourceUrl
      })
    );
    let data = response.data;
    return {
      clientUrl: data.client_url,
      apiBase: data.api_base,
      roomId: data.room_id,
      secret: data.secret,
      sessionId: data.session_id,
      userId: data.user_id,
      roomSettings: data.room_settings
    };
  }

  async listSessions(
    params: ListSessionsParams = {}
  ): Promise<PaginatedResponse<SessionData>> {
    let response = await this.http.get<PaginatedResponse<ApiSession>>(
      'organisations/sessions/',
      {
        params: this.sessionQuery(params)
      }
    );
    return this.mapPaginatedSessions(response.data);
  }

  async getSession(sessionUuid: string): Promise<SessionData> {
    let response = await this.http.get<ApiSession>(
      `organisations/sessions/${encodeURIComponent(sessionUuid)}/`
    );
    return this.mapSession(response.data);
  }

  async updateSession(sessionUuid: string, params: UpdateSessionParams): Promise<SessionData> {
    // PATCH returns only the changed fields, so read the identity before writing.
    let session = await this.getSession(sessionUuid);
    let response = await this.http.patch<{ name: string; recording_access_policy?: unknown }>(
      `organisations/sessions/${encodeURIComponent(sessionUuid)}/`,
      pickDefined({ name: params.name, recording_access_policy: params.recordingAccessPolicy })
    );
    return {
      ...session,
      name: response.data.name,
      recordingAccessPolicy:
        response.data.recording_access_policy ??
        params.recordingAccessPolicy ??
        session.recordingAccessPolicy
    };
  }

  async getPlaybackUrl(sessionUuid: string): Promise<PlaybackResponse> {
    let response = await this.http.get<{ recording_url: string }>(
      `organisations/sessions/${encodeURIComponent(sessionUuid)}/playback/`
    );
    if (response.status === 204) {
      throw createApiServiceError(
        'Content recording was disabled for this session, so no playback will be available.',
        { reason: 'lessonspace_recording_disabled', upstreamStatus: 204 }
      );
    }
    if (typeof response.data?.recording_url !== 'string' || !response.data.recording_url) {
      throw createApiServiceError(
        'Lessonspace did not return a recording URL. Request the recording again later.'
      );
    }
    return { recordingUrl: response.data.recording_url, ready: response.status !== 202 };
  }

  async getTranscript(sessionUuid: string): Promise<TranscriptResponse> {
    let response = await this.http.get<TranscriptResponse>(
      `organisations/sessions/${encodeURIComponent(sessionUuid)}/transcript/`
    );
    if (
      typeof response.data?.transcriptionUrl !== 'string' ||
      !response.data.transcriptionUrl
    ) {
      throw createApiServiceError(
        'Lessonspace did not return a transcript download URL. Check that transcription was enabled and has finished processing.'
      );
    }
    return response.data;
  }

  async listSpaces(params: ListSpacesParams = {}): Promise<PaginatedResponse<SpaceData>> {
    let response = await this.http.get<PaginatedResponse<ApiSpace>>('organisations/spaces/', {
      params: pickDefined({
        session: params.session,
        tag_key: params.tagKey,
        tag_value: params.tagValue,
        user: params.user,
        assigned_to: params.assignedTo,
        search: params.search,
        page: params.page,
        date_after: params.dateAfter,
        date_before: params.dateBefore
      })
    });
    this.validatePage(response.data);
    return { ...response.data, results: response.data.results.map(s => this.mapSpace(s)) };
  }

  async listUsers(params: ListUsersParams = {}): Promise<PaginatedResponse<OrganisationUser>> {
    let response = await this.http.get<
      PaginatedResponse<{
        user: { id: number; username?: string; email?: string };
        role: string;
        active: boolean;
        name?: string | null;
        external_id?: string | null;
        url: string;
      }>
    >('organisations/users/', { params: pickDefined(params) });
    this.validatePage(response.data);
    return {
      ...response.data,
      results: response.data.results.map(u => ({
        user: u.user,
        role: u.role,
        active: u.active,
        name: u.name ?? null,
        externalId: u.external_id ?? '',
        url: u.url
      }))
    };
  }

  async removeUser(userId: number): Promise<void> {
    await this.http.delete(`organisations/users/${encodeURIComponent(userId)}/`);
  }

  async deleteSessionRecordings(sessionUuid: string, forceDeleteCustomBuckets?: boolean) {
    let response = await this.http.post<{ status?: string }>(
      `organisations/sessions/${encodeURIComponent(sessionUuid)}/delete-recordings/`,
      pickDefined({
        session: sessionUuid,
        force_delete_custom_buckets: forceDeleteCustomBuckets
      })
    );
    return response.data;
  }

  async deleteSpaceRecordings(spaceUuid: string, forceDeleteCustomBuckets?: boolean) {
    let response = await this.http.post<{ status?: string }>(
      `organisations/spaces/${encodeURIComponent(spaceUuid)}/delete-recordings/`,
      pickDefined({ space: spaceUuid, force_delete_custom_buckets: forceDeleteCustomBuckets })
    );
    return response.data;
  }

  private sessionQuery(params: ListSessionsParams) {
    return pickDefined({
      search: params.search,
      page: params.page,
      include_single_user: params.includeSingleUser,
      duration_min: params.durationMin,
      duration_max: params.durationMax,
      start_time_after: params.startTimeAfter,
      start_time_before: params.startTimeBefore,
      end_time_after: params.endTimeAfter,
      end_time_before: params.endTimeBefore,
      date_after: params.dateAfter,
      date_before: params.dateBefore,
      user: params.user,
      space: params.space,
      launch_id: params.launchId,
      in_progress_only: params.inProgressOnly,
      tags: params.tags,
      user_external_id: params.userExternalId,
      user_name: params.userName
    });
  }

  private validatePage<T>(data: PaginatedResponse<T>) {
    if (!data || !Array.isArray(data.results) || typeof data.count !== 'number') {
      throw createApiServiceError(
        'Lessonspace returned an invalid paginated response. Try the request again.'
      );
    }
  }

  private mapPaginatedSessions(
    data: PaginatedResponse<ApiSession>
  ): PaginatedResponse<SessionData> {
    this.validatePage(data);
    return { ...data, results: data.results.map(s => this.mapSession(s)) };
  }

  private mapSession(s: ApiSession): SessionData {
    return {
      id: s.id,
      name: s.name ?? null,
      uuid: s.uuid,
      startTime: s.start_time,
      endTime: s.end_time ?? null,
      profiles: s.profiles ?? [],
      guests: (s.guests ?? []).map(g => ({
        socketId: g.socket_id ?? g.socketId,
        name: g.name ?? null,
        id: g.id,
        uuid: g.uuid,
        session: g.session
      })),
      billableSeconds: s.billable_seconds,
      tags: s.tags ?? '',
      recordingAccessPolicy: s.recording_access_policy,
      summary: s.summary ?? null,
      playbackUrl: s.playback_url ?? null,
      recordingDeleted: s.recording_deleted,
      recordingAvailable: s.recording_available,
      playbackPassword: s.playback_password ?? null,
      isPasswordSet: s.is_password_set,
      space: s.space ? this.mapSpace(s.space) : undefined
    };
  }

  private mapSpace(s: ApiSpace): SpaceData {
    return {
      id: s.id,
      alias: s.alias,
      slug: s.slug,
      name: s.name ?? null,
      organisation: s.organisation,
      isLocked: s.is_locked,
      tags: s.tags ?? '',
      url: s.url ?? null,
      createdAt: s.created_at,
      region: s.region,
      recordAv: s.record_av ?? null,
      transcribe: s.transcribe ?? null,
      summarise: s.summarise ?? null
    };
  }
}
