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
  instructions: [
    'Copy the device group ID from your Push account; the API does not document a group-list endpoint.',
    'Inspect responses for individual device failures even when success is true.'
  ],
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
      message: z.string().optional().describe('Response message from the API'),
      responses: z
        .array(
          z
            .object({
              success: z.boolean(),
              message: z.string().optional()
            })
            .passthrough()
        )
        .optional()
        .describe('Per-device delivery results returned by the API')
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

    let failedDevices = result.responses?.filter(response => !response.success).length ?? 0;

    return {
      output: {
        success: result.success,
        message: result.message,
        responses: result.responses
      },
      message: `Notification **"${ctx.input.title}"** processed for device group \`${ctx.input.groupId}\`.${failedDevices ? ` ${failedDevices} device result(s) reported a failure; inspect responses.` : ''}`
    };
  })
  .build();
