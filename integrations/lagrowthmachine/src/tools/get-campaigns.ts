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
      skip: z.number().optional().describe('Number of campaigns to skip for pagination'),
      limit: z.number().optional().describe('Number of campaigns to return per page (max 25)')
    })
  )
  .output(
    z.object({
      campaigns: z.array(z.any()).describe('List of campaign records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getCampaigns(ctx.input.skip, ctx.input.limit);

    let campaigns = Array.isArray(result) ? result : (result?.campaigns ?? [result]);

    return {
      output: { campaigns },
      message: `Retrieved **${campaigns.length}** campaign(s).`
    };
  })
  .build();
