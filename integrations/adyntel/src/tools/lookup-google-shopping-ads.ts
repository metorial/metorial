import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleShoppingAdSchema, mapShoppingAds, shoppingRequestId } from '../lib/shopping';
import { spec } from '../spec';

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
      ads: z.array(googleShoppingAdSchema).optional(),
      rawResponse: z
        .unknown()
        .optional()
        .describe('Latest provider status response, including original fields and null values')
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

    let requestId = shoppingRequestId(submitResponse);

    ctx.progress('Polling for Google Shopping results...');

    let maxAttempts = 10;
    let delayMs = 3000;
    let statusResponse: Record<string, unknown> | undefined;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, delayMs));

      statusResponse = await client.getGoogleShoppingStatus({ requestId });

      if (Array.isArray(statusResponse?.ads)) {
        break;
      }
    }

    let ads = mapShoppingAds(statusResponse?.ads);

    return {
      output: {
        requestId,
        ads,
        rawResponse: statusResponse
      },
      message: ads
        ? `Retrieved **${ads.length}** Google Shopping ads for **${ctx.input.companyDomain}**.`
        : `Google Shopping results are not available yet. Call Get Google Shopping Status with request ID **${requestId}** to check again without starting another search.`
    };
  })
  .build();
