import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';
import { z } from 'zod';

let providerId = z.union([z.string(), z.number()]);
let newsletterResponse = z.object({ id: z.number(), name: z.string() });
let subscriberResponse = z.object({
  email: z.string().min(1),
  first_name: z.string(),
  last_name: z.string(),
  name: z.string()
});
let subscriberStatusResponse = z.object({ status: z.string() });
let subscriberCountsResponse = z.object({
  active: z.number(),
  unsubscribed: z.number(),
  deleted: z.number()
});
let linkResponse = z.object({
  id: providerId,
  url: z.string(),
  title: z.string(),
  description: z.string()
});
let sentEmailsResponse = z.object({
  emails: z.array(z.object({ id: providerId, subject: z.string(), sent_at: z.string() })),
  meta: z.object({
    total: z.number(),
    offset: z.number().nullish(),
    limit: z.number().nullish()
  })
});
let metricResponse = z.object({ value: z.number() });
let analyticsResponse = z.object({
  recipients: metricResponse,
  unique_opens: metricResponse,
  unique_clicks: metricResponse,
  engagement_rate: z.object({ value: z.number(), delta_previous: z.number().nullable() }),
  newsletter_links: z.array(
    z.object({ url: z.string(), unique_clicks: z.number(), engagement_rate: z.number() })
  )
});

let parseResponse = <T>(schema: z.ZodType<T>, value: unknown, upstreamStatus: number): T => {
  let result = schema.safeParse(value);
  if (!result.success) {
    let details = result.error.issues
      .map(issue => `${issue.path.join('.') || 'response'}: ${issue.message}`)
      .join('; ');
    throw createApiServiceError(`Goodbits returned an invalid API response: ${details}`, {
      reason: 'goodbits_invalid_response',
      upstreamStatus
    });
  }
  return result.data;
};

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim()) {
      throw createApiServiceError('A Goodbits API token is required.');
    }

    this.axios = createAuthenticatedAxios({
      baseURL: 'https://app.goodbits.io/api/v1',
      authHeader: { value: config.token },
      timeout: 30_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Goodbits',
          reason: 'goodbits_api_error'
        })
    });
  }

  async getNewsletter(): Promise<{ newsletterId: number; name: string }> {
    let response = await this.axios.get('/newsletter');
    let data = parseResponse(newsletterResponse, response.data, response.status);
    return {
      newsletterId: data.id,
      name: data.name
    };
  }

  async createSubscriber(params: {
    email: string;
    firstName?: string;
    lastName?: string;
  }): Promise<{
    email: string;
    firstName: string;
    lastName: string;
    name: string;
  }> {
    let response = await this.axios.post('/subscribers', {
      subscriber: {
        email: params.email,
        first_name: params.firstName,
        last_name: params.lastName
      }
    });
    let sub = parseResponse(subscriberResponse, response.data?.subscriber, response.status);
    return {
      email: sub.email,
      firstName: sub.first_name,
      lastName: sub.last_name,
      name: sub.name
    };
  }

  async updateSubscriberStatus(params: {
    email: string;
    status: 'active' | 'unsubscribed' | 'deleted';
  }): Promise<{
    email: string;
    status: string;
  }> {
    let response = await this.axios.put(`/subscribers/${encodeURIComponent(params.email)}`, {
      subscriber: {
        status: params.status
      }
    });
    let data = response.data;
    let sub = parseResponse(
      subscriberStatusResponse,
      isApiErrorRecord(data) && data.subscriber !== undefined ? data.subscriber : data,
      response.status
    );
    return {
      email: params.email,
      status: sub.status
    };
  }

  async getSubscriberCounts(): Promise<{
    active: number;
    unsubscribed: number;
    deleted: number;
  }> {
    let response = await this.axios.get('/subscriber_counts');
    let data = parseResponse(subscriberCountsResponse, response.data, response.status);
    return {
      active: data.active,
      unsubscribed: data.unsubscribed,
      deleted: data.deleted
    };
  }

  async createLink(params: {
    url: string;
    title?: string;
    description?: string;
    fetchRemoteThumbnailUrl?: string;
    imageCandidates?: string[];
  }): Promise<{
    linkId: string;
    url: string;
    title: string;
    description: string;
  }> {
    let response = await this.axios.post('/links', {
      link: {
        url: params.url,
        title: params.title,
        description: params.description,
        fetch_remote_thumbnail_url: params.fetchRemoteThumbnailUrl,
        image_candidates: params.imageCandidates
      }
    });
    let data = response.data;
    let link = parseResponse(
      linkResponse,
      isApiErrorRecord(data) && data.link !== undefined ? data.link : data,
      response.status
    );
    return {
      linkId: String(link.id),
      url: link.url,
      title: link.title,
      description: link.description
    };
  }

  async listSentEmails(params?: { offset?: number; limit?: number }): Promise<{
    emails: Array<{
      newsletterEmailId: string;
      subject: string;
      sentAt: string;
    }>;
    meta: {
      total: number;
      offset: number;
      limit: number;
    };
  }> {
    let query: Record<string, string> = {};
    if (params?.offset !== undefined) query.offset = String(params.offset);
    if (params?.limit !== undefined) query.limit = String(params.limit);

    let response = await this.axios.get('/emails', { params: query });
    let data = parseResponse(sentEmailsResponse, response.data, response.status);

    let emails = data.emails.map(e => ({
      newsletterEmailId: String(e.id),
      subject: e.subject,
      sentAt: e.sent_at
    }));

    return {
      emails,
      meta: {
        total: data.meta.total,
        offset: data.meta?.offset ?? params?.offset ?? 0,
        limit: data.meta?.limit ?? params?.limit ?? 10
      }
    };
  }

  async getEmailAnalytics(newsletterEmailId: string): Promise<{
    newsletterEmailId: string;
    recipients: number;
    uniqueOpens: number;
    uniqueClicks: number;
    engagementRate: number;
    deltaPreviousEngagementRate: number | null;
    trackedLinks: Array<{
      url: string;
      uniqueClicks: number;
      engagementRate: number;
    }>;
  }> {
    let response = await this.axios.get(
      `/emails/${encodeURIComponent(newsletterEmailId)}/analytics`
    );
    let data = parseResponse(analyticsResponse, response.data, response.status);

    let trackedLinks = data.newsletter_links.map(link => ({
      url: link.url,
      uniqueClicks: link.unique_clicks,
      engagementRate: link.engagement_rate
    }));

    return {
      newsletterEmailId,
      recipients: data.recipients.value,
      uniqueOpens: data.unique_opens.value,
      uniqueClicks: data.unique_clicks.value,
      engagementRate: data.engagement_rate.value,
      deltaPreviousEngagementRate: data.engagement_rate.delta_previous,
      trackedLinks
    };
  }
}
