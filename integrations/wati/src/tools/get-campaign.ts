import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCampaign = SlateTool.create(spec, {
  name: 'Get Campaign',
  key: 'get_campaign',
  description:
    'Retrieve a Wati broadcast campaign with its status, template, timestamps, and recipient delivery statistics. Call list_campaigns to find campaign IDs.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      campaignId: z
        .string()
        .min(1)
        .describe('Campaign ID from list_campaigns or send_template_message.')
    })
  )
  .output(
    z.object({
      campaign: z
        .record(z.string(), z.unknown())
        .describe('Campaign details, including delivery statistics when available.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, apiEndpoint: ctx.config.apiEndpoint });
    let result = await client.getCampaign(ctx.input.campaignId);
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
      throw createApiServiceError('Wati returned no campaign details.');
    }
    return {
      output: { campaign: result },
      message: `Retrieved campaign **${ctx.input.campaignId}**.`
    };
  })
  .build();
