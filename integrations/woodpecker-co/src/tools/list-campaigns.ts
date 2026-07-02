import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let campaignSchema = z.object({
  campaignId: z.number().describe('Unique campaign identifier'),
  name: z.string().describe('Campaign name'),
  status: z
    .string()
    .describe('Campaign status (e.g., DRAFT, RUNNING, PAUSED, STOPPED, COMPLETED, EDITED)')
});

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `Retrieve all outreach campaigns in the Woodpecker account. Returns campaign names, IDs, and statuses. Use this to discover available campaigns before performing operations on them.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      campaigns: z.array(campaignSchema).describe('List of campaigns')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyId: ctx.config.companyId
    });

    let data: any = await client.listCampaigns();
    let campaigns: any[] = Array.isArray(data) ? data : (data?.campaigns ?? []);

    let mapped = campaigns.map((c: any) => ({
      campaignId: c.id ?? c.campaign_id,
      name: c.name ?? '',
      status: c.status ?? ''
    }));

    return {
      output: { campaigns: mapped },
      message: `Found **${mapped.length}** campaign(s).`
    };
  })
  .build();
