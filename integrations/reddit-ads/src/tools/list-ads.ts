import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { accountInput, pagingInput, pagingOutput, resourceOutput } from '../lib/contracts';
import { spec } from '../spec';

export let listAds = SlateTool.create(spec, {
  name: 'List Ads',
  key: 'list_ads',
  description:
    'Retrieve one page of ads for a selected ad account, optionally filtered by ad group. Returns current configured state, relationships and provider values. Follow nextUrl with the same selectors to continue.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: accountInput,
      ...pagingInput,
      adGroupId: z.string().optional().describe('Filter ads by ad group ID')
    })
  )
  .output(
    z.object({
      ...pagingOutput,
      ads: z.array(
        z.object({
          adId: z.string().optional(),
          adGroupId: z.string().optional(),
          postId: z.string().optional(),
          campaignId: z.string().optional(),
          name: z.string().optional(),
          status: z.string().optional(),
          headline: z.string().optional(),
          clickUrl: z.string().optional(),
          callToAction: z.string().optional(),
          raw: z.any().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const page = await createClient(ctx).list('ad', ctx.input);
    return {
      output: {
        ads: page.items.map(value => resourceOutput('ad', value)),
        nextUrl: page.nextUrl,
        hasMore: page.hasMore
      },
      message: `Retrieved ${page.items.length} ads in this page${page.hasMore ? '; more pages are available' : ''}.`
    };
  })
  .build();
