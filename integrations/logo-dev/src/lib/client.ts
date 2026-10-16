import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';
import { z } from 'zod';
import {
  brandSchema,
  imageResourceSchema,
  type lookupTypeSchema,
  metadataSchema,
  unsettledSchema
} from './schemas';

export interface LogoImageOptions {
  format?: 'jpg' | 'png' | 'webp';
  size?: number;
  width?: number;
  height?: number;
  theme?: 'dark' | 'light';
  greyscale?: boolean;
  retina?: boolean;
  fallback?: 'monogram' | '404';
  redirect?: 'follow' | '404';
}

type LookupType = z.infer<typeof lookupTypeSchema>;

let legacyBrandSchema = z.object({
  name: z.string().min(1),
  domain: z.string().min(1),
  description: z.string(),
  indexed_at: z.string(),
  socials: z.record(z.string(), z.string().nullable()),
  logo: z.string(),
  blurhash: z.string(),
  colors: z.array(
    z
      .object({
        hex: z.string().optional(),
        rgb: z.object({ r: z.number(), g: z.number(), b: z.number() }).optional()
      })
      .passthrough()
  )
});

let searchEnvelopeSchema = z.object({
  data: z.array(
    z
      .object({
        object: z.literal('search_result'),
        name: z.string().min(1),
        domain: z.string().min(1),
        logo_url: z.string().url()
      })
      .passthrough()
  ),
  metadata: metadataSchema
});

let brandEnvelopeSchema = z.object({ data: brandSchema, metadata: metadataSchema });
let imageEnvelopeSchema = z.object({ data: imageResourceSchema, metadata: metadataSchema });
let unsettledEnvelopeSchema = z.object({ data: unsettledSchema, metadata: metadataSchema });

let parseProviderResponse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  let parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw createApiServiceError(
      'Logo.dev returned incomplete or malformed data. Retry the request; use lookup_brand instead of the retired Describe API.',
      { reason: 'logo_dev_invalid_response' }
    );
  }
  return parsed.data;
};

let apiError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Logo.dev',
    reason: 'logo_dev_api_error',
    extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
    detailKeys: ['message', 'msg', 'err', 'detail', 'code'],
    nestedKeys: ['error', 'errors'],
    extractUpstreamCode: (_error, response, helpers) => {
      if (!helpers.isRecord(response?.data) || !helpers.isRecord(response.data.error)) {
        return undefined;
      }
      return typeof response.data.error.code === 'string'
        ? response.data.error.code
        : undefined;
    }
  });

export class LogoDevClient {
  private axios;

  constructor(secretKey: string) {
    if (!secretKey.trim()) {
      throw createApiServiceError('Configure a Logo.dev secret API key (sk_...).');
    }
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.logo.dev',
      authHeader: { value: `Bearer ${secretKey}` },
      timeout: 30000,
      errorAdapter: apiError
    });
  }

  async searchBrands(query: string, strategy?: 'typeahead' | 'match', limit?: number) {
    if (!query.trim()) {
      throw createApiServiceError('Provide a non-empty brand name to search for.');
    }
    let response = await this.axios.get('/v2/search', {
      params: pickDefined({ q: query, method: strategy ?? 'typeahead', limit })
    });
    return parseProviderResponse(searchEnvelopeSchema, response.data);
  }

  async describeBrand(domain: string) {
    if (!domain.trim()) {
      throw createApiServiceError('Provide a non-empty company domain.');
    }
    let response = await this.axios.get(`/describe/${encodeURIComponent(domain)}`);
    if (response.status === 202) {
      throw createApiServiceError(
        'Logo.dev is indexing this domain. Retry in a few seconds.',
        {
          reason: 'logo_dev_indexing',
          upstreamStatus: 202
        }
      );
    }
    let data = parseProviderResponse(legacyBrandSchema, response.data);
    return {
      name: data.name,
      domain: data.domain,
      description: data.description,
      indexedAt: data.indexed_at,
      socials: data.socials,
      logo: data.logo,
      blurhash: data.blurhash,
      colors: data.colors
    };
  }

  private async lookup(path: string, params: Record<string, string>) {
    let response = await this.axios.get(path, {
      params,
      validateStatus: status => (status >= 200 && status < 300) || status === 404
    });
    if (response.status === 202 || response.status === 404) {
      let parsed = unsettledEnvelopeSchema.safeParse(response.data);
      if (parsed.success) {
        let expectedStatus = response.status === 202 ? 'not_indexed' : 'not_found';
        if (parsed.data.data.status === expectedStatus) {
          if (response.status === 202 && !parsed.data.metadata.pending) {
            throw createApiServiceError('Logo.dev omitted the indexing retry metadata.', {
              reason: 'logo_dev_invalid_response'
            });
          }
          return { settled: false as const, ...parsed.data };
        }
      }
      throw apiError({ response: { status: response.status, data: response.data } });
    }
    return { settled: true as const, body: response.data as unknown };
  }

  async lookupBrand(identifier: string, lookupType: LookupType | 'brand_id') {
    if (!identifier.trim()) {
      throw createApiServiceError('Provide a non-empty brand identifier.');
    }
    let response =
      lookupType === 'brand_id'
        ? await this.lookup(`/v2/brands/${encodeURIComponent(identifier)}`, {
            nosubscribe: 'true'
          })
        : await this.lookup('/v2/brands', {
            [lookupType]: identifier,
            nosubscribe: 'true'
          });
    if (!response.settled) return response;
    return {
      settled: true as const,
      ...parseProviderResponse(brandEnvelopeSchema, response.body)
    };
  }

  async getImage(identifier: string, lookupType: LookupType, kind: 'logo' | 'brandmark') {
    if (!identifier.trim()) {
      throw createApiServiceError('Provide a non-empty brand identifier.');
    }
    let response = await this.lookup(`/v2/brands/${kind}`, { [lookupType]: identifier });
    if (!response.settled) return response;
    let result = parseProviderResponse(imageEnvelopeSchema, response.body);
    if (result.data.kind !== kind) {
      throw createApiServiceError('Logo.dev returned a different image kind than requested.', {
        reason: 'logo_dev_invalid_response'
      });
    }
    return { settled: true as const, ...result };
  }
}

export let buildLogoUrl = (
  identifier: string,
  lookupType: LookupType,
  publishableToken?: string,
  options?: LogoImageOptions
): string => {
  if (!identifier.trim()) {
    throw createApiServiceError('Provide a non-empty logo identifier.');
  }
  if (!publishableToken?.trim()) {
    throw createApiServiceError(
      'Configure the Logo.dev publishable key (pk_...) to generate a working CDN image URL.'
    );
  }
  for (let value of [options?.size, options?.width, options?.height]) {
    if (value !== undefined && !Number.isInteger(value)) {
      throw createApiServiceError('Logo dimensions must be whole numbers of pixels.');
    }
  }
  if (options?.theme === 'dark' && (options.format ?? 'jpg') === 'jpg') {
    throw createApiServiceError('Use PNG or WebP format with the dark theme.');
  }
  let basePath =
    lookupType === 'domain'
      ? `/${encodeURIComponent(identifier)}`
      : `/${lookupType}/${encodeURIComponent(identifier)}`;
  let params = new URLSearchParams({ token: publishableToken });
  for (let [key, value] of Object.entries(pickDefined(options ?? {}))) {
    params.set(key, String(value));
  }
  return `https://img.logo.dev${basePath}?${params.toString()}`;
};
