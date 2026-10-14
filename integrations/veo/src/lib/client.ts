import { buildApiServiceError, createApiServiceError, createAuthenticatedAxios } from 'slates';
import { z } from 'zod';

let getBaseUrl = (environment: string) =>
  environment === 'development' ? 'https://apiuat.veo.co.uk/api' : 'https://api.veo.co.uk/api';

export interface PaginationParams {
  pageSize?: number;
  pageNumber?: number;
  orderBy?: string;
  orderByDirection?: 'ASC' | 'DESC';
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItemCount: number;
}

export class Client {
  private http;

  constructor(opts: { token: string; environment: string }) {
    if (!opts.token) {
      throw createApiServiceError('VEO credentials are missing. Reconnect your account.');
    }
    this.http = createAuthenticatedAxios({
      baseURL: getBaseUrl(opts.environment),
      timeout: 30_000,
      authHeader: { value: `Bearer ${opts.token}` },
      errorAdapter: error =>
        buildApiServiceError(error, { providerLabel: 'VEO', reason: 'veo_api_error' })
    });
  }

  async getCurrentUser() {
    let response = await this.http.get('/me');
    return response.data;
  }

  async listOrganisations() {
    let response = await this.http.get('/me/organisations');
    return response.data;
  }

  async getVideo(videoId: string) {
    let response = await this.http.get(`/videos/${encodeURIComponent(videoId)}`);
    return response.data;
  }

  // ── Videos ──────────────────────────────────────────────────────────────

  async listVideos(params: {
    createdByMe?: boolean;
    pageSize?: number;
    pageNumber?: number;
    orderByDirection?: 'ASC' | 'DESC';
    orderBy?: string;
  }) {
    let response = await this.http.get('/videos/v3/get-all', {
      params: {
        createdByMe: params.createdByMe ?? true,
        pageSize: params.pageSize ?? 20,
        pageNumber: params.pageNumber ?? 1,
        orderByDirection: params.orderByDirection ?? 'DESC',
        orderBy: params.orderBy ?? 'UPLOADEDSTAMP'
      }
    });
    return response.data;
  }

  async createVideo(title: string, recordedStamp: string) {
    let response = await this.http.post('/videos/', {
      Title: title,
      RecordedStamp: recordedStamp
    });
    return response.data;
  }

  async getVideoUploadToken(videoId: string, mimeType: string) {
    let response = await this.http.get(`/videos/${encodeURIComponent(videoId)}/uploadtoken`, {
      params: { mimeType }
    });
    return response.data;
  }

  async getVideoDownloadToken(videoId: string) {
    let response = await this.http.get(`/videos/${encodeURIComponent(videoId)}/downloadtoken`);
    return response.data;
  }

  async downloadVideo(url: string) {
    let parsedUrl = z.url().safeParse(url);
    if (!parsedUrl.success || !url.startsWith('https://')) {
      throw createApiServiceError('VEO returned an invalid video download URL.');
    }
    let downloads = createAuthenticatedAxios({
      contentType: false,
      timeout: 120_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'VEO',
          operation: 'video download',
          reason: 'veo_download_error'
        })
    });
    return downloads.get(url, { responseType: 'stream' });
  }

  async getVideoTranscript(videoId: string) {
    let response = await this.http.get(`/videos/${encodeURIComponent(videoId)}/transcript`);
    return response.data;
  }

  // ── Users ───────────────────────────────────────────────────────────────

  async listUsers(params: {
    searchTerm?: string;
    organisationId?: string;
    pageSize?: number;
    pageNumber?: number;
    orderByDirection?: 'ASC' | 'DESC';
  }) {
    let response = await this.http.get('/users/get-all', {
      params: {
        SearchTerm: params.searchTerm,
        OrganisationId: params.organisationId,
        pageSize: params.pageSize ?? 20,
        pageNumber: params.pageNumber ?? 1,
        orderByDirection: params.orderByDirection ?? 'ASC'
      }
    });
    return response.data;
  }

  async createUser(data: {
    organisationId: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    roles: number[];
    regionId?: number;
  }) {
    let response = await this.http.post('/users/create', {
      OrganisationId: data.organisationId,
      FirstName: data.firstName,
      LastName: data.lastName,
      Email: data.email,
      Password: data.password,
      IsActive: true,
      Roles: data.roles,
      RegionId: data.regionId ?? 1,
      AcceptsPrivacyPolicy: true,
      AcceptsTermsAndConditions: true
    });
    return response.data;
  }

  async inviteUsers(data: {
    organisationId: string;
    users: Array<{
      email: string;
      isOrgAdmin?: boolean;
      communities?: number[];
    }>;
  }) {
    let response = await this.http.post('/userinvites/multiple', {
      OrganisationId: data.organisationId,
      Users: data.users.map(u => ({
        Email: u.email,
        IsOrgAdmin: u.isOrgAdmin ?? false,
        Communities: u.communities ?? []
      }))
    });
    return response.data;
  }

  async updateUser(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      password?: string;
      isActive?: boolean;
      roles?: Array<{ organisationId: string; roles: number[] }>;
    }
  ) {
    let body: Record<string, unknown> = {};
    if (data.firstName !== undefined) body.FirstName = data.firstName;
    if (data.lastName !== undefined) body.LastName = data.lastName;
    if (data.email !== undefined) body.Email = data.email;
    if (data.password !== undefined) body.Password = data.password;
    if (data.isActive !== undefined) body.IsActive = data.isActive;
    if (data.roles !== undefined) {
      body.Roles = data.roles.map(r => ({
        OrganisationId: r.organisationId,
        Roles: r.roles
      }));
    } else {
      let currentUser = await this.http.get('/user', { params: { id: userId } });
      let existingRoles = z
        .object({
          Roles: z.array(z.object({ OrganisationId: z.number(), RoleId: z.number() }))
        })
        .safeParse(currentUser.data);
      if (!existingRoles.success) {
        throw createApiServiceError(
          "VEO did not return the user's existing organisation roles. Supply roles explicitly to update the user."
        );
      }
      let rolesByOrganisation = new Map<number, number[]>();
      for (let assignment of existingRoles.data.Roles) {
        let roles = rolesByOrganisation.get(assignment.OrganisationId) ?? [];
        roles.push(assignment.RoleId);
        rolesByOrganisation.set(assignment.OrganisationId, roles);
      }
      body.Roles = Array.from(rolesByOrganisation, ([OrganisationId, Roles]) => ({
        OrganisationId,
        Roles
      }));
    }
    let response = await this.http.put(`/v2/users/${encodeURIComponent(userId)}`, body);
    return response.data;
  }

  async deleteUser(userId: string) {
    let response = await this.http.delete('/user', { params: { Id: userId } });
    return response.data;
  }

  // ── Groups / Communities ────────────────────────────────────────────────

  async listGroups(params: {
    name?: string;
    organisationId?: string;
    createdByMe?: boolean;
    pageSize?: number;
    pageNumber?: number;
  }) {
    let response = await this.http.get('/communities', {
      params: {
        name: params.name,
        OrganisationId: params.organisationId,
        createdByMe: params.createdByMe,
        pageSize: params.pageSize ?? 20,
        pageNumber: params.pageNumber ?? 1
      }
    });
    return response.data;
  }

  async getGroup(groupId: string) {
    let response = await this.http.get(`/communities/${encodeURIComponent(groupId)}`);
    return response.data;
  }

  async createGroup(data: {
    name: string;
    description: string;
    typeId: number;
    privacyLevelId?: number;
    visibilityId?: number;
    inviteTypeId?: number;
    postingPermissionTypeId?: number;
    commentPostsType?: boolean;
  }) {
    let response = await this.http.post('/communities', {
      Name: data.name,
      Description: data.description,
      TypeId: data.typeId,
      PrivacyLevelId: data.privacyLevelId ?? 1,
      VisibilityId: data.visibilityId ?? 3,
      InviteTypeId: data.inviteTypeId ?? 2,
      PostingPermissionTypeId: data.postingPermissionTypeId ?? 1,
      CommentPostsType: data.commentPostsType ?? true
    });
    return response.data;
  }

  async updateGroup(
    groupId: string,
    data: {
      name?: string;
      description?: string;
      typeId?: number;
      privacyLevelId?: number;
      visibilityId?: number;
      inviteTypeId?: number;
      postingPermissionTypeId?: number;
      commentPostsType?: boolean;
      featureActivity?: boolean;
      featureTimeline?: boolean;
      featureVideo?: boolean;
      featureFile?: boolean;
    }
  ) {
    let body: Record<string, unknown> = {};
    if (data.name !== undefined) body.Name = data.name;
    if (data.description !== undefined) body.Description = data.description;
    if (data.typeId !== undefined) body.TypeId = data.typeId;
    if (data.privacyLevelId !== undefined) body.PrivacyLevelId = data.privacyLevelId;
    if (data.visibilityId !== undefined) body.VisibilityId = data.visibilityId;
    if (data.inviteTypeId !== undefined) body.InviteTypeId = data.inviteTypeId;
    if (data.postingPermissionTypeId !== undefined)
      body.PostingPermissionTypeId = data.postingPermissionTypeId;
    if (data.commentPostsType !== undefined) body.CommentPostsType = data.commentPostsType;
    if (data.featureActivity !== undefined) body.FeatureActivity = data.featureActivity;
    if (data.featureTimeline !== undefined) body.FeatureTimeline = data.featureTimeline;
    if (data.featureVideo !== undefined) body.FeatureVideo = data.featureVideo;
    if (data.featureFile !== undefined) body.FeatureFile = data.featureFile;
    let response = await this.http.put(`/communities/${encodeURIComponent(groupId)}`, body);
    return response.data;
  }

  async deleteGroup(groupId: string) {
    let response = await this.http.delete(`/communities/${encodeURIComponent(groupId)}`);
    return response.data;
  }

  async getGroupMembers(groupId: string) {
    let response = await this.http.get(
      `/community/members/members/${encodeURIComponent(groupId)}`
    );
    return response.data;
  }

  async addGroupMember(groupId: string, userId: string, admin?: boolean) {
    let response = await this.http.post(
      `/community/${encodeURIComponent(groupId)}/members/addmember/${encodeURIComponent(userId)}`,
      null,
      { params: { admin: admin ?? false } }
    );
    return response.data;
  }

  // ── Comments ────────────────────────────────────────────────────────────

  async getVideoComments(videoId: string) {
    let response = await this.http.get(`/videos/${encodeURIComponent(videoId)}/comments`);
    return response.data;
  }

  async createVideoComment(videoId: string, message: string, parentCommentId?: number) {
    let body: Record<string, unknown> = { Message: message };
    if (parentCommentId !== undefined) body.ParentCommentId = parentCommentId;
    let response = await this.http.post(
      `/videos/${encodeURIComponent(videoId)}/comments`,
      body
    );
    return response.data;
  }

  async deleteVideoComment(videoId: string, commentId: string) {
    let response = await this.http.delete(
      `/videos/${encodeURIComponent(videoId)}/comments/${encodeURIComponent(commentId)}`
    );
    return response.data;
  }

  // ── Tag Session Notes ──────────────────────────────────────────────────

  async getTagSessionNotes(tagSessionId: string) {
    let response = await this.http.get(
      `/taggedvideo/${encodeURIComponent(tagSessionId)}/Notes`
    );
    return response.data;
  }

  async createTagSessionNote(
    taggedVideoId: string,
    tagId: string,
    message: string,
    parentCommentId?: number
  ) {
    let body: Record<string, unknown> = { Note: message };
    if (parentCommentId !== undefined) body.ParentNoteId = parentCommentId;
    let response = await this.http.post(
      `/taggedvideo/${encodeURIComponent(taggedVideoId)}/tags/${encodeURIComponent(tagId)}/Notes`,
      body
    );
    return response.data;
  }

  async deleteTagSessionNote(taggedVideoId: string, tagId: string, noteId: string) {
    let response = await this.http.delete(
      `/taggedvideo/${encodeURIComponent(taggedVideoId)}/tags/${encodeURIComponent(tagId)}/notes/${encodeURIComponent(noteId)}`
    );
    return response.data;
  }

  // ── Portfolios ─────────────────────────────────────────────────────────

  async listPortfolios(params?: PaginationParams) {
    let response = await this.http.get('/portfolios/v2/search', {
      params: {
        pageSize: params?.pageSize ?? 20,
        pageNumber: params?.pageNumber ?? 1,
        orderByDirection: params?.orderByDirection ?? 'DESC'
      }
    });
    return response.data;
  }

  async getPortfolio(portfolioId: string) {
    let response = await this.http.get(`/portfolios/${encodeURIComponent(portfolioId)}`);
    return response.data;
  }

  async createPortfolio(data: { name: string; description?: string }) {
    let body: Record<string, unknown> = { Title: data.name };
    if (data.description !== undefined) body.Description = data.description;
    let response = await this.http.post('/portfolios', body);
    return response.data;
  }

  async updatePortfolio(portfolioId: string, data: { name?: string; description?: string }) {
    let portfolio = await this.getPortfolio(portfolioId);
    let title = data.name ?? portfolio.Title ?? portfolio.title;
    if (typeof title !== 'string') {
      throw createApiServiceError(
        'VEO did not return the portfolio title. Supply name to update it.'
      );
    }
    let body: Record<string, unknown> = { Title: title };
    let description = data.description ?? portfolio.Description ?? portfolio.description;
    if (description !== undefined) body.Description = description;
    if (portfolio.Module !== undefined) body.Module = portfolio.Module;
    let response = await this.http.put(`/portfolios/${encodeURIComponent(portfolioId)}`, body);
    return response.data;
  }

  async deletePortfolio(portfolioId: string) {
    let response = await this.http.delete(`/portfolios/${encodeURIComponent(portfolioId)}`);
    return response.data;
  }
}
