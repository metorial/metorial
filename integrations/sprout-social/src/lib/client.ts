import { createAxios } from 'slates';

export interface ClientConfig {
  token: string;
  customerId: string;
}

export interface AnalyticsRequest {
  filters: string[];
  metrics?: string[];
  fields?: string[];
  dimensions?: string[];
  sort?: string[];
  timezone?: string;
  page?: number;
  limit?: number;
}

export interface MessagesRequest {
  filters: string[];
  fields?: string[];
  sort?: string[];
  timezone?: string;
  limit?: number;
  pageCursor?: string;
}

export interface ListeningMessagesRequest {
  filters: string[];
  fields?: string[];
  metrics?: string[];
  sort?: string[];
  timezone?: string;
  page?: number;
  limit?: number;
}

export interface ListeningMetricsRequest {
  filters: string[];
  metrics: string[];
  dimensions?: string[];
  timezone?: string;
  limit?: number;
}

export interface CasesFilterRequest {
  filters: string[];
  fields?: string[];
  page?: number;
  limit?: number;
  sort?: string[];
}

export interface CreatePublishingPostRequest {
  groupId: number;
  customerProfileIds: number[];
  isDraft: boolean;
  text?: string;
  media?: Array<{ mediaId: string; mediaType: string }>;
  delivery?: {
    scheduledTimes: string[];
    type: string;
  };
  tagIds?: number[];
}

export class Client {
  private axios;
  private customerId: string;

  constructor(config: ClientConfig) {
    this.customerId = config.customerId;
    this.axios = createAxios({
      baseURL: `https://api.sproutsocial.com/v1/${config.customerId}`,
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  // ---- Metadata ----

  async getCustomerProfiles(): Promise<any> {
    let response = await this.axios.get('/metadata/customer');
    return response.data;
  }

  async getGroups(): Promise<any> {
    let response = await this.axios.get('/metadata/customer/groups');
    return response.data;
  }

  async getTags(): Promise<any> {
    let response = await this.axios.get('/metadata/customer/tags');
    return response.data;
  }

  async getUsers(): Promise<any> {
    let response = await this.axios.get('/metadata/customer/users');
    return response.data;
  }

  async getTeams(): Promise<any> {
    let response = await this.axios.get('/metadata/customer/teams');
    return response.data;
  }

  async getTopics(): Promise<any> {
    let response = await this.axios.get('/metadata/customer/topics');
    return response.data;
  }

  async getQueues(): Promise<any> {
    let response = await this.axios.get('/metadata/customer/queues');
    return response.data;
  }

  // ---- Analytics ----

  async getProfileAnalytics(request: AnalyticsRequest): Promise<any> {
    let body: any = {
      filters: request.filters,
      metrics: request.metrics
    };
    if (request.page) body.page = request.page;

    let response = await this.axios.post('/analytics/profiles', body);
    return response.data;
  }

  async getPostAnalytics(request: AnalyticsRequest): Promise<any> {
    let body: any = {
      filters: request.filters
    };
    if (request.fields) body.fields = request.fields;
    if (request.metrics) body.metrics = request.metrics;
    if (request.sort) body.sort = request.sort;
    if (request.timezone) body.timezone = request.timezone;
    if (request.page) body.page = request.page;

    let response = await this.axios.post('/analytics/posts', body);
    return response.data;
  }

  // ---- Messages ----

  async getMessages(request: MessagesRequest): Promise<any> {
    let body: any = {
      filters: request.filters
    };
    if (request.fields) body.fields = request.fields;
    if (request.sort) body.sort = request.sort;
    if (request.timezone) body.timezone = request.timezone;
    if (request.limit) body.limit = request.limit;
    if (request.pageCursor) body.page_cursor = request.pageCursor;

    let response = await this.axios.post('/messages', body);
    return response.data;
  }

  // ---- Listening ----

  async getListeningTopicMessages(
    topicId: string,
    request: ListeningMessagesRequest
  ): Promise<any> {
    let body: any = {
      filters: request.filters
    };
    if (request.fields) body.fields = request.fields;
    if (request.metrics) body.metrics = request.metrics;
    if (request.sort) body.sort = request.sort;
    if (request.timezone) body.timezone = request.timezone;
    if (request.page) body.page = request.page;
    if (request.limit) body.limit = request.limit;

    let response = await this.axios.post(`/listening/topics/${topicId}/messages`, body);
    return response.data;
  }

  async getListeningTopicMetrics(
    topicId: string,
    request: ListeningMetricsRequest
  ): Promise<any> {
    let body: any = {
      filters: request.filters,
      metrics: request.metrics
    };
    if (request.dimensions) body.dimensions = request.dimensions;
    if (request.timezone) body.timezone = request.timezone;
    if (request.limit) body.limit = request.limit;

    let response = await this.axios.post(`/listening/topics/${topicId}/metrics`, body);
    return response.data;
  }

  // ---- Cases ----

  async getCases(request: CasesFilterRequest): Promise<any> {
    let body: any = {
      filters: request.filters
    };
    if (request.fields) body.fields = request.fields;
    if (request.page) body.page = request.page;
    if (request.limit) body.limit = request.limit;
    if (request.sort) body.sort = request.sort;

    let response = await this.axios.post('/cases/filter', body);
    return response.data;
  }

  // ---- Publishing ----

  async createPublishingPost(request: CreatePublishingPostRequest): Promise<any> {
    let body: any = {
      group_id: request.groupId,
      customer_profile_ids: request.customerProfileIds,
      is_draft: request.isDraft
    };
    if (request.text) body.text = request.text;
    if (request.media) {
      body.media = request.media.map(m => ({
        media_id: m.mediaId,
        media_type: m.mediaType
      }));
    }
    if (request.delivery) {
      body.delivery = {
        scheduled_times: request.delivery.scheduledTimes,
        type: request.delivery.type
      };
    }
    if (request.tagIds) body.tag_ids = request.tagIds;

    let response = await this.axios.post('/publishing/posts', body);
    return response.data;
  }

  async getPublishingPost(publishingPostId: string): Promise<any> {
    let response = await this.axios.get(`/publishing/posts/${publishingPostId}`);
    return response.data;
  }

  // ---- Media ----

  async uploadMediaFromUrl(mediaUrl: string): Promise<any> {
    let formBody = `media_url=${encodeURIComponent(mediaUrl)}`;
    let response = await this.axios.post('/media/', formBody, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return response.data;
  }
}
