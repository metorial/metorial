import { createAxios } from 'slates';

export class Client {
  private baseUrl: string;
  private token: string;

  constructor(config: { baseUrl: string; token: string }) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.token = config.token;
  }

  private get axios() {
    return createAxios({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Token ${this.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  private async rpc<T = any>(method: string, data?: Record<string, any>): Promise<T> {
    let response = await this.axios.post(`/api/main/methods/${method}`, data ?? {});
    return response.data;
  }

  private async rpcGet<T = any>(method: string, params?: Record<string, any>): Promise<T> {
    let response = await this.axios.get(`/api/main/methods/${method}`, { params });
    return response.data;
  }

  // ─── Profile ─────────────────────────────────────────────────

  async getProfile(): Promise<any> {
    return this.rpcGet('get-profile');
  }

  async updateProfile(data: {
    fullname?: string;
    lang?: string;
    theme?: string;
  }): Promise<any> {
    return this.rpc('update-profile', data);
  }

  // ─── Teams ───────────────────────────────────────────────────

  async getTeams(): Promise<any[]> {
    return this.rpcGet('get-teams');
  }

  async getTeam(params: { id?: string; fileId?: string }): Promise<any> {
    let data: Record<string, any> = {};
    if (params.id) data.id = params.id;
    if (params.fileId) data['file-id'] = params.fileId;
    return this.rpcGet('get-team', data);
  }

  async createTeam(name: string): Promise<any> {
    return this.rpc('create-team', { name });
  }

  async updateTeam(teamId: string, name: string): Promise<any> {
    return this.rpc('update-team', { id: teamId, name });
  }

  async deleteTeam(teamId: string): Promise<any> {
    return this.rpc('delete-team', { id: teamId });
  }

  async getTeamMembers(teamId: string): Promise<any[]> {
    return this.rpcGet('get-team-members', { 'team-id': teamId });
  }

  async getTeamStats(teamId: string): Promise<any> {
    return this.rpcGet('get-team-stats', { 'team-id': teamId });
  }

  async getTeamInvitations(teamId: string): Promise<any[]> {
    return this.rpcGet('get-team-invitations', { 'team-id': teamId });
  }

  async createTeamInvitations(
    teamId: string,
    invitations: Array<{ email: string; role: string }>
  ): Promise<any> {
    return this.rpc('create-team-invitations', {
      'team-id': teamId,
      invitations
    });
  }

  async updateTeamMemberRole(teamId: string, memberId: string, role: string): Promise<any> {
    return this.rpc('update-team-member-role', {
      'team-id': teamId,
      'member-id': memberId,
      role
    });
  }

  async deleteTeamMember(teamId: string, memberId: string): Promise<any> {
    return this.rpc('delete-team-member', {
      'team-id': teamId,
      'member-id': memberId
    });
  }

  async deleteTeamInvitation(teamId: string, email: string): Promise<any> {
    return this.rpc('delete-team-invitation', {
      'team-id': teamId,
      email
    });
  }

  // ─── Projects ────────────────────────────────────────────────

  async getProjects(teamId: string): Promise<any[]> {
    return this.rpcGet('get-projects', { 'team-id': teamId });
  }

  async getProject(projectId: string): Promise<any> {
    return this.rpcGet('get-project', { id: projectId });
  }

  async createProject(teamId: string, name: string): Promise<any> {
    return this.rpc('create-project', { 'team-id': teamId, name });
  }

  async renameProject(projectId: string, name: string): Promise<any> {
    return this.rpc('rename-project', { id: projectId, name });
  }

  async deleteProject(projectId: string): Promise<any> {
    return this.rpc('delete-project', { id: projectId });
  }

  async updateProjectPin(teamId: string, projectId: string, isPinned: boolean): Promise<any> {
    return this.rpc('update-project-pin', {
      'team-id': teamId,
      id: projectId,
      'is-pinned': isPinned
    });
  }

  // ─── Files ───────────────────────────────────────────────────

  async createFile(projectId: string, name: string, isShared?: boolean): Promise<any> {
    let data: Record<string, any> = { 'project-id': projectId, name };
    if (isShared !== undefined) data['is-shared'] = isShared;
    return this.rpc('create-file', data);
  }

  async getFile(fileId: string): Promise<any> {
    return this.rpcGet('get-file', { id: fileId });
  }

  async getProjectFiles(projectId: string): Promise<any[]> {
    return this.rpcGet('get-project-files', { 'project-id': projectId });
  }

  async getTeamRecentFiles(teamId: string): Promise<any[]> {
    return this.rpcGet('get-team-recent-files', { 'team-id': teamId });
  }

  async searchFiles(teamId: string, searchTerm?: string): Promise<any[]> {
    let params: Record<string, any> = { 'team-id': teamId };
    if (searchTerm) params['search-term'] = searchTerm;
    return this.rpcGet('search-files', params);
  }

  async renameFile(fileId: string, name: string): Promise<any> {
    return this.rpc('rename-file', { id: fileId, name });
  }

  async deleteFile(fileId: string): Promise<any> {
    return this.rpc('delete-file', { id: fileId });
  }

  async setFileShared(fileId: string, isShared: boolean): Promise<any> {
    return this.rpc('set-file-shared', { id: fileId, 'is-shared': isShared });
  }

  async getTeamSharedFiles(teamId: string): Promise<any[]> {
    return this.rpcGet('get-team-shared-files', { 'team-id': teamId });
  }

  async getFileSummary(fileId: string): Promise<any> {
    return this.rpcGet('get-file-summary', { id: fileId });
  }

  // ─── File Updates (Pages, Shapes, Components) ───────────────

  async updateFile(
    fileId: string,
    sessionId: string,
    revn: number,
    vern: number,
    changes: any[]
  ): Promise<any> {
    return this.rpc('update-file', {
      id: fileId,
      'session-id': sessionId,
      revn,
      vern,
      changes
    });
  }

  // ─── Pages ───────────────────────────────────────────────────

  async getPage(fileId: string, pageId?: string): Promise<any> {
    let params: Record<string, any> = { 'file-id': fileId };
    if (pageId) params['page-id'] = pageId;
    return this.rpcGet('get-page', params);
  }

  // ─── Comments ────────────────────────────────────────────────

  async getCommentThreads(params: { fileId?: string; teamId?: string }): Promise<any[]> {
    let data: Record<string, any> = {};
    if (params.fileId) data['file-id'] = params.fileId;
    if (params.teamId) data['team-id'] = params.teamId;
    return this.rpcGet('get-comment-threads', data);
  }

  async getComments(threadId: string): Promise<any[]> {
    return this.rpcGet('get-comments', { 'thread-id': threadId });
  }

  async createCommentThread(
    fileId: string,
    pageId: string,
    content: string,
    position: { x: number; y: number },
    frameId: string
  ): Promise<any> {
    return this.rpc('create-comment-thread', {
      'file-id': fileId,
      'page-id': pageId,
      content,
      position,
      'frame-id': frameId
    });
  }

  async createComment(threadId: string, content: string): Promise<any> {
    return this.rpc('create-comment', {
      'thread-id': threadId,
      content
    });
  }

  async updateComment(commentId: string, content: string): Promise<any> {
    return this.rpc('update-comment', { id: commentId, content });
  }

  async deleteComment(commentId: string): Promise<any> {
    return this.rpc('delete-comment', { id: commentId });
  }

  async updateCommentThread(threadId: string, isResolved: boolean): Promise<any> {
    return this.rpc('update-comment-thread', { id: threadId, 'is-resolved': isResolved });
  }

  async deleteCommentThread(threadId: string): Promise<any> {
    return this.rpc('delete-comment-thread', { id: threadId });
  }

  // ─── Libraries ───────────────────────────────────────────────

  async getFileLibraries(fileId: string): Promise<any> {
    return this.rpcGet('get-file-libraries', { 'file-id': fileId });
  }

  async linkFileToLibrary(fileId: string, libraryId: string): Promise<any> {
    return this.rpc('link-file-to-library', {
      'file-id': fileId,
      'library-id': libraryId
    });
  }

  async unlinkFileFromLibrary(fileId: string, libraryId: string): Promise<any> {
    return this.rpc('unlink-file-from-library', {
      'file-id': fileId,
      'library-id': libraryId
    });
  }

  // ─── Media ───────────────────────────────────────────────────

  async createFileMediaObjectFromUrl(
    fileId: string,
    url: string,
    isLocal: boolean,
    name?: string
  ): Promise<any> {
    let data: Record<string, any> = {
      'file-id': fileId,
      'is-local': isLocal,
      url
    };
    if (name) data.name = name;
    return this.rpc('create-file-media-object-from-url', data);
  }

  // ─── Webhooks ────────────────────────────────────────────────

  async getWebhooks(teamId: string): Promise<any[]> {
    return this.rpcGet('get-webhooks', { 'team-id': teamId });
  }

  async createWebhook(
    teamId: string,
    uri: string,
    mtype: string = 'application/json'
  ): Promise<any> {
    return this.rpc('create-webhook', {
      'team-id': teamId,
      uri,
      mtype
    });
  }

  async updateWebhook(
    webhookId: string,
    uri: string,
    mtype: string,
    isActive: boolean
  ): Promise<any> {
    return this.rpc('update-webhook', {
      id: webhookId,
      uri,
      mtype,
      'is-active': isActive
    });
  }

  async deleteWebhook(webhookId: string): Promise<any> {
    return this.rpc('delete-webhook', { id: webhookId });
  }

  // ─── File Export ─────────────────────────────────────────────

  async exportBinfile(
    fileId: string,
    includeLibraries: boolean,
    embedAssets: boolean
  ): Promise<any> {
    return this.rpc('export-binfile', {
      'file-id': fileId,
      'include-libraries': includeLibraries,
      'embed-assets': embedAssets
    });
  }

  // ─── File Object Thumbnails ──────────────────────────────────

  async getFileObjectThumbnails(fileId: string): Promise<any> {
    return this.rpcGet('get-file-object-thumbnails', { 'file-id': fileId });
  }

  // ─── Snapshots ───────────────────────────────────────────────

  async getFileSnapshots(fileId: string): Promise<any[]> {
    return this.rpcGet('get-file-snapshots', { 'file-id': fileId });
  }

  async createFileSnapshot(fileId: string, label?: string): Promise<any> {
    let data: Record<string, any> = { 'file-id': fileId };
    if (label) data.label = label;
    return this.rpc('create-file-snapshot', data);
  }

  async restoreFileSnapshot(fileId: string, snapshotId: string): Promise<any> {
    return this.rpc('restore-file-snapshot', { 'file-id': fileId, id: snapshotId });
  }
}
