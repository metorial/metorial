import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getNotificationContent = SlateTool.create(spec, {
  name: 'Get Notification Content',
  key: 'get_notification_content',
  description:
    'Retrieve the HTML content of a notification, as sent in the notification email. Call list_notifications to find its notification ID.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      notificationId: z.string().min(1).describe('Notification ID from list_notifications')
    })
  )
  .output(
    z.object({
      notificationId: z.string().describe('Notification ID'),
      jobType: z.string().optional().describe('Monitor type'),
      syntheticExpression: z
        .string()
        .optional()
        .describe('Expression for a synthetic monitor'),
      url: z.string().optional().describe('Monitored URL'),
      name: z.string().optional().describe('Monitor name'),
      htmlContent: z.string().optional().describe('HTML content of the notification email'),
      timestampUtc: z.string().optional().describe('Notification timestamp in UTC')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let content = await client.getNotificationContent(ctx.input.notificationId);
    return {
      output: {
        notificationId: ctx.input.notificationId,
        jobType: content.jobType == null ? undefined : String(content.jobType),
        syntheticExpression: content.syntheticExpression ?? undefined,
        url: content.url ?? undefined,
        name: content.name ?? undefined,
        htmlContent: content.html ?? undefined,
        timestampUtc: content.timestampUtc
      },
      message: `Retrieved notification content for \`${ctx.input.notificationId}\`.`
    };
  })
  .build();
