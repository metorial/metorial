import { createAxios } from 'slates';

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.curated.co/api/v3',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Token token="${config.token}"`
      }
    });
  }

  // Publications

  async listPublications(): Promise<Publication[]> {
    let response = await this.axios.get('/publications');
    return response.data;
  }

  // Issues

  async listIssues(
    publicationId: string,
    params?: {
      page?: number;
      perPage?: number;
      state?: 'published' | 'draft';
      stats?: boolean;
    }
  ): Promise<IssueListResponse> {
    let response = await this.axios.get(`/publications/${publicationId}/issues`, {
      params: {
        page: params?.page,
        per_page: params?.perPage,
        state: params?.state,
        stats: params?.stats
      }
    });
    return response.data;
  }

  async getIssue(
    publicationId: string,
    issueNumber: string,
    params?: {
      stats?: boolean;
    }
  ): Promise<IssueDetail> {
    let response = await this.axios.get(
      `/publications/${publicationId}/issues/${issueNumber}`,
      {
        params: {
          stats: params?.stats
        }
      }
    );
    return response.data;
  }

  async createDraftIssue(publicationId: string): Promise<IssueDetail> {
    let response = await this.axios.post(`/publications/${publicationId}/issues/`);
    return response.data;
  }

  async deleteDraftIssue(publicationId: string, issueId: string): Promise<void> {
    await this.axios.delete(`/publications/${publicationId}/issues/${issueId}`);
  }

  // Links

  async listLinks(publicationId: string): Promise<Link[]> {
    let response = await this.axios.get(`/publications/${publicationId}/links`);
    return response.data;
  }

  async getLink(publicationId: string, linkId: string): Promise<Link> {
    let response = await this.axios.get(`/publications/${publicationId}/links/${linkId}`);
    return response.data;
  }

  async createLink(
    publicationId: string,
    params: {
      url: string;
      title?: string;
      description?: string;
      image?: string;
      category?: string;
    }
  ): Promise<Link> {
    let response = await this.axios.post(`/publications/${publicationId}/links`, null, {
      params: {
        url: params.url,
        title: params.title,
        description: params.description,
        image: params.image,
        category: params.category
      }
    });
    return response.data;
  }

  async updateLink(
    publicationId: string,
    linkId: string,
    params: {
      url?: string;
      title?: string;
      description?: string;
      category?: string;
      issueId?: string;
    }
  ): Promise<Link> {
    let response = await this.axios.put(
      `/publications/${publicationId}/links/${linkId}`,
      null,
      {
        params: {
          url: params.url,
          title: params.title,
          description: params.description,
          category: params.category,
          issue_id: params.issueId
        }
      }
    );
    return response.data;
  }

  async deleteLink(publicationId: string, linkId: string): Promise<void> {
    await this.axios.delete(`/publications/${publicationId}/links/${linkId}`);
  }

  // Subscribers

  async listSubscribers(
    publicationId: string,
    params?: {
      page?: number;
      perPage?: number;
    }
  ): Promise<SubscriberListResponse> {
    let response = await this.axios.get(`/publications/${publicationId}/email_subscribers`, {
      params: {
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  async getSubscriber(publicationId: string, subscriberId: string): Promise<Subscriber> {
    let response = await this.axios.get(
      `/publications/${publicationId}/email_subscribers/${subscriberId}`
    );
    return response.data;
  }

  async subscribe(
    publicationId: string,
    params: {
      email: string;
      sync?: boolean;
    }
  ): Promise<SubscribeResponse> {
    let response = await this.axios.post(`/publications/${publicationId}/email_subscribers`, {
      email: params.email,
      sync: params.sync
    });
    return response.data;
  }

  async listUnsubscribers(
    publicationId: string,
    params?: {
      page?: number;
      perPage?: number;
    }
  ): Promise<UnsubscriberListResponse> {
    let response = await this.axios.get(`/publications/${publicationId}/email_unsubscribers`, {
      params: {
        page: params?.page,
        per_page: params?.perPage
      }
    });
    return response.data;
  }

  async unsubscribe(
    publicationId: string,
    params: {
      email: string;
    }
  ): Promise<SubscribeResponse> {
    let response = await this.axios.post(
      `/publications/${publicationId}/email_unsubscribers`,
      {
        email: params.email
      }
    );
    return response.data;
  }

  // Categories

  async listCategories(publicationId: string): Promise<Category[]> {
    let response = await this.axios.get(`/publications/${publicationId}/categories`);
    return response.data;
  }
}

// Types

export interface Publication {
  id: number;
  name: string;
  key: string;
}

export interface IssueSummary {
  number: number;
  title: string;
  summary: string;
  url: string;
  published_at: string | null;
  updated_at: string;
}

export interface IssueListResponse {
  page: number;
  total_pages: number;
  total_results: number;
  issues?: IssueSummary[];
  data?: IssueSummary[];
}

export interface IssueCategory {
  name: string;
  items?: IssueItem[];
}

export interface IssueItem {
  type: string;
  title?: string;
  description?: string;
  url?: string;
  image_url?: string;
}

export interface IssueDetail {
  id: number;
  number: number;
  title: string;
  summary: string;
  url: string;
  published_at: string | null;
  updated_at: string;
  categories?: IssueCategory[];
  open_rate?: number;
  click_rate?: number;
}

export interface Link {
  id: number;
  url: string;
  title: string;
  description: string;
  image_url?: string;
  category?: string;
  issue_id?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface Subscriber {
  id: number;
  email: string;
  created_at?: string;
}

export interface SubscriberListResponse {
  page?: number;
  total_pages?: number;
  total_results?: number;
  subscribers?: Subscriber[];
  data?: Subscriber[];
}

export interface UnsubscriberListResponse {
  page?: number;
  total_pages?: number;
  total_results?: number;
  unsubscribers?: Subscriber[];
  data?: Subscriber[];
}

export interface SubscribeResponse {
  success: boolean;
  error_message?: string;
  errors?: string[];
}

export interface Category {
  code: string;
  name: string;
  sponsored: boolean;
  limit: number | null;
}
