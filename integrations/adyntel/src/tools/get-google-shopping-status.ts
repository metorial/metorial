import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleShoppingAdSchema, mapShoppingAds } from '../lib/shopping';
import { spec } from '../spec';

export let getGoogleShoppingStatus = SlateTool.create(spec, {
  key: 'get_google_shopping_status',
  name: 'Get Google Shopping Status',
  description:
    'Retrieve results for a previously submitted Google Shopping ad search. This check does not start another search or consume credits.',
  instructions: [
    'Use the requestId from Submit Google Shopping Search or Lookup Google Shopping Ads. If ads are not available, check the same request ID again later.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      requestId: z.string().describe('Request ID returned by the Google Shopping search')
    })
  )
  .output(
    z.object({
      requestId: z.string(),
      ads: z.array(googleShoppingAdSchema).optional(),
      rawResponse: z.unknown().optional()
    })
  )
  .handleInvocation(async ctx => {
    let response = await new Client(ctx.auth).getGoogleShoppingStatus(ctx.input);
    let ads = mapShoppingAds(response?.ads);
    return {
      output: { requestId: ctx.input.requestId, ads, rawResponse: response },
      message: ads
        ? `Retrieved **${ads.length}** Google Shopping ads.`
        : 'Google Shopping results are not available yet. Check this request ID again later.'
    };
  })
  .build();
