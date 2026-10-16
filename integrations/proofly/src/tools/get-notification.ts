import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getNotification = SlateTool.create(spec, {
  name: 'Get Notification',
  key: 'get_notification',
  description:
    'Retrieve one notification and its settings and statistics. Call get_campaign_notifications to discover notification IDs.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      notificationId: z.string().describe('Notification ID from get_campaign_notifications.')
    })
  )
  .output(
    z.object({
      notification: z.unknown().describe('Notification details returned by Proofly')
    })
  )
  .handleInvocation(async ctx => ({
    output: {
      notification: await new Client({ token: ctx.auth.token }).getNotification(
        ctx.input.notificationId
      )
    },
    message: `Retrieved notification \`${ctx.input.notificationId}\`.`
  }))
  .build();
