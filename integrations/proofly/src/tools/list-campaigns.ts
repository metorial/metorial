import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `List all campaigns in the account. Returns each campaign's ID, name, associated domain, and whether it is currently enabled.`,
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
            campaignId: z.string().describe('Unique campaign identifier'),
            name: z.string().optional().describe('Campaign name'),
            domain: z.string().optional().describe('Domain associated with the campaign'),
            enabled: z
              .boolean()
              .optional()
              .describe('Whether the campaign is currently active')
          })
        )
        .describe('List of campaigns in the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.listCampaigns();

    let campaigns = Array.isArray(data) ? data : (data.campaigns ?? []);

    return {
      output: {
        campaigns: campaigns.map((c: any) => ({
          campaignId: String(c.id ?? c._id ?? c.campaignId),
          name: c.name ?? c.title,
          domain: c.domain ?? c.website ?? c.url,
          enabled: c.enabled ?? c.active ?? c.is_enabled
        }))
      },
      message: `Found **${campaigns.length}** campaign(s).`
    };
  })
  .build();
