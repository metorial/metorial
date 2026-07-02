import { createAxios } from 'slates';

export interface PaginatedResponse<T> {
  meta: {
    previous: string | null;
    next: string | null;
    offset: number;
    limit: number;
    total_count: number;
  };
  objects: T[];
}

export interface AmaraUser {
  username: string;
  id: string;
  uri: string;
}

export interface VideoData {
  id: string;
  title: string;
  description: string;
  duration: number | null;
  thumbnail: string;
  created: string;
  team: string | null;
  project: string | null;
  primary_audio_language_code: string | null;
  video_type: string;
  all_urls: string[];
  metadata: Record<string, string>;
  languages: Array<{
    code: string;
    name: string;
    published: boolean;
    dir: string;
    subtitles_uri: string;
    resource_uri: string;
  }>;
  activity_uri: string;
  urls_uri: string;
  subtitle_languages_uri: string;
  resource_uri: string;
}

export interface SubtitleLanguageData {
  language_code: string;
  name: string;
  is_primary_audio_language: boolean;
  is_rtl: boolean;
  resource_uri: string;
  created: string;
  title: string;
  description: string;
  metadata: Record<string, string>;
  subtitles_complete: boolean;
  subtitle_count: number;
  reviewer: AmaraUser | null;
  approver: AmaraUser | null;
  published: boolean;
  versions: Array<{
    author: AmaraUser;
    version_no: number;
    published: boolean;
  }>;
}

export interface SubtitleData {
  version_number: number;
  subtitles: any;
  sub_format: string;
  author: AmaraUser;
  language: {
    code: string;
    name: string;
    dir: string;
  };
  title: string;
  description: string;
  metadata: Record<string, string>;
  video_title: string;
  video_description: string;
  notes_uri: string;
  actions_uri: string;
  resource_uri: string;
  site_uri: string;
}

export interface TeamData {
  name: string;
  slug: string;
  type: string;
  description: string;
  team_visibility: string;
  video_visibility: string;
  is_visible: boolean;
  membership_policy: string;
  video_policy: string;
  activity_uri: string;
  members_uri: string;
  projects_uri: string;
  applications_uri: string;
  languages_uri: string;
  resource_uri: string;
}

export interface TeamMemberData {
  user: AmaraUser;
  role: string;
  resource_uri: string;
}

export interface ProjectData {
  name: string;
  slug: string;
  description: string;
  guidelines: string;
  created: string;
  modified: string;
  workflow_enabled: boolean;
  resource_uri: string;
}

export interface ApplicationData {
  user: AmaraUser;
  note: string;
  status: string;
  id: number;
  created: string;
  modified: string;
  resource_uri: string;
}

export interface ActivityData {
  type: string;
  date: string;
  user: AmaraUser | null;
  video: string | null;
  language: string | null;
  video_uri: string | null;
  language_uri: string | null;
  [key: string]: any;
}

export interface SubtitleRequestData {
  job_id: string;
  video: string;
  language: string;
  work_status: string;
  created: string;
  work_completed: string | null;
  subtitler: AmaraUser | null;
  reviewer: AmaraUser | null;
  approver: AmaraUser | null;
  video_uri: string;
  subtitles_uri: string;
  actions_uri: string;
  resource_uri: string;
}

export interface SubtitleAction {
  action: string;
  label: string;
  complete: boolean | null;
}

export interface SubtitleNote {
  user: AmaraUser;
  datetime: string;
  body: string;
}

export interface UserData {
  username: string;
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  homepage: string;
  biography: string;
  num_videos: number;
  languages: string[];
  avatar: string;
  activity_uri: string;
  resource_uri: string;
}

export interface NotificationData {
  number: number;
  url: string;
  data: Record<string, any>;
  timestamp: string;
  in_progress: boolean;
  response_status: number | null;
  error_message: string | null;
  resource_uri: string;
}

export class Client {
  private axios;

  constructor(private config: { token: string; username: string }) {
    this.axios = createAxios({
      baseURL: 'https://amara.org/api'
    });
  }

  private get headers() {
    return {
      'X-api-key': this.config.token,
      'X-api-username': this.config.username,
      'Content-Type': 'application/json'
    };
  }

  // ==================== Videos ====================

  async listVideos(params?: {
    team?: string;
    project?: string;
    videoUrl?: string;
    orderBy?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<VideoData>> {
    let query: Record<string, any> = {};
    if (params?.team) query.team = params.team;
    if (params?.project) query.project = params.project;
    if (params?.videoUrl) query.video_url = params.videoUrl;
    if (params?.orderBy) query.order_by = params.orderBy;
    if (params?.limit) query.limit = params.limit;
    if (params?.offset) query.offset = params.offset;

    let response = await this.axios.get('/videos/', {
      headers: this.headers,
      params: query
    });
    return response.data;
  }

  async getVideo(videoId: string): Promise<VideoData> {
    let response = await this.axios.get(`/videos/${videoId}/`, {
      headers: this.headers
    });
    return response.data;
  }

  async createVideo(data: {
    videoUrl: string;
    title?: string;
    description?: string;
    primaryAudioLanguageCode?: string;
    thumbnail?: string;
    metadata?: Record<string, string>;
    team?: string;
    project?: string;
  }): Promise<VideoData> {
    let body: Record<string, any> = {
      video_url: data.videoUrl
    };
    if (data.title) body.title = data.title;
    if (data.description) body.description = data.description;
    if (data.primaryAudioLanguageCode)
      body.primary_audio_language_code = data.primaryAudioLanguageCode;
    if (data.thumbnail) body.thumbnail = data.thumbnail;
    if (data.metadata) body.metadata = data.metadata;
    if (data.team) body.team = data.team;
    if (data.project) body.project = data.project;

    let response = await this.axios.post('/videos/', body, {
      headers: this.headers
    });
    return response.data;
  }

  async updateVideo(
    videoId: string,
    data: {
      title?: string;
      description?: string;
      primaryAudioLanguageCode?: string;
      thumbnail?: string;
      metadata?: Record<string, string>;
      team?: string;
      project?: string;
    }
  ): Promise<VideoData> {
    let body: Record<string, any> = {};
    if (data.title !== undefined) body.title = data.title;
    if (data.description !== undefined) body.description = data.description;
    if (data.primaryAudioLanguageCode !== undefined)
      body.primary_audio_language_code = data.primaryAudioLanguageCode;
    if (data.thumbnail !== undefined) body.thumbnail = data.thumbnail;
    if (data.metadata !== undefined) body.metadata = data.metadata;
    if (data.team !== undefined) body.team = data.team;
    if (data.project !== undefined) body.project = data.project;

    let response = await this.axios.put(`/videos/${videoId}/`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteVideo(videoId: string): Promise<void> {
    await this.axios.delete(`/videos/${videoId}/`, {
      headers: this.headers
    });
  }

  // ==================== Video URLs ====================

  async listVideoUrls(videoId: string): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get(`/videos/${videoId}/urls/`, {
      headers: this.headers
    });
    return response.data;
  }

  async addVideoUrl(
    videoId: string,
    data: {
      url: string;
      primary?: boolean;
      original?: boolean;
    }
  ): Promise<any> {
    let response = await this.axios.post(`/videos/${videoId}/urls/`, data, {
      headers: this.headers
    });
    return response.data;
  }

  // ==================== Subtitle Languages ====================

  async listSubtitleLanguages(
    videoId: string,
    params?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<PaginatedResponse<SubtitleLanguageData>> {
    let response = await this.axios.get(`/videos/${videoId}/languages/`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getSubtitleLanguage(
    videoId: string,
    languageCode: string
  ): Promise<SubtitleLanguageData> {
    let response = await this.axios.get(`/videos/${videoId}/languages/${languageCode}/`, {
      headers: this.headers
    });
    return response.data;
  }

  async createSubtitleLanguage(
    videoId: string,
    data: {
      languageCode: string;
      isPrimaryAudioLanguage?: boolean;
      subtitlesComplete?: boolean;
      softLimitLines?: number;
      softLimitMinDuration?: number;
      softLimitMaxDuration?: number;
      softLimitCpl?: number;
      softLimitCps?: number;
    }
  ): Promise<SubtitleLanguageData> {
    let body: Record<string, any> = {
      language_code: data.languageCode
    };
    if (data.isPrimaryAudioLanguage !== undefined)
      body.is_primary_audio_language = data.isPrimaryAudioLanguage;
    if (data.subtitlesComplete !== undefined) body.subtitles_complete = data.subtitlesComplete;
    if (data.softLimitLines !== undefined) body.soft_limit_lines = data.softLimitLines;
    if (data.softLimitMinDuration !== undefined)
      body.soft_limit_min_duration = data.softLimitMinDuration;
    if (data.softLimitMaxDuration !== undefined)
      body.soft_limit_max_duration = data.softLimitMaxDuration;
    if (data.softLimitCpl !== undefined) body.soft_limit_cpl = data.softLimitCpl;
    if (data.softLimitCps !== undefined) body.soft_limit_cps = data.softLimitCps;

    let response = await this.axios.post(`/videos/${videoId}/languages/`, body, {
      headers: this.headers
    });
    return response.data;
  }

  async updateSubtitleLanguage(
    videoId: string,
    languageCode: string,
    data: {
      isPrimaryAudioLanguage?: boolean;
      subtitlesComplete?: boolean;
      softLimitLines?: number;
      softLimitMinDuration?: number;
      softLimitMaxDuration?: number;
      softLimitCpl?: number;
      softLimitCps?: number;
    }
  ): Promise<SubtitleLanguageData> {
    let body: Record<string, any> = {};
    if (data.isPrimaryAudioLanguage !== undefined)
      body.is_primary_audio_language = data.isPrimaryAudioLanguage;
    if (data.subtitlesComplete !== undefined) body.subtitles_complete = data.subtitlesComplete;
    if (data.softLimitLines !== undefined) body.soft_limit_lines = data.softLimitLines;
    if (data.softLimitMinDuration !== undefined)
      body.soft_limit_min_duration = data.softLimitMinDuration;
    if (data.softLimitMaxDuration !== undefined)
      body.soft_limit_max_duration = data.softLimitMaxDuration;
    if (data.softLimitCpl !== undefined) body.soft_limit_cpl = data.softLimitCpl;
    if (data.softLimitCps !== undefined) body.soft_limit_cps = data.softLimitCps;

    let response = await this.axios.put(
      `/videos/${videoId}/languages/${languageCode}/`,
      body,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ==================== Subtitles ====================

  async getSubtitles(
    videoId: string,
    languageCode: string,
    params?: {
      subFormat?: string;
      versionNumber?: number;
    }
  ): Promise<SubtitleData> {
    let query: Record<string, any> = {};
    if (params?.subFormat) query.sub_format = params.subFormat;
    if (params?.versionNumber) query.version_number = params.versionNumber;

    let response = await this.axios.get(
      `/videos/${videoId}/languages/${languageCode}/subtitles/`,
      {
        headers: this.headers,
        params: query
      }
    );
    return response.data;
  }

  async downloadSubtitles(
    videoId: string,
    languageCode: string,
    format: string
  ): Promise<string> {
    let acceptMap: Record<string, string> = {
      dfxp: 'application/ttml+xml',
      srt: 'text/srt',
      vtt: 'text/vtt',
      sbv: 'text/sbv',
      ssa: 'text/ssa'
    };

    let accept = acceptMap[format] || 'text/srt';

    let response = await this.axios.get(
      `/videos/${videoId}/languages/${languageCode}/subtitles/`,
      {
        headers: {
          ...this.headers,
          Accept: accept
        }
      }
    );
    return response.data;
  }

  async createSubtitles(
    videoId: string,
    languageCode: string,
    data: {
      subtitles?: string;
      subtitlesUrl?: string;
      subFormat?: string;
      title?: string;
      description?: string;
      action?: string;
      isComplete?: boolean;
    }
  ): Promise<SubtitleData> {
    let body: Record<string, any> = {};
    if (data.subtitles !== undefined) body.subtitles = data.subtitles;
    if (data.subtitlesUrl !== undefined) body.subtitles_url = data.subtitlesUrl;
    if (data.subFormat !== undefined) body.sub_format = data.subFormat;
    if (data.title !== undefined) body.title = data.title;
    if (data.description !== undefined) body.description = data.description;
    if (data.action !== undefined) body.action = data.action;
    if (data.isComplete !== undefined) body.is_complete = data.isComplete;

    let response = await this.axios.post(
      `/videos/${videoId}/languages/${languageCode}/subtitles/`,
      body,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteSubtitles(videoId: string, languageCode: string): Promise<void> {
    await this.axios.delete(`/videos/${videoId}/languages/${languageCode}/subtitles/`, {
      headers: this.headers
    });
  }

  // ==================== Subtitle Actions ====================

  async listSubtitleActions(videoId: string, languageCode: string): Promise<SubtitleAction[]> {
    let response = await this.axios.get(
      `/videos/${videoId}/languages/${languageCode}/subtitles/actions/`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async performSubtitleAction(
    videoId: string,
    languageCode: string,
    action: string
  ): Promise<void> {
    await this.axios.post(
      `/videos/${videoId}/languages/${languageCode}/subtitles/actions/`,
      { action },
      {
        headers: this.headers
      }
    );
  }

  // ==================== Subtitle Notes ====================

  async listSubtitleNotes(
    videoId: string,
    languageCode: string
  ): Promise<PaginatedResponse<SubtitleNote>> {
    let response = await this.axios.get(
      `/videos/${videoId}/languages/${languageCode}/subtitles/notes/`,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async addSubtitleNote(
    videoId: string,
    languageCode: string,
    body: string
  ): Promise<SubtitleNote> {
    let response = await this.axios.post(
      `/videos/${videoId}/languages/${languageCode}/subtitles/notes/`,
      { body },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ==================== Teams ====================

  async listTeams(params?: {
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<TeamData>> {
    let response = await this.axios.get('/teams/', {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getTeam(teamSlug: string): Promise<TeamData> {
    let response = await this.axios.get(`/teams/${teamSlug}/`, {
      headers: this.headers
    });
    return response.data;
  }

  async createTeam(data: {
    name: string;
    slug: string;
    type?: string;
    description?: string;
    teamVisibility?: string;
    videoVisibility?: string;
    membershipPolicy?: string;
    videoPolicy?: string;
  }): Promise<TeamData> {
    let body: Record<string, any> = {
      name: data.name,
      slug: data.slug
    };
    if (data.type) body.type = data.type;
    if (data.description) body.description = data.description;
    if (data.teamVisibility) body.team_visibility = data.teamVisibility;
    if (data.videoVisibility) body.video_visibility = data.videoVisibility;
    if (data.membershipPolicy) body.membership_policy = data.membershipPolicy;
    if (data.videoPolicy) body.video_policy = data.videoPolicy;

    let response = await this.axios.post('/teams/', body, {
      headers: this.headers
    });
    return response.data;
  }

  async updateTeam(
    teamSlug: string,
    data: {
      name?: string;
      slug?: string;
      description?: string;
      teamVisibility?: string;
      videoVisibility?: string;
      membershipPolicy?: string;
      videoPolicy?: string;
    }
  ): Promise<TeamData> {
    let body: Record<string, any> = {};
    if (data.name !== undefined) body.name = data.name;
    if (data.slug !== undefined) body.slug = data.slug;
    if (data.description !== undefined) body.description = data.description;
    if (data.teamVisibility !== undefined) body.team_visibility = data.teamVisibility;
    if (data.videoVisibility !== undefined) body.video_visibility = data.videoVisibility;
    if (data.membershipPolicy !== undefined) body.membership_policy = data.membershipPolicy;
    if (data.videoPolicy !== undefined) body.video_policy = data.videoPolicy;

    let response = await this.axios.put(`/teams/${teamSlug}/`, body, {
      headers: this.headers
    });
    return response.data;
  }

  // ==================== Team Members ====================

  async listTeamMembers(
    teamSlug: string,
    params?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<PaginatedResponse<TeamMemberData>> {
    let response = await this.axios.get(`/teams/${teamSlug}/members/`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getTeamMember(teamSlug: string, userIdentifier: string): Promise<TeamMemberData> {
    let response = await this.axios.get(`/teams/${teamSlug}/members/${userIdentifier}/`, {
      headers: this.headers
    });
    return response.data;
  }

  async addTeamMember(
    teamSlug: string,
    data: {
      user: string;
      role?: string;
    }
  ): Promise<TeamMemberData> {
    let response = await this.axios.post(`/teams/${teamSlug}/members/`, data, {
      headers: this.headers
    });
    return response.data;
  }

  async updateTeamMember(
    teamSlug: string,
    userIdentifier: string,
    data: {
      role: string;
    }
  ): Promise<TeamMemberData> {
    let response = await this.axios.put(
      `/teams/${teamSlug}/members/${userIdentifier}/`,
      data,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async removeTeamMember(teamSlug: string, userIdentifier: string): Promise<void> {
    await this.axios.delete(`/teams/${teamSlug}/members/${userIdentifier}/`, {
      headers: this.headers
    });
  }

  // ==================== Projects ====================

  async listProjects(
    teamSlug: string,
    params?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<PaginatedResponse<ProjectData>> {
    let response = await this.axios.get(`/teams/${teamSlug}/projects/`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getProject(teamSlug: string, projectSlug: string): Promise<ProjectData> {
    let response = await this.axios.get(`/teams/${teamSlug}/projects/${projectSlug}/`, {
      headers: this.headers
    });
    return response.data;
  }

  async createProject(
    teamSlug: string,
    data: {
      name: string;
      slug: string;
      description?: string;
      guidelines?: string;
    }
  ): Promise<ProjectData> {
    let response = await this.axios.post(`/teams/${teamSlug}/projects/`, data, {
      headers: this.headers
    });
    return response.data;
  }

  async updateProject(
    teamSlug: string,
    projectSlug: string,
    data: {
      name?: string;
      description?: string;
      guidelines?: string;
    }
  ): Promise<ProjectData> {
    let response = await this.axios.put(`/teams/${teamSlug}/projects/${projectSlug}/`, data, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteProject(teamSlug: string, projectSlug: string): Promise<void> {
    await this.axios.delete(`/teams/${teamSlug}/projects/${projectSlug}/`, {
      headers: this.headers
    });
  }

  // ==================== Team Applications ====================

  async listApplications(
    teamSlug: string,
    params?: {
      status?: string;
      before?: string;
      after?: string;
      user?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<PaginatedResponse<ApplicationData>> {
    let response = await this.axios.get(`/teams/${teamSlug}/applications/`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getApplication(teamSlug: string, applicationId: number): Promise<ApplicationData> {
    let response = await this.axios.get(`/teams/${teamSlug}/applications/${applicationId}/`, {
      headers: this.headers
    });
    return response.data;
  }

  async updateApplication(
    teamSlug: string,
    applicationId: number,
    status: string
  ): Promise<ApplicationData> {
    let response = await this.axios.put(
      `/teams/${teamSlug}/applications/${applicationId}/`,
      { status },
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  // ==================== Team Language Preferences ====================

  async setPreferredLanguages(teamSlug: string, languages: string[]): Promise<void> {
    await this.axios.put(`/teams/${teamSlug}/languages/preferred/`, languages, {
      headers: this.headers
    });
  }

  async setBlacklistedLanguages(teamSlug: string, languages: string[]): Promise<void> {
    await this.axios.put(`/teams/${teamSlug}/languages/blacklisted/`, languages, {
      headers: this.headers
    });
  }

  // ==================== Subtitle Requests ====================

  async listSubtitleRequests(
    teamSlug: string,
    params?: {
      workStatus?: string;
      video?: string;
      videoTitle?: string;
      language?: string;
      project?: string;
      assignee?: string;
      sort?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<PaginatedResponse<SubtitleRequestData>> {
    let query: Record<string, any> = {};
    if (params?.workStatus) query.work_status = params.workStatus;
    if (params?.video) query.video = params.video;
    if (params?.videoTitle) query.video_title = params.videoTitle;
    if (params?.language) query.language = params.language;
    if (params?.project) query.project = params.project;
    if (params?.assignee) query.assignee = params.assignee;
    if (params?.sort) query.sort = params.sort;
    if (params?.limit) query.limit = params.limit;
    if (params?.offset) query.offset = params.offset;

    let response = await this.axios.get(`/teams/${teamSlug}/subtitle-requests/`, {
      headers: this.headers,
      params: query
    });
    return response.data;
  }

  async getSubtitleRequest(teamSlug: string, jobId: string): Promise<SubtitleRequestData> {
    let response = await this.axios.get(`/teams/${teamSlug}/subtitle-requests/${jobId}/`, {
      headers: this.headers
    });
    return response.data;
  }

  async createSubtitleRequest(
    teamSlug: string,
    data: {
      video: string;
      language: string;
    }
  ): Promise<SubtitleRequestData> {
    let response = await this.axios.post(`/teams/${teamSlug}/subtitle-requests/`, data, {
      headers: this.headers
    });
    return response.data;
  }

  async updateSubtitleRequest(
    teamSlug: string,
    jobId: string,
    data: {
      subtitler?: string | null;
      reviewer?: string | null;
      approver?: string | null;
      workStatus?: string;
    }
  ): Promise<SubtitleRequestData> {
    let body: Record<string, any> = {};
    if (data.subtitler !== undefined) body.subtitler = data.subtitler;
    if (data.reviewer !== undefined) body.reviewer = data.reviewer;
    if (data.approver !== undefined) body.approver = data.approver;
    if (data.workStatus !== undefined) body.work_status = data.workStatus;

    let response = await this.axios.put(
      `/teams/${teamSlug}/subtitle-requests/${jobId}/`,
      body,
      {
        headers: this.headers
      }
    );
    return response.data;
  }

  async deleteSubtitleRequest(teamSlug: string, jobId: string): Promise<void> {
    await this.axios.delete(`/teams/${teamSlug}/subtitle-requests/${jobId}/`, {
      headers: this.headers
    });
  }

  // ==================== Activity ====================

  async getVideoActivity(
    videoId: string,
    params?: {
      type?: string;
      user?: string;
      language?: string;
      before?: string;
      after?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<PaginatedResponse<ActivityData>> {
    let response = await this.axios.get(`/videos/${videoId}/activity/`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getTeamActivity(
    teamSlug: string,
    params?: {
      type?: string;
      user?: string;
      video?: string;
      language?: string;
      before?: string;
      after?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<PaginatedResponse<ActivityData>> {
    let response = await this.axios.get(`/teams/${teamSlug}/activity/`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getUserActivity(
    userIdentifier: string,
    params?: {
      type?: string;
      video?: string;
      language?: string;
      team?: string;
      before?: string;
      after?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<PaginatedResponse<ActivityData>> {
    let response = await this.axios.get(`/users/${userIdentifier}/activity/`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  // ==================== Users ====================

  async getUser(identifier: string): Promise<UserData> {
    let response = await this.axios.get(`/users/${identifier}/`, {
      headers: this.headers
    });
    return response.data;
  }

  async createUser(data: {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    allow3rdPartyLogin?: boolean;
    createLoginToken?: boolean;
    findUniqueUsername?: boolean;
  }): Promise<UserData & { email: string; api_key: string }> {
    let body: Record<string, any> = {
      username: data.username,
      email: data.email,
      password: data.password
    };
    if (data.firstName) body.first_name = data.firstName;
    if (data.lastName) body.last_name = data.lastName;
    if (data.allow3rdPartyLogin !== undefined)
      body.allow_3rd_party_login = data.allow3rdPartyLogin;
    if (data.createLoginToken !== undefined) body.create_login_token = data.createLoginToken;
    if (data.findUniqueUsername !== undefined)
      body.find_unique_username = data.findUniqueUsername;

    let response = await this.axios.post('/users/', body, {
      headers: this.headers
    });
    return response.data;
  }

  async updateUser(
    identifier: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
    }
  ): Promise<UserData> {
    let body: Record<string, any> = {};
    if (data.firstName !== undefined) body.first_name = data.firstName;
    if (data.lastName !== undefined) body.last_name = data.lastName;
    if (data.email !== undefined) body.email = data.email;

    let response = await this.axios.put(`/users/${identifier}/`, body, {
      headers: this.headers
    });
    return response.data;
  }

  // ==================== Messages ====================

  async sendMessage(data: {
    user?: string;
    team?: string;
    subject: string;
    content: string;
  }): Promise<void> {
    let body: Record<string, any> = {
      subject: data.subject,
      content: data.content
    };
    if (data.user) body.user = data.user;
    if (data.team) body.team = data.team;

    await this.axios.post('/message/', body, {
      headers: this.headers
    });
  }

  // ==================== Languages ====================

  async listLanguages(): Promise<any> {
    let response = await this.axios.get('/languages/', {
      headers: this.headers
    });
    return response.data;
  }

  // ==================== Team Notifications ====================

  async listNotifications(
    teamSlug: string,
    params?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<PaginatedResponse<NotificationData>> {
    let response = await this.axios.get(`/teams/${teamSlug}/notifications/`, {
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getNotification(teamSlug: string, number: number): Promise<NotificationData> {
    let response = await this.axios.get(`/teams/${teamSlug}/notifications/${number}/`, {
      headers: this.headers
    });
    return response.data;
  }
}
