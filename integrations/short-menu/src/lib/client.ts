import { createAxios } from 'slates';

export interface CreateLinkParams {
  destinationUrl: string;
  domain: string;
  slug?: string;
  tags?: { name: string; id?: string }[];
}

export interface UpdateLinkParams {
  destinationUrl?: string;
  tags?: { name: string; id?: string }[];
}

export interface TagResponse {
  id: string;
  name: string;
}

export interface DomainResponse {
  id: string;
  name: string;
}

export interface LinkResponse {
  id: string;
  createdAt: string;
  destinationUrl: string;
  title?: string;
  slug: string;
  domain: DomainResponse;
  shortUrl: string;
  clickCount?: number;
  tags: TagResponse[];
}

export class Client {
  private axios: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://api.shortmenu.com',
      headers: {
        'x-api-key': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  async createLink(params: CreateLinkParams): Promise<LinkResponse> {
    let response = await this.axios.post('/links', {
      destinationUrl: params.destinationUrl,
      domain: params.domain,
      slug: params.slug,
      tags: params.tags ?? []
    });
    return response.data;
  }

  async updateLink(linkId: string, params: UpdateLinkParams): Promise<LinkResponse> {
    let body: Record<string, unknown> = {};
    if (params.destinationUrl !== undefined) {
      body.destinationUrl = params.destinationUrl;
    }
    if (params.tags !== undefined) {
      body.tags = params.tags;
    }
    let response = await this.axios.put(`/links/${linkId}`, body);
    return response.data;
  }

  async deleteLink(linkId: string): Promise<void> {
    await this.axios.delete(`/links/${linkId}`);
  }
}
