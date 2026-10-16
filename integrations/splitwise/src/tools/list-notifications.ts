import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listNotifications = SlateTool.create(spec, {
  name: 'List Notifications',
  key: 'list_notifications',
  description:
    'Retrieve recent account activity with the newest notifications first. Notification content contains provider-formatted HTML; notification types may expand over time.',
  instructions: [
    'Omit limit or pass 0 to request the provider maximum. Splitwise may cap results for accounts with extensive activity.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      updatedAfter: z
        .string()
        .optional()
        .describe('Only return notifications after this ISO 8601 timestamp'),
      limit: z
        .number()
        .optional()
        .describe('Maximum notifications; 0 requests the provider maximum')
    })
  )
  .output(
    z.object({
      notifications: z
        .array(z.record(z.string(), z.unknown()))
        .describe(
          'Notifications exactly as returned by Splitwise, including nullable source metadata'
        )
    })
  )
  .handleInvocation(async ctx => {
    let notifications = await new Client({ token: ctx.auth.token }).getNotifications(
      ctx.input
    );
    return {
      output: { notifications },
      message: `Retrieved ${notifications.length} notification(s).`
    };
  })
  .build();
