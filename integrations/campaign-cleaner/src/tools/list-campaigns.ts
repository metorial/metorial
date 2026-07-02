import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let campaignListItemSchema = z.object({
  campaignId: z.string().describe('Unique campaign identifier'),
  campaignName: z.string().describe('Name of the campaign'),
  status: z.string().describe('Processing status: "processing", "completed", or "paused"'),
  dateAdded: z.string().describe('Timestamp when the campaign was submitted')
});

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `Retrieve a list of all campaigns in your Campaign Cleaner account with their current processing status. Use this to find campaign IDs, check which campaigns are completed, or get an overview of all submitted campaigns.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      campaigns: z
        .array(campaignListItemSchema)
        .describe('List of all campaigns in the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let campaigns = await client.getCampaignList();

    let mapped = campaigns.map(c => ({
      campaignId: c.id,
      campaignName: c.campaignName,
      status: c.status,
      dateAdded: c.dateAdded
    }));

    let completed = mapped.filter(c => c.status === 'completed').length;
    let processing = mapped.filter(c => c.status === 'processing').length;

    return {
      output: { campaigns: mapped },
      message: `Found **${mapped.length}** campaigns: ${completed} completed, ${processing} processing.`
    };
  })
  .build();
