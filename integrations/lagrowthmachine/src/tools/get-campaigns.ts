import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCampaigns = SlateTool.create(spec, {
  name: 'Get Campaigns',
  key: 'get_campaigns',
  description: `Retrieve all campaigns from your La Growth Machine account with pagination support. Returns campaign details including performance metrics.`,
  constraints: ['Maximum of 25 campaigns per page.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      skip: z
        .number()
        .refine(Number.isSafeInteger, 'Must be a safe integer')
        .min(0)
        .optional()
        .describe('Number of campaigns to skip for pagination'),
      limit: z
        .number()
        .refine(Number.isSafeInteger, 'Must be a safe integer')
        .min(1)
        .max(25)
        .optional()
        .describe('Number of campaigns to return per page (1–25, defaults to 25)'),
      status: z
        .string()
        .optional()
        .describe('Campaign status filter, comma-separated: RUNNING, READY, PAUSED, CANCELED'),
      search: z.string().optional().describe('Case-insensitive campaign name search')
    })
  )
  .output(
    z.object({
      campaigns: z.array(z.any()).describe('List of campaign records'),
      total: z
        .number()
        .optional()
        .describe('Total campaigns matching the filters across all pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getCampaigns(
      ctx.input.skip,
      ctx.input.limit,
      ctx.input.status,
      ctx.input.search
    );

    let campaigns = Array.isArray(result) ? result : (result?.campaigns ?? [result]);

    return {
      output: { campaigns, total: result?.total },
      message: `Retrieved **${campaigns.length}** campaign(s).`
    };
  })
  .build();
