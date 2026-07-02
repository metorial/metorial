import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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

export let lookupGoogleAds = SlateTool.create(spec, {
  name: 'Lookup Google Ads',
  key: 'lookup_google_ads',
  description: `Retrieve all Google ads for a given company. Find search, image, and video ads by company domain. Returns ad creatives, advertiser information, formats, start dates, and links to the Google Ads Transparency Center. Supports filtering by media type.`,
  instructions: [
    'Domain must be in bare format like "nike.com" without https:// or www. prefix.'
  ],
  constraints: ['Each successful API call consumes 1 credit.'],
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
      mediaType: z
        .enum(['text', 'image', 'video'])
        .optional()
        .describe('Filter results by ad media type')
    })
  )
  .output(
    z.object({
      continuationToken: z.string().nullable().optional(),
      countryCode: z.string().optional(),
      totalAdCount: z.number().optional(),
      ads: z.array(googleAdSchema).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      email: ctx.auth.email
    });

    let response = await client.lookupGoogleAds({
      companyDomain: ctx.input.companyDomain,
      mediaType: ctx.input.mediaType
    });

    let adCount = response?.total_ad_count ?? response?.totalAdCount ?? 0;
    let filterStr = ctx.input.mediaType ? ` (filtered by **${ctx.input.mediaType}**)` : '';

    return {
      output: {
        continuationToken: response?.continuation_token ?? response?.continuationToken,
        countryCode: response?.country_code ?? response?.countryCode,
        totalAdCount: adCount,
        ads: response?.ads
      },
      message: `Found **${adCount}** Google ads for **${ctx.input.companyDomain}**${filterStr}.`
    };
  })
  .build();
