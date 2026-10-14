import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

let createDiffbotApi = (baseURL: string) => {
  let api = createAuthenticatedAxios({
    baseURL,
    timeout: 120_000,
    contentType: false,
    errorAdapter: error =>
      buildApiServiceError(error, {
        providerLabel: 'Diffbot',
        reason: 'diffbot_api_error',
        detailKeys: ['error', 'message', 'errorCode', 'code']
      })
  });
  api.interceptors.response.use(response => {
    let documents = Array.isArray(response.data) ? response.data : [response.data];
    for (let data of documents) {
      if (
        isApiErrorRecord(data) &&
        (data.error === true ||
          typeof data.error === 'string' ||
          (typeof data.errorCode === 'number' && data.errorCode >= 400) ||
          (baseURL === 'https://nl.diffbot.com' &&
            Array.isArray(data.errors) &&
            data.errors.length > 0))
      ) {
        throw buildApiServiceError(
          { response: { status: response.status, data } },
          {
            providerLabel: 'Diffbot',
            reason: 'diffbot_api_error',
            detailKeys: ['error', 'message', 'errorCode', 'code'],
            extractUpstreamCode: () =>
              data.errorCode !== undefined ? String(data.errorCode) : undefined
          }
        );
      }
    }
    return response;
  });
  return api;
};

let extractApi = createDiffbotApi('https://api.diffbot.com');
let kgApi = createDiffbotApi('https://kg.diffbot.com');
let nlApi = createDiffbotApi('https://nl.diffbot.com');
let webApi = createDiffbotApi('https://llm.diffbot.com');

// Keep the original match envelope while exposing identifiers at the existing
// entity field level. Older responses that already contain entity fields work too.
export let withEntityFields = (entry: any) =>
  isApiErrorRecord(entry?.entity) ? { ...entry.entity, ...entry } : entry;

export let withJobStatus = (job: any) => {
  let { jobStatus, ...details } = job;
  let statusDetails = isApiErrorRecord(jobStatus) ? jobStatus : undefined;
  let message = typeof jobStatus === 'string' ? jobStatus : statusDetails?.message;
  return {
    ...details,
    ...(typeof message === 'string' ? { jobStatus: message } : {}),
    ...(statusDetails ? { jobStatusDetails: statusDetails } : {})
  };
};

export type ExtractType =
  | 'analyze'
  | 'article'
  | 'product'
  | 'discussion'
  | 'image'
  | 'video'
  | 'list'
  | 'event'
  | 'job';

export interface ExtractOptions {
  url: string;
  type: ExtractType;
  fields?: string;
  timeout?: number;
  paging?: boolean;
  discussion?: boolean;
  body?: string;
  contentType?: string;
  customJs?: string;
}

export interface KnowledgeGraphSearchOptions {
  query: string;
  size?: number;
  from?: number;
  type?: string;
  sortBy?: string;
  filter?: string;
}

export interface EnhanceOptions {
  entityType: 'organization' | 'person';
  name?: string;
  url?: string;
  email?: string;
  phone?: string;
  employer?: string;
  title?: string;
  location?: string;
  description?: string;
  customId?: string;
}

export interface NaturalLanguageOptions {
  content: string;
  lang?: string;
  tagMode?: 'types' | 'entities' | 'sentiment';
}

export interface CrawlCreateOptions {
  name: string;
  seeds: string[];
  apiType?: ExtractType;
  maxToCrawl?: number;
  maxToProcess?: number;
  maxHops?: number;
  urlCrawlPattern?: string;
  urlProcessPattern?: string;
  repeat?: number;
  repeatFrequency?: number;
  notifyWebhook?: string;
  onlyProcessIfNew?: boolean;
}

export interface BulkCreateOptions {
  name: string;
  urls: string[];
  apiType?: ExtractType;
  notifyWebhook?: string;
  customHeaders?: Record<string, string>;
}

export class DiffbotClient {
  private token: string;

  constructor(config: { token: string }) {
    if (!config.token?.trim()) {
      throw createApiServiceError(
        'A Diffbot API token is required. Reconnect with a valid token.'
      );
    }
    this.token = config.token;
  }

  async extractPage(options: ExtractOptions): Promise<any> {
    let endpoint = `/v3/${options.type}`;
    let params: Record<string, any> = {
      token: this.token,
      url: options.url
    };

    if (options.fields) params.fields = options.fields;
    if (options.timeout !== undefined) params.timeout = options.timeout;
    if (options.paging !== undefined) params.paging = options.paging;
    if (options.discussion !== undefined) params.discussion = options.discussion;

    if (options.body !== undefined) {
      let response = await extractApi.post(endpoint, options.body, {
        params,
        headers: {
          'Content-Type': options.contentType || 'text/html'
        }
      });
      return response.data;
    }

    let response = await extractApi.get(endpoint, { params });
    return response.data;
  }

  async searchKnowledgeGraph(options: KnowledgeGraphSearchOptions): Promise<any> {
    let params: Record<string, any> = {
      token: this.token,
      query: options.query
    };

    if (options.size !== undefined) params.size = options.size;
    if (options.from !== undefined) params.from = options.from;
    if (options.type) params.type = options.type;
    if (options.filter) params.filter = options.filter;

    let response = await kgApi.get('/kg/v3/dql', { params });
    return response.data;
  }

  async enhanceEntity(options: EnhanceOptions): Promise<any> {
    let params: Record<string, any> = {
      token: this.token,
      type: options.entityType === 'organization' ? 'Organization' : 'Person'
    };

    if (options.name) params.name = options.name;
    if (options.url) params.url = options.url;
    if (options.email) params.email = options.email;
    if (options.phone) params.phone = options.phone;
    if (options.employer) params.employer = options.employer;
    if (options.title) params.title = options.title;
    if (options.location) params.location = options.location;
    if (options.description) params.description = options.description;
    if (options.customId) params.customId = options.customId;

    let response = await kgApi.get('/kg/v3/enhance', { params });
    return response.data;
  }

  async enhanceCombine(options: EnhanceOptions): Promise<any> {
    let params: Record<string, any> = {
      token: this.token,
      type: options.entityType === 'organization' ? 'Organization' : 'Person'
    };

    if (options.name) params.name = options.name;
    if (options.url) params.url = options.url;
    if (options.email) params.email = options.email;
    if (options.phone) params.phone = options.phone;
    if (options.employer) params.employer = options.employer;
    if (options.title) params.title = options.title;
    if (options.location) params.location = options.location;
    if (options.description) params.description = options.description;

    let response = await kgApi.get('/kg/v3/enhance/combine', { params });
    return response.data;
  }

  async analyzeText(options: NaturalLanguageOptions): Promise<any> {
    let params: Record<string, any> = {
      token: this.token
    };

    let response = await nlApi.post(
      '/v1/',
      [
        {
          content: options.content,
          ...(options.lang ? { lang: options.lang } : {})
        }
      ],
      {
        params,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    let result = Array.isArray(response.data) ? response.data[0] : response.data;
    if (!isApiErrorRecord(result)) {
      throw createApiServiceError('Diffbot returned no text analysis result.');
    }
    return result;
  }

  async createCrawl(options: CrawlCreateOptions): Promise<any> {
    let params: Record<string, any> = {
      name: options.name,
      seeds: options.seeds.join(' ')
    };

    params.apiUrl = `https://api.diffbot.com/v3/${options.apiType ?? 'analyze'}`;
    if (options.maxToCrawl !== undefined) params.maxToCrawl = options.maxToCrawl;
    if (options.maxToProcess !== undefined) params.maxToProcess = options.maxToProcess;
    if (options.maxHops !== undefined) params.maxHops = options.maxHops;
    if (options.urlCrawlPattern) params.urlCrawlRegEx = options.urlCrawlPattern;
    if (options.urlProcessPattern) params.urlProcessRegEx = options.urlProcessPattern;
    if (options.repeat !== undefined) params.repeat = options.repeat;
    if (options.repeatFrequency !== undefined)
      params.repeat = options.repeat === 0 ? 0 : options.repeatFrequency;
    if (options.notifyWebhook) params.notifyWebhook = options.notifyWebhook;
    if (options.onlyProcessIfNew !== undefined)
      params.onlyProcessIfNew = options.onlyProcessIfNew ? 1 : 0;

    let body = new URLSearchParams();
    for (let [key, value] of Object.entries(params)) body.set(key, String(value));
    let response = await extractApi.post('/v3/crawl', body.toString(), {
      params: { token: this.token },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async getCrawlStatus(crawlName: string): Promise<any> {
    let response = await extractApi.get('/v3/crawl', {
      params: {
        token: this.token,
        name: crawlName
      }
    });
    return response.data;
  }

  async listCrawls(): Promise<any> {
    let response = await extractApi.get('/v3/crawl', {
      params: {
        token: this.token
      }
    });
    return response.data;
  }

  async deleteCrawl(crawlName: string): Promise<any> {
    let response = await extractApi.get('/v3/crawl', {
      params: {
        token: this.token,
        name: crawlName,
        delete: 1
      }
    });
    return response.data;
  }

  async pauseCrawl(crawlName: string): Promise<any> {
    let response = await extractApi.get('/v3/crawl', {
      params: {
        token: this.token,
        name: crawlName,
        pause: 1
      }
    });
    return response.data;
  }

  async resumeCrawl(crawlName: string): Promise<any> {
    let response = await extractApi.get('/v3/crawl', {
      params: {
        token: this.token,
        name: crawlName,
        pause: 0
      }
    });
    return response.data;
  }

  async restartCrawl(crawlName: string): Promise<any> {
    let response = await extractApi.get('/v3/crawl', {
      params: {
        token: this.token,
        name: crawlName,
        restart: 1
      }
    });
    return response.data;
  }

  async getCrawlResults(crawlName: string, format?: string, num?: number): Promise<any> {
    let params: Record<string, any> = {
      token: this.token,
      name: crawlName
    };
    if (format) params.format = format;
    if (num !== undefined) params.num = num;

    let response = await extractApi.get('/v3/crawl/data', { params });
    return response.data;
  }

  async createBulkJob(options: BulkCreateOptions): Promise<any> {
    let params: Record<string, any> = {
      name: options.name,
      urls: options.urls.join(' ')
    };

    params.apiUrl = `https://api.diffbot.com/v3/${options.apiType ?? 'analyze'}`;
    if (options.notifyWebhook) params.notifyWebhook = options.notifyWebhook;

    let body = new URLSearchParams();
    for (let [key, value] of Object.entries(params)) body.set(key, String(value));
    for (let [key, value] of Object.entries(options.customHeaders ?? {})) {
      body.append('customHeaders', `${key}:${value}`);
    }
    let response = await extractApi.post('/v3/bulk', body.toString(), {
      params: { token: this.token },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async getBulkJobStatus(jobName: string): Promise<any> {
    let response = await extractApi.get('/v3/bulk', {
      params: {
        token: this.token,
        name: jobName
      }
    });
    return response.data;
  }

  async listBulkJobs(): Promise<any> {
    let response = await extractApi.get('/v3/bulk', {
      params: {
        token: this.token
      }
    });
    return response.data;
  }

  async deleteBulkJob(jobName: string): Promise<any> {
    let response = await extractApi.get('/v3/bulk', {
      params: {
        token: this.token,
        name: jobName,
        delete: 1
      }
    });
    return response.data;
  }

  async getBulkJobResults(jobName: string, format?: string, num?: number): Promise<any> {
    let params: Record<string, any> = {
      token: this.token,
      name: jobName
    };
    if (format) params.format = format;
    if (num !== undefined) params.num = num;

    let response = await extractApi.get('/v3/bulk/data', { params });
    return response.data;
  }

  async getAccount(days?: number): Promise<any> {
    let response = await extractApi.get('/v4/account', {
      params: { token: this.token, days }
    });
    // Tokens and child tokens are credentials, not account profile data.
    let { token: _token, childTokens: _childTokens, ...account } = response.data;
    return account;
  }

  async searchWeb(options: {
    queries: string[];
    size?: number;
    maxTokens?: number;
  }): Promise<any> {
    let params = new URLSearchParams();
    for (let query of options.queries) params.append('text', query);
    if (options.size !== undefined) params.set('size', String(options.size));
    if (options.maxTokens !== undefined) params.set('maxTokens', String(options.maxTokens));
    let response = await webApi.get('/api/v1/web_search', {
      params,
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return response.data;
  }
}
