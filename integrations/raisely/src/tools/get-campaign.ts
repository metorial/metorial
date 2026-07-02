import { SlateTool } from 'slates';
import { z } from 'zod';
import { RaiselyClient } from '../lib/client';
import { spec } from '../spec';

export let getCampaign = SlateTool.create(spec, {
  name: 'Get Campaign',
  key: 'get_campaign',
  description: `Retrieve detailed information about a specific Raisely campaign by its UUID. Returns full campaign configuration including goals, currency, and custom fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignUuid: z.string().describe('UUID of the campaign to retrieve'),
      includePrivateData: z.boolean().optional().describe('Include private/custom field data')
    })
  )
  .output(
    z.object({
      campaign: z.record(z.string(), z.any()).describe('Campaign object with full details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RaiselyClient({ token: ctx.auth.token });

    let result = await client.getCampaign(ctx.input.campaignUuid, {
      private: ctx.input.includePrivateData
    });

    let campaign = result.data || result;

    return {
      output: { campaign },
      message: `Retrieved campaign **${campaign.name || ctx.input.campaignUuid}**.`
    };
  })
  .build();
