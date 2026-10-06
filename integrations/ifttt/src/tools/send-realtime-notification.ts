import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConnectClient } from '../lib/client';
import { spec } from '../spec';

export let sendRealtimeNotificationTool = SlateTool.create(spec, {
  name: 'Send Realtime Notification',
  key: 'send_realtime_notification',
  description: `Notify IFTTT's Realtime API that new trigger events are available for the specified users or trigger identities. This prompts polling; request acceptance does not confirm polling time, Applet completion, or downstream effects.`,
  instructions: [
    'Each notification must include either a userId or a triggerIdentity (or both).',
    'Up to 1000 notifications can be sent in a single request.',
    'This does not send data directly — it tells IFTTT to fetch new data from your trigger endpoints.'
  ],
  constraints: ['Maximum 1000 notifications per request.']
})
  .input(
    z.object({
      notifications: z
        .array(
          z.object({
            userId: z.string().optional().describe('The user ID to notify IFTTT about'),
            triggerIdentity: z
              .string()
              .optional()
              .describe('The trigger identity to notify IFTTT about')
          })
        )
        .min(1)
        .max(1000)
        .describe(
          'Array of notification targets (each must have userId and/or triggerIdentity)'
        )
    })
  )
  .output(
    z.object({
      notificationCount: z.number().describe('Number of notifications sent'),
      result: z.any().describe('Response from the Realtime API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConnectClient(ctx.auth);
    let result = await client.sendRealtimeNotification(ctx.input.notifications);

    return {
      output: {
        notificationCount: ctx.input.notifications.length,
        result
      },
      message: `IFTTT accepted **${ctx.input.notifications.length}** realtime notification target(s). Polling and Applet completion are not confirmed.`
    };
  })
  .build();
