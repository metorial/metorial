import { SlateTool } from 'slates';
import { z } from 'zod';
import { DeadlineFunnelClient } from '../lib/client';
import { spec } from '../spec';

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `Retrieve all Deadline Funnel campaigns in your account. Returns campaign IDs, names, types, and statuses. Use this to find the campaign ID needed for starting deadlines or tracking purchases.`,
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
            campaignId: z.string().describe('Unique identifier for the campaign'),
            name: z.string().describe('Name of the campaign'),
            campaignType: z
              .string()
              .describe('Type of campaign (e.g., evergreen, flash sale, automated webinar)'),
            status: z.string().describe('Current status of the campaign'),
            createdAt: z.string().describe('When the campaign was created'),
            updatedAt: z.string().describe('When the campaign was last updated')
          })
        )
        .describe('List of campaigns')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DeadlineFunnelClient({ token: ctx.auth.token });
    let campaigns = await client.listCampaigns();

    return {
      output: { campaigns },
      message: `Found **${campaigns.length}** campaign(s).${campaigns.length > 0 ? `\n\n${campaigns.map(c => `- **${c.name}** (${c.campaignId}) — ${c.campaignType}`).join('\n')}` : ''}`
    };
  })
  .build();
