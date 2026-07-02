import { SlateTool } from 'slates';
import { z } from 'zod';
import { MondayClient } from '../lib/client';
import { spec } from '../spec';

export let sendNotificationTool = SlateTool.create(spec, {
  name: 'Send Notification',
  key: 'send_notification',
  description: `Send a notification to a specific user on behalf of the authenticated user. The notification is linked to a target item on a board.`
})
  .input(
    z.object({
      userId: z.string().describe('ID of the user to notify'),
      targetItemId: z.string().describe('Item ID to link the notification to'),
      text: z.string().describe('Notification text content'),
      targetType: z
        .enum(['Project'])
        .default('Project')
        .describe('Target type for the notification')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the notification was sent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MondayClient({ token: ctx.auth.token });

    await client.createNotification(
      ctx.input.userId,
      ctx.input.targetItemId,
      ctx.input.text,
      ctx.input.targetType
    );

    return {
      output: { success: true },
      message: `Sent notification to user ${ctx.input.userId}.`
    };
  })
  .build();
