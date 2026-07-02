import { createAxios } from '@slates/provider';
import { facebookApiError, facebookServiceError } from './errors';

export interface PaginatedResponse<T> {
  data: T[];
  paging?: {
    cursors?: { before?: string; after?: string };
    next?: string;
    previous?: string;
  };
}

export interface FacebookPost {
  id: string;
  message?: string;
  story?: string;
  created_time?: string;
  updated_time?: string;
  full_picture?: string;
  permalink_url?: string;
  type?: string;
  from?: { id: string; name: string };
  likes?: { summary?: { total_count: number } };
  comments?: { summary?: { total_count: number } };
  shares?: { count: number };
  reactions?: { summary?: { total_count: number } };
}

export interface FacebookComment {
  id: string;
  message: string;
  created_time: string;
  from?: { id: string; name: string };
  like_count?: number;
  comment_count?: number;
  parent?: { id: string };
  is_hidden?: boolean;
}

export interface FacebookPage {
  id: string;
  name: string;
  category?: string;
  access_token?: string;
  fan_count?: number;
  followers_count?: number;
  link?: string;
  picture?: { data?: { url: string } };
}

export interface FacebookUser {
  id: string;
  name?: string;
  email?: string;
  birthday?: string;
  location?: { id: string; name: string };
  link?: string;
  picture?: { data?: { url: string } };
}

export interface FacebookLead {
  id: string;
  created_time: string;
  field_data: Array<{ name: string; values: string[] }>;
  form_id?: string;
}

export interface FacebookInsight {
  name: string;
  period: string;
  title: string;
  description: string;
  values: Array<{ value: number | Record<string, number>; end_time: string }>;
}

export class Client {
  private axios: ReturnType<typeof createAxios>;
  private token: string;
  private apiVersion: string;

  constructor(config: { token: string; apiVersion?: string }) {
    this.token = config.token;
    this.apiVersion = config.apiVersion || 'v25.0';
    this.axios = createAxios({
      baseURL: `https://graph.facebook.com/${this.apiVersion}`
    });
    this.axios.interceptors.response.use(
      response => response,
      error => Promise.reject(facebookApiError(error))
    );
  }

  private get defaultParams() {
    return { access_token: this.token };
  }

  // ── User ──────────────────────────────────────────────

  async getMe(
    fields: string = 'id,name,email,picture.type(large),birthday,location,link'
  ): Promise<FacebookUser> {
    let response = await this.axios.get('/me', {
      params: { ...this.defaultParams, fields }
    });
    return response.data;
  }

  async getUserById(
    userId: string,
    fields: string = 'id,name,email,picture.type(large),birthday,location,link'
  ): Promise<FacebookUser> {
    let response = await this.axios.get(`/${userId}`, {
      params: { ...this.defaultParams, fields }
    });
    return response.data;
  }

  // ── Pages ─────────────────────────────────────────────

  async getMyPages(
    fields: string = 'id,name,category,access_token,fan_count,followers_count,link,picture.type(large)'
  ): Promise<FacebookPage[]> {
    let response = await this.axios.get('/me/accounts', {
      params: { ...this.defaultParams, fields }
    });
    return response.data.data || [];
  }

  async getPage(
    pageId: string,
    fields: string = 'id,name,category,fan_count,followers_count,link,picture.type(large)'
  ): Promise<FacebookPage> {
    let response = await this.axios.get(`/${pageId}`, {
      params: { ...this.defaultParams, fields }
    });
    return response.data;
  }

  async getPageAccessToken(pageId: string): Promise<string> {
    let pages = await this.getMyPages('id,access_token');
    let page = pages.find(p => p.id === pageId);
    if (!page?.access_token) {
      throw facebookServiceError(
        `Could not retrieve an access token for page ${pageId}. Ensure the authenticated user can manage this Page and has granted the required Page permissions.`
      );
    }
    return page.access_token;
  }

  // ── Posts / Content Publishing ────────────────────────

  async getPagePosts(
    pageId: string,
    options: { limit?: number; after?: string; fields?: string } = {}
  ): Promise<PaginatedResponse<FacebookPost>> {
    let fields =
      options.fields ||
      'id,message,story,created_time,updated_time,full_picture,permalink_url,type,from,likes.summary(true),comments.summary(true),shares,reactions.summary(true)';
    let response = await this.axios.get(`/${pageId}/posts`, {
      params: {
        ...this.defaultParams,
        fields,
        limit: options.limit || 25,
        ...(options.after ? { after: options.after } : {})
      }
    });
    return response.data;
  }

  async getUserPosts(
    userId: string = 'me',
    options: { limit?: number; after?: string; fields?: string } = {}
  ): Promise<PaginatedResponse<FacebookPost>> {
    let fields =
      options.fields ||
      'id,message,story,created_time,updated_time,full_picture,permalink_url,type,from';
    let response = await this.axios.get(`/${userId}/posts`, {
      params: {
        ...this.defaultParams,
        fields,
        limit: options.limit || 25,
        ...(options.after ? { after: options.after } : {})
      }
    });
    return response.data;
  }

  async getPost(
    postId: string,
    fields: string = 'id,message,story,created_time,updated_time,full_picture,permalink_url,type,from,likes.summary(true),comments.summary(true),shares,reactions.summary(true)'
  ): Promise<FacebookPost> {
    let response = await this.axios.get(`/${postId}`, {
      params: { ...this.defaultParams, fields }
    });
    return response.data;
  }

  async publishPost(
    targetId: string,
    data: {
      message?: string;
      link?: string;
      published?: boolean;
      scheduledPublishTime?: number;
    },
    pageAccessToken?: string
  ): Promise<{ id: string }> {
    let response = await this.axios.post(`/${targetId}/feed`, null, {
      params: {
        access_token: pageAccessToken || this.token,
        ...data,
        ...(data.scheduledPublishTime
          ? { scheduled_publish_time: data.scheduledPublishTime, published: false }
          : {})
      }
    });
    return response.data;
  }

  async publishPhoto(
    targetId: string,
    data: { url?: string; caption?: string; published?: boolean },
    pageAccessToken?: string
  ): Promise<{ id: string; post_id?: string }> {
    let response = await this.axios.post(`/${targetId}/photos`, null, {
      params: {
        access_token: pageAccessToken || this.token,
        ...data
      }
    });
    return response.data;
  }

  async publishVideo(
    targetId: string,
    data: { file_url?: string; description?: string; title?: string },
    pageAccessToken?: string
  ): Promise<{ id: string }> {
    let response = await this.axios.post(`/${targetId}/videos`, null, {
      params: {
        access_token: pageAccessToken || this.token,
        ...data
      }
    });
    return response.data;
  }

  async updatePost(
    postId: string,
    data: { message?: string },
    pageAccessToken?: string
  ): Promise<{ success: boolean }> {
    let response = await this.axios.post(`/${postId}`, null, {
      params: {
        access_token: pageAccessToken || this.token,
        ...data
      }
    });
    return response.data;
  }

  async deletePost(postId: string, pageAccessToken?: string): Promise<{ success: boolean }> {
    let response = await this.axios.delete(`/${postId}`, {
      params: {
        access_token: pageAccessToken || this.token
      }
    });
    return response.data;
  }

  // ── Comments ──────────────────────────────────────────

  async getComments(
    objectId: string,
    options: {
      limit?: number;
      after?: string;
      filter?: 'toplevel' | 'stream';
      order?: 'chronological' | 'reverse_chronological';
    } = {}
  ): Promise<PaginatedResponse<FacebookComment>> {
    let response = await this.axios.get(`/${objectId}/comments`, {
      params: {
        ...this.defaultParams,
        fields: 'id,message,created_time,from,like_count,comment_count,parent,is_hidden',
        limit: options.limit || 25,
        ...(options.after ? { after: options.after } : {}),
        ...(options.filter ? { filter: options.filter } : {}),
        ...(options.order ? { order: options.order } : {})
      }
    });
    return response.data;
  }

  async postComment(
    objectId: string,
    message: string,
    pageAccessToken?: string
  ): Promise<{ id: string }> {
    let response = await this.axios.post(`/${objectId}/comments`, null, {
      params: {
        access_token: pageAccessToken || this.token,
        message
      }
    });
    return response.data;
  }

  async updateComment(
    commentId: string,
    message: string,
    pageAccessToken?: string
  ): Promise<{ success: boolean }> {
    let response = await this.axios.post(`/${commentId}`, null, {
      params: {
        access_token: pageAccessToken || this.token,
        message
      }
    });
    return response.data;
  }

  async deleteComment(
    commentId: string,
    pageAccessToken?: string
  ): Promise<{ success: boolean }> {
    let response = await this.axios.delete(`/${commentId}`, {
      params: {
        access_token: pageAccessToken || this.token
      }
    });
    return response.data;
  }

  async hideComment(
    commentId: string,
    isHidden: boolean,
    pageAccessToken?: string
  ): Promise<{ success: boolean }> {
    let response = await this.axios.post(`/${commentId}`, null, {
      params: {
        access_token: pageAccessToken || this.token,
        is_hidden: isHidden
      }
    });
    return response.data;
  }

  // ── Reactions ─────────────────────────────────────────

  async getReactions(
    objectId: string,
    options: { limit?: number; after?: string; type?: string } = {}
  ): Promise<PaginatedResponse<{ id: string; name: string; type: string }>> {
    let response = await this.axios.get(`/${objectId}/reactions`, {
      params: {
        ...this.defaultParams,
        fields: 'id,name,type',
        limit: options.limit || 25,
        ...(options.after ? { after: options.after } : {}),
        ...(options.type ? { type: options.type } : {})
      }
    });
    return response.data;
  }

  // ── Insights ──────────────────────────────────────────

  async getPageInsights(
    pageId: string,
    options: {
      metric: string[];
      period?: string;
      since?: string;
      until?: string;
      pageAccessToken?: string;
    }
  ): Promise<FacebookInsight[]> {
    let response = await this.axios.get(`/${pageId}/insights`, {
      params: {
        access_token: options.pageAccessToken || this.token,
        metric: options.metric.join(','),
        ...(options.period ? { period: options.period } : {}),
        ...(options.since ? { since: options.since } : {}),
        ...(options.until ? { until: options.until } : {})
      }
    });
    return response.data.data || [];
  }

  async getPostInsights(
    postId: string,
    options: {
      metric?: string[];
      pageAccessToken?: string;
    } = {}
  ): Promise<FacebookInsight[]> {
    let metrics = options.metric || [
      'post_impressions',
      'post_engaged_users',
      'post_reactions_by_type_total',
      'post_clicks'
    ];
    let response = await this.axios.get(`/${postId}/insights`, {
      params: {
        access_token: options.pageAccessToken || this.token,
        metric: metrics.join(',')
      }
    });
    return response.data.data || [];
  }

  // ── Leads ─────────────────────────────────────────────

  async getLeads(
    formId: string,
    options: { limit?: number; after?: string } = {}
  ): Promise<PaginatedResponse<FacebookLead>> {
    let response = await this.axios.get(`/${formId}/leads`, {
      params: {
        ...this.defaultParams,
        limit: options.limit || 25,
        ...(options.after ? { after: options.after } : {})
      }
    });
    return response.data;
  }

  async getLead(leadId: string): Promise<FacebookLead> {
    let response = await this.axios.get(`/${leadId}`, {
      params: this.defaultParams
    });
    return response.data;
  }

  async getLeadForms(
    pageId: string,
    pageAccessToken?: string
  ): Promise<Array<{ id: string; name: string; status: string }>> {
    let response = await this.axios.get(`/${pageId}/leadgen_forms`, {
      params: {
        access_token: pageAccessToken || this.token,
        fields: 'id,name,status'
      }
    });
    return response.data.data || [];
  }

  // ── Search ────────────────────────────────────────────

  async search(
    query: string,
    type: 'place' | 'page',
    options: { limit?: number; fields?: string } = {}
  ): Promise<PaginatedResponse<any>> {
    let defaultFields =
      type === 'page'
        ? 'id,name,category,link,fan_count,picture.type(large)'
        : 'id,name,location,category,picture.type(large)';

    let response = await this.axios.get('/search', {
      params: {
        ...this.defaultParams,
        q: query,
        type,
        fields: options.fields || defaultFields,
        limit: options.limit || 25
      }
    });
    return response.data;
  }

  // ── Webhook subscription (for Page events) ───────────

  async subscribePageToApp(
    pageId: string,
    pageAccessToken: string,
    subscribedFields: string[]
  ): Promise<{ success: boolean }> {
    let response = await this.axios.post(`/${pageId}/subscribed_apps`, null, {
      params: {
        access_token: pageAccessToken,
        subscribed_fields: subscribedFields.join(',')
      }
    });
    return response.data;
  }

  async unsubscribePageFromApp(
    pageId: string,
    pageAccessToken: string
  ): Promise<{ success: boolean }> {
    let response = await this.axios.delete(`/${pageId}/subscribed_apps`, {
      params: {
        access_token: pageAccessToken
      }
    });
    return response.data;
  }

  // ── Ad Campaigns ──────────────────────────────────────

  async getAdAccounts(userId: string = 'me'): Promise<
    Array<{
      id: string;
      name: string;
      account_id: string;
      account_status: number;
      currency: string;
    }>
  > {
    let response = await this.axios.get(`/${userId}/adaccounts`, {
      params: {
        ...this.defaultParams,
        fields: 'id,name,account_id,account_status,currency,amount_spent,balance'
      }
    });
    return response.data.data || [];
  }

  async getCampaigns(
    adAccountId: string,
    options: { limit?: number; after?: string; status?: string[] } = {}
  ): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get(`/${adAccountId}/campaigns`, {
      params: {
        ...this.defaultParams,
        fields:
          'id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time',
        limit: options.limit || 25,
        ...(options.after ? { after: options.after } : {}),
        ...(options.status ? { effective_status: JSON.stringify(options.status) } : {})
      }
    });
    return response.data;
  }

  async getCampaignInsights(
    campaignId: string,
    options: { datePreset?: string; since?: string; until?: string; fields?: string[] } = {}
  ): Promise<any[]> {
    let fields = options.fields || [
      'impressions',
      'clicks',
      'spend',
      'reach',
      'cpc',
      'cpm',
      'ctr',
      'actions'
    ];
    let response = await this.axios.get(`/${campaignId}/insights`, {
      params: {
        ...this.defaultParams,
        fields: fields.join(','),
        ...(options.datePreset ? { date_preset: options.datePreset } : {}),
        ...(options.since
          ? {
              time_range: JSON.stringify({
                since: options.since,
                until: options.until || new Date().toISOString().split('T')[0]
              })
            }
          : {})
      }
    });
    return response.data.data || [];
  }

  // ── Messaging ─────────────────────────────────────────

  async sendPageMessage(
    pageId: string,
    recipientId: string,
    message: { text?: string; attachment?: any },
    pageAccessToken: string
  ): Promise<{ recipient_id: string; message_id: string }> {
    let response = await this.axios.post(
      `/${pageId}/messages`,
      {
        recipient: { id: recipientId },
        message,
        messaging_type: 'RESPONSE'
      },
      {
        params: { access_token: pageAccessToken }
      }
    );
    return response.data;
  }

  async getConversations(
    pageId: string,
    options: { limit?: number; after?: string; pageAccessToken?: string } = {}
  ): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get(`/${pageId}/conversations`, {
      params: {
        access_token: options.pageAccessToken || this.token,
        fields: 'id,snippet,updated_time,participants,message_count',
        limit: options.limit || 25,
        ...(options.after ? { after: options.after } : {})
      }
    });
    return response.data;
  }

  async getConversationMessages(
    conversationId: string,
    options: { limit?: number; after?: string; pageAccessToken?: string } = {}
  ): Promise<PaginatedResponse<any>> {
    let response = await this.axios.get(`/${conversationId}/messages`, {
      params: {
        access_token: options.pageAccessToken || this.token,
        fields: 'id,message,from,to,created_time',
        limit: options.limit || 25,
        ...(options.after ? { after: options.after } : {})
      }
    });
    return response.data;
  }
}
