import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppClient } from '../lib/client';
import { spec } from '../spec';

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `Retrieve campaigns from your Customer.io workspace. Returns information about campaigns including their names, states, types, and tags.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      campaigns: z
        .array(
          z.object({
            campaignId: z.number().describe('The campaign ID'),
            name: z.string().describe('The campaign name'),
            type: z.string().optional().describe('The campaign type'),
            state: z
              .string()
              .optional()
              .describe('The campaign state (e.g. draft, started, stopped)'),
            createdAt: z
              .number()
              .optional()
              .describe('Unix timestamp when the campaign was created'),
            updatedAt: z
              .number()
              .optional()
              .describe('Unix timestamp when the campaign was last updated'),
            tags: z.array(z.string()).optional().describe('Tags applied to the campaign')
          })
        )
        .describe('Array of campaigns')
    })
  )
  .handleInvocation(async ctx => {
    let appClient = new AppClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await appClient.listCampaigns();
    let campaigns = (result?.campaigns ?? []).map((c: any) => ({
      campaignId: c.id,
      name: c.name,
      type: c.type,
      state: c.state,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      tags: c.tags
    }));

    return {
      output: { campaigns },
      message: `Found **${campaigns.length}** campaigns.`
    };
  })
  .build();
