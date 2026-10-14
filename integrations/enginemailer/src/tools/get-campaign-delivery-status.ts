import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCampaignDeliveryStatus = SlateTool.create(spec, {
  name: 'Get Campaign Delivery Status',
  key: 'get_campaign_delivery_status',
  description:
    'Retrieve delivery and engagement statistics for a delivered campaign, including sent, delivered, bounced, opened, clicked, unsubscribed, and spam complaint counts.',
  constraints: [
    'Only delivered campaigns are eligible. Campaign API requires a paid account.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({ campaignId: z.string().describe('Numeric ID of the delivered campaign') }))
  .output(
    z.object({
      status: z.string().describe('Response status'),
      statusCode: z.string().describe('Response status code'),
      campaignId: z.string().describe('Campaign ID requested'),
      statistics: z
        .any()
        .optional()
        .describe('Delivery and engagement counts returned by Enginemailer')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).getCampaignDeliveryStatus(
      ctx.input.campaignId
    );
    return {
      output: {
        status: result.Result.Status,
        statusCode: result.Result.StatusCode,
        campaignId: ctx.input.campaignId,
        statistics: result.Result.Data
      },
      message: `Retrieved delivery statistics for campaign **${ctx.input.campaignId}**.`
    };
  })
  .build();
