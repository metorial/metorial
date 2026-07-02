import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelTelClient } from '../lib/client';
import { spec } from '../spec';

export let listCampaignsTool = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `Retrieve all auto dialer campaigns from the TelTel account. Returns campaign details including ID, name, creation date, and campaign type.
Optionally fetch a specific campaign by providing a campaign ID for detailed information.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z
        .string()
        .optional()
        .describe(
          'Specific campaign ID to retrieve details for. If omitted, all campaigns are listed.'
        )
    })
  )
  .output(
    z.object({
      campaigns: z.array(z.any()).describe('List of campaign objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelTelClient(ctx.auth.token);

    if (ctx.input.campaignId) {
      let campaign = await client.getCampaign(ctx.input.campaignId);
      return {
        output: {
          campaigns: [campaign]
        },
        message: `Retrieved campaign **${ctx.input.campaignId}**.`
      };
    }

    let result = await client.listCampaigns({
      fields: 'id,name,created_at,campaign_type,status'
    });

    let campaigns = Array.isArray(result) ? result : (result?.data ?? result?.campaigns ?? []);

    return {
      output: {
        campaigns
      },
      message: `Retrieved **${campaigns.length}** campaign(s).`
    };
  })
  .build();
