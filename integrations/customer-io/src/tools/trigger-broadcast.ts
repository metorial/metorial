import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppClient } from '../lib/client';
import { spec } from '../spec';

export let triggerBroadcast = SlateTool.create(spec, {
  name: 'Trigger Broadcast',
  key: 'trigger_broadcast',
  description: `Trigger an API-triggered broadcast to send messages to a wide audience. You set up the broadcast in the Customer.io UI and then trigger it via this action. Broadcasts are ideal for announcements, product launches, event notifications, etc.
You can target a segment, a list of customer IDs, or a list of email addresses.`,
  instructions: [
    'The broadcast must be set up as an API-triggered broadcast in the Customer.io UI first.',
    'You can provide data that populates Liquid merge fields in the broadcast message.'
  ],
  constraints: [
    'Rate limit: 1 request per 10 seconds.',
    'Broadcasts can only send to people already in your workspace.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      broadcastId: z.number().describe('The ID of the API-triggered broadcast to trigger'),
      broadcastData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Key-value data to populate Liquid merge fields in the broadcast message'),
      segmentIds: z.array(z.number()).optional().describe('Target specific segment IDs'),
      customerIds: z.array(z.string()).optional().describe('Target specific customer IDs'),
      emails: z.array(z.string()).optional().describe('Target specific email addresses'),
      recipients: z
        .record(z.string(), z.record(z.string(), z.unknown()))
        .optional()
        .describe('Map of customer IDs to per-recipient data')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the broadcast was triggered successfully')
    })
  )
  .handleInvocation(async ctx => {
    let appClient = new AppClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let payload: Record<string, unknown> = {};
    if (ctx.input.broadcastData) payload.data = ctx.input.broadcastData;
    if (ctx.input.segmentIds) payload.ids = ctx.input.segmentIds;
    if (ctx.input.customerIds) payload.recipients = { ids: ctx.input.customerIds };
    if (ctx.input.emails) payload.emails = ctx.input.emails;
    if (ctx.input.recipients)
      payload.per_user_data = Object.entries(ctx.input.recipients).map(([id, data]) => ({
        id,
        data
      }));

    await appClient.triggerBroadcast(ctx.input.broadcastId, payload);

    return {
      output: { success: true },
      message: `Triggered broadcast **${ctx.input.broadcastId}** successfully.`
    };
  })
  .build();
