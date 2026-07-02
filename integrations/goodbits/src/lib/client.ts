import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://app.goodbits.io/api/v1',
      headers: {
        Authorization: config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  async getNewsletter(): Promise<{ newsletterId: number; name: string }> {
    let response = await this.axios.get('/newsletter');
    let data = response.data;
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
    let sub = response.data.subscriber;
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
    let sub = response.data.subscriber || response.data;
    return {
      email: params.email,
      status: sub.status || params.status
    };
  }

  async getSubscriberCounts(): Promise<{
    active: number;
    unsubscribed: number;
    deleted: number;
  }> {
    let response = await this.axios.get('/subscriber_counts');
    let data = response.data;
    return {
      active: data.active ?? 0,
      unsubscribed: data.unsubscribed ?? 0,
      deleted: data.deleted ?? 0
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
    let link = response.data.link || response.data;
    return {
      linkId: String(link.id ?? ''),
      url: link.url ?? params.url,
      title: link.title ?? '',
      description: link.description ?? ''
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
    let data = response.data;

    let emails = (data.emails || []).map((e: any) => ({
      newsletterEmailId: String(e.id),
      subject: e.subject ?? '',
      sentAt: e.sent_at ?? ''
    }));

    return {
      emails,
      meta: {
        total: data.meta?.total ?? emails.length,
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
    let data = response.data;

    let trackedLinks = (data.newsletter_links || []).map((link: any) => ({
      url: link.url ?? '',
      uniqueClicks: link.unique_clicks ?? 0,
      engagementRate: link.engagement_rate ?? 0
    }));

    return {
      newsletterEmailId,
      recipients: data.recipients?.value ?? 0,
      uniqueOpens: data.unique_opens?.value ?? 0,
      uniqueClicks: data.unique_clicks?.value ?? 0,
      engagementRate: data.engagement_rate?.value ?? 0,
      deltaPreviousEngagementRate: data.engagement_rate?.delta_previous ?? null,
      trackedLinks
    };
  }
}
