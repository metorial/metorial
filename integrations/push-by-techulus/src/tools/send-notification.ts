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

Supports customizing the notification with a sound, channel, link, image, and time-sensitive delivery (iOS only). Synchronous requests return per-device delivery results when available. Asynchronous requests return an acknowledgement and do not confirm device delivery.`,
  instructions: [
    'Use async mode for teams or accounts with more than 10 devices to avoid timeouts.',
    'Inspect responses for individual device failures even when success is true.'
  ],
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
        .describe('Return an acknowledgement without waiting for per-device delivery results')
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
        .describe('Per-device delivery results returned by synchronous requests')
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

    let failedDevices = result.responses?.filter(response => !response.success).length ?? 0;

    return {
      output: {
        success: result.success,
        message: result.message,
        responses: result.responses
      },
      message: ctx.input.async
        ? `Notification **"${ctx.input.title}"** accepted for asynchronous delivery.`
        : `Notification **"${ctx.input.title}"** processed.${failedDevices ? ` ${failedDevices} device result(s) reported a failure; inspect responses.` : ''}`
    };
  })
  .build();
