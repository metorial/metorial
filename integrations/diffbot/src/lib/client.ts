import { createAxios } from 'slates';

let extractApi = createAxios({
  baseURL: 'https://api.diffbot.com'
});

let kgApi = createAxios({
  baseURL: 'https://kg.diffbot.com'
});

let nlApi = createAxios({
  baseURL: 'https://nl.diffbot.com'
});

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
    this.token = config.token;
  }

  async extractPage(options: ExtractOptions): Promise<any> {
    let endpoint = `/v3/${options.type}`;
    let params: Record<string, any> = {
      token: this.token,
      url: options.url
    };

    if (options.fields) params.fields = options.fields;
    if (options.timeout) params.timeout = options.timeout;
    if (options.paging !== undefined) params.paging = options.paging;
    if (options.discussion !== undefined) params.discussion = options.discussion;

    if (options.body) {
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

    let response = await kgApi.get('/kg/v3/enhance/combine', { params });
    return response.data;
  }

  async analyzeText(options: NaturalLanguageOptions): Promise<any> {
    let params: Record<string, any> = {
      token: this.token
    };

    if (options.lang) params.lang = options.lang;
    if (options.tagMode) params.tagMode = options.tagMode;

    let response = await nlApi.post('/v1/', options.content, {
      params,
      headers: {
        'Content-Type': 'text/plain'
      }
    });
    return response.data;
  }

  async createCrawl(options: CrawlCreateOptions): Promise<any> {
    let params: Record<string, any> = {
      token: this.token,
      name: options.name,
      seeds: options.seeds.join(' ')
    };

    if (options.apiType) params.apiUrl = `https://api.diffbot.com/v3/${options.apiType}`;
    if (options.maxToCrawl !== undefined) params.maxToCrawl = options.maxToCrawl;
    if (options.maxToProcess !== undefined) params.maxToProcess = options.maxToProcess;
    if (options.maxHops !== undefined) params.maxHops = options.maxHops;
    if (options.urlCrawlPattern) params.urlCrawlPattern = options.urlCrawlPattern;
    if (options.urlProcessPattern) params.urlProcessPattern = options.urlProcessPattern;
    if (options.repeat !== undefined) params.repeat = options.repeat;
    if (options.repeatFrequency !== undefined)
      params.repeatFrequency = options.repeatFrequency;
    if (options.notifyWebhook) params.notifyWebhook = options.notifyWebhook;
    if (options.onlyProcessIfNew !== undefined)
      params.onlyProcessIfNew = options.onlyProcessIfNew ? 1 : 0;

    let response = await extractApi.post('/v3/crawl', null, { params });
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
    let response = await extractApi.delete('/v3/crawl', {
      params: {
        token: this.token,
        name: crawlName
      }
    });
    return response.data;
  }

  async pauseCrawl(crawlName: string): Promise<any> {
    let response = await extractApi.put('/v3/crawl', null, {
      params: {
        token: this.token,
        name: crawlName,
        pause: 1
      }
    });
    return response.data;
  }

  async resumeCrawl(crawlName: string): Promise<any> {
    let response = await extractApi.put('/v3/crawl', null, {
      params: {
        token: this.token,
        name: crawlName,
        pause: 0
      }
    });
    return response.data;
  }

  async restartCrawl(crawlName: string): Promise<any> {
    let response = await extractApi.put('/v3/crawl', null, {
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
      token: this.token,
      name: options.name,
      urls: options.urls.join(' ')
    };

    if (options.apiType) params.apiUrl = `https://api.diffbot.com/v3/${options.apiType}`;
    if (options.notifyWebhook) params.notifyWebhook = options.notifyWebhook;

    let response = await extractApi.post('/v3/bulk', null, { params });
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
    let response = await extractApi.delete('/v3/bulk', {
      params: {
        token: this.token,
        name: jobName
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
}
