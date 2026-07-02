import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://api.thelessonspace.com/v2/'
});

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
    customJwtParameters?: Record<string, any>;
  };
  webhooks?: {
    session?: {
      start?: string | null;
      end?: string | null;
      idle?: string | null;
    };
    user?: {
      join?: string | null;
      leave?: string | null;
      idle?: string | null;
    };
    chat?: {
      message?: string | null;
    };
    cobrowser?: {
      start?: string | null;
      stop?: string | null;
    };
    transcription?: {
      finish?: string | null;
    };
    summary?: {
      finish?: string | null;
    };
  };
  timeouts?: {
    notBefore?: string | null;
    notAfter?: string | null;
  };
  features?: Record<string, boolean>;
  theme?: Record<string, string> | null;
  videoLayoutMode?: string | null;
  locale?: string | null;
  server?: string | null;
  sessionTags?: Record<string, string>;
  spaceTags?: Record<string, string>;
  inviteUrl?: string | null;
  resourceUrl?: string | null;
  authExternal?: {
    url: string;
  } | null;
}

export interface LaunchSpaceResponse {
  clientUrl: string;
  apiBase: string;
  roomId: string;
  secret: string;
  sessionId: string;
  userId: number;
  roomSettings?: Record<string, string> | null;
}

export interface SessionProfile {
  user: number;
  name: string | null;
  email: string;
  role: string;
}

export interface SessionGuest {
  socketId: string;
  name: string | null;
}

export interface SpaceData {
  id: string;
  alias: string;
  slug: string;
  name: string | null;
  organisation: number;
  isLocked: string;
  tags: string;
  url: string;
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
  recordingAccessPolicy: any;
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
  user: {
    id: number;
    username: string;
  };
  role: string;
  active: boolean;
  name: string | null;
  externalId: string;
  url: string;
}

export interface UpdateSessionParams {
  name: string;
  recordingAccessPolicy?: any;
}

export interface PlaybackResponse {
  recordingUrl: string;
}

export class Client {
  private token: string;
  private organisationId: string;

  constructor(config: { token: string; organisationId: string }) {
    this.token = config.token;
    this.organisationId = config.organisationId;
  }

  private headers() {
    return {
      Authorization: `Organisation ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  async launchSpace(params: LaunchSpaceParams): Promise<LaunchSpaceResponse> {
    let body: Record<string, any> = {
      id: params.id
    };

    if (params.name !== undefined) body.name = params.name;
    if (params.allowGuests !== undefined) body.allow_guests = params.allowGuests;
    if (params.recordAv !== undefined) body.record_av = params.recordAv;
    if (params.recordContent !== undefined) body.record_content = params.recordContent;
    if (params.transcribe !== undefined) body.transcribe = params.transcribe;
    if (params.summarise !== undefined) body.summarise = params.summarise;

    if (params.user) {
      let userObj: Record<string, any> = {};
      if (params.user.id !== undefined) userObj.id = params.user.id;
      if (params.user.name !== undefined) userObj.name = params.user.name;
      if (params.user.email !== undefined) userObj.email = params.user.email;
      if (params.user.leader !== undefined) userObj.leader = params.user.leader;
      if (params.user.customJwtParameters !== undefined)
        userObj.custom_jwt_parameters = params.user.customJwtParameters;
      body.user = userObj;
    }

    if (params.webhooks) {
      body.webhooks = params.webhooks;
    }

    if (params.timeouts) {
      let timeouts: Record<string, any> = {};
      if (params.timeouts.notBefore !== undefined)
        timeouts.not_before = params.timeouts.notBefore;
      if (params.timeouts.notAfter !== undefined)
        timeouts.not_after = params.timeouts.notAfter;
      body.timeouts = timeouts;
    }

    if (params.features !== undefined) body.features = params.features;
    if (params.theme !== undefined) body.theme = params.theme;
    if (params.videoLayoutMode !== undefined) body.video_layout_mode = params.videoLayoutMode;
    if (params.locale !== undefined) body.locale = params.locale;
    if (params.server !== undefined) body.server = params.server;
    if (params.sessionTags !== undefined) body.session_tags = params.sessionTags;
    if (params.spaceTags !== undefined) body.space_tags = params.spaceTags;
    if (params.inviteUrl !== undefined) body.invite_url = params.inviteUrl;
    if (params.resourceUrl !== undefined) body.resource_url = params.resourceUrl;
    if (params.authExternal !== undefined) body.auth_external = params.authExternal;

    let response = await http.post('spaces/launch/', body, {
      headers: this.headers()
    });

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
    let queryParams: Record<string, any> = {};

    if (params.search) queryParams.search = params.search;
    if (params.page) queryParams.page = params.page;
    if (params.includeSingleUser !== undefined)
      queryParams.include_single_user = params.includeSingleUser;
    if (params.durationMin !== undefined) queryParams.duration_min = params.durationMin;
    if (params.durationMax !== undefined) queryParams.duration_max = params.durationMax;
    if (params.startTimeAfter) queryParams.start_time_after = params.startTimeAfter;
    if (params.startTimeBefore) queryParams.start_time_before = params.startTimeBefore;
    if (params.endTimeAfter) queryParams.end_time_after = params.endTimeAfter;
    if (params.endTimeBefore) queryParams.end_time_before = params.endTimeBefore;
    if (params.dateAfter) queryParams.date_after = params.dateAfter;
    if (params.dateBefore) queryParams.date_before = params.dateBefore;
    if (params.user) queryParams.user = params.user;
    if (params.space) queryParams.space = params.space;
    if (params.launchId) queryParams.launch_id = params.launchId;
    if (params.inProgressOnly !== undefined)
      queryParams.in_progress_only = params.inProgressOnly;
    if (params.tags) queryParams.tags = params.tags;
    if (params.userExternalId) queryParams.user_external_id = params.userExternalId;
    if (params.userName) queryParams.user_name = params.userName;

    let response = await http.get(`organisations/${this.organisationId}/sessions/`, {
      headers: this.headers(),
      params: queryParams
    });

    return this.mapPaginatedSessions(response.data);
  }

  async getSession(sessionUuid: string): Promise<SessionData> {
    let response = await http.get(
      `organisations/${this.organisationId}/sessions/${sessionUuid}/`,
      {
        headers: this.headers()
      }
    );

    return this.mapSession(response.data);
  }

  async updateSession(sessionUuid: string, params: UpdateSessionParams): Promise<SessionData> {
    let body: Record<string, any> = {
      name: params.name
    };
    if (params.recordingAccessPolicy !== undefined) {
      body.recording_access_policy = params.recordingAccessPolicy;
    }

    let response = await http.patch(
      `organisations/${this.organisationId}/sessions/${sessionUuid}/`,
      body,
      {
        headers: this.headers()
      }
    );

    return this.mapSession(response.data);
  }

  async getPlaybackUrl(sessionUuid: string): Promise<PlaybackResponse> {
    let response = await http.get(
      `organisations/${this.organisationId}/sessions/${sessionUuid}/playback/`,
      {
        headers: this.headers()
      }
    );

    return {
      recordingUrl: response.data.recording_url
    };
  }

  async getTranscript(
    sessionUuid: string,
    params: { search?: string; page?: number } = {}
  ): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params.search) queryParams.search = params.search;
    if (params.page) queryParams.page = params.page;

    let response = await http.get(
      `organisations/${this.organisationId}/sessions/${sessionUuid}/transcript/`,
      {
        headers: this.headers(),
        params: queryParams
      }
    );

    return response.data;
  }

  async listSpaces(params: ListSpacesParams = {}): Promise<PaginatedResponse<SpaceData>> {
    let queryParams: Record<string, any> = {};

    if (params.session) queryParams.session = params.session;
    if (params.tagKey) queryParams.tag_key = params.tagKey;
    if (params.tagValue) queryParams.tag_value = params.tagValue;
    if (params.user) queryParams.user = params.user;
    if (params.assignedTo !== undefined) queryParams.assigned_to = params.assignedTo;
    if (params.search) queryParams.search = params.search;
    if (params.page) queryParams.page = params.page;
    if (params.dateAfter) queryParams.date_after = params.dateAfter;
    if (params.dateBefore) queryParams.date_before = params.dateBefore;

    let response = await http.get(`organisations/${this.organisationId}/spaces/`, {
      headers: this.headers(),
      params: queryParams
    });

    let data = response.data;
    return {
      count: data.count,
      next: data.next,
      previous: data.previous,
      results: data.results.map((s: any) => this.mapSpace(s))
    };
  }

  async listUsers(params: ListUsersParams = {}): Promise<PaginatedResponse<OrganisationUser>> {
    let queryParams: Record<string, any> = {};

    if (params.role) queryParams.role = params.role;
    if (params.space) queryParams.space = params.space;
    if (params.session) queryParams.session = params.session;
    if (params.search) queryParams.search = params.search;
    if (params.page) queryParams.page = params.page;

    let response = await http.get(`organisations/${this.organisationId}/users/`, {
      headers: this.headers(),
      params: queryParams
    });

    let data = response.data;
    return {
      count: data.count,
      next: data.next,
      previous: data.previous,
      results: data.results.map((u: any) => ({
        user: {
          id: u.user?.id,
          username: u.user?.username
        },
        role: u.role,
        active: u.active,
        name: u.name,
        externalId: u.external_id,
        url: u.url
      }))
    };
  }

  async removeUser(userId: number): Promise<void> {
    await http.delete(`organisations/${this.organisationId}/users/${userId}/`, {
      headers: this.headers()
    });
  }

  async listSpaceSessions(
    spaceUuid: string,
    params: ListSessionsParams = {}
  ): Promise<PaginatedResponse<SessionData>> {
    let queryParams: Record<string, any> = {};

    if (params.search) queryParams.search = params.search;
    if (params.page) queryParams.page = params.page;
    if (params.includeSingleUser !== undefined)
      queryParams.include_single_user = params.includeSingleUser;
    if (params.durationMin !== undefined) queryParams.duration_min = params.durationMin;
    if (params.durationMax !== undefined) queryParams.duration_max = params.durationMax;
    if (params.startTimeAfter) queryParams.start_time_after = params.startTimeAfter;
    if (params.startTimeBefore) queryParams.start_time_before = params.startTimeBefore;
    if (params.inProgressOnly !== undefined)
      queryParams.in_progress_only = params.inProgressOnly;

    let response = await http.get(`spaces/${spaceUuid}/sessions/`, {
      headers: this.headers(),
      params: queryParams
    });

    return this.mapPaginatedSessions(response.data);
  }

  private mapPaginatedSessions(data: any): PaginatedResponse<SessionData> {
    return {
      count: data.count,
      next: data.next,
      previous: data.previous,
      results: data.results.map((s: any) => this.mapSession(s))
    };
  }

  private mapSession(s: any): SessionData {
    return {
      id: s.id,
      name: s.name,
      uuid: s.uuid,
      startTime: s.start_time,
      endTime: s.end_time,
      profiles: (s.profiles || []).map((p: any) => ({
        user: p.user,
        name: p.name,
        email: p.email,
        role: p.role
      })),
      guests: (s.guests || []).map((g: any) => ({
        socketId: g.socket_id ?? g.socketId,
        name: g.name
      })),
      billableSeconds: s.billable_seconds,
      tags: s.tags,
      recordingAccessPolicy: s.recording_access_policy,
      summary: s.summary,
      playbackUrl: s.playback_url,
      recordingDeleted: s.recording_deleted,
      recordingAvailable: s.recording_available,
      playbackPassword: s.playback_password,
      isPasswordSet: s.is_password_set,
      space: s.space ? this.mapSpace(s.space) : undefined
    };
  }

  private mapSpace(s: any): SpaceData {
    return {
      id: s.id,
      alias: s.alias,
      slug: s.slug,
      name: s.name,
      organisation: s.organisation,
      isLocked: s.is_locked,
      tags: s.tags,
      url: s.url,
      createdAt: s.created_at,
      region: s.region,
      recordAv: s.record_av,
      transcribe: s.transcribe,
      summarise: s.summarise
    };
  }
}
