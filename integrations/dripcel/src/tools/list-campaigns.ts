import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `Retrieve all campaigns or a specific campaign by ID. Campaigns organize sends, track performance, and associate contacts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z
        .string()
        .optional()
        .describe('Specific campaign ID to retrieve. If omitted, all campaigns are returned.')
    })
  )
  .output(
    z.object({
      campaigns: z
        .array(z.any())
        .describe(
          'Array of campaign objects (single-element array if campaignId was provided)'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    if (ctx.input.campaignId) {
      let result = await client.getCampaign(ctx.input.campaignId);
      return {
        output: { campaigns: [result.data] },
        message: `Retrieved campaign \`${ctx.input.campaignId}\`.`
      };
    }
    let result = await client.getCampaigns();
    let campaigns = Array.isArray(result.data) ? result.data : [];
    return {
      output: { campaigns },
      message: `Found **${campaigns.length}** campaign(s).`
    };
  })
  .build();
