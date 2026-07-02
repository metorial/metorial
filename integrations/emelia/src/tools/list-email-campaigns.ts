import { SlateTool } from 'slates';
import { z } from 'zod';
import { EmeliaClient } from '../lib/client';
import { spec } from '../spec';

export let listEmailCampaigns = SlateTool.create(spec, {
  name: 'List Email Campaigns',
  key: 'list_email_campaigns',
  description: `Retrieves all email campaigns for the authenticated account. Returns campaign names, statuses, creation dates, and basic statistics.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      campaigns: z.array(z.record(z.string(), z.unknown())).describe('List of email campaigns')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EmeliaClient(ctx.auth.token);
    let campaigns = await client.listEmailCampaigns();

    let campaignList = Array.isArray(campaigns) ? campaigns : [];

    return {
      output: { campaigns: campaignList },
      message: `Retrieved **${campaignList.length}** email campaign(s).`
    };
  })
  .build();
