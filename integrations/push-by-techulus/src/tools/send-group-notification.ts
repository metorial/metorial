import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let soundOptions = z.enum([
  'default',
  'arcade',
  'correct',
  'fail',
  'harp',
  'reveal',
  'bubble',
  'doorbell',
  'flute',
  'money',
  'scifi',
  'clear',
  'elevator',
  'guitar',
  'pop'
]);

export let sendGroupNotification = SlateTool.create(spec, {
  name: 'Send Group Notification',
  key: 'send_group_notification',
  description: `Send a push notification to a specific device group in your account. Requires an **account API key** (not a team API key) and a group ID to target the desired device group.

Supports the same customization options as regular notifications: sound, channel, link, image, and time-sensitive delivery.`,
  constraints: ['Only works with an account API key, not a team API key.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      groupId: z.string().describe('The device group ID to send the notification to'),
      title: z.string().describe('Notification title'),
      body: z.string().describe('Notification message content'),
      sound: soundOptions.optional().describe('Notification sound'),
      channel: z
        .string()
        .optional()
        .describe('Notification channel (alphanumeric and hyphens only)'),
      link: z.string().optional().describe('URL to attach to the notification'),
      image: z.string().optional().describe('Image URL to include with the notification'),
      timeSensitive: z
        .boolean()
        .optional()
        .describe('Deliver immediately even in Do Not Disturb mode (iOS only)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the notification was sent successfully'),
      message: z.string().optional().describe('Response message from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.sendGroupNotification(ctx.input.groupId, {
      title: ctx.input.title,
      body: ctx.input.body,
      sound: ctx.input.sound,
      channel: ctx.input.channel,
      link: ctx.input.link,
      image: ctx.input.image,
      timeSensitive: ctx.input.timeSensitive
    });

    return {
      output: {
        success: result.success,
        message: result.message
      },
      message: result.success
        ? `Notification **"${ctx.input.title}"** sent to device group \`${ctx.input.groupId}\`.`
        : `Failed to send group notification: ${result.message ?? result.error ?? 'Unknown error'}`
    };
  })
  .build();
