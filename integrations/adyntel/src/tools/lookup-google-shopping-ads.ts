import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let googleShoppingAdSchema = z
  .object({
    advertiserId: z.string().optional(),
    creativeId: z.string().optional(),
    firstShown: z.string().optional(),
    lastShown: z.string().optional(),
    format: z.string().optional(),
    title: z.string().optional(),
    type: z.string().optional(),
    url: z.string().optional(),
    verified: z.boolean().optional(),
    rankAbsolute: z.number().optional(),
    rankGroup: z.number().optional(),
    previewImage: z
      .object({
        height: z.number().optional(),
        width: z.number().optional(),
        url: z.string().optional()
      })
      .passthrough()
      .optional(),
    previewUrl: z.string().nullable().optional()
  })
  .passthrough();

export let lookupGoogleShoppingAds = SlateTool.create(spec, {
  name: 'Lookup Google Shopping Ads',
  key: 'lookup_google_shopping_ads',
  description: `Retrieve Google Shopping ads for a given company. Submits a search request and polls for results. Returns shopping ad creatives, titles, preview images, and advertiser verification status. This covers strictly shopping ads rather than search, image, or video ads.`,
  instructions: [
    'Domain must be in bare format like "amazon.com" without https:// or www. prefix.',
    'Results are fetched asynchronously. The tool submits the request and polls for results automatically.'
  ],
  constraints: [
    'The initial search consumes 1 credit. Polling for status does not consume credits.',
    'Polling may take several seconds. Results may not be immediately available.'
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
        .describe('Company website domain in bare format, e.g. "amazon.com"')
    })
  )
  .output(
    z.object({
      requestId: z.string().optional().describe('The async request ID for reference'),
      ads: z.array(googleShoppingAdSchema).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      email: ctx.auth.email
    });

    ctx.progress('Submitting Google Shopping search request...');

    let submitResponse = await client.submitGoogleShoppingSearch({
      companyDomain: ctx.input.companyDomain
    });

    let requestId = submitResponse?.id;
    if (!requestId) {
      return {
        output: {
          requestId: undefined,
          ads: []
        },
        message: `No results found for Google Shopping ads for **${ctx.input.companyDomain}**.`
      };
    }

    ctx.progress('Polling for Google Shopping results...');

    let maxAttempts = 10;
    let delayMs = 3000;
    let statusResponse: any = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, delayMs));

      statusResponse = await client.getGoogleShoppingStatus({ requestId });

      if (statusResponse?.ads && statusResponse.ads.length > 0) {
        break;
      }
    }

    let ads = statusResponse?.ads ?? [];

    return {
      output: {
        requestId,
        ads
      },
      message: `Found **${ads.length}** Google Shopping ads for **${ctx.input.companyDomain}**.`
    };
  })
  .build();
