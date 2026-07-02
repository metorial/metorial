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

export let sendNotification = SlateTool.create(spec, {
  name: 'Send Notification',
  key: 'send_notification',
  description: `Send a push notification to all devices connected to your account or team. The target depends on the API key used during authentication: an account API key sends to all personal devices, while a team API key sends to all team members' devices.

Supports customizing the notification with a sound, channel, link, image, and time-sensitive delivery (iOS only). Can be sent **synchronously** (waits for delivery confirmation) or **asynchronously** (returns immediately).`,
  instructions: ['Use async mode for accounts with more than 10 devices to avoid timeouts.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
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
        .describe('Deliver immediately even in Do Not Disturb mode (iOS only)'),
      async: z
        .boolean()
        .optional()
        .default(false)
        .describe('Send asynchronously without waiting for delivery confirmation')
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

    let options = {
      title: ctx.input.title,
      body: ctx.input.body,
      sound: ctx.input.sound,
      channel: ctx.input.channel,
      link: ctx.input.link,
      image: ctx.input.image,
      timeSensitive: ctx.input.timeSensitive
    };

    let result = ctx.input.async
      ? await client.sendNotificationAsync(options)
      : await client.sendNotification(options);

    return {
      output: {
        success: result.success,
        message: result.message
      },
      message: result.success
        ? `Notification **"${ctx.input.title}"** sent successfully${ctx.input.async ? ' (async)' : ''}.`
        : `Failed to send notification: ${result.message ?? result.error ?? 'Unknown error'}`
    };
  })
  .build();
