import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { accountInput, pagingInput, pagingOutput, resourceOutput } from '../lib/contracts';
import { spec } from '../spec';

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description:
    'Retrieve one page of campaigns for a selected ad account. Returns current configured state, relationships and provider values. Follow nextUrl to continue; a campaign status filter applies only to the returned page.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: accountInput,
      ...pagingInput,
      status: z
        .enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'DRAFT'])
        .optional()
        .describe('Filter campaigns by status')
    })
  )
  .output(
    z.object({
      ...pagingOutput,
      campaigns: z.array(
        z.object({
          campaignId: z.string().optional(),
          name: z.string().optional(),
          objective: z.string().optional(),
          status: z.string().optional(),
          budgetCents: z.number().optional(),
          budgetType: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          isProcessing: z.boolean().optional(),
          raw: z.any().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const page = await createClient(ctx).list('campaign', ctx.input);
    return {
      output: {
        campaigns: page.items.map(value => resourceOutput('campaign', value)),
        nextUrl: page.nextUrl,
        hasMore: page.hasMore
      },
      message: `Retrieved ${page.items.length} campaigns in this page${page.hasMore ? '; more pages are available' : ''}.`
    };
  })
  .build();
