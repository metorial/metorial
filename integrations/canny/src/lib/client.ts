import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://canny.io/api'
});

export class CannyClient {
  constructor(private token: string) {}

  private async post<T = any>(path: string, data: Record<string, any> = {}): Promise<T> {
    let response = await http.post(path, {
      apiKey: this.token,
      ...data
    });
    return response.data;
  }

  // ── Boards ──

  async retrieveBoard(boardId: string) {
    return this.post('/v1/boards/retrieve', { id: boardId });
  }

  async listBoards() {
    return this.post<{ boards: any[] }>('/v1/boards/list');
  }

  // ── Posts ──

  async createPost(params: {
    authorID: string;
    boardID: string;
    title: string;
    details?: string;
    categoryID?: string;
    customFields?: Record<string, any>;
    eta?: string;
    etaPublic?: boolean;
    imageURLs?: string[];
    ownerID?: string;
    byID?: string;
    createdAt?: string;
  }) {
    return this.post('/v1/posts/create', params);
  }

  async retrievePost(params: { id?: string; boardID?: string; urlName?: string }) {
    return this.post('/v1/posts/retrieve', params);
  }

  async listPosts(
    params: {
      boardID?: string;
      authorID?: string;
      companyID?: string;
      tagIDs?: string[];
      limit?: number;
      search?: string;
      skip?: number;
      sort?: string;
      status?: string;
    } = {}
  ) {
    return this.post<{ posts: any[]; hasMore: boolean }>('/v1/posts/list', params);
  }

  async updatePost(params: {
    postID: string;
    title?: string;
    details?: string;
    eta?: string;
    etaPublic?: boolean;
    customFields?: Record<string, any>;
    imageURLs?: string[];
  }) {
    return this.post('/v1/posts/update', params);
  }

  async deletePost(postId: string) {
    return this.post('/v1/posts/delete', { postID: postId });
  }

  async changePostStatus(params: {
    postID: string;
    changerID: string;
    status: string;
    shouldNotifyVoters?: boolean;
    commentValue?: string;
    commentImageURLs?: string[];
  }) {
    return this.post('/v1/posts/change_status', params);
  }

  async changePostBoard(postId: string, boardId: string) {
    return this.post('/v1/posts/change_board', { postID: postId, boardID: boardId });
  }

  async changePostCategory(postId: string, categoryId: string | null) {
    return this.post('/v1/posts/change_category', { postID: postId, categoryID: categoryId });
  }

  async mergePosts(params: { mergePostID: string; intoPostID: string; mergerID: string }) {
    return this.post('/v1/posts/merge', params);
  }

  async addTagToPost(postId: string, tagId: string) {
    return this.post('/v1/posts/add_tag', { postID: postId, tagID: tagId });
  }

  async removeTagFromPost(postId: string, tagId: string) {
    return this.post('/v1/posts/remove_tag', { postID: postId, tagID: tagId });
  }

  async linkJiraIssue(postId: string, issueKey: string) {
    return this.post('/v1/posts/link_jira', { postID: postId, issueKey });
  }

  async unlinkJiraIssue(postId: string, issueKey: string) {
    return this.post('/v1/posts/unlink_jira', { postID: postId, issueKey });
  }

  // ── Comments ──

  async createComment(params: {
    authorID: string;
    postID: string;
    value: string;
    imageURLs?: string[];
    parentID?: string;
    internal?: boolean;
    shouldNotifyVoters?: boolean;
    createdAt?: string;
  }) {
    return this.post('/v1/comments/create', params);
  }

  async retrieveComment(commentId: string) {
    return this.post('/v1/comments/retrieve', { id: commentId });
  }

  async listComments(
    params: {
      boardID?: string;
      postID?: string;
      authorID?: string;
      companyID?: string;
      limit?: number;
      cursor?: string;
    } = {}
  ) {
    return this.post<{ items: any[]; cursor: string; hasNextPage: boolean }>(
      '/v2/comments/list',
      params
    );
  }

  async deleteComment(commentId: string) {
    return this.post('/v1/comments/delete', { commentID: commentId });
  }

  // ── Votes ──

  async createVote(params: { voterID: string; postID: string; byID?: string }) {
    return this.post('/v1/votes/create', params);
  }

  async retrieveVote(voteId: string) {
    return this.post('/v1/votes/retrieve', { id: voteId });
  }

  async listVotes(
    params: {
      boardID?: string;
      postID?: string;
      userID?: string;
      companyID?: string;
      limit?: number;
      skip?: number;
    } = {}
  ) {
    return this.post<{ votes: any[]; hasMore: boolean }>('/v1/votes/list', params);
  }

  async deleteVote(voteId: string) {
    return this.post('/v1/votes/delete', { voteID: voteId });
  }

  // ── Users ──

  async createOrUpdateUser(params: {
    userID?: string;
    email?: string;
    name: string;
    avatarURL?: string;
    companies?: Array<{
      id: string;
      name?: string;
      monthlySpend?: number;
      customFields?: Record<string, any>;
      created?: string;
    }>;
    customFields?: Record<string, any>;
    created?: string;
  }) {
    return this.post('/v1/users/create_or_update', params);
  }

  async retrieveUser(params: { id?: string; userID?: string; email?: string }) {
    return this.post('/v1/users/retrieve', params);
  }

  async listUsers(params: { limit?: number; cursor?: string } = {}) {
    return this.post<{ items: any[]; cursor: string; hasNextPage: boolean }>(
      '/v2/users/list',
      params
    );
  }

  async deleteUser(userId: string) {
    return this.post('/v1/users/delete', { userID: userId });
  }

  async removeUserFromCompany(userId: string, companyId: string) {
    return this.post('/v1/users/remove_from_company', {
      userID: userId,
      companyID: companyId
    });
  }

  // ── Companies ──

  async listCompanies(
    params: { limit?: number; cursor?: string; search?: string; segment?: string } = {}
  ) {
    return this.post<{ companies: any[]; cursor: string; hasNextPage: boolean }>(
      '/v2/companies/list',
      params
    );
  }

  async updateCompany(params: {
    id: string;
    name?: string;
    customFields?: Record<string, any>;
    monthlySpend?: number;
    created?: string;
  }) {
    return this.post('/v1/companies/update', params);
  }

  async deleteCompany(companyId: string) {
    return this.post('/v1/companies/delete', { companyID: companyId });
  }

  // ── Categories ──

  async createCategory(params: {
    boardID: string;
    name: string;
    parentID?: string;
    subscribeAdmins?: boolean;
  }) {
    return this.post('/v1/categories/create', params);
  }

  async retrieveCategory(categoryId: string) {
    return this.post('/v1/categories/retrieve', { id: categoryId });
  }

  async listCategories(params: { boardID: string; limit?: number; skip?: number }) {
    return this.post<{ categories: any[]; hasMore: boolean }>('/v1/categories/list', params);
  }

  async deleteCategory(categoryId: string) {
    return this.post('/v1/categories/delete', { categoryID: categoryId });
  }

  // ── Tags ──

  async createTag(params: { boardID: string; name: string }) {
    return this.post('/v1/tags/create', params);
  }

  async retrieveTag(tagId: string) {
    return this.post('/v1/tags/retrieve', { id: tagId });
  }

  async listTags(params: { boardID: string; limit?: number; skip?: number }) {
    return this.post<{ tags: any[]; hasMore: boolean }>('/v1/tags/list', params);
  }

  // ── Changelog Entries ──

  async createChangelogEntry(params: {
    title: string;
    details: string;
    type?: string;
    notify?: boolean;
    published?: boolean;
    publishedOn?: string;
    scheduledFor?: string;
    labelIDs?: string[];
    postIDs?: string[];
  }) {
    return this.post('/v1/entries/create', params);
  }

  async listChangelogEntries(
    params: {
      labelIDs?: string[];
      limit?: number;
      skip?: number;
      sort?: string;
      type?: string;
    } = {}
  ) {
    return this.post<{ entries: any[]; hasMore: boolean }>('/v1/entries/list', params);
  }

  // ── Status Changes ──

  async listStatusChanges(params: { boardID?: string; limit?: number; skip?: number } = {}) {
    return this.post<{ statusChanges: any[]; hasMore: boolean }>(
      '/v1/status_changes/list',
      params
    );
  }

  // ── Opportunities ──

  async listOpportunities(params: { limit?: number; skip?: number } = {}) {
    return this.post<{ opportunities: any[]; hasMore: boolean }>(
      '/v1/opportunities/list',
      params
    );
  }

  // ── Autopilot ──

  async enqueueFeedback(params: {
    content: string;
    sourceType?: string;
    sourceURL?: string;
    userID?: string;
    companyID?: string;
  }) {
    return this.post('/v1/autopilot/enqueue_feedback', params);
  }
}
