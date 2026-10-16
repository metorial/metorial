import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { appIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let cancelNotification = SlateTool.create(spec, {
  name: 'Cancel Notification',
  key: 'cancel_notification',
  description: `Cancel a scheduled or in-progress notification by its ID. Only notifications that have not yet been fully delivered can be cancelled. Provide appId from list_apps with an Organization API Key, or Settings > Keys & IDs.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      appId: appIdSchema,
      notificationId: z.string().describe('ID of the notification to cancel')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the cancellation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      appId: ctx.input.appId ?? ctx.config.appId
    });

    let result = await client.cancelNotification(ctx.input.notificationId);

    return {
      output: {
        success: result.success === true
      },
      message: result.success
        ? `Notification **${ctx.input.notificationId}** has been cancelled.`
        : `Failed to cancel notification **${ctx.input.notificationId}**.`
    };
  })
  .build();
