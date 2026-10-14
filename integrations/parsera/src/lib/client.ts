import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import { z } from 'zod';
import type { Attribute, Cookie } from './schemas';

let recordsSchema = z.array(z.record(z.string(), z.unknown()));
let scraperSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string().optional(),
  status: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  created_at: z.string().nullable().optional()
});

export let scraperRunSchema = z
  .object({
    run_id: z.string(),
    status: z.string(),
    completed: z.number().nullable().optional(),
    total: z.number().nullable().optional(),
    credits_charged: z.number().nullable().optional(),
    data: z.unknown().optional()
  })
  .passthrough();

export interface ExtractParams {
  url: string;
  prompt?: string;
  attributes?: Attribute[];
  mode?: 'standard' | 'precision';
  proxyCountry?: string;
  cookies?: Cookie[];
}

export interface ParseParams {
  content: string;
  prompt?: string;
  attributes?: Attribute[];
  mode?: 'standard' | 'precision';
}

export interface ExtractMarkdownParams {
  url: string;
  proxyCountry?: string;
  cookies?: Cookie[];
}

export interface RunScraperParams {
  scraperId: string;
  urls?: string[];
  proxyCountry?: string;
  cookies?: Cookie[];
  parameters?: Record<string, unknown>;
  callbackUrl?: string;
}

export interface GenerateScraperParams {
  scraperId: string;
  url?: string;
  content?: string;
  prompt?: string;
  attributes: Attribute[];
  proxyCountry?: string;
  cookies?: Cookie[];
}

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token?.trim()) {
      throw createApiServiceError(
        'A Parsera API key is required. Reconnect with your API key.'
      );
    }
    this.http = createAuthenticatedAxios({
      baseURL: 'https://api.parsera.org/v1',
      authHeader: { name: 'X-API-KEY', value: config.token },
      errorAdapter: error =>
        buildApiServiceError(error, { providerLabel: 'Parsera', reason: 'parsera_api_error' })
    });
  }

  private parseResponse<T extends z.ZodType>(
    schema: T,
    data: unknown,
    operation: string
  ): z.infer<T> {
    let result = schema.safeParse(data);
    if (!result.success) {
      throw createApiServiceError(`Parsera returned an invalid response for ${operation}.`, {
        reason: 'invalid_provider_response'
      });
    }
    return result.data;
  }

  async extract(params: ExtractParams) {
    let response = await this.http.post(
      '/extractor/extract',
      pickDefined({
        url: params.url,
        prompt: params.prompt,
        attributes: params.attributes,
        mode: params.mode,
        proxy_country: params.proxyCountry,
        cookies: params.cookies
      })
    );
    return this.parseResponse(recordsSchema, response.data, 'data extraction');
  }

  async parse(params: ParseParams) {
    let response = await this.http.post(
      '/extractor/parse',
      pickDefined({
        content: params.content,
        prompt: params.prompt,
        attributes: params.attributes,
        mode: params.mode
      })
    );
    return this.parseResponse(recordsSchema, response.data, 'content parsing');
  }

  async extractMarkdown(params: ExtractMarkdownParams) {
    let response = await this.http.post(
      '/extractor/extract_markdown',
      pickDefined({
        url: params.url,
        proxy_country: params.proxyCountry,
        cookies: params.cookies
      })
    );
    return this.parseResponse(z.string(), response.data, 'Markdown extraction');
  }

  async listScrapers() {
    let response = await this.http.get('/scrapers');
    return this.parseResponse(
      z.array(scraperSummarySchema),
      response.data,
      'listing scrapers'
    );
  }

  async getScraper(scraperId: string, type: 'extractor' | 'agentic') {
    let route = type === 'agentic' ? 'agent' : 'extractor';
    let response = await this.http.get(`/${route}/${encodeURIComponent(scraperId)}`);
    return this.parseResponse(
      z.object({ template_id: z.string() }).passthrough(),
      response.data,
      'scraper details'
    );
  }

  async createScraper() {
    // Preserve the legacy create/generate workflow; its generation payload has no current replacement documentation.
    let response = await this.http.post('/scrapers/new', {});
    let data = this.parseResponse(
      z.object({
        scraper_id: z.string().optional(),
        template_id: z.string().optional()
      }),
      response.data,
      'scraper creation'
    );
    let scraperId = data.scraper_id ?? data.template_id;
    if (!scraperId) {
      throw createApiServiceError('Parsera did not return an ID for the created scraper.', {
        reason: 'invalid_provider_response'
      });
    }
    return scraperId;
  }

  async generateScraper(params: GenerateScraperParams) {
    let response = await this.http.post(
      '/scrapers/generate',
      pickDefined({
        scraper_id: params.scraperId,
        attributes: params.attributes,
        url: params.url,
        content: params.content,
        prompt: params.prompt,
        proxy_country: params.proxyCountry,
        cookies: params.cookies
      })
    );
    return this.parseResponse(
      z.object({ message: z.string() }),
      response.data,
      `generation of scraper ${params.scraperId}`
    ).message;
  }

  private runBody(params: RunScraperParams) {
    return pickDefined({
      template_id: params.scraperId,
      url: params.urls?.length === 1 ? params.urls[0] : params.urls,
      proxy_country: params.proxyCountry,
      cookies: params.cookies,
      parameters: params.parameters,
      callback_url: params.callbackUrl
    });
  }

  async runScraper(params: RunScraperParams) {
    let response = await this.http.post('/scrapers/run', this.runBody(params), {
      timeout: 330000
    });
    if (response.status === 202) {
      let run = this.parseResponse(
        scraperRunSchema,
        response.data,
        'asynchronous run handoff'
      );
      throw createApiServiceError(
        `Parsera is still running scraper ${params.scraperId}. Call get_scraper_run with runId "${run.run_id}" to retrieve its status and results.`,
        {
          reason: 'scraper_run_in_progress'
        }
      );
    }
    return this.parseResponse(recordsSchema, response.data, 'scraper execution');
  }

  async runScraperAsync(params: RunScraperParams) {
    let response = await this.http.post('/scrapers/run_async', this.runBody(params));
    return this.parseResponse(
      scraperRunSchema,
      response.data,
      'asynchronous scraper dispatch'
    );
  }

  async getScraperRun(runId: string) {
    let response = await this.http.get(`/scrapers/run_async/${encodeURIComponent(runId)}`);
    return this.parseResponse(scraperRunSchema, response.data, 'scraper run status');
  }

  async deleteScraper(scraperId: string) {
    let response = await this.http.delete(`/scrapers/${encodeURIComponent(scraperId)}`);
    return this.parseResponse(
      z.object({ message: z.string() }),
      response.data,
      'scraper deletion'
    ).message;
  }
}
