import { createAxios } from '@slates/provider';
import { assertNoRedditJsonErrors, redditApiError } from './errors';

export let REDDIT_USER_AGENT = 'web:slates-integrations-reddit:0.2.0-rc.6 (by /u/slates)';

export class RedditClient {
  private http: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.http = createAxios({
      baseURL: 'https://oauth.reddit.com',
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': REDDIT_USER_AGENT
      }
    });

    this.http.interceptors.response.use(
      response => {
        let operation = [response.config.method?.toUpperCase(), response.config.url]
          .filter(Boolean)
          .join(' ');
        assertNoRedditJsonErrors(response.data, operation || 'request');
        return response;
      },
      error => Promise.reject(redditApiError(error))
    );
  }

  // ─── User ──────────────────────────────────────────────────────

  async getMe() {
    let response = await this.http.get('/api/v1/me');
    return response.data;
  }

  async getUserAbout(username: string) {
    let response = await this.http.get(`/user/${username}/about`);
    return response.data?.data ?? response.data;
  }

  async getUserPosts(
    username: string,
    params: {
      sort?: string;
      t?: string;
      limit?: number;
      after?: string;
      before?: string;
    } = {}
  ) {
    let response = await this.http.get(`/user/${username}/submitted`, { params });
    return response.data;
  }

  async getUserComments(
    username: string,
    params: {
      sort?: string;
      t?: string;
      limit?: number;
      after?: string;
      before?: string;
    } = {}
  ) {
    let response = await this.http.get(`/user/${username}/comments`, { params });
    return response.data;
  }

  async getUserTrophies(username: string) {
    let response = await this.http.get(`/api/v1/user/${username}/trophies`);
    return response.data;
  }

  async getUserListing(
    username: string,
    where:
      | 'overview'
      | 'submitted'
      | 'comments'
      | 'saved'
      | 'hidden'
      | 'upvoted'
      | 'downvoted'
      | 'gilded',
    params: {
      sort?: string;
      t?: string;
      limit?: number;
      after?: string;
      before?: string;
      show?: string;
    } = {}
  ) {
    let response = await this.http.get(`/user/${username}/${where}`, { params });
    return response.data;
  }

  // ─── Subreddit ─────────────────────────────────────────────────

  async getSubredditAbout(subreddit: string) {
    let response = await this.http.get(`/r/${subreddit}/about`);
    return response.data?.data ?? response.data;
  }

  async getSubredditRules(subreddit: string) {
    let response = await this.http.get(`/r/${subreddit}/about/rules`);
    return response.data;
  }

  async getSubredditPosts(
    subreddit: string,
    sort: string = 'hot',
    params: {
      t?: string;
      limit?: number;
      after?: string;
      before?: string;
    } = {}
  ) {
    let response = await this.http.get(`/r/${subreddit}/${sort}`, { params });
    return response.data;
  }

  async getMySubreddits(params: { limit?: number; after?: string; before?: string } = {}) {
    let response = await this.http.get('/subreddits/mine/subscriber', { params });
    return response.data;
  }

  async getMyModeratedSubreddits(params: { limit?: number; after?: string } = {}) {
    let response = await this.http.get('/subreddits/mine/moderator', { params });
    return response.data;
  }

  async searchSubreddits(
    query: string,
    params: {
      limit?: number;
      after?: string;
    } = {}
  ) {
    let response = await this.http.get('/subreddits/search', {
      params: { q: query, ...params }
    });
    return response.data;
  }

  async subscribe(subreddit: string) {
    let response = await this.http.post(
      '/api/subscribe',
      new URLSearchParams({
        action: 'sub',
        sr_name: subreddit
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  async unsubscribe(subreddit: string) {
    let response = await this.http.post(
      '/api/subscribe',
      new URLSearchParams({
        action: 'unsub',
        sr_name: subreddit
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  // ─── Search ────────────────────────────────────────────────────

  async search(params: {
    q: string;
    subreddit?: string;
    sort?: string;
    t?: string;
    type?: string;
    limit?: number;
    after?: string;
    restrict_sr?: boolean;
  }) {
    let { subreddit, restrict_sr, ...rest } = params;
    let url = subreddit ? `/r/${subreddit}/search` : '/search';
    let queryParams: Record<string, any> = { ...rest };
    if (subreddit) {
      queryParams.restrict_sr = restrict_sr !== false ? 'true' : 'false';
    }
    let response = await this.http.get(url, { params: queryParams });
    return response.data;
  }

  async getContentInfo(params: { ids?: string[]; url?: string; subredditNames?: string[] }) {
    let queryParams: Record<string, string> = {};
    if (params.ids?.length) queryParams.id = params.ids.join(',');
    if (params.url) queryParams.url = params.url;
    if (params.subredditNames?.length) queryParams.sr_name = params.subredditNames.join(',');

    let response = await this.http.get('/api/info', { params: queryParams });
    return response.data;
  }

  // ─── Posts ─────────────────────────────────────────────────────

  async getPost(postId: string) {
    let id = postId.startsWith('t3_') ? postId.slice(3) : postId;
    let response = await this.http.get(`/comments/${id}`);
    return response.data;
  }

  async submitTextPost(params: {
    subreddit: string;
    title: string;
    text: string;
    flairId?: string;
    flairText?: string;
    nsfw?: boolean;
    spoiler?: boolean;
    sendreplies?: boolean;
  }) {
    let body = new URLSearchParams({
      sr: params.subreddit,
      kind: 'self',
      title: params.title,
      text: params.text,
      api_type: 'json'
    });

    if (params.flairId) body.append('flair_id', params.flairId);
    if (params.flairText) body.append('flair_text', params.flairText);
    if (params.nsfw) body.append('nsfw', 'true');
    if (params.spoiler) body.append('spoiler', 'true');
    if (params.sendreplies !== undefined)
      body.append('sendreplies', String(params.sendreplies));

    let response = await this.http.post('/api/submit', body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async submitLinkPost(params: {
    subreddit: string;
    title: string;
    url: string;
    flairId?: string;
    flairText?: string;
    nsfw?: boolean;
    spoiler?: boolean;
    resubmit?: boolean;
    sendreplies?: boolean;
  }) {
    let body = new URLSearchParams({
      sr: params.subreddit,
      kind: 'link',
      title: params.title,
      url: params.url,
      api_type: 'json'
    });

    if (params.flairId) body.append('flair_id', params.flairId);
    if (params.flairText) body.append('flair_text', params.flairText);
    if (params.nsfw) body.append('nsfw', 'true');
    if (params.spoiler) body.append('spoiler', 'true');
    if (params.resubmit) body.append('resubmit', 'true');
    if (params.sendreplies !== undefined)
      body.append('sendreplies', String(params.sendreplies));

    let response = await this.http.post('/api/submit', body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async editPost(thingId: string, text: string) {
    let response = await this.http.post(
      '/api/editusertext',
      new URLSearchParams({
        thing_id: thingId,
        text,
        api_type: 'json'
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  async deletePost(thingId: string) {
    let response = await this.http.post(
      '/api/del',
      new URLSearchParams({
        id: thingId
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  async hidePost(thingId: string) {
    let response = await this.http.post(
      '/api/hide',
      new URLSearchParams({
        id: thingId
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  async unhidePost(thingId: string) {
    let response = await this.http.post(
      '/api/unhide',
      new URLSearchParams({
        id: thingId
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  async markNsfw(thingId: string) {
    let response = await this.http.post(
      '/api/marknsfw',
      new URLSearchParams({
        id: thingId
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  async unmarkNsfw(thingId: string) {
    let response = await this.http.post(
      '/api/unmarknsfw',
      new URLSearchParams({
        id: thingId
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  async markSpoiler(thingId: string) {
    let response = await this.http.post(
      '/api/spoiler',
      new URLSearchParams({
        id: thingId
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  async unmarkSpoiler(thingId: string) {
    let response = await this.http.post(
      '/api/unspoiler',
      new URLSearchParams({
        id: thingId
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  // ─── Comments ──────────────────────────────────────────────────

  async getComments(
    postId: string,
    params: {
      sort?: string;
      limit?: number;
      depth?: number;
    } = {}
  ) {
    let id = postId.startsWith('t3_') ? postId.slice(3) : postId;
    let response = await this.http.get(`/comments/${id}`, { params });
    return response.data;
  }

  async submitComment(parentFullname: string, text: string) {
    let response = await this.http.post(
      '/api/comment',
      new URLSearchParams({
        thing_id: parentFullname,
        text,
        api_type: 'json'
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  async editComment(thingId: string, text: string) {
    return this.editPost(thingId, text);
  }

  async deleteComment(thingId: string) {
    return this.deletePost(thingId);
  }

  // ─── Voting ────────────────────────────────────────────────────

  async vote(thingId: string, direction: number) {
    let response = await this.http.post(
      '/api/vote',
      new URLSearchParams({
        id: thingId,
        dir: String(direction)
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  // ─── Save/Unsave ──────────────────────────────────────────────

  async save(thingId: string, category?: string) {
    let body = new URLSearchParams({ id: thingId });
    if (category) body.append('category', category);

    let response = await this.http.post('/api/save', body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async unsave(thingId: string) {
    let response = await this.http.post(
      '/api/unsave',
      new URLSearchParams({
        id: thingId
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  async getSavedCategories() {
    let response = await this.http.get('/api/saved_categories');
    return response.data;
  }

  // ─── Private Messages ─────────────────────────────────────────

  async getInbox(params: { mark?: boolean; limit?: number; after?: string } = {}) {
    let response = await this.http.get('/message/inbox', { params });
    return response.data;
  }

  async getUnread(params: { mark?: boolean; limit?: number; after?: string } = {}) {
    let response = await this.http.get('/message/unread', { params });
    return response.data;
  }

  async getSent(params: { limit?: number; after?: string } = {}) {
    let response = await this.http.get('/message/sent', { params });
    return response.data;
  }

  async sendMessage(params: { to: string; subject: string; text: string }) {
    let response = await this.http.post(
      '/api/compose',
      new URLSearchParams({
        to: params.to,
        subject: params.subject,
        text: params.text,
        api_type: 'json'
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  async markMessagesRead(ids: string[]) {
    let response = await this.http.post(
      '/api/read_message',
      new URLSearchParams({
        id: ids.join(',')
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  async markMessagesUnread(ids: string[]) {
    let response = await this.http.post(
      '/api/unread_message',
      new URLSearchParams({
        id: ids.join(',')
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  // ─── Moderation ────────────────────────────────────────────────

  async approve(thingId: string) {
    let response = await this.http.post(
      '/api/approve',
      new URLSearchParams({
        id: thingId
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  async remove(thingId: string, spam: boolean = false) {
    let response = await this.http.post(
      '/api/remove',
      new URLSearchParams({
        id: thingId,
        spam: String(spam)
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  async distinguish(thingId: string, how: string = 'yes') {
    let response = await this.http.post(
      '/api/distinguish',
      new URLSearchParams({
        id: thingId,
        how,
        api_type: 'json'
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  async getModLog(
    subreddit: string,
    params: {
      type?: string;
      limit?: number;
      after?: string;
    } = {}
  ) {
    let response = await this.http.get(`/r/${subreddit}/about/log`, { params });
    return response.data;
  }

  async getModQueue(
    subreddit: string,
    params: {
      limit?: number;
      after?: string;
    } = {}
  ) {
    let response = await this.http.get(`/r/${subreddit}/about/modqueue`, { params });
    return response.data;
  }

  async getReports(
    subreddit: string,
    params: {
      limit?: number;
      after?: string;
    } = {}
  ) {
    let response = await this.http.get(`/r/${subreddit}/about/reports`, { params });
    return response.data;
  }

  async banUser(
    subreddit: string,
    params: {
      name: string;
      banReason?: string;
      banMessage?: string;
      note?: string;
      duration?: number;
    }
  ) {
    let body = new URLSearchParams({
      name: params.name,
      type: 'banned',
      api_type: 'json'
    });
    if (params.banReason) body.append('ban_reason', params.banReason);
    if (params.banMessage) body.append('ban_message', params.banMessage);
    if (params.note) body.append('note', params.note);
    if (params.duration !== undefined) body.append('duration', String(params.duration));

    let response = await this.http.post(`/r/${subreddit}/api/friend`, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async unbanUser(subreddit: string, username: string) {
    let response = await this.http.post(
      `/r/${subreddit}/api/unfriend`,
      new URLSearchParams({
        name: username,
        type: 'banned'
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    return response.data;
  }

  async getBannedUsers(
    subreddit: string,
    params: {
      limit?: number;
      after?: string;
    } = {}
  ) {
    let response = await this.http.get(`/r/${subreddit}/about/banned`, { params });
    return response.data;
  }

  // ─── Flair ─────────────────────────────────────────────────────

  async getUserFlairOptions(subreddit: string) {
    let response = await this.http.get(`/r/${subreddit}/api/user_flair_v2`);
    return response.data;
  }

  async getLinkFlairOptions(subreddit: string) {
    let response = await this.http.get(`/r/${subreddit}/api/link_flair_v2`);
    return response.data;
  }

  async setUserFlair(
    subreddit: string,
    params: {
      name: string;
      text?: string;
      flairTemplateId?: string;
      cssClass?: string;
    }
  ) {
    let body = new URLSearchParams({
      name: params.name,
      api_type: 'json'
    });
    if (params.text) body.append('text', params.text);
    if (params.flairTemplateId) body.append('flair_template_id', params.flairTemplateId);
    if (params.cssClass) body.append('css_class', params.cssClass);

    let response = await this.http.post(`/r/${subreddit}/api/selectflair`, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async setPostFlair(
    subreddit: string,
    params: {
      linkFullname: string;
      text?: string;
      flairTemplateId?: string;
      cssClass?: string;
    }
  ) {
    let body = new URLSearchParams({
      link: params.linkFullname,
      api_type: 'json'
    });
    if (params.text) body.append('text', params.text);
    if (params.flairTemplateId) body.append('flair_template_id', params.flairTemplateId);
    if (params.cssClass) body.append('css_class', params.cssClass);

    let response = await this.http.post(`/r/${subreddit}/api/selectflair`, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  // ─── Wiki ──────────────────────────────────────────────────────

  async getWikiPage(subreddit: string, page: string) {
    let response = await this.http.get(`/r/${subreddit}/wiki/${page}`);
    return response.data;
  }

  async editWikiPage(
    subreddit: string,
    page: string,
    params: {
      content: string;
      reason?: string;
    }
  ) {
    let body = new URLSearchParams({
      page,
      content: params.content
    });
    if (params.reason) body.append('reason', params.reason);

    let response = await this.http.post(`/r/${subreddit}/api/wiki/edit`, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async getWikiPages(subreddit: string) {
    let response = await this.http.get(`/r/${subreddit}/wiki/pages`);
    return response.data;
  }

  async getWikiRevisions(
    subreddit: string,
    page: string,
    params: {
      limit?: number;
      after?: string;
    } = {}
  ) {
    let response = await this.http.get(`/r/${subreddit}/wiki/revisions/${page}`, { params });
    return response.data;
  }
}
