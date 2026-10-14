import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelTelClient } from '../lib/client';
import { spec } from '../spec';

export let getCampaignStatsTool = SlateTool.create(spec, {
  name: 'Get Campaign Statistics',
  key: 'get_campaign_stats',
  description:
    'Retrieve live dialing activity, call counts, agent availability, and campaign metrics. Call list_campaigns to discover campaign IDs.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({ campaignId: z.string().describe('Campaign ID from list_campaigns') }))
  .output(
    z.object({ statistics: z.any().describe('Live campaign statistics returned by TelTel') })
  )
  .handleInvocation(async ctx => {
    let response = await new TelTelClient(ctx.auth.token).getCampaignStats(
      ctx.input.campaignId
    );
    return {
      output: { statistics: response?.data ?? response },
      message: `Retrieved statistics for campaign **${ctx.input.campaignId}**.`
    };
  })
  .build();
