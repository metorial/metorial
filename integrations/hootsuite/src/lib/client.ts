import { createAxios } from 'slates';

let BASE_URL = 'https://platform.hootsuite.com';

export class HootsuiteClient {
  private api: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.api = createAxios({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Me ----

  async getMe(): Promise<any> {
    let response = await this.api.get('/v1/me');
    return response.data.data;
  }

  async getMyOrganizations(): Promise<any[]> {
    let response = await this.api.get('/v1/me/organizations');
    return response.data.data || [];
  }

  // ---- Social Profiles ----

  async getSocialProfiles(): Promise<any[]> {
    let response = await this.api.get('/v1/socialProfiles');
    return response.data.data || [];
  }

  async getSocialProfile(socialProfileId: string): Promise<any> {
    let response = await this.api.get(`/v1/socialProfiles/${socialProfileId}`);
    return response.data.data;
  }

  async getSocialProfileTeams(socialProfileId: string): Promise<any[]> {
    let response = await this.api.get(`/v1/socialProfiles/${socialProfileId}/teams`);
    return response.data.data || [];
  }

  // ---- Messages ----

  async scheduleMessage(params: {
    text: string;
    socialProfileIds: string[];
    scheduledSendTime: string;
    mediaUrls?: { url: string }[];
    media?: { id: string; videoOptions?: any }[];
    tags?: string[];
    location?: { latitude: number; longitude: number };
    emailNotification?: boolean;
    webhookUrls?: string[];
    extendedInfo?: any[];
    privacy?: string;
    targeting?: any;
  }): Promise<any[]> {
    let response = await this.api.post('/v1/messages', params);
    return response.data.data || [];
  }

  async getMessage(messageId: string): Promise<any> {
    let response = await this.api.get(`/v1/messages/${messageId}`);
    return response.data.data;
  }

  async getMessages(params: {
    startTime: string;
    endTime: string;
    socialProfileIds?: string[];
    state?: string;
    limit?: number;
    cursor?: string;
    includeUnscheduledReviewMessages?: boolean;
  }): Promise<{ messages: any[]; cursor?: string }> {
    let queryParams: Record<string, string> = {
      startTime: params.startTime,
      endTime: params.endTime
    };

    if (params.socialProfileIds?.length) {
      queryParams.socialProfileIds = params.socialProfileIds.join(',');
    }
    if (params.state) queryParams.state = params.state;
    if (params.limit) queryParams.limit = String(params.limit);
    if (params.cursor) queryParams.cursor = params.cursor;
    if (params.includeUnscheduledReviewMessages !== undefined) {
      queryParams.includeUnscheduledReviewMessages = String(
        params.includeUnscheduledReviewMessages
      );
    }

    let response = await this.api.get('/v1/messages', { params: queryParams });
    return {
      messages: response.data.data || [],
      cursor: response.data.cursor
    };
  }

  async deleteMessage(messageId: string): Promise<void> {
    await this.api.delete(`/v1/messages/${messageId}`);
  }

  async approveMessage(messageId: string, sequenceNumber: number): Promise<any> {
    let response = await this.api.post(`/v1/messages/${messageId}/approve`, {
      sequenceNumber
    });
    return response.data.data;
  }

  async rejectMessage(
    messageId: string,
    sequenceNumber: number,
    reason?: string
  ): Promise<any> {
    let response = await this.api.post(`/v1/messages/${messageId}/reject`, {
      sequenceNumber,
      reason
    });
    return response.data.data;
  }

  // ---- Media ----

  async createMediaUploadUrl(
    sizeBytes: number,
    mimeType: string
  ): Promise<{
    uploadUrl: string;
    mediaId: string;
    uploadUrlDurationSeconds: number;
  }> {
    let response = await this.api.post('/v1/media', {
      sizeBytes,
      mimeType
    });
    let d = response.data.data;
    return {
      uploadUrl: d.uploadUrl,
      mediaId: d.id,
      uploadUrlDurationSeconds: d.uploadUrlDurationSeconds
    };
  }

  async getMediaUploadStatus(mediaId: string): Promise<any> {
    let response = await this.api.get(`/v1/media/${mediaId}`);
    return response.data.data;
  }

  // ---- Organizations ----

  async getOrganizationMembers(
    organizationId: string,
    cursor?: string
  ): Promise<{ members: any[]; cursor?: string }> {
    let params: Record<string, string> = {};
    if (cursor) params.cursor = cursor;

    let response = await this.api.get(`/v1/organizations/${organizationId}/members`, {
      params
    });
    return {
      members: response.data.data || [],
      cursor: response.data.cursor
    };
  }

  async getOrganizationMember(organizationId: string, memberId: string): Promise<any> {
    let response = await this.api.get(
      `/v1/organizations/${organizationId}/members/${memberId}`
    );
    return response.data.data;
  }

  async getOrganizationMemberPermissions(
    organizationId: string,
    memberId: string
  ): Promise<any> {
    let response = await this.api.get(
      `/v1/organizations/${organizationId}/members/${memberId}/permissions`
    );
    return response.data.data;
  }

  async inviteOrganizationMember(params: {
    organizationId: string;
    fullName: string;
    email: string;
    organizationIds?: string[];
    companyName?: string;
    bio?: string;
    timezone?: string;
  }): Promise<any> {
    let response = await this.api.post(`/v1/organizations/${params.organizationId}/members`, {
      fullName: params.fullName,
      email: params.email,
      organizationIds: params.organizationIds,
      companyName: params.companyName,
      bio: params.bio,
      timezone: params.timezone
    });
    return response.data.data;
  }

  async removeOrganizationMember(organizationId: string, memberId: string): Promise<void> {
    await this.api.delete(`/v1/organizations/${organizationId}/members/${memberId}`);
  }

  async getMemberTeams(organizationId: string, memberId: string): Promise<any[]> {
    let response = await this.api.get(
      `/v1/organizations/${organizationId}/members/${memberId}/teams`
    );
    return response.data.data || [];
  }

  async getMemberSocialProfiles(organizationId: string, memberId: string): Promise<any[]> {
    let response = await this.api.get(
      `/v1/organizations/${organizationId}/members/${memberId}/socialProfiles`
    );
    return response.data.data || [];
  }

  async getMemberSocialProfilePermissions(
    organizationId: string,
    memberId: string,
    socialProfileId: string
  ): Promise<any> {
    let response = await this.api.get(
      `/v1/organizations/${organizationId}/members/${memberId}/socialProfiles/${socialProfileId}/permissions`
    );
    return response.data.data;
  }

  // ---- Teams ----

  async getOrganizationTeams(
    organizationId: string,
    cursor?: string
  ): Promise<{ teams: any[]; cursor?: string }> {
    let params: Record<string, string> = {};
    if (cursor) params.cursor = cursor;

    let response = await this.api.get(`/v1/organizations/${organizationId}/teams`, { params });
    return {
      teams: response.data.data || [],
      cursor: response.data.cursor
    };
  }

  async getTeam(teamId: string): Promise<any> {
    let response = await this.api.get(`/v1/teams/${teamId}`);
    return response.data.data;
  }

  async createTeam(organizationId: string, teamName: string): Promise<any> {
    let response = await this.api.post(`/v1/organizations/${organizationId}/teams`, {
      name: teamName
    });
    return response.data.data;
  }

  async getTeamMembers(
    teamId: string,
    cursor?: string
  ): Promise<{ members: any[]; cursor?: string }> {
    let params: Record<string, string> = {};
    if (cursor) params.cursor = cursor;

    let response = await this.api.get(`/v1/teams/${teamId}/members`, { params });
    return {
      members: response.data.data || [],
      cursor: response.data.cursor
    };
  }

  async addTeamMember(teamId: string, memberId: string): Promise<void> {
    await this.api.post(`/v1/teams/${teamId}/members`, {
      memberId
    });
  }

  async removeTeamMember(teamId: string, memberId: string): Promise<void> {
    await this.api.delete(`/v1/teams/${teamId}/members/${memberId}`);
  }

  async getTeamSocialProfiles(teamId: string, cursor?: string): Promise<any[]> {
    let params: Record<string, string> = {};
    if (cursor) params.cursor = cursor;

    let response = await this.api.get(`/v1/teams/${teamId}/socialProfiles`, { params });
    return response.data.data || [];
  }

  async getTeamMemberPermissions(teamId: string, memberId: string): Promise<any> {
    let response = await this.api.get(`/v1/teams/${teamId}/members/${memberId}/permissions`);
    return response.data.data;
  }

  // ---- Ow.ly Link Shortening ----

  async shortenLink(url: string): Promise<any> {
    let response = await this.api.post('/v1/owly/links', {
      url
    });
    return response.data.data;
  }
}
