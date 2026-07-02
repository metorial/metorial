import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrazeClient } from '../lib/client';
import { spec } from '../spec';

export let scheduleMessage = SlateTool.create(spec, {
  name: 'Schedule Message',
  key: 'schedule_message',
  description: `Schedule a message for future delivery or cancel an existing scheduled message. Allows you to set up one-off message sends at a specific time, optionally in each user's local timezone.`,
  instructions: [
    'Use action "create" to schedule a new message, or "delete" to cancel an existing scheduled message.',
    'The scheduled time must be in ISO 8601 format.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'delete'])
        .describe('"create" to schedule a message, "delete" to cancel a scheduled message'),
      scheduleId: z
        .string()
        .optional()
        .describe('Schedule ID to cancel (required for delete action)'),
      externalUserIds: z
        .array(z.string())
        .optional()
        .describe('External user IDs to send to (for create action)'),
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
      messages: z
        .object({
          email: z.record(z.string(), z.any()).optional().describe('Email message object'),
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
      message: z.string().describe('Response status from Braze')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BrazeClient({
      token: ctx.auth.token,
      instanceUrl: ctx.config.instanceUrl
    });

    if (ctx.input.action === 'delete') {
      let result = await client.deleteScheduledMessage(ctx.input.scheduleId!);
      return {
        output: {
          message: result.message
        },
        message: `Cancelled scheduled message **${ctx.input.scheduleId}**.`
      };
    }

    let messages: Record<string, any> = {};
    if (ctx.input.messages) {
      if (ctx.input.messages.email) messages.email = ctx.input.messages.email;
      if (ctx.input.messages.applePush) messages.apple_push = ctx.input.messages.applePush;
      if (ctx.input.messages.androidPush)
        messages.android_push = ctx.input.messages.androidPush;
      if (ctx.input.messages.webPush) messages.web_push = ctx.input.messages.webPush;
      if (ctx.input.messages.sms) messages.sms = ctx.input.messages.sms;
      if (ctx.input.messages.webhook) messages.webhook = ctx.input.messages.webhook;
      if (ctx.input.messages.contentCard)
        messages.content_card = ctx.input.messages.contentCard;
    }

    let result = await client.scheduleMessage({
      externalUserIds: ctx.input.externalUserIds,
      broadcast: ctx.input.broadcast,
      messages,
      schedule: {
        time: ctx.input.scheduledTime!,
        inLocalTime: ctx.input.inLocalTime
      }
    });

    return {
      output: {
        scheduleId: result.schedule_id,
        message: result.message
      },
      message: `Scheduled message for **${ctx.input.scheduledTime}**${ctx.input.inLocalTime ? ' (local time)' : ''}.`
    };
  })
  .build();
