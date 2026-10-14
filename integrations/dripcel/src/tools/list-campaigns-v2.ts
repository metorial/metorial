import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCampaignsV2 = SlateTool.create(spec, {
  name: 'List V2 Campaigns',
  key: 'list_campaigns_v2',
  description:
    'List newer Dripcel V2 campaigns or retrieve one by ID. Returns the full campaign with targeting, channel templates, marketplace attribution, and status.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      campaignId: z
        .string()
        .optional()
        .describe('V2 campaign ID. Omit to list all V2 campaigns.')
    })
  )
  .output(z.object({ campaigns: z.array(z.any()).describe('Full V2 campaign records') }))
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getCampaignsV2(ctx.input.campaignId);
    if (
      ctx.input.campaignId
        ? !result.data || typeof result.data !== 'object' || Array.isArray(result.data)
        : !Array.isArray(result.data)
    ) {
      throw createApiServiceError('Dripcel returned an invalid V2 campaign response.');
    }
    let campaigns = ctx.input.campaignId ? [result.data] : result.data;
    return {
      output: { campaigns },
      message: `Retrieved **${campaigns.length}** V2 campaign(s).`
    };
  })
  .build();
