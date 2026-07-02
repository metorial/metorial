import { createAxios } from 'slates';
import { klaviyoApiError } from './errors';

const DEFAULT_KLAVIYO_API_REVISION = '2026-04-15';

export interface KlaviyoClientConfig {
  token: string;
  revision?: string;
  isOAuth?: boolean;
}

export interface JsonApiResource {
  type: string;
  id?: string;
  attributes?: Record<string, any>;
  relationships?: Record<string, any>;
  links?: Record<string, any>;
}

export interface JsonApiResponse {
  data: JsonApiResource | JsonApiResource[];
  included?: JsonApiResource[];
  links?: Record<string, any>;
}

export interface PaginatedResponse {
  data: JsonApiResource[];
  included?: JsonApiResource[];
  links?: {
    self?: string;
    next?: string;
    prev?: string;
  };
}

export class KlaviyoClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: KlaviyoClientConfig) {
    let authHeader = config.isOAuth
      ? `Bearer ${config.token}`
      : `Klaviyo-API-Key ${config.token}`;

    this.axios = createAxios({
      baseURL: 'https://a.klaviyo.com/api',
      headers: {
        Authorization: authHeader,
        revision: config.revision ?? DEFAULT_KLAVIYO_API_REVISION,
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json'
      }
    });

    this.axios.interceptors.response.use(
      response => response,
      error => Promise.reject(klaviyoApiError(error))
    );
  }

  // --- Profiles ---

  async getProfiles(params?: {
    filter?: string;
    fields?: string[];
    sort?: string;
    pageSize?: number;
    pageCursor?: string;
  }): Promise<PaginatedResponse> {
    let query: Record<string, any> = {};
    if (params?.filter) query.filter = params.filter;
    if (params?.fields?.length) query['fields[profile]'] = params.fields.join(',');
    if (params?.sort) query.sort = params.sort;
    if (params?.pageSize) query['page[size]'] = params.pageSize;
    if (params?.pageCursor) query['page[cursor]'] = params.pageCursor;

    let response = await this.axios.get('/profiles/', { params: query });
    return response.data;
  }

  async getProfile(
    profileId: string,
    params?: {
      fields?: string[];
      include?: string[];
    }
  ): Promise<JsonApiResponse> {
    let query: Record<string, any> = {};
    if (params?.fields?.length) query['fields[profile]'] = params.fields.join(',');
    if (params?.include?.length) query.include = params.include.join(',');

    let response = await this.axios.get(`/profiles/${profileId}/`, { params: query });
    return response.data;
  }

  async createProfile(attributes: Record<string, any>): Promise<JsonApiResponse> {
    let response = await this.axios.post('/profiles/', {
      data: {
        type: 'profile',
        attributes
      }
    });
    return response.data;
  }

  async updateProfile(
    profileId: string,
    attributes: Record<string, any>
  ): Promise<JsonApiResponse> {
    let response = await this.axios.patch(`/profiles/${profileId}/`, {
      data: {
        type: 'profile',
        id: profileId,
        attributes
      }
    });
    return response.data;
  }

  async suppressProfiles(profileIds: string[]): Promise<void> {
    await this.axios.post('/profile-suppression-bulk-create-jobs/', {
      data: {
        type: 'profile-suppression-bulk-create-job',
        attributes: {
          profiles: {
            data: profileIds.map(id => ({ type: 'profile', id }))
          }
        }
      }
    });
  }

  async unsuppressProfiles(profileIds: string[]): Promise<void> {
    await this.axios.post('/profile-suppression-bulk-delete-jobs/', {
      data: {
        type: 'profile-suppression-bulk-delete-job',
        attributes: {
          profiles: {
            data: profileIds.map(id => ({ type: 'profile', id }))
          }
        }
      }
    });
  }

  async subscribeProfiles(
    listId: string,
    subscriptions: {
      email?: string;
      phoneNumber?: string;
      channels?: Record<string, any>;
      profileId?: string;
    }[]
  ): Promise<void> {
    await this.axios.post('/profile-subscription-bulk-create-jobs/', {
      data: {
        type: 'profile-subscription-bulk-create-job',
        attributes: {
          custom_source: 'Slates Integration',
          profiles: {
            data: subscriptions.map(sub => ({
              type: 'profile',
              ...(sub.profileId ? { id: sub.profileId } : {}),
              attributes: {
                ...(sub.email ? { email: sub.email } : {}),
                ...(sub.phoneNumber ? { phone_number: sub.phoneNumber } : {}),
                subscriptions: sub.channels ?? {
                  email: { marketing: { consent: 'SUBSCRIBED' } }
                }
              }
            }))
          }
        },
        relationships: {
          list: {
            data: { type: 'list', id: listId }
          }
        }
      }
    });
  }

  async unsubscribeProfiles(
    listId: string,
    profiles: {
      email?: string;
      phoneNumber?: string;
      channels?: string[];
    }[]
  ): Promise<void> {
    await this.axios.post('/profile-subscription-bulk-delete-jobs/', {
      data: {
        type: 'profile-subscription-bulk-delete-job',
        attributes: {
          profiles: {
            data: profiles.map(p => ({
              type: 'profile',
              attributes: {
                ...(p.email ? { email: p.email } : {}),
                ...(p.phoneNumber ? { phone_number: p.phoneNumber } : {})
              }
            }))
          }
        },
        relationships: {
          list: {
            data: { type: 'list', id: listId }
          }
        }
      }
    });
  }

  // --- Lists ---

  async getLists(params?: {
    filter?: string;
    fields?: string[];
    pageCursor?: string;
    pageSize?: number;
  }): Promise<PaginatedResponse> {
    let query: Record<string, any> = {};
    if (params?.filter) query.filter = params.filter;
    if (params?.fields?.length) query['fields[list]'] = params.fields.join(',');
    if (params?.pageCursor) query['page[cursor]'] = params.pageCursor;
    if (params?.pageSize) query['page[size]'] = params.pageSize;

    let response = await this.axios.get('/lists/', { params: query });
    return response.data;
  }

  async getList(listId: string): Promise<JsonApiResponse> {
    let response = await this.axios.get(`/lists/${listId}/`);
    return response.data;
  }

  async createList(name: string): Promise<JsonApiResponse> {
    let response = await this.axios.post('/lists/', {
      data: {
        type: 'list',
        attributes: { name }
      }
    });
    return response.data;
  }

  async updateList(listId: string, name: string): Promise<JsonApiResponse> {
    let response = await this.axios.patch(`/lists/${listId}/`, {
      data: {
        type: 'list',
        id: listId,
        attributes: { name }
      }
    });
    return response.data;
  }

  async deleteList(listId: string): Promise<void> {
    await this.axios.delete(`/lists/${listId}/`);
  }

  async addProfilesToList(listId: string, profileIds: string[]): Promise<void> {
    await this.axios.post(`/lists/${listId}/relationships/profiles/`, {
      data: profileIds.map(id => ({ type: 'profile', id }))
    });
  }

  async removeProfilesFromList(listId: string, profileIds: string[]): Promise<void> {
    await this.axios.delete(`/lists/${listId}/relationships/profiles/`, {
      data: {
        data: profileIds.map(id => ({ type: 'profile', id }))
      }
    });
  }

  async getListProfiles(
    listId: string,
    params?: {
      fields?: string[];
      filter?: string;
      pageCursor?: string;
      pageSize?: number;
    }
  ): Promise<PaginatedResponse> {
    let query: Record<string, any> = {};
    if (params?.fields?.length) query['fields[profile]'] = params.fields.join(',');
    if (params?.filter) query.filter = params.filter;
    if (params?.pageCursor) query['page[cursor]'] = params.pageCursor;
    if (params?.pageSize) query['page[size]'] = params.pageSize;

    let response = await this.axios.get(`/lists/${listId}/profiles/`, { params: query });
    return response.data;
  }

  // --- Segments ---

  async getSegments(params?: {
    filter?: string;
    fields?: string[];
    pageCursor?: string;
    pageSize?: number;
  }): Promise<PaginatedResponse> {
    let query: Record<string, any> = {};
    if (params?.filter) query.filter = params.filter;
    if (params?.fields?.length) query['fields[segment]'] = params.fields.join(',');
    if (params?.pageCursor) query['page[cursor]'] = params.pageCursor;
    if (params?.pageSize) query['page[size]'] = params.pageSize;

    let response = await this.axios.get('/segments/', { params: query });
    return response.data;
  }

  async getSegment(segmentId: string): Promise<JsonApiResponse> {
    let response = await this.axios.get(`/segments/${segmentId}/`);
    return response.data;
  }

  async createSegment(attributes: {
    name: string;
    definition: Record<string, any>;
  }): Promise<JsonApiResponse> {
    let response = await this.axios.post('/segments/', {
      data: {
        type: 'segment',
        attributes
      }
    });
    return response.data;
  }

  async updateSegment(
    segmentId: string,
    attributes: Record<string, any>
  ): Promise<JsonApiResponse> {
    let response = await this.axios.patch(`/segments/${segmentId}/`, {
      data: {
        type: 'segment',
        id: segmentId,
        attributes
      }
    });
    return response.data;
  }

  async deleteSegment(segmentId: string): Promise<void> {
    await this.axios.delete(`/segments/${segmentId}/`);
  }

  async getSegmentProfiles(
    segmentId: string,
    params?: {
      fields?: string[];
      filter?: string;
      pageCursor?: string;
      pageSize?: number;
    }
  ): Promise<PaginatedResponse> {
    let query: Record<string, any> = {};
    if (params?.fields?.length) query['fields[profile]'] = params.fields.join(',');
    if (params?.filter) query.filter = params.filter;
    if (params?.pageCursor) query['page[cursor]'] = params.pageCursor;
    if (params?.pageSize) query['page[size]'] = params.pageSize;

    let response = await this.axios.get(`/segments/${segmentId}/profiles/`, { params: query });
    return response.data;
  }

  // --- Campaigns ---

  async getCampaigns(params?: {
    filter?: string;
    fields?: string[];
    sort?: string;
    pageCursor?: string;
    pageSize?: number;
  }): Promise<PaginatedResponse> {
    let query: Record<string, any> = {};
    if (params?.filter) query.filter = params.filter;
    if (params?.fields?.length) query['fields[campaign]'] = params.fields.join(',');
    if (params?.sort) query.sort = params.sort;
    if (params?.pageCursor) query['page[cursor]'] = params.pageCursor;
    if (params?.pageSize) query['page[size]'] = params.pageSize;

    let response = await this.axios.get('/campaigns/', { params: query });
    return response.data;
  }

  async getCampaign(campaignId: string): Promise<JsonApiResponse> {
    let response = await this.axios.get(`/campaigns/${campaignId}/`);
    return response.data;
  }

  async createCampaign(attributes: Record<string, any>): Promise<JsonApiResponse> {
    let response = await this.axios.post('/campaigns/', {
      data: {
        type: 'campaign',
        attributes
      }
    });
    return response.data;
  }

  async updateCampaign(
    campaignId: string,
    attributes: Record<string, any>
  ): Promise<JsonApiResponse> {
    let response = await this.axios.patch(`/campaigns/${campaignId}/`, {
      data: {
        type: 'campaign',
        id: campaignId,
        attributes
      }
    });
    return response.data;
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    await this.axios.delete(`/campaigns/${campaignId}/`);
  }

  async sendCampaign(campaignId: string): Promise<void> {
    await this.axios.post('/campaign-send-jobs/', {
      data: {
        type: 'campaign-send-job',
        id: campaignId
      }
    });
  }

  async getCampaignRecipientEstimation(campaignId: string): Promise<JsonApiResponse> {
    let response = await this.axios.get(`/campaign-recipient-estimations/${campaignId}/`);
    return response.data;
  }

  // --- Flows ---

  async getFlows(params?: {
    filter?: string;
    fields?: string[];
    sort?: string;
    pageCursor?: string;
    pageSize?: number;
  }): Promise<PaginatedResponse> {
    let query: Record<string, any> = {};
    if (params?.filter) query.filter = params.filter;
    if (params?.fields?.length) query['fields[flow]'] = params.fields.join(',');
    if (params?.sort) query.sort = params.sort;
    if (params?.pageCursor) query['page[cursor]'] = params.pageCursor;
    if (params?.pageSize) query['page[size]'] = params.pageSize;

    let response = await this.axios.get('/flows/', { params: query });
    return response.data;
  }

  async getFlow(
    flowId: string,
    params?: {
      fields?: string[];
      include?: string[];
    }
  ): Promise<JsonApiResponse> {
    let query: Record<string, any> = {};
    if (params?.fields?.length) query['fields[flow]'] = params.fields.join(',');
    if (params?.include?.length) query.include = params.include.join(',');

    let response = await this.axios.get(`/flows/${flowId}/`, { params: query });
    return response.data;
  }

  async updateFlowStatus(flowId: string, status: string): Promise<JsonApiResponse> {
    let response = await this.axios.patch(`/flows/${flowId}/`, {
      data: {
        type: 'flow',
        id: flowId,
        attributes: { status }
      }
    });
    return response.data;
  }

  async deleteFlow(flowId: string): Promise<void> {
    await this.axios.delete(`/flows/${flowId}/`);
  }

  async getFlowActions(
    flowId: string,
    params?: {
      fields?: string[];
      sort?: string;
      pageCursor?: string;
    }
  ): Promise<PaginatedResponse> {
    let query: Record<string, any> = {};
    if (params?.fields?.length) query['fields[flow-action]'] = params.fields.join(',');
    if (params?.sort) query.sort = params.sort;
    if (params?.pageCursor) query['page[cursor]'] = params.pageCursor;

    let response = await this.axios.get(`/flows/${flowId}/flow-actions/`, { params: query });
    return response.data;
  }

  // --- Events ---

  async getEvents(params?: {
    filter?: string;
    fields?: string[];
    sort?: string;
    pageCursor?: string;
    pageSize?: number;
    include?: string[];
  }): Promise<PaginatedResponse> {
    let query: Record<string, any> = {};
    if (params?.filter) query.filter = params.filter;
    if (params?.fields?.length) query['fields[event]'] = params.fields.join(',');
    if (params?.sort) query.sort = params.sort;
    if (params?.pageCursor) query['page[cursor]'] = params.pageCursor;
    if (params?.pageSize) query['page[size]'] = params.pageSize;
    if (params?.include?.length) query.include = params.include.join(',');

    let response = await this.axios.get('/events/', { params: query });
    return response.data;
  }

  async getEvent(eventId: string): Promise<JsonApiResponse> {
    let response = await this.axios.get(`/events/${eventId}/`);
    return response.data;
  }

  async createEvent(attributes: {
    metric: { data: { type: string; attributes: { name: string } } };
    profile: { data: Record<string, any> };
    properties?: Record<string, any>;
    value?: number;
    time?: string;
    unique_id?: string;
  }): Promise<void> {
    await this.axios.post('/events/', {
      data: {
        type: 'event',
        attributes
      }
    });
  }

  // --- Metrics ---

  async getMetrics(params?: {
    filter?: string;
    fields?: string[];
    pageCursor?: string;
    pageSize?: number;
  }): Promise<PaginatedResponse> {
    let query: Record<string, any> = {};
    if (params?.filter) query.filter = params.filter;
    if (params?.fields?.length) query['fields[metric]'] = params.fields.join(',');
    if (params?.pageCursor) query['page[cursor]'] = params.pageCursor;
    if (params?.pageSize) query['page[size]'] = params.pageSize;

    let response = await this.axios.get('/metrics/', { params: query });
    return response.data;
  }

  async queryMetricAggregates(body: {
    metric_id: string;
    measurements: string[];
    interval?: string;
    page_size?: number;
    filter?: string[];
    group_by?: string[];
    timezone?: string;
    page_cursor?: string;
  }): Promise<any> {
    let response = await this.axios.post('/metric-aggregates/', {
      data: {
        type: 'metric-aggregate',
        attributes: body
      }
    });
    return response.data;
  }

  // --- Catalogs ---

  async getCatalogItems(params?: {
    filter?: string;
    fields?: string[];
    sort?: string;
    pageCursor?: string;
    pageSize?: number;
  }): Promise<PaginatedResponse> {
    let query: Record<string, any> = {};
    if (params?.filter) query.filter = params.filter;
    if (params?.fields?.length) query['fields[catalog-item]'] = params.fields.join(',');
    if (params?.sort) query.sort = params.sort;
    if (params?.pageCursor) query['page[cursor]'] = params.pageCursor;
    if (params?.pageSize) query['page[size]'] = params.pageSize;

    let response = await this.axios.get('/catalog-items/', { params: query });
    return response.data;
  }

  async getCatalogItem(itemId: string): Promise<JsonApiResponse> {
    let response = await this.axios.get(`/catalog-items/${itemId}/`);
    return response.data;
  }

  async createCatalogItem(attributes: Record<string, any>): Promise<JsonApiResponse> {
    let response = await this.axios.post('/catalog-items/', {
      data: {
        type: 'catalog-item',
        attributes
      }
    });
    return response.data;
  }

  async updateCatalogItem(
    itemId: string,
    attributes: Record<string, any>
  ): Promise<JsonApiResponse> {
    let response = await this.axios.patch(`/catalog-items/${itemId}/`, {
      data: {
        type: 'catalog-item',
        id: itemId,
        attributes
      }
    });
    return response.data;
  }

  async deleteCatalogItem(itemId: string): Promise<void> {
    await this.axios.delete(`/catalog-items/${itemId}/`);
  }

  async getCatalogVariants(
    itemId: string,
    params?: {
      fields?: string[];
      pageCursor?: string;
      pageSize?: number;
    }
  ): Promise<PaginatedResponse> {
    let query: Record<string, any> = {};
    if (params?.fields?.length) query['fields[catalog-variant]'] = params.fields.join(',');
    if (params?.pageCursor) query['page[cursor]'] = params.pageCursor;
    if (params?.pageSize) query['page[size]'] = params.pageSize;

    let response = await this.axios.get(`/catalog-items/${itemId}/variants/`, {
      params: query
    });
    return response.data;
  }

  async getCatalogCategories(params?: {
    filter?: string;
    fields?: string[];
    sort?: string;
    pageCursor?: string;
    pageSize?: number;
  }): Promise<PaginatedResponse> {
    let query: Record<string, any> = {};
    if (params?.filter) query.filter = params.filter;
    if (params?.fields?.length) query['fields[catalog-category]'] = params.fields.join(',');
    if (params?.sort) query.sort = params.sort;
    if (params?.pageCursor) query['page[cursor]'] = params.pageCursor;
    if (params?.pageSize) query['page[size]'] = params.pageSize;

    let response = await this.axios.get('/catalog-categories/', { params: query });
    return response.data;
  }

  // --- Templates ---

  async getTemplates(params?: {
    filter?: string;
    fields?: string[];
    sort?: string;
    pageCursor?: string;
    pageSize?: number;
  }): Promise<PaginatedResponse> {
    let query: Record<string, any> = {};
    if (params?.filter) query.filter = params.filter;
    if (params?.fields?.length) query['fields[template]'] = params.fields.join(',');
    if (params?.sort) query.sort = params.sort;
    if (params?.pageCursor) query['page[cursor]'] = params.pageCursor;
    if (params?.pageSize) query['page[size]'] = params.pageSize;

    let response = await this.axios.get('/templates/', { params: query });
    return response.data;
  }

  async getTemplate(templateId: string): Promise<JsonApiResponse> {
    let response = await this.axios.get(`/templates/${templateId}/`);
    return response.data;
  }

  async createTemplate(attributes: {
    name: string;
    html?: string;
    editor_type?: string;
  }): Promise<JsonApiResponse> {
    let response = await this.axios.post('/templates/', {
      data: {
        type: 'template',
        attributes
      }
    });
    return response.data;
  }

  async updateTemplate(
    templateId: string,
    attributes: Record<string, any>
  ): Promise<JsonApiResponse> {
    let response = await this.axios.patch(`/templates/${templateId}/`, {
      data: {
        type: 'template',
        id: templateId,
        attributes
      }
    });
    return response.data;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    await this.axios.delete(`/templates/${templateId}/`);
  }

  async cloneTemplate(templateId: string, newName: string): Promise<JsonApiResponse> {
    let response = await this.axios.post('/template-clone/', {
      data: {
        type: 'template',
        id: templateId,
        attributes: { name: newName }
      }
    });
    return response.data;
  }

  async renderTemplate(templateId: string, context?: Record<string, any>): Promise<any> {
    let response = await this.axios.post('/template-render/', {
      data: {
        type: 'template',
        id: templateId,
        attributes: {
          context: context ?? {},
          return_fields: { html: true, text: true }
        }
      }
    });
    return response.data;
  }

  // --- Tags ---

  async getTags(params?: {
    filter?: string;
    fields?: string[];
    sort?: string;
    pageCursor?: string;
    pageSize?: number;
  }): Promise<PaginatedResponse> {
    let query: Record<string, any> = {};
    if (params?.filter) query.filter = params.filter;
    if (params?.fields?.length) query['fields[tag]'] = params.fields.join(',');
    if (params?.sort) query.sort = params.sort;
    if (params?.pageCursor) query['page[cursor]'] = params.pageCursor;
    if (params?.pageSize) query['page[size]'] = params.pageSize;

    let response = await this.axios.get('/tags/', { params: query });
    return response.data;
  }

  async createTag(name: string, tagGroupId: string): Promise<JsonApiResponse> {
    let response = await this.axios.post('/tags/', {
      data: {
        type: 'tag',
        attributes: { name },
        relationships: {
          'tag-group': {
            data: { type: 'tag-group', id: tagGroupId }
          }
        }
      }
    });
    return response.data;
  }

  async updateTag(tagId: string, name: string): Promise<JsonApiResponse> {
    let response = await this.axios.patch(`/tags/${tagId}/`, {
      data: {
        type: 'tag',
        id: tagId,
        attributes: { name }
      }
    });
    return response.data;
  }

  async deleteTag(tagId: string): Promise<void> {
    await this.axios.delete(`/tags/${tagId}/`);
  }

  async getTagGroups(params?: {
    filter?: string;
    fields?: string[];
    sort?: string;
    pageCursor?: string;
    pageSize?: number;
  }): Promise<PaginatedResponse> {
    let query: Record<string, any> = {};
    if (params?.filter) query.filter = params.filter;
    if (params?.fields?.length) query['fields[tag-group]'] = params.fields.join(',');
    if (params?.sort) query.sort = params.sort;
    if (params?.pageCursor) query['page[cursor]'] = params.pageCursor;
    if (params?.pageSize) query['page[size]'] = params.pageSize;

    let response = await this.axios.get('/tag-groups/', { params: query });
    return response.data;
  }

  async createTagGroup(name: string, exclusive?: boolean): Promise<JsonApiResponse> {
    let response = await this.axios.post('/tag-groups/', {
      data: {
        type: 'tag-group',
        attributes: {
          name,
          ...(exclusive !== undefined ? { exclusive } : {})
        }
      }
    });
    return response.data;
  }

  // --- Coupons ---

  async getCoupons(params?: {
    filter?: string;
    pageCursor?: string;
    pageSize?: number;
  }): Promise<PaginatedResponse> {
    let query: Record<string, any> = {};
    if (params?.filter) query.filter = params.filter;
    if (params?.pageCursor) query['page[cursor]'] = params.pageCursor;
    if (params?.pageSize) query['page[size]'] = params.pageSize;

    let response = await this.axios.get('/coupons/', { params: query });
    return response.data;
  }

  async createCoupon(attributes: {
    external_id: string;
    description?: string;
  }): Promise<JsonApiResponse> {
    let response = await this.axios.post('/coupons/', {
      data: {
        type: 'coupon',
        attributes
      }
    });
    return response.data;
  }

  async createCouponCodes(couponId: string, codes: string[]): Promise<any> {
    let response = await this.axios.post('/coupon-code-bulk-create-jobs/', {
      data: {
        type: 'coupon-code-bulk-create-job',
        attributes: {
          coupon_codes: {
            data: codes.map(code => ({
              type: 'coupon-code',
              attributes: {
                unique_code: code
              },
              relationships: {
                coupon: {
                  data: { type: 'coupon', id: couponId }
                }
              }
            }))
          }
        }
      }
    });
    return response.data;
  }

  // --- Webhooks ---

  async getWebhooks(params?: {
    fields?: string[];
    pageCursor?: string;
  }): Promise<PaginatedResponse> {
    let query: Record<string, any> = {};
    if (params?.fields?.length) query['fields[webhook]'] = params.fields.join(',');
    if (params?.pageCursor) query['page[cursor]'] = params.pageCursor;

    let response = await this.axios.get('/webhooks/', { params: query });
    return response.data;
  }

  async createWebhook(attributes: {
    name: string;
    endpoint_url: string;
    secret_key: string;
    topics: string[];
    description?: string;
    enabled?: boolean;
  }): Promise<JsonApiResponse> {
    let response = await this.axios.post('/webhooks/', {
      data: {
        type: 'webhook',
        attributes: {
          name: attributes.name,
          endpoint_url: attributes.endpoint_url,
          secret_key: attributes.secret_key,
          enabled_topics: attributes.topics,
          description: attributes.description ?? '',
          enabled: attributes.enabled ?? true
        }
      }
    });
    return response.data;
  }

  async updateWebhook(
    webhookId: string,
    attributes: Record<string, any>
  ): Promise<JsonApiResponse> {
    let response = await this.axios.patch(`/webhooks/${webhookId}/`, {
      data: {
        type: 'webhook',
        id: webhookId,
        attributes
      }
    });
    return response.data;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    await this.axios.delete(`/webhooks/${webhookId}/`);
  }

  async getWebhookTopics(): Promise<PaginatedResponse> {
    let response = await this.axios.get('/webhook-topics/');
    return response.data;
  }

  // --- Reporting ---

  private async queryReport(
    path: string,
    type: string,
    attributes: Record<string, any>,
    params?: { fields?: string[]; pageCursor?: string }
  ): Promise<any> {
    let query: Record<string, any> = {};
    if (params?.fields?.length) query[`fields[${type}]`] = params.fields.join(',');
    if (params?.pageCursor) query.page_cursor = params.pageCursor;

    let response = await this.axios.post(
      path,
      {
        data: {
          type,
          attributes
        }
      },
      { params: query }
    );
    return response.data;
  }

  async queryCampaignValues(
    body: Record<string, any>,
    params?: { fields?: string[]; pageCursor?: string }
  ): Promise<any> {
    return this.queryReport(
      '/campaign-values-reports/',
      'campaign-values-report',
      body,
      params
    );
  }

  async queryFlowValues(
    body: Record<string, any>,
    params?: { fields?: string[]; pageCursor?: string }
  ): Promise<any> {
    return this.queryReport('/flow-values-reports/', 'flow-values-report', body, params);
  }

  async queryFlowSeries(
    body: Record<string, any>,
    params?: { fields?: string[]; pageCursor?: string }
  ): Promise<any> {
    return this.queryReport('/flow-series-reports/', 'flow-series-report', body, params);
  }

  async queryFormValues(
    body: Record<string, any>,
    params?: { fields?: string[] }
  ): Promise<any> {
    return this.queryReport('/form-values-reports/', 'form-values-report', body, params);
  }

  async queryFormSeries(
    body: Record<string, any>,
    params?: { fields?: string[] }
  ): Promise<any> {
    return this.queryReport('/form-series-reports/', 'form-series-report', body, params);
  }

  async querySegmentValues(
    body: Record<string, any>,
    params?: { fields?: string[] }
  ): Promise<any> {
    return this.queryReport('/segment-values-reports/', 'segment-values-report', body, params);
  }

  async querySegmentSeries(
    body: Record<string, any>,
    params?: { fields?: string[] }
  ): Promise<any> {
    return this.queryReport('/segment-series-reports/', 'segment-series-report', body, params);
  }

  // --- Data Privacy ---

  async requestProfileDeletion(params: {
    email?: string;
    phoneNumber?: string;
    profileId?: string;
  }): Promise<void> {
    let profile: Record<string, any> = { type: 'profile' };
    if (params.profileId) {
      profile.id = params.profileId;
    }
    if (params.email || params.phoneNumber) {
      profile.attributes = {};
      if (params.email) profile.attributes.email = params.email;
      if (params.phoneNumber) profile.attributes.phone_number = params.phoneNumber;
    }

    await this.axios.post('/data-privacy-deletion-jobs/', {
      data: {
        type: 'data-privacy-deletion-job',
        attributes: {
          profile: {
            data: profile
          }
        }
      }
    });
  }

  // --- Accounts ---

  async getAccounts(params?: { fields?: string[] }): Promise<PaginatedResponse> {
    let query: Record<string, any> = {};
    if (params?.fields?.length) query['fields[account]'] = params.fields.join(',');

    let response = await this.axios.get('/accounts/', { params: query });
    return response.data;
  }

  // --- Forms ---

  async getForms(params?: {
    filter?: string;
    fields?: string[];
    sort?: string;
    pageCursor?: string;
    pageSize?: number;
  }): Promise<PaginatedResponse> {
    let query: Record<string, any> = {};
    if (params?.filter) query.filter = params.filter;
    if (params?.fields?.length) query['fields[form]'] = params.fields.join(',');
    if (params?.sort) query.sort = params.sort;
    if (params?.pageCursor) query['page[cursor]'] = params.pageCursor;
    if (params?.pageSize) query['page[size]'] = params.pageSize;

    let response = await this.axios.get('/forms/', { params: query });
    return response.data;
  }

  async getForm(formId: string): Promise<JsonApiResponse> {
    let response = await this.axios.get(`/forms/${formId}/`);
    return response.data;
  }

  // --- Images ---

  async getImages(params?: {
    filter?: string;
    fields?: string[];
    sort?: string;
    pageCursor?: string;
    pageSize?: number;
  }): Promise<PaginatedResponse> {
    let query: Record<string, any> = {};
    if (params?.filter) query.filter = params.filter;
    if (params?.fields?.length) query['fields[image]'] = params.fields.join(',');
    if (params?.sort) query.sort = params.sort;
    if (params?.pageCursor) query['page[cursor]'] = params.pageCursor;
    if (params?.pageSize) query['page[size]'] = params.pageSize;

    let response = await this.axios.get('/images/', { params: query });
    return response.data;
  }

  async getImage(imageId: string): Promise<JsonApiResponse> {
    let response = await this.axios.get(`/images/${imageId}/`);
    return response.data;
  }

  async uploadImage(attributes: {
    name?: string;
    import_from_url: string;
    hidden?: boolean;
  }): Promise<JsonApiResponse> {
    let response = await this.axios.post('/images/', {
      data: {
        type: 'image',
        attributes
      }
    });
    return response.data;
  }

  async updateImage(
    imageId: string,
    attributes: {
      name?: string;
      hidden?: boolean;
    }
  ): Promise<JsonApiResponse> {
    let response = await this.axios.patch(`/images/${imageId}/`, {
      data: {
        type: 'image',
        id: imageId,
        attributes
      }
    });
    return response.data;
  }
}
