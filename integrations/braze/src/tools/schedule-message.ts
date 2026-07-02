import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrazeClient } from '../lib/client';
import { brazeServiceError, requireBrazeString } from '../lib/errors';
import { spec } from '../spec';
import { assertHasMessageChannel, mapMessageChannels } from './send-message';

let userAliasSchema = z.object({
  aliasName: z.string().describe('Alias name'),
  aliasLabel: z.string().describe('Alias label')
});

let messageChannelsSchema = z.object({
  email: z.record(z.string(), z.any()).optional().describe('Email message object'),
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

export let scheduleMessage = SlateTool.create(spec, {
  name: 'Schedule Message',
  key: 'schedule_message',
  description: `Schedule a message for future delivery, list upcoming scheduled broadcasts, or cancel an existing scheduled message. Allows one-off API message sends at a specific time, optionally in each user's local timezone.`,
  instructions: [
    'Use action "create" to schedule a new message, "list" to retrieve upcoming scheduled broadcasts, or "delete" to cancel an existing scheduled message.',
    'The scheduled time and list end time must be ISO 8601 timestamps.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'list', 'delete'])
        .describe(
          '"create" to schedule a message, "list" to retrieve scheduled broadcasts, "delete" to cancel a scheduled message'
        ),
      scheduleId: z
        .string()
        .optional()
        .describe('Schedule ID to cancel (required for delete action)'),
      endTime: z
        .string()
        .optional()
        .describe('End of the scheduled broadcast lookup window (required for list action)'),
      externalUserIds: z
        .array(z.string())
        .optional()
        .describe('External user IDs to send to (for create action)'),
      userAliases: z
        .array(userAliasSchema)
        .optional()
        .describe('User aliases to send to (for create action)'),
      segmentId: z.string().optional().describe('Segment ID to target (for create action)'),
      audience: z
        .record(z.string(), z.any())
        .optional()
        .describe('Connected audience object to target (for create action)'),
      broadcast: z
        .boolean()
        .optional()
        .describe('Set to true for broadcast send (for create action)'),
      scheduledTime: z
        .string()
        .optional()
        .describe(
          'ISO 8601 datetime for when to send the message (required for create action)'
        ),
      inLocalTime: z
        .boolean()
        .optional()
        .describe("If true, deliver the message in each user's local timezone"),
      campaignId: z.string().optional().describe('Campaign ID for tracking analytics'),
      sendId: z.string().optional().describe('Send ID for tracking this scheduled dispatch'),
      overrideFrequencyCapping: z
        .boolean()
        .optional()
        .describe('Ignore campaign frequency capping'),
      recipientSubscriptionState: z
        .enum(['opted_in', 'subscribed', 'all'])
        .optional()
        .describe('Recipient subscription state filter'),
      messages: messageChannelsSchema
        .optional()
        .describe('Channel-specific message objects (for create action)')
    })
  )
  .output(
    z.object({
      scheduleId: z
        .string()
        .optional()
        .describe('Schedule ID for the created scheduled message'),
      scheduledBroadcasts: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Upcoming scheduled campaigns and Canvases'),
      message: z.string().describe('Response status from Braze')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrazeClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    if (ctx.input.action === 'delete') {
      let scheduleId = requireBrazeString(ctx.input.scheduleId, 'scheduleId', 'delete');
      let result = await client.deleteScheduledMessage(scheduleId);
      return {
        output: {
          message: result.message
        },
        message: `Cancelled scheduled message **${scheduleId}**.`
      };
    }

    if (ctx.input.action === 'list') {
      let endTime = requireBrazeString(ctx.input.endTime, 'endTime', 'list');
      let result = await client.listScheduledBroadcasts(endTime);
      let scheduledBroadcasts = result.scheduled_broadcasts ?? [];

      return {
        output: {
          scheduledBroadcasts,
          message: result.message
        },
        message: `Found **${scheduledBroadcasts.length}** scheduled broadcast(s) through **${endTime}**.`
      };
    }

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

    let scheduledTime = requireBrazeString(ctx.input.scheduledTime, 'scheduledTime', 'create');
    let messages = mapMessageChannels(ctx.input.messages ?? {});
    assertHasMessageChannel(messages);

    let result = await client.scheduleMessage({
      externalUserIds: ctx.input.externalUserIds,
      userAliases: ctx.input.userAliases,
      broadcast: ctx.input.broadcast,
      segmentId: ctx.input.segmentId,
      audience: ctx.input.audience,
      campaignId: ctx.input.campaignId,
      sendId: ctx.input.sendId,
      overrideFrequencyCapping: ctx.input.overrideFrequencyCapping,
      recipientSubscriptionState: ctx.input.recipientSubscriptionState,
      messages,
      schedule: {
        time: scheduledTime,
        inLocalTime: ctx.input.inLocalTime
      }
    });

    return {
      output: {
        scheduleId: result.schedule_id,
        message: result.message
      },
      message: `Scheduled message for **${scheduledTime}**${ctx.input.inLocalTime ? ' (local time)' : ''}.`
    };
  })
  .build();
