import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteTemplateNotification = SlateTool.create(spec, {
  name: 'Delete Scheduled Template Notification',
  key: 'delete_template_notification',
  description:
    'Cancel a pending push notification or template update task. Already executed tasks cannot be deleted. Call list_template_notifications to discover pending notification IDs.',
  tags: { destructive: true }
})
  .input(
    z.object({
      notificationId: z
        .string()
        .describe('Pending notification ID from list_template_notifications')
    })
  )
  .output(z.object({ notificationId: z.string().describe('Deleted notification identifier') }))
  .handleInvocation(async ctx => {
    await new Client({ token: ctx.auth.token }).deleteTemplateNotification(
      ctx.input.notificationId
    );
    return {
      output: { notificationId: ctx.input.notificationId },
      message: `Cancelled scheduled task \`${ctx.input.notificationId}\`.`
    };
  })
  .build();
