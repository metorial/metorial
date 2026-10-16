import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { flattenAds, mapSummary } from '../lib/response';
import { spec } from '../spec';

let googleAdVariantSchema = z
  .object({
    content: z.string().optional(),
    height: z.number().nullable().optional(),
    width: z.number().nullable().optional()
  })
  .passthrough();

let googleAdSchema = z
  .object({
    advertiserId: z.string().optional(),
    creativeId: z.string().optional(),
    originalUrl: z.string().optional(),
    variants: z.array(googleAdVariantSchema).optional(),
    start: z.string().optional(),
    lastSeen: z.string().optional(),
    advertiserName: z.string().optional(),
    format: z.string().optional()
  })
  .passthrough();

let outputSchema = z.object({
  continuationToken: z.string().nullable().optional(),
  countryCode: z.string().optional(),
  totalAdCount: z.number().optional(),
  ads: z.array(googleAdSchema).optional(),
  rawResponse: z
    .unknown()
    .optional()
    .describe('Complete provider response with original fields and null values')
});

export let lookupGoogleAds = SlateTool.create(spec, {
  name: 'Lookup Google Ads',
  key: 'lookup_google_ads',
  description: `Retrieve a page of Google ads for a given company. Find search, image, and video ads by company domain. Returns ad creatives, advertiser information, formats, start dates, and links to the Google Ads Transparency Center. Supports filtering by media type.`,
  instructions: [
    'Domain must be in bare format like "nike.com" without https:// or www. prefix.',
    'When paginating, send the same countryCode on every request; the continuation token does not retain it.'
  ],
  constraints: [
    'Each successful API call consumes 1 credit; enabling extractText costs 2 credits.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      companyDomain: z
        .string()
        .describe('Company website domain in bare format, e.g. "nike.com"'),
      continuationToken: z
        .string()
        .optional()
        .describe(
          'Token from the previous Lookup Google Ads response to retrieve the next page'
        ),
      countryCode: z
        .string()
        .optional()
        .describe('One ISO 3166-1 alpha-2 country code, or anywhere for worldwide results'),
      extractText: z
        .boolean()
        .optional()
        .describe('Extract text from ad creatives; costs one additional credit'),
      mediaType: z
        .enum(['text', 'image', 'video'])
        .optional()
        .describe('Filter results by ad media type')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      email: ctx.auth.email
    });

    let response = await client.lookupGoogleAds({
      companyDomain: ctx.input.companyDomain,
      mediaType: ctx.input.mediaType,
      continuationToken: ctx.input.continuationToken,
      countryCode: ctx.input.countryCode,
      extractText: ctx.input.extractText
    });

    let adCount = response?.total_ad_count ?? response?.totalAdCount;
    let filterStr = ctx.input.mediaType ? ` (filtered by **${ctx.input.mediaType}**)` : '';

    return {
      output: mapSummary(outputSchema, {
        continuationToken:
          response?.continuation_token !== undefined
            ? response.continuation_token
            : response?.continuationToken,
        countryCode: response?.country_code ?? response?.countryCode,
        totalAdCount: typeof adCount === 'number' ? adCount : undefined,
        ads: flattenAds(response?.ads)?.map(ad =>
          mapSummary(googleAdSchema, ad, {
            advertiserId: 'advertiser_id',
            creativeId: 'creative_id',
            originalUrl: 'original_url',
            lastSeen: 'last_seen',
            advertiserName: 'advertiser_name'
          })
        ),
        rawResponse: response
      }),
      message: `${typeof adCount === 'number' ? `Found **${adCount}**` : 'Retrieved'} Google ads for **${ctx.input.companyDomain}**${filterStr}.`
    };
  })
  .build();
