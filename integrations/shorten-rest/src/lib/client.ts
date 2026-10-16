import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import { z } from 'zod';

let destinationSchema = z.object({
  url: z.string(),
  country: z.string().optional(),
  os: z.string().optional()
});
let metatagSchema = z.object({ name: z.string(), content: z.string() });
let snippetSchema = z.object({
  id: z.string(),
  parameters: z.record(z.string(), z.string()).optional()
});
let timestampSchema = z.number().refine(value => Number.isFinite(new Date(value).getTime()));
let aliasDetailsSchema = z.object({
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  name: z.string(),
  domainName: z.string(),
  destinations: z.array(destinationSchema),
  metatags: z.array(metatagSchema).default([]),
  snippets: z.array(snippetSchema).default([])
});
let createAliasResponseSchema = z.object({
  aliasName: z.string(),
  domainName: z.string(),
  shortUrl: z.string()
});
let listAliasesResponseSchema = z.object({
  aliases: z.array(z.string()),
  lastId: z.string().nullish()
});
let clickEntrySchema = z.object({
  alias: z.string(),
  aliasId: z.string(),
  browser: z.string(),
  country: z.string(),
  createdAt: timestampSchema,
  destination: z.string(),
  domain: z.string(),
  os: z.string(),
  referrer: z.string(),
  userAgent: z.string()
});
let clicksResponseSchema = z.object({
  clicks: z.array(clickEntrySchema),
  lastId: z.string().nullish()
});

export type Destination = z.infer<typeof destinationSchema>;
export type Metatag = z.infer<typeof metatagSchema>;
export type Snippet = z.infer<typeof snippetSchema>;
export type AliasDetails = z.infer<typeof aliasDetailsSchema>;
export type CreateAliasResponse = z.infer<typeof createAliasResponseSchema>;
export type ListAliasesResponse = z.infer<typeof listAliasesResponseSchema>;
export type ClickEntry = z.infer<typeof clickEntrySchema>;
export type GetClicksResponse = z.infer<typeof clicksResponseSchema>;

export interface CreateAliasRequest {
  aliasName?: string;
  domainName?: string;
  destinations: Destination[];
  metatags?: Metatag[];
  snippets?: Snippet[];
}

export interface UpdateAliasRequest {
  aliasName: string;
  domainName?: string;
  destinations?: Destination[];
  metatags?: Metatag[];
  snippets?: Snippet[];
}

export interface GetAliasRequest {
  aliasName: string;
  domainName?: string;
}

export type DeleteAliasRequest = GetAliasRequest;

export interface ListAliasesRequest {
  domainName?: string;
  lastId?: string;
  limit?: number;
}

export interface ListClicksRequest {
  lastId?: string;
  limit?: number;
}

export interface GetClicksRequest extends ListClicksRequest {
  aliasName: string;
  domainName?: string;
}

let parseResponse = <T>(schema: z.ZodType<T>, data: unknown, resource: string): T => {
  let result = schema.safeParse(data);
  if (!result.success) {
    throw createApiServiceError(
      `Shorten.REST returned an invalid ${resource} response. Missing or invalid fields: ${result.error.issues.map(issue => issue.path.join('.') || resource).join(', ')}.`,
      { reason: 'shortenrest_invalid_response' }
    );
  }
  return result.data;
};

let aliasParams = (request: { aliasName?: string; domainName?: string }, creating = false) => {
  if ((!creating && !request.aliasName?.trim()) || request.aliasName?.startsWith('/')) {
    throw createApiServiceError('Provide an alias path without a leading slash.');
  }
  if (
    request.domainName !== undefined &&
    (!request.domainName || /[\s/]/.test(request.domainName))
  ) {
    throw createApiServiceError(
      'Provide a domain name without a URL scheme, path, or spaces.'
    );
  }
  return pickDefined({ aliasName: request.aliasName, domainName: request.domainName });
};

let paginationParams = (request: ListClicksRequest) => {
  if (
    request.limit !== undefined &&
    (!Number.isInteger(request.limit) || request.limit < 1 || request.limit > 1000)
  ) {
    throw createApiServiceError('limit must be a whole number between 1 and 1000.');
  }
  return pickDefined({ continueFrom: request.lastId, limit: request.limit });
};

let validateDestinations = (destinations?: Destination[]) => {
  if (
    destinations?.some(destination => !destination.url.trim() || destination.url.length > 8192)
  ) {
    throw createApiServiceError(
      'Destination URLs must contain between 1 and 8192 characters.'
    );
  }
};

export class Client {
  private axios;

  constructor(token: string) {
    if (!token.trim()) {
      throw createApiServiceError('A Shorten.REST API key is required.');
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.shorten.rest',
      authHeader: { name: 'x-api-key', value: token.trim() },
      timeout: 30_000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Shorten.REST',
          reason: 'shortenrest_api_error'
        })
    });
  }

  async createAlias(request: CreateAliasRequest): Promise<CreateAliasResponse> {
    let params = aliasParams(request, true);
    validateDestinations(request.destinations);
    let response = await this.axios.post(
      '/aliases',
      pickDefined({
        destinations: request.destinations,
        metatags: request.metatags,
        snippets: request.snippets
      }),
      { params }
    );
    return parseResponse(createAliasResponseSchema, response.data, 'created alias');
  }

  async getAlias(request: GetAliasRequest): Promise<AliasDetails> {
    let response = await this.axios.get('/aliases', { params: aliasParams(request) });
    if (response.data === null) {
      throw createApiServiceError('The requested alias was not found on this domain.', {
        reason: 'shortenrest_alias_not_found'
      });
    }
    return parseResponse(aliasDetailsSchema, response.data, 'alias details');
  }

  async updateAlias(request: UpdateAliasRequest): Promise<void> {
    let params = aliasParams(request);
    validateDestinations(request.destinations);
    if (
      request.destinations === undefined &&
      request.metatags === undefined &&
      request.snippets === undefined
    ) {
      throw createApiServiceError('Provide destinations, metatags, or snippets to update.');
    }
    await this.axios.put(
      '/aliases',
      pickDefined({
        destinations: request.destinations,
        metatags: request.metatags,
        snippets: request.snippets
      }),
      { params }
    );
  }

  async deleteAlias(request: DeleteAliasRequest): Promise<void> {
    await this.axios.delete('/aliases', { params: aliasParams(request) });
  }

  async listAliases(request: ListAliasesRequest): Promise<ListAliasesResponse> {
    let { domainName } = aliasParams({ domainName: request.domainName }, true);
    let response = await this.axios.get('/aliases/all', {
      params: { ...paginationParams(request), ...pickDefined({ domainName }) }
    });
    return parseResponse(listAliasesResponseSchema, response.data, 'alias list');
  }

  async listClicks(request: ListClicksRequest): Promise<GetClicksResponse> {
    let response = await this.axios.get('/clicks', { params: paginationParams(request) });
    return parseResponse(clicksResponseSchema, response.data, 'click list');
  }

  async getClicks(request: GetClicksRequest): Promise<GetClicksResponse> {
    aliasParams(request);
    let result = await this.listClicks(request);
    return {
      ...result,
      clicks: result.clicks.filter(
        click =>
          click.alias === request.aliasName &&
          click.domain === (request.domainName ?? 'short.fyi')
      )
    };
  }
}
