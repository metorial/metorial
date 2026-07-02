import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrazeClient } from '../lib/client';
import { brazeServiceError } from '../lib/errors';
import { spec } from '../spec';

let userAliasSchema = z.object({
  aliasName: z.string().describe('Alias name'),
  aliasLabel: z.string().describe('Alias label')
});

let messageChannelsSchema = z.object({
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
  webPush: z.record(z.string(), z.any()).optional().describe('Web push notification object'),
  kindlePush: z
    .record(z.string(), z.any())
    .optional()
    .describe('Kindle/FireOS push notification object'),
  sms: z.record(z.string(), z.any()).optional().describe('SMS message object'),
  webhook: z.record(z.string(), z.any()).optional().describe('Webhook message object'),
  whatsApp: z.record(z.string(), z.any()).optional().describe('WhatsApp message object'),
  contentCard: z.record(z.string(), z.any()).optional().describe('Content Card message object')
});

export let mapMessageChannels = (messages: z.infer<typeof messageChannelsSchema>) => {
  let mapped: Record<string, any> = {};
  if (messages.email) mapped.email = messages.email;
  if (messages.applePush) mapped.apple_push = messages.applePush;
  if (messages.androidPush) mapped.android_push = messages.androidPush;
  if (messages.webPush) mapped.web_push = messages.webPush;
  if (messages.kindlePush) mapped.kindle_push = messages.kindlePush;
  if (messages.sms) mapped.sms = messages.sms;
  if (messages.webhook) mapped.webhook = messages.webhook;
  if (messages.whatsApp) mapped.whats_app = messages.whatsApp;
  if (messages.contentCard) mapped.content_card = messages.contentCard;

  return mapped;
};

export let assertHasMessageChannel = (messages: Record<string, any>) => {
  if (Object.keys(messages).length === 0) {
    throw brazeServiceError('At least one message channel object is required.');
  }
};

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send messages immediately across channels (email, push, SMS, webhook, Content Cards) to specified users. Supports direct one-off sends to user IDs. For API-triggered campaigns or Canvases, use the dedicated trigger tools instead.`,
  instructions: [
    'Provide at least one message channel object in the messages field.',
    'Specify externalUserIds or userAliases for targeted sends, or set broadcast to true when targeting a segment or connected audience.'
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
      userAliases: z.array(userAliasSchema).optional().describe('User aliases to send to'),
      broadcast: z
        .boolean()
        .optional()
        .describe(
          'Set to true to send to all users in a segment. Cannot be used with externalUserIds.'
        ),
      segmentId: z.string().optional().describe('Segment ID to target (used with broadcast)'),
      audience: z
        .record(z.string(), z.any())
        .optional()
        .describe('Connected audience object to target'),
      campaignId: z.string().optional().describe('Campaign ID for tracking analytics'),
      sendId: z.string().optional().describe('Send ID for tracking this dispatch'),
      overrideFrequencyCapping: z
        .boolean()
        .optional()
        .describe('Ignore campaign frequency capping'),
      recipientSubscriptionState: z
        .enum(['opted_in', 'subscribed', 'all'])
        .optional()
        .describe(
          'Recipient subscription state filter. Use "all" only for transactional sends.'
        ),
      messages: messageChannelsSchema.describe('Channel-specific message objects')
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

    if (
      ctx.input.broadcast &&
      ((ctx.input.externalUserIds?.length ?? 0) > 0 ||
        (ctx.input.userAliases?.length ?? 0) > 0)
    ) {
      throw brazeServiceError('broadcast cannot be used with externalUserIds or userAliases.');
    }

    if (
      !ctx.input.broadcast &&
      (ctx.input.externalUserIds?.length ?? 0) === 0 &&
      (ctx.input.userAliases?.length ?? 0) === 0
    ) {
      throw brazeServiceError(
        'Provide externalUserIds or userAliases, or set broadcast to true for segment/audience sends.'
      );
    }

    let messages = mapMessageChannels(ctx.input.messages);
    assertHasMessageChannel(messages);

    let result = await client.sendMessages({
      externalUserIds: ctx.input.externalUserIds,
      userAliases: ctx.input.userAliases,
      broadcast: ctx.input.broadcast,
      segmentId: ctx.input.segmentId,
      audience: ctx.input.audience,
      campaignId: ctx.input.campaignId,
      sendId: ctx.input.sendId,
      overrideFrequencyCapping: ctx.input.overrideFrequencyCapping,
      recipientSubscriptionState: ctx.input.recipientSubscriptionState,
      messages
    });

    let targetDesc = ctx.input.broadcast
      ? 'broadcast'
      : `${ctx.input.externalUserIds?.length ?? 0} user(s)`;
    let channels = Object.keys(messages);

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
