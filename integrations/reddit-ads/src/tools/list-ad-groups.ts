import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { accountInput, pagingInput, pagingOutput, resourceOutput } from '../lib/contracts';
import { spec } from '../spec';

export let listAdGroups = SlateTool.create(spec, {
  name: 'List Ad Groups',
  key: 'list_ad_groups',
  description:
    'Retrieve one page of ad groups for a selected ad account, optionally filtered by campaign. Returns current configured state, relationships and provider values. Follow nextUrl with the same selectors to continue.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: accountInput,
      ...pagingInput,
      campaignId: z.string().optional().describe('Filter ad groups by campaign ID')
    })
  )
  .output(
    z.object({
      ...pagingOutput,
      adGroups: z.array(
        z.object({
          adGroupId: z.string().optional(),
          campaignId: z.string().optional(),
          name: z.string().optional(),
          status: z.string().optional(),
          bidCents: z.number().optional(),
          bidStrategy: z.string().optional(),
          optimizationStrategy: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          raw: z.any().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const page = await createClient(ctx).list('adGroup', ctx.input);
    return {
      output: {
        adGroups: page.items.map(value => resourceOutput('adGroup', value)),
        nextUrl: page.nextUrl,
        hasMore: page.hasMore
      },
      message: `Retrieved ${page.items.length} adGroups in this page${page.hasMore ? '; more pages are available' : ''}.`
    };
  })
  .build();
