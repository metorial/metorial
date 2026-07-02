import { createAxios } from 'slates';

export interface Destination {
  url: string;
  country?: string;
  os?: string;
}

export interface Metatag {
  name: string;
  content: string;
}

export interface Snippet {
  id: string;
  parameters?: Record<string, string>;
}

export interface AliasDetails {
  createdAt: number;
  updatedAt: number;
  name: string;
  domainName: string;
  destinations: Destination[];
  metatags: Metatag[];
  snippets: Snippet[];
}

export interface CreateAliasRequest {
  aliasName?: string;
  domainName?: string;
  destinations: Destination[];
  metatags?: Metatag[];
  snippets?: Snippet[];
}

export interface CreateAliasResponse {
  aliasName: string;
  domainName: string;
  shortUrl: string;
}

export interface UpdateAliasRequest {
  aliasName: string;
  domainName?: string;
  destinations?: Destination[];
  metatags?: Metatag[];
  snippets?: Snippet[];
}

export interface DeleteAliasRequest {
  aliasName: string;
  domainName?: string;
}

export interface GetAliasRequest {
  aliasName: string;
  domainName?: string;
}

export interface ListAliasesRequest {
  domainName?: string;
  lastId?: string;
}

export interface ListAliasesResponse {
  aliases: string[];
  lastId: string;
}

export interface GetClicksRequest {
  aliasName: string;
  domainName?: string;
  lastId?: string;
  limit?: number;
}

export interface ClickEntry {
  alias: string;
  aliasId: string;
  browser: string;
  country: string;
  createdAt: number;
  destination: string;
  domain: string;
  os: string;
  referrer: string;
  userAgent: string;
}

export interface GetClicksResponse {
  clicks: ClickEntry[];
  lastId: string;
}

export class Client {
  private axios;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://api.shorten.rest',
      headers: {
        'x-api-key': token,
        'Content-Type': 'application/json'
      }
    });
  }

  async createAlias(request: CreateAliasRequest): Promise<CreateAliasResponse> {
    let response = await this.axios.post('/aliases', request);
    return response.data;
  }

  async getAlias(request: GetAliasRequest): Promise<AliasDetails> {
    let params: Record<string, string> = {
      aliasName: request.aliasName
    };
    if (request.domainName) {
      params.domainName = request.domainName;
    }
    let response = await this.axios.get('/aliases', { params });
    return response.data;
  }

  async updateAlias(request: UpdateAliasRequest): Promise<void> {
    await this.axios.put('/aliases', request);
  }

  async deleteAlias(request: DeleteAliasRequest): Promise<void> {
    await this.axios.delete('/aliases', {
      data: request
    });
  }

  async listAliases(request: ListAliasesRequest): Promise<ListAliasesResponse> {
    let params: Record<string, string> = {};
    if (request.domainName) {
      params.domainName = request.domainName;
    }
    if (request.lastId) {
      params.lastId = request.lastId;
    }
    let response = await this.axios.get('/aliases/all', { params });
    return response.data;
  }

  async getClicks(request: GetClicksRequest): Promise<GetClicksResponse> {
    let params: Record<string, string | number> = {
      aliasName: request.aliasName
    };
    if (request.domainName) {
      params.domainName = request.domainName;
    }
    if (request.lastId) {
      params.lastId = request.lastId;
    }
    if (request.limit) {
      params.limit = request.limit;
    }
    let response = await this.axios.get('/clicks', { params });
    return response.data;
  }
}
