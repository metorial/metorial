import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrazeClient } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send messages immediately across channels (email, push, SMS, webhook, Content Cards) to specified users. Supports direct one-off sends to user IDs. For API-triggered campaigns or Canvases, use the dedicated trigger tools instead.`,
  instructions: [
    'Provide at least one message channel object in the messages field.',
    'Either specify externalUserIds for targeted sends or set broadcast to true for all users.'
  ],
  constraints: [
    'Maximum 50 external user IDs per request.',
    'Broadcast sends are rate limited to 250 requests per minute.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      externalUserIds: z
        .array(z.string())
        .optional()
        .describe('List of external user IDs to send to'),
      broadcast: z
        .boolean()
        .optional()
        .describe(
          'Set to true to send to all users in a segment. Cannot be used with externalUserIds.'
        ),
      segmentId: z.string().optional().describe('Segment ID to target (used with broadcast)'),
      campaignId: z.string().optional().describe('Campaign ID for tracking analytics'),
      messages: z
        .object({
          email: z
            .record(z.string(), z.any())
            .optional()
            .describe('Email message object with subject, body, from, etc.'),
          applePush: z
            .record(z.string(), z.any())
            .optional()
            .describe('Apple push notification object'),
          androidPush: z
            .record(z.string(), z.any())
            .optional()
            .describe('Android push notification object'),
          webPush: z
            .record(z.string(), z.any())
            .optional()
            .describe('Web push notification object'),
          sms: z.record(z.string(), z.any()).optional().describe('SMS message object'),
          webhook: z.record(z.string(), z.any()).optional().describe('Webhook message object'),
          contentCard: z
            .record(z.string(), z.any())
            .optional()
            .describe('Content Card message object')
        })
        .describe('Channel-specific message objects')
    })
  )
  .output(
    z.object({
      dispatchId: z.string().optional().describe('Dispatch ID for tracking the send'),
      message: z.string().describe('Response status from Braze'),
      errors: z.array(z.any()).optional().describe('Errors encountered during send')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrazeClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    let messages: Record<string, any> = {};
    if (ctx.input.messages.email) messages.email = ctx.input.messages.email;
    if (ctx.input.messages.applePush) messages.apple_push = ctx.input.messages.applePush;
    if (ctx.input.messages.androidPush) messages.android_push = ctx.input.messages.androidPush;
    if (ctx.input.messages.webPush) messages.web_push = ctx.input.messages.webPush;
    if (ctx.input.messages.sms) messages.sms = ctx.input.messages.sms;
    if (ctx.input.messages.webhook) messages.webhook = ctx.input.messages.webhook;
    if (ctx.input.messages.contentCard) messages.content_card = ctx.input.messages.contentCard;

    let result = await client.sendMessages({
      externalUserIds: ctx.input.externalUserIds,
      broadcast: ctx.input.broadcast,
      segmentId: ctx.input.segmentId,
      messages
    });

    let targetDesc = ctx.input.broadcast
      ? 'broadcast'
      : `${ctx.input.externalUserIds?.length ?? 0} user(s)`;
    let channels = Object.keys(ctx.input.messages).filter(k => (ctx.input.messages as any)[k]);

    return {
      output: {
        dispatchId: result.dispatch_id,
        message: result.message,
        errors: result.errors
      },
      message: `Sent message via **${channels.join(', ')}** to ${targetDesc}.`
    };
  })
  .build();
